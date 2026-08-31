import { Router } from "express";
import { z } from "zod";
import { db, id, now, audit, mapGrievance, mapBooking } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate);

// Customer or worker reports an issue on a booking — "report a worker/service
// issue" from the brief. is_sos flags it for urgent admin attention.
router.post(
  "/",
  validate(
    z.object({
      bookingId: z.string().optional(),
      againstWorkerId: z.string().optional(),
      category: z.string().min(2),
      description: z.string().min(3),
      isSos: z.boolean().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { bookingId, againstWorkerId, category, description, isSos } = req.body;
    const grievanceId = id();
    db.prepare(
      `INSERT INTO grievances (id, booking_id, raised_by_user_id, against_worker_id, category, description, status, is_sos, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)`
    ).run(grievanceId, bookingId || null, req.user.id, againstWorkerId || null, category, description, isSos ? 1 : 0, now());

    // SOS reports also raise an immediate high-priority notification visible to admins.
    if (isSos) {
      const admins = db.prepare(`SELECT id FROM users WHERE role IN ('ADMIN','SOCIETY_ADMIN')`).all();
      for (const a of admins) {
        db.prepare(`INSERT INTO notifications (id, user_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)`)
          .run(id(), a.id, "🚨 SOS Alert", `${category}: ${description}`, now());
      }
    }
    ok(res, mapGrievance(db.prepare(`SELECT * FROM grievances WHERE id = ?`).get(grievanceId)), null, 201);
  })
);

router.get(
  "/mine",
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`SELECT * FROM grievances WHERE raised_by_user_id = ? ORDER BY created_at DESC`).all(req.user.id);
    ok(res, rows.map(mapGrievance));
  })
);

router.get(
  "/",
  requireRole("ADMIN", "SOCIETY_ADMIN"),
  asyncHandler(async (req, res) => {
    const { status } = req.query;
    const rows = status
      ? db.prepare(`SELECT * FROM grievances WHERE status = ? ORDER BY is_sos DESC, created_at DESC`).all(status)
      : db.prepare(`SELECT * FROM grievances ORDER BY is_sos DESC, created_at DESC`).all();
    ok(res, rows.map(mapGrievance));
  })
);

router.patch(
  "/:id",
  requireRole("ADMIN", "SOCIETY_ADMIN"),
  validate(z.object({ status: z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]), resolutionNote: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const existing = db.prepare(`SELECT * FROM grievances WHERE id = ?`).get(req.params.id);
    if (!existing) throw new AppError("Grievance not found", 404);
    const resolvedAt = ["RESOLVED", "DISMISSED"].includes(req.body.status) ? now() : existing.resolved_at;
    db.prepare(`UPDATE grievances SET status = ?, resolution_note = ?, resolved_at = ? WHERE id = ?`)
      .run(req.body.status, req.body.resolutionNote || null, resolvedAt, req.params.id);
    audit(req.user.id, "GRIEVANCE_STATUS_CHANGE", "grievance", req.params.id, { status: req.body.status });
    ok(res, mapGrievance(db.prepare(`SELECT * FROM grievances WHERE id = ?`).get(req.params.id)));
  })
);

export default router;
