import { db, id, now, mapBooking, mapCategory, mapCustomer, mapUser, mapWorker, mapAddress } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { findAndScoreWorkers } from "./matching.service.js";
import { estimatePrice, computeFairWageSplit } from "../utils/pricing.js";
import { recalculateReliability } from "./worker.service.js";

const TRANSITIONS = {
  PENDING: ["MATCHING", "CANCELLED"],
  MATCHING: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["ON_THE_WAY", "CANCELLED"],
  ON_THE_WAY: ["ARRIVED", "CANCELLED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  DISPUTED: ["COMPLETED", "CANCELLED"],
};

function notify(userId, bookingId, title, body) {
  db.prepare(`INSERT INTO notifications (id, user_id, booking_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id(), userId, bookingId, title, body, now());
}

function logStatus(bookingId, status, note = null) {
  db.prepare(`INSERT INTO booking_status_logs (id, booking_id, status, note, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(id(), bookingId, status, note, now());
}

// Writes a real demand_records row for every booking request, so the AI
// forecasting engine (forecast.service.js) learns from actual live platform
// usage over time, not only the historical seed backfill.
function recordDemand(categoryId, address) {
  const d = new Date();
  const date = d.toISOString().slice(0, 10);
  const hour = d.getHours();
  const city = address.city;
  const zone = "Zone A"; // single-zone-per-city simplification; see AI.md for the multi-zone upgrade path
  const existing = db
    .prepare(`SELECT id, request_count FROM demand_records WHERE category_id = ? AND city = ? AND zone = ? AND date = ? AND hour = ?`)
    .get(categoryId, city, zone, date, hour);
  if (existing) {
    db.prepare(`UPDATE demand_records SET request_count = request_count + 1 WHERE id = ?`).run(existing.id);
  } else {
    db.prepare(`INSERT INTO demand_records (id, category_id, city, zone, date, hour, request_count) VALUES (?, ?, ?, ?, ?, ?, 1)`)
      .run(id(), categoryId, city, zone, date, hour);
  }
}

export async function createBooking(customerUserId, payload) {
  const { categoryId, addressId, scheduledAt, description, photoUrl, isEmergency, preferredWorkerId } = payload;

  const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(customerUserId));
  if (!customer) throw new AppError("Customer profile not found", 404);

  const address = mapAddress(db.prepare(`SELECT * FROM addresses WHERE id = ? AND customer_id = ?`).get(addressId, customer.id));
  if (!address) throw new AppError("Address not found", 404);

  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(categoryId));
  if (!category) throw new AppError("Service category not found", 404);

  const estimatedPrice = estimatePrice(category, !!isEmergency);
  const bookingId = id();
  const t = now();

  db.prepare(
    `INSERT INTO bookings
      (id, customer_id, category_id, address_id, scheduled_at, description, photo_url, is_emergency, estimated_price, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'MATCHING', ?, ?)`
  ).run(bookingId, customer.id, categoryId, addressId, new Date(scheduledAt).toISOString(), description || null, photoUrl || null, isEmergency ? 1 : 0, estimatedPrice, t, t);
  logStatus(bookingId, "PENDING");
  logStatus(bookingId, "MATCHING");
  recordDemand(categoryId, address);

  const matches = await findAndScoreWorkers({
    categoryId, latitude: address.latitude, longitude: address.longitude,
    isEmergency: !!isEmergency, limit: 5,
  });

  if (matches.length === 0) {
    return { booking: enrichBooking(bookingId), matches: [] };
  }

  const chosen = preferredWorkerId ? matches.find((m) => m.workerId === preferredWorkerId) || matches[0] : matches[0];
  const worker = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(chosen.workerId));
  const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(worker.societyId);
  const split = computeFairWageSplit(estimatedPrice, {
    welfareContributionPct: society.welfare_contribution_pct,
    platformFeePct: society.platform_fee_pct,
  });

  db.prepare(
    `UPDATE bookings SET worker_id = ?, status = 'ASSIGNED', match_score = ?, match_reason = ?, eta_minutes = ?,
       worker_payout = ?, welfare_share = ?, platform_share = ?, updated_at = ? WHERE id = ?`
  ).run(worker.id, chosen.matchScore, chosen.matchReason, chosen.etaMinutes, split.workerPayout, split.welfareShare, split.platformShare, now(), bookingId);
  logStatus(bookingId, "ASSIGNED", chosen.matchReason);

  db.prepare(`INSERT INTO allocation_logs (id, booking_id, worker_id, score, distance_km, reason, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id(), bookingId, worker.id, chosen.matchScore, chosen.distanceKm, chosen.matchReason, now());
  db.prepare(`UPDATE worker_profiles SET current_load = current_load + 1 WHERE id = ?`).run(worker.id);

  const workerUser = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(worker.userId));
  notify(worker.userId, bookingId, "New job request", `${category.name} booking assigned to you — ETA ${chosen.etaMinutes} min.`);
  notify(customerUserId, bookingId, "Worker assigned", `${workerUser.name} has been assigned to your ${category.name} booking.`);

  return { booking: enrichBooking(bookingId), matches };
}

export async function transition(bookingId, actorUserId, actorRole, nextStatus, extra = {}) {
  const row = db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId);
  if (!row) throw new AppError("Booking not found", 404);
  const booking = mapBooking(row);
  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(booking.categoryId));
  const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(booking.customerId));

  authorizeTransition(booking, actorRole, nextStatus);

  const allowed = TRANSITIONS[booking.status] || [];
  if (!allowed.includes(nextStatus)) {
    throw new AppError(`Cannot move booking from ${booking.status} to ${nextStatus}`, 400);
  }

  const fields = ["status = ?", "updated_at = ?"];
  const values = [nextStatus, now()];
  if (nextStatus === "CANCELLED") {
    fields.push("cancelled_at = ?", "cancel_reason = ?");
    values.push(now(), extra.reason || "Not specified");
  }
  if (nextStatus === "COMPLETED") {
    fields.push("completed_at = ?", "final_price = ?");
    values.push(now(), booking.estimatedPrice);
  }
  values.push(bookingId);
  db.prepare(`UPDATE bookings SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  logStatus(bookingId, nextStatus, extra.reason || null);

  if (booking.workerId && ["COMPLETED", "CANCELLED"].includes(nextStatus)) {
    db.prepare(`UPDATE worker_profiles SET current_load = MAX(current_load - 1, 0) WHERE id = ?`).run(booking.workerId);
    recalculateReliability(booking.workerId);
  }
  if (nextStatus === "COMPLETED" && booking.workerId) {
    db.prepare(`UPDATE worker_profiles SET jobs_completed = jobs_completed + 1 WHERE id = ?`).run(booking.workerId);
    notify(customer.userId, bookingId, "Service completed", `Your ${category.name} booking is complete. Please pay & rate your worker.`);
  }
  if (nextStatus === "ACCEPTED") {
    notify(customer.userId, bookingId, "Worker on the job", `Your worker has accepted the ${category.name} booking.`);
  }
  if (nextStatus === "ON_THE_WAY") {
    notify(customer.userId, bookingId, "Worker on the way", `Arriving in about ${booking.etaMinutes || 15} minutes.`);
  }

  return enrichBooking(bookingId);
}

function authorizeTransition(booking, actorRole, nextStatus) {
  if (actorRole === "ADMIN") return;
  if (actorRole === "WORKER") {
    const workerTransitions = ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"];
    if (!workerTransitions.includes(nextStatus)) throw new AppError("Workers cannot perform this transition", 403);
    return;
  }
  if (actorRole === "CUSTOMER") {
    if (nextStatus !== "CANCELLED") throw new AppError("Customers can only cancel bookings", 403);
    return;
  }
  throw new AppError("Not authorized", 403);
}

function enrichBooking(bookingId) {
  const booking = mapBooking(db.prepare(`SELECT * FROM bookings WHERE id = ?`).get(bookingId));
  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(booking.categoryId));
  const address = mapAddress(db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(booking.addressId));
  const customerProfile = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(booking.customerId));
  const customerUser = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(customerProfile.userId));
  let worker = null;
  if (booking.workerId) {
    const w = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(booking.workerId));
    const wUser = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(w.userId));
    const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(w.societyId);
    worker = { ...w, user: { name: wUser.name, phone: wUser.phone }, society };
  }
  const statusHistory = db.prepare(`SELECT * FROM booking_status_logs WHERE booking_id = ? ORDER BY created_at ASC`).all(bookingId);
  const payment = db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(bookingId) || null;
  const review = db.prepare(`SELECT * FROM reviews WHERE booking_id = ?`).get(bookingId) || null;

  return {
    ...booking, category, address, worker,
    customer: { name: customerUser.name, phone: customerUser.phone },
    statusHistory, payment, review,
  };
}

export async function getBooking(bookingId) {
  const exists = db.prepare(`SELECT id FROM bookings WHERE id = ?`).get(bookingId);
  if (!exists) throw new AppError("Booking not found", 404);
  return enrichBooking(bookingId);
}

export async function myBookings(customerUserId, status) {
  const customer = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(customerUserId));
  if (!customer) throw new AppError("Customer profile not found", 404);
  const rows = status
    ? db.prepare(`SELECT id FROM bookings WHERE customer_id = ? AND status = ? ORDER BY created_at DESC`).all(customer.id, status)
    : db.prepare(`SELECT id FROM bookings WHERE customer_id = ? ORDER BY created_at DESC`).all(customer.id);
  return rows.map((r) => enrichBooking(r.id));
}

export async function emergencyRequest(customerUserId, payload) {
  return createBooking(customerUserId, { ...payload, isEmergency: true, scheduledAt: new Date().toISOString() });
}
