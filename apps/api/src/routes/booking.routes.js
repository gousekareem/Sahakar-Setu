import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import * as ctrl from "../controllers/booking.controller.js";

const router = Router();
router.use(authenticate);

const bookingSchema = z.object({
  categoryId: z.string(),
  addressId: z.string(),
  scheduledAt: z.string(),
  description: z.string().optional(),
  photoUrl: z.string().optional(),
  isEmergency: z.boolean().optional(),
  preferredWorkerId: z.string().optional(),
});

router.post("/", requireRole("CUSTOMER"), validate(bookingSchema), ctrl.create);
router.post(
  "/emergency",
  requireRole("CUSTOMER"),
  validate(bookingSchema.omit({ scheduledAt: true, isEmergency: true })),
  ctrl.emergency
);
router.get("/", requireRole("CUSTOMER"), ctrl.list);
router.get("/:id", ctrl.getOne);
router.patch(
  "/:id/status",
  validate(z.object({ status: z.string(), reason: z.string().optional() })),
  ctrl.setStatus
);

export default router;
