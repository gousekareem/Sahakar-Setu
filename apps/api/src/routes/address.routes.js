import { Router } from "express";
import { z } from "zod";
import { db, id, now, mapCustomer, mapAddress } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate, requireRole("CUSTOMER"));

const addressSchema = z.object({
  label: z.string().min(1),
  line1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(4),
  latitude: z.number(),
  longitude: z.number(),
  isDefault: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(req.user.id));
    const rows = db.prepare(`SELECT * FROM addresses WHERE customer_id = ? ORDER BY created_at DESC`).all(customer.id);
    ok(res, rows.map(mapAddress));
  })
);

router.post(
  "/",
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(req.user.id));
    if (!customer) throw new AppError("Customer profile not found", 404);
    const b = req.body;
    if (b.isDefault) {
      db.prepare(`UPDATE addresses SET is_default = 0 WHERE customer_id = ?`).run(customer.id);
    }
    const addressId = id();
    db.prepare(
      `INSERT INTO addresses (id, customer_id, label, line1, city, state, pincode, latitude, longitude, is_default, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(addressId, customer.id, b.label, b.line1, b.city, b.state, b.pincode, b.latitude, b.longitude, b.isDefault ? 1 : 0, now());
    ok(res, mapAddress(db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(addressId)), null, 201);
  })
);

export default router;
