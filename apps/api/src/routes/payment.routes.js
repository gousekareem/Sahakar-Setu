import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as paymentService from "../services/payment.service.js";

const router = Router();
router.use(authenticate);

router.post(
  "/:bookingId",
  requireRole("CUSTOMER"),
  validate(z.object({ method: z.enum(["UPI", "CARD", "NETBANKING", "WALLET", "CASH"]) })),
  asyncHandler(async (req, res) => {
    ok(res, await paymentService.pay(req.params.bookingId, req.user.id, req.body), null, 201);
  })
);

router.get(
  "/:bookingId/invoice",
  asyncHandler(async (req, res) => {
    ok(res, await paymentService.getInvoice(req.params.bookingId));
  })
);

router.post(
  "/:bookingId/refund",
  requireRole("ADMIN", "SUPER_ADMIN", "SOCIETY_ADMIN"),
  validate(z.object({ reason: z.string().min(3) })),
  asyncHandler(async (req, res) => {
    ok(res, await paymentService.refund(req.params.bookingId, req.body.reason, req.user.id));
  })
);

export default router;
