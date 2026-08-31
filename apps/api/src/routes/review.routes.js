import { Router } from "express";
import { z } from "zod";
import { db, id, now, mapBooking, mapCustomer } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate, requireRole("CUSTOMER"));

router.post(
  "/",
  validate(
    z.object({
      bookingId: z.string(),
      rating: z.number().min(1).max(5),
      punctuality: z.number().min(1).max(5).optional(),
      professionalism: z.number().min(1).max(5).optional(),
      valueForMoney: z.number().min(1).max(5).optional(),
      comment: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => {
    const { bookingId, rating, punctuality, professionalism, valueForMoney, comment } = req.body;
    const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(req.user.id));
    const booking = mapBooking(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId));
    if (!booking || booking.customerId !== customer.id) throw new AppError("Booking not found", 404);
    if (booking.status !== "COMPLETED") throw new AppError("You can only rate a completed service", 400);
    const existing = db.prepare(`SELECT * FROM reviews WHERE booking_id = ?`).get(bookingId);
    if (existing) throw new AppError("This booking has already been rated", 400);

    const reviewId = id();
    db.prepare(
      `INSERT INTO reviews (id, booking_id, customer_id, worker_id, rating, punctuality, professionalism, value_for_money, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(reviewId, bookingId, customer.id, booking.workerId, rating, punctuality ?? 5, professionalism ?? 5, valueForMoney ?? 5, comment || null, now());

    const agg = db.prepare(`SELECT AVG(rating) as avg, COUNT(*) as cnt FROM reviews WHERE worker_id = ?`).get(booking.workerId);
    db.prepare(`UPDATE worker_profiles SET rating_avg = ?, rating_count = ? WHERE id = ?`).run(agg.avg || rating, agg.cnt, booking.workerId);

    ok(res, db.prepare(`SELECT * FROM reviews WHERE id = ?`).get(reviewId), null, 201);
  })
);

export default router;
