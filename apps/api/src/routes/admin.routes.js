import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as adminService from "../services/admin.service.js";
import { db, id, now, mapWelfare, mapSettlement, mapAuditLog, audit } from "../db/index.js";

const router = Router();
router.use(authenticate, requireRole("ADMIN", "SUPER_ADMIN"));

router.get("/dashboard", asyncHandler(async (req, res) => ok(res, await adminService.dashboardOverview())));

router.get("/workers", asyncHandler(async (req, res) => ok(res, await adminService.listWorkers(req.query))));

router.post(
  "/workers/:id/verify",
  validate(z.object({ status: z.string() })),
  asyncHandler(async (req, res) => ok(res, await adminService.verifyWorker(req.params.id, req.body.status)))
);

router.get("/bookings", asyncHandler(async (req, res) => ok(res, await adminService.listBookings(req.query))));

router.get("/demand-heatmap", asyncHandler(async (req, res) => ok(res, await adminService.demandHeatmap())));

router.get("/analytics", asyncHandler(async (req, res) => ok(res, await adminService.analytics())));

router.get("/cooperatives", asyncHandler(async (req, res) => ok(res, await adminService.cooperativeHierarchy())));

router.post(
  "/workers/:id/welfare/enroll",
  asyncHandler(async (req, res) => {
    const worker = db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(req.params.id);
    if (!worker) return res.status(404).json({ success: false, error: { message: "Worker not found" } });
    const policyNumber = `CWF-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = db.prepare(`SELECT * FROM welfare_profiles WHERE worker_id = ?`).get(worker.id);
    const t = now();
    if (existing) {
      db.prepare(`UPDATE welfare_profiles SET enrolled = 1, enrolled_at = ?, policy_number = ? WHERE worker_id = ?`)
        .run(t, policyNumber, worker.id);
    } else {
      db.prepare(`INSERT INTO welfare_profiles (id, worker_id, enrolled, enrolled_at, policy_number, created_at) VALUES (?, ?, 1, ?, ?, ?)`)
        .run(id(), worker.id, t, policyNumber, t);
    }
    ok(res, mapWelfare(db.prepare(`SELECT * FROM welfare_profiles WHERE worker_id = ?`).get(worker.id)));
  })
);

// ── Admin CRUD: cooperative societies, federations, service categories/skills
router.post(
  "/federations",
  validate(z.object({ name: z.string().min(2), state: z.string().min(2), description: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const fedId = id();
    db.prepare(`INSERT INTO federations (id, name, state, description, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(fedId, req.body.name, req.body.state, req.body.description || null, now());
    audit(req.user.id, "FEDERATION_CREATE", "federation", fedId, req.body);
    ok(res, db.prepare(`SELECT * FROM federations WHERE id = ?`).get(fedId), null, 201);
  })
);

router.post(
  "/societies",
  validate(z.object({
    federationId: z.string(), name: z.string().min(2), city: z.string().min(2),
    registrationNo: z.string().min(3), contactPhone: z.string().min(6),
    welfareContributionPct: z.number().min(0).max(50).optional(), platformFeePct: z.number().min(0).max(50).optional(),
  })),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const societyId = id();
    db.prepare(
      `INSERT INTO cooperative_societies (id, federation_id, name, city, registration_no, contact_phone, welfare_contribution_pct, platform_fee_pct, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(societyId, b.federationId, b.name, b.city, b.registrationNo, b.contactPhone, b.welfareContributionPct ?? 8, b.platformFeePct ?? 8, now());
    audit(req.user.id, "SOCIETY_CREATE", "cooperative_society", societyId, b);
    ok(res, db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId), null, 201);
  })
);

router.patch(
  "/societies/:id/fees",
  validate(z.object({ welfareContributionPct: z.number().min(0).max(50), platformFeePct: z.number().min(0).max(50) })),
  asyncHandler(async (req, res) => {
    db.prepare(`UPDATE cooperative_societies SET welfare_contribution_pct = ?, platform_fee_pct = ? WHERE id = ?`)
      .run(req.body.welfareContributionPct, req.body.platformFeePct, req.params.id);
    audit(req.user.id, "FEE_CONFIG_CHANGE", "cooperative_society", req.params.id, req.body);
    ok(res, db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(req.params.id));
  })
);

router.post(
  "/categories",
  validate(z.object({ name: z.string().min(2), slug: z.string().min(2), icon: z.string().optional(), description: z.string().optional(), baseRate: z.number().positive(), emergencyEligible: z.boolean().optional() })),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const catId = id();
    db.prepare(`INSERT INTO service_categories (id, name, slug, icon, description, base_rate, emergency_eligible, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(catId, b.name, b.slug, b.icon || "wrench", b.description || null, b.baseRate, b.emergencyEligible ? 1 : 0, now());
    audit(req.user.id, "CATEGORY_CREATE", "service_category", catId, b);
    ok(res, db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(catId), null, 201);
  })
);

router.post(
  "/categories/:categoryId/skills",
  validate(z.object({ name: z.string().min(2) })),
  asyncHandler(async (req, res) => {
    const skillId = id();
    db.prepare(`INSERT INTO skills (id, category_id, name, created_at) VALUES (?, ?, ?, ?)`).run(skillId, req.params.categoryId, req.body.name, now());
    audit(req.user.id, "SKILL_CREATE", "skill", skillId, req.body);
    ok(res, db.prepare(`SELECT * FROM skills WHERE id = ?`).get(skillId), null, 201);
  })
);

// ── Settlement batches (weekly payout runs) ───────────────────────────────
router.post(
  "/settlements",
  validate(z.object({ societyId: z.string(), periodStart: z.string(), periodEnd: z.string() })),
  asyncHandler(async (req, res) => {
    const { societyId, periodStart, periodEnd } = req.body;
    const bookings = db
      .prepare(
        `SELECT b.id, b.worker_payout FROM bookings b JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE wp.society_id = ? AND b.status = 'COMPLETED' AND b.completed_at BETWEEN ? AND ? AND b.settlement_id IS NULL`
      )
      .all(societyId, periodStart, periodEnd);
    if (bookings.length === 0) return ok(res, { message: "No unsettled completed bookings in this period", bookingCount: 0 });

    const totalAmount = bookings.reduce((sum, b) => sum + (b.worker_payout || 0), 0);
    const settlementId = id();
    db.prepare(`INSERT INTO settlements (id, society_id, period_start, period_end, total_amount, booking_count, created_at, created_by_user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(settlementId, societyId, periodStart, periodEnd, totalAmount, bookings.length, now(), req.user.id);
    for (const b of bookings) {
      db.prepare(`UPDATE bookings SET settlement_id = ? WHERE id = ?`).run(settlementId, b.id);
      db.prepare(`INSERT INTO settlement_bookings (settlement_id, booking_id) VALUES (?, ?)`).run(settlementId, b.id);
    }
    audit(req.user.id, "SETTLEMENT_CREATE", "settlement", settlementId, { societyId, totalAmount, bookingCount: bookings.length });
    ok(res, mapSettlement(db.prepare(`SELECT * FROM settlements WHERE id = ?`).get(settlementId)), null, 201);
  })
);

router.get(
  "/settlements",
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`SELECT * FROM settlements ORDER BY created_at DESC`).all();
    ok(res, rows.map(mapSettlement));
  })
);

// ── Audit log viewer ──────────────────────────────────────────────────────
router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`SELECT al.*, u.name as actor_name FROM audit_logs al JOIN users u ON u.id = al.actor_user_id ORDER BY al.created_at DESC LIMIT 200`).all();
    ok(res, rows.map((r) => ({ ...mapAuditLog(r), actorName: r.actor_name })));
  })
);

// ── CSV export for analytics (government/Ministry reporting) ─────────────
router.get(
  "/analytics/export.csv",
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT b.id, sc.name as category, b.status, b.is_emergency, b.estimated_price, b.worker_payout, b.welfare_share, b.platform_share, b.created_at, a.city
         FROM bookings b JOIN service_categories sc ON sc.id = b.category_id JOIN addresses a ON a.id = b.address_id
         ORDER BY b.created_at DESC`
      )
      .all();
    const header = "booking_id,category,status,is_emergency,estimated_price,worker_payout,welfare_share,platform_share,created_at,city";
    const csvRows = rows.map((r) =>
      [r.id, r.category, r.status, r.is_emergency, r.estimated_price, r.worker_payout || "", r.welfare_share || "", r.platform_share || "", r.created_at, r.city].join(",")
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=sahakarsetu_bookings_report.csv");
    res.send([header, ...csvRows].join("\n"));
  })
);

// ── City / district rollup (Ministry-facing geographic reporting) ────────
router.get(
  "/analytics/by-city",
  asyncHandler(async (req, res) => {
    const rows = db
      .prepare(
        `SELECT a.city, COUNT(*) as bookings, COALESCE(SUM(b.estimated_price),0) as revenue,
           SUM(CASE WHEN b.status='COMPLETED' THEN 1 ELSE 0 END) as completed
         FROM bookings b JOIN addresses a ON a.id = b.address_id GROUP BY a.city ORDER BY bookings DESC`
      )
      .all();
    ok(res, rows);
  })
);

export default router;
