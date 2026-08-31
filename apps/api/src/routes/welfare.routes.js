import { Router } from "express";
import { z } from "zod";
import { db, id, now, mapWorker, mapWelfare } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate, requireRole("WORKER"));

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const worker = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE user_id = ?`).get(req.user.id));
    const welfare = mapWelfare(db.prepare(`SELECT * FROM welfare_profiles WHERE worker_id = ?`).get(worker.id));
    const claims = welfare ? db.prepare(`SELECT * FROM welfare_claims WHERE welfare_id = ? ORDER BY created_at DESC`).all(welfare.id) : [];
    ok(res, { ...welfare, claims });
  })
);

router.post(
  "/me/claims",
  validate(z.object({ reason: z.string().min(3), amountClaimed: z.number().positive() })),
  asyncHandler(async (req, res) => {
    const worker = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE user_id = ?`).get(req.user.id));
    const welfare = mapWelfare(db.prepare(`SELECT * FROM welfare_profiles WHERE worker_id = ?`).get(worker.id));
    if (!welfare || !welfare.enrolled) throw new AppError("You are not enrolled in the welfare scheme yet", 400);
    const claimId = id();
    db.prepare(`INSERT INTO welfare_claims (id, welfare_id, reason, amount_claimed, status, created_at) VALUES (?, ?, ?, ?, 'SUBMITTED', ?)`)
      .run(claimId, welfare.id, req.body.reason, req.body.amountClaimed, now());
    ok(res, db.prepare(`SELECT * FROM welfare_claims WHERE id = ?`).get(claimId), null, 201);
  })
);

export default router;
