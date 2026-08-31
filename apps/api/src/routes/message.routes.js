import { Router } from "express";
import { z } from "zod";
import { db, id, now, mapMessage, mapBooking, mapCustomer } from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate);

// Booking-scoped chat. Authorization: only the customer or the assigned
// worker on that specific booking (or an admin) may read/send messages.
function assertParticipant(bookingId, user) {
  const booking = mapBooking(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId));
  if (!booking) throw new AppError("Booking not found", 404);
  if (user.role === "ADMIN" || user.role === "SOCIETY_ADMIN") return booking;

  const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(booking.customerId));
  const isCustomer = customer?.userId === user.id;
  const worker = booking.workerId ? db.prepare(`SELECT user_id FROM worker_profiles WHERE id = ?`).get(booking.workerId) : null;
  const isWorker = worker?.user_id === user.id;
  if (!isCustomer && !isWorker) throw new AppError("Not authorized to view this conversation", 403);
  return booking;
}

router.get(
  "/:bookingId",
  asyncHandler(async (req, res) => {
    assertParticipant(req.params.bookingId, req.user);
    const rows = db.prepare(`SELECT * FROM messages WHERE booking_id = ? ORDER BY created_at ASC`).all(req.params.bookingId);
    ok(res, rows.map(mapMessage));
  })
);

router.post(
  "/:bookingId",
  validate(z.object({ body: z.string().min(1).max(1000) })),
  asyncHandler(async (req, res) => {
    assertParticipant(req.params.bookingId, req.user);
    const messageId = id();
    db.prepare(`INSERT INTO messages (id, booking_id, sender_user_id, body, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(messageId, req.params.bookingId, req.user.id, req.body.body, now());
    ok(res, mapMessage(db.prepare(`SELECT * FROM messages WHERE id = ?`).get(messageId)), null, 201);
  })
);

export default router;
