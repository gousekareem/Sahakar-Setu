import { db, id, now, mapBooking, mapPayment, mapCategory, mapWorker, mapUser, mapCustomer, mapAddress } from "../db/index.js";
import { AppError } from "../utils/AppError.js";

// Demo payment provider abstraction. In production this would be swapped
// for a real gateway (Razorpay/UPI PSP) behind the same interface — see
// ARCHITECTURE.md "Provider abstraction" section.
function demoProviderCharge() {
  return { success: true, ref: `DEMO-${Date.now()}-${Math.floor(Math.random() * 10000)}` };
}

export async function pay(bookingId, customerUserId, { method }) {
  const booking = mapBooking(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId));
  if (!booking) throw new AppError("Booking not found", 404);
  const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(booking.customerId));
  if (customer.userId !== customerUserId) throw new AppError("Not authorized", 403);
  if (booking.status !== "COMPLETED") throw new AppError("You can only pay for a completed service", 400);
  const existingPayment = db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(bookingId);
  if (existingPayment) throw new AppError("This booking has already been paid", 400);

  const amount = booking.finalPrice || booking.estimatedPrice;
  const result = demoProviderCharge();
  const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
  const paymentId = id();
  const t = now();

  db.prepare(
    `INSERT INTO payments (id, booking_id, amount, method, status, transaction_ref, invoice_no, paid_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(paymentId, bookingId, amount, method, result.success ? "PAID" : "FAILED", result.ref, invoiceNo, result.success ? t : null, t);

  if (result.success) {
    db.prepare(`INSERT INTO notifications (id, user_id, booking_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(id(), customerUserId, bookingId, "Payment successful", `₹${amount} paid. Invoice ${invoiceNo} generated.`, t);
  }

  return mapPayment(db.prepare(`SELECT * FROM payments WHERE id = ?`).get(paymentId));
}

export async function getInvoice(bookingId) {
  const booking = mapBooking(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId));
  if (!booking) throw new AppError("Invoice not found", 404);
  const payment = mapPayment(db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(bookingId));
  if (!payment) throw new AppError("Invoice not found", 404);

  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(booking.categoryId));
  const address = mapAddress(db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(booking.addressId));
  const customerProfile = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(booking.customerId));
  const customerUser = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(customerProfile.userId));
  let worker = null;
  if (booking.workerId) {
    const w = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(booking.workerId));
    const wUser = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(w.userId));
    const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(w.societyId);
    worker = { ...w, user: { name: wUser.name }, society };
  }

  return { ...booking, payment, category, address, worker, customer: { name: customerUser.name } };
}

// Refund flow — admin-triggered, updates payment status and logs the reason.
export async function refund(bookingId, reason, actorUserId) {
  const payment = db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(bookingId);
  if (!payment) throw new AppError("No payment found for this booking", 404);
  if (payment.status !== "PAID") throw new AppError("Only a paid booking can be refunded", 400);
  db.prepare(`UPDATE payments SET status = 'REFUNDED', refunded_at = ?, refund_reason = ? WHERE id = ?`)
    .run(now(), reason, payment.id);
  db.prepare(`INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, 'PAYMENT_REFUND', 'payment', ?, ?, ?)`)
    .run(id(), actorUserId, payment.id, JSON.stringify({ reason }), now());
  return mapPayment(db.prepare(`SELECT * FROM payments WHERE id = ?`).get(payment.id));
}
