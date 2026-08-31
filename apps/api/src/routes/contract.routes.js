import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as institutionService from "../services/institution.service.js";
import { db } from "../db/index.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate);

// Open contracts any cooperative society admin (or platform admin) can browse.
router.get(
  "/open",
  requireRole("SOCIETY_ADMIN", "ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => ok(res, await institutionService.openContracts()))
);

router.get("/:id", asyncHandler(async (req, res) => ok(res, await institutionService.getContractDetail(req.params.id))));

router.post(
  "/:id/quote",
  requireRole("SOCIETY_ADMIN"),
  validate(
    z.object({
      totalPrice: z.number().positive(),
      workersOffered: z.number().int().positive(),
      notes: z.string().optional(),
      slaCommitmentHours: z.number().positive(),
    })
  ),
  asyncHandler(async (req, res) => {
    const admin = db.prepare(`SELECT society_id FROM users WHERE id = ?`).get(req.user.id);
    if (!admin?.society_id) throw new AppError("Your account is not linked to a cooperative society", 400);
    ok(res, await institutionService.submitQuotation(admin.society_id, req.params.id, req.body, req.user.id), null, 201);
  })
);

export default router;
