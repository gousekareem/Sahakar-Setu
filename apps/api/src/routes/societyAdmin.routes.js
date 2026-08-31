import { Router } from "express";
import { z } from "zod";
import { db, id, audit, mapWorker, mapCategory } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";
import * as coopIntel from "../services/cooperativeIntelligence.service.js";

const router = Router();
router.use(authenticate, requireRole("SOCIETY_ADMIN"));

function mySocietyId(req) {
  const row = db.prepare(`SELECT society_id FROM users WHERE id = ?`).get(req.user.id);
  if (!row?.society_id) throw new AppError("Your account is not linked to a cooperative society", 400);
  return row.society_id;
}

// "Cooperative Intelligence" dashboard cards: active workers, available
// capacity, active jobs, today's demand, predicted demand, skill gap, idle
// capacity, active contracts — all computed live from real data.
router.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    const activeWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles WHERE society_id = ? AND verification_status = 'VERIFIED'`).get(societyId).c;
    const onlineWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles WHERE society_id = ? AND is_online = 1`).get(societyId).c;
    const activeJobs = db
      .prepare(
        `SELECT COUNT(*) c FROM bookings b JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE wp.society_id = ? AND b.status IN ('ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS')`
      ).get(societyId).c;
    const todaysDemand = db
      .prepare(
        `SELECT COUNT(*) c FROM bookings b JOIN worker_profiles wp ON wp.id = b.worker_id
         WHERE wp.society_id = ? AND date(b.created_at) = date('now')`
      ).get(societyId).c;
    const activeContracts = db.prepare(`SELECT COUNT(*) c FROM contracts WHERE awarded_society_id = ? AND status IN ('AWARDED','ACTIVE')`).get(societyId).c;

    const capacity = coopIntel.getCapacityMatrix().filter((c) => c.societyId === societyId);
    const idleCapacity = capacity.reduce((sum, c) => sum + c.availableWorkers, 0);
    const skillGaps = capacity.filter((c) => c.totalWorkers === 0);

    ok(res, {
      activeWorkers, onlineWorkers, activeJobs, todaysDemand, activeContracts,
      idleCapacity, skillGapCategories: skillGaps.map((s) => s.categoryName),
      capacity,
    });
  })
);

router.get(
  "/workers",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    const rows = db.prepare(`SELECT * FROM worker_profiles WHERE society_id = ? ORDER BY created_at DESC`).all(societyId).map(mapWorker);
    const withUser = rows.map((w) => {
      const u = db.prepare(`SELECT name, phone FROM users WHERE id = ?`).get(w.userId);
      return { ...w, user: u };
    });
    ok(res, withUser);
  })
);

router.post(
  "/workers/:id/verify",
  validate(z.object({ status: z.string() })),
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    const worker = db.prepare(`SELECT * FROM worker_profiles WHERE id = ? AND society_id = ?`).get(req.params.id, societyId);
    if (!worker) throw new AppError("Worker not found in your cooperative", 404);
    db.prepare(`INSERT INTO worker_verification_logs (id, worker_id, from_status, to_status, reason, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id(), worker.id, worker.verification_status, req.body.status, req.body.reason || null, req.user.id, new Date().toISOString());
    db.prepare(`UPDATE worker_profiles SET verification_status = ?, suspension_reason = ?, updated_at = datetime('now') WHERE id = ?`)
      .run(req.body.status, req.body.status === "SUSPENDED" ? req.body.reason || null : null, worker.id);
    audit(req.user.id, "WORKER_VERIFY", "worker_profile", worker.id, { status: req.body.status });
    ok(res, mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(worker.id)));
  })
);

router.get(
  "/society",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    ok(res, db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId));
  })
);

// Society fee configuration — the "fair wage" percentages are editable here,
// not hardcoded, per the brief's "configurable by the cooperative administrator" requirement.
router.patch(
  "/fees",
  validate(z.object({ welfareContributionPct: z.number().min(0).max(50), platformFeePct: z.number().min(0).max(50) })),
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    db.prepare(`UPDATE cooperative_societies SET welfare_contribution_pct = ?, platform_fee_pct = ? WHERE id = ?`)
      .run(req.body.welfareContributionPct, req.body.platformFeePct, societyId);
    audit(req.user.id, "FEE_CONFIG_CHANGE", "cooperative_society", societyId, req.body);
    ok(res, db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId));
  })
);

// ── Capacity & shortage detection (federated cooperative network) ────────
router.get(
  "/capacity",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    ok(res, coopIntel.getCapacityMatrix().filter((c) => c.societyId === societyId));
  })
);

router.get(
  "/capacity/shortage/:categoryId",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    ok(res, await coopIntel.detectShortageAndSuggest(societyId, req.params.categoryId));
  })
);

router.post(
  "/capacity/sharing-requests",
  validate(z.object({ categoryId: z.string(), workersRequested: z.number().int().positive(), reason: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    ok(res, await coopIntel.createSharingRequest(societyId, req.body), null, 201);
  })
);

router.get(
  "/capacity/sharing-requests",
  asyncHandler(async (req, res) => ok(res, coopIntel.listSharingRequests(req.query.status)))
);

router.post(
  "/capacity/sharing-requests/:id/respond",
  validate(z.object({ status: z.enum(["OFFERED", "ACCEPTED", "DECLINED", "FULFILLED"]) })),
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    ok(res, coopIntel.respondToSharingRequest(req.params.id, societyId, req.body.status, req.user.id));
  })
);

// Contracts awarded to this society
router.get(
  "/contracts",
  asyncHandler(async (req, res) => {
    const societyId = mySocietyId(req);
    const rows = db.prepare(`SELECT id FROM contracts WHERE awarded_society_id = ? ORDER BY awarded_at DESC`).all(societyId);
    const institutionService = await import("../services/institution.service.js");
    ok(res, await Promise.all(rows.map((r) => institutionService.getContractDetail(r.id))));
  })
);

export default router;
