import { db, id, mapWorker, mapUser, mapBooking, mapCategory, mapCustomer, mapWelfare } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { findAndScoreWorkers } from "./matching.service.js";

export async function nearbyWorkers({ categoryId, latitude, longitude, isEmergency }) {
  if (!categoryId || latitude == null || longitude == null) {
    throw new AppError("categoryId, latitude and longitude are required", 400);
  }
  return findAndScoreWorkers({
    categoryId, latitude: Number(latitude), longitude: Number(longitude),
    isEmergency: isEmergency === "true" || isEmergency === true,
  });
}

export async function getWorkerPublicProfile(workerId) {
  const worker = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(workerId));
  if (!worker) throw new AppError("Worker not found", 404);

  const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(worker.userId));
  const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(worker.societyId);
  const skills = db
    .prepare(
      `SELECT ws.*, sk.name as skill_name, sk.category_id as skill_category_id
       FROM worker_skills ws JOIN skills sk ON sk.id = ws.skill_id WHERE ws.worker_id = ?`
    )
    .all(workerId);
  const certifications = db.prepare(`SELECT * FROM certifications WHERE worker_id = ?`).all(workerId);

  return {
    ...worker,
    user: user ? { id: user.id, name: user.name, phone: user.phone } : null,
    society,
    skills: skills.map((s) => ({ id: s.id, level: s.level, yearsExp: s.years_exp, skillName: s.skill_name })),
    certifications: certifications.map((c) => ({
      id: c.id, title: c.title, issuingBody: c.issuing_body, verified: !!c.verified, issuedAt: c.issued_at,
    })),
  };
}

function getProfileByUserId(userId) {
  const worker = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE user_id = ?`).get(userId));
  if (!worker) throw new AppError("Worker profile not found", 404);
  return worker;
}

export async function dashboard(userId) {
  const worker = getProfileByUserId(userId);
  const todayStart = startOfDay(), todayEnd = endOfDay();

  const todaysJobs = db
    .prepare(`SELECT * FROM bookings WHERE worker_id = ? AND scheduled_at BETWEEN ? AND ?`)
    .all(worker.id, todayStart, todayEnd)
    .map((b) => enrichBooking(b));

  const upcomingJobsCount = db
    .prepare(
      `SELECT COUNT(*) as c FROM bookings WHERE worker_id = ? AND status IN ('ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS')`
    )
    .get(worker.id).c;

  const completedJobsCount = db.prepare(`SELECT COUNT(*) as c FROM bookings WHERE worker_id = ? AND status = 'COMPLETED'`).get(worker.id).c;

  const totalPayout = db.prepare(`SELECT COALESCE(SUM(worker_payout),0) as s FROM bookings WHERE worker_id = ? AND status = 'COMPLETED'`).get(worker.id).s;
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const weekly = db.prepare(`SELECT COALESCE(SUM(worker_payout),0) as s FROM bookings WHERE worker_id = ? AND status = 'COMPLETED' AND completed_at >= ?`).get(worker.id, weekAgo).s;
  const monthly = db.prepare(`SELECT COALESCE(SUM(worker_payout),0) as s FROM bookings WHERE worker_id = ? AND status = 'COMPLETED' AND completed_at >= ?`).get(worker.id, monthAgo).s;

  const welfare = db.prepare(`SELECT * FROM welfare_profiles WHERE worker_id = ?`).get(worker.id);

  return {
    worker,
    todaysJobs,
    upcomingJobsCount,
    completedJobsCount,
    earnings: { total: totalPayout, weekly, monthly },
    welfare: mapWelfare(welfare),
  };
}

function enrichBooking(row) {
  const b = mapBooking(row);
  const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(b.categoryId));
  const customerProfile = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(b.customerId));
  const customerUser = customerProfile ? mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(customerProfile.userId)) : null;
  const address = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(b.addressId);
  return { ...b, category, customer: customerUser ? { name: customerUser.name, phone: customerUser.phone } : null, address };
}

export async function setAvailability(userId, { isOnline, workingHoursStart, workingHoursEnd, serviceRadiusKm }) {
  const worker = getProfileByUserId(userId);
  const fields = [];
  const values = [];
  if (isOnline !== undefined) { fields.push("is_online = ?"); values.push(isOnline ? 1 : 0); }
  if (workingHoursStart) { fields.push("working_hours_start = ?"); values.push(workingHoursStart); }
  if (workingHoursEnd) { fields.push("working_hours_end = ?"); values.push(workingHoursEnd); }
  if (serviceRadiusKm !== undefined) { fields.push("service_radius_km = ?"); values.push(serviceRadiusKm); }
  fields.push("updated_at = ?"); values.push(new Date().toISOString());
  values.push(worker.id);
  db.prepare(`UPDATE worker_profiles SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(worker.id));
}

// Real-time-ish location update (polled from the worker app while online).
// In production this would come from device GPS; here the worker app exposes
// a "share my location" control that calls this with the browser's
// geolocation coordinates, or a manual simulate-movement control for demo
// purposes where GPS hardware isn't available.
export async function updateLocation(userId, { latitude, longitude }) {
  const worker = getProfileByUserId(userId);
  db.prepare(`UPDATE worker_profiles SET current_latitude = ?, current_longitude = ?, location_updated_at = ? WHERE id = ?`)
    .run(latitude, longitude, new Date().toISOString(), worker.id);
  return mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(worker.id));
}

export async function updateBankDetails(userId, { accountNumber, ifsc, accountHolder }) {
  const worker = getProfileByUserId(userId);
  const last4 = accountNumber ? String(accountNumber).slice(-4) : null;
  db.prepare(`UPDATE worker_profiles SET bank_account_last4 = ?, bank_ifsc = ?, bank_account_holder = ?, updated_at = ? WHERE id = ?`)
    .run(last4, ifsc || null, accountHolder || null, new Date().toISOString(), worker.id);
  return mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(worker.id));
}

// Recomputes the worker's reliability score from real job history:
// on-time arrival rate + completion (non-cancellation) rate, blended.
// Called after every booking status change that affects the worker's record.
export function recalculateReliability(workerId) {
  const total = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE worker_id = ? AND status IN ('COMPLETED','CANCELLED')`).get(workerId).c;
  if (total === 0) return; // no history yet — leave the default seeded score alone
  const completed = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE worker_id = ? AND status = 'COMPLETED'`).get(workerId).c;
  const completionRate = completed / total;

  // On-time rate: was the worker ACCEPTED status logged within 15 minutes of ASSIGNED?
  const rows = db
    .prepare(
      `SELECT b.id,
        (SELECT created_at FROM booking_status_logs WHERE booking_id = b.id AND status = 'ASSIGNED' ORDER BY created_at ASC LIMIT 1) as assigned_at,
        (SELECT created_at FROM booking_status_logs WHERE booking_id = b.id AND status = 'ACCEPTED' ORDER BY created_at ASC LIMIT 1) as accepted_at
       FROM bookings b WHERE b.worker_id = ? AND b.status = 'COMPLETED'`
    )
    .all(workerId);
  let onTimeCount = 0;
  let ratedCount = 0;
  for (const r of rows) {
    if (!r.assigned_at || !r.accepted_at) continue;
    ratedCount++;
    const minutes = (new Date(r.accepted_at) - new Date(r.assigned_at)) / 60000;
    if (minutes <= 15) onTimeCount++;
  }
  const onTimeRate = ratedCount > 0 ? onTimeCount / ratedCount : 1;

  const score = Math.round((completionRate * 0.6 + onTimeRate * 0.4) * 100);
  db.prepare(`UPDATE worker_profiles SET reliability_score = ? WHERE id = ?`).run(score, workerId);
}

export async function blockDate(userId, date, reason) {
  const worker = getProfileByUserId(userId);
  const rowId = id();
  db.prepare(`INSERT INTO blocked_dates (id, worker_id, date, reason) VALUES (?, ?, ?, ?)`).run(rowId, worker.id, date, reason || null);
  return { id: rowId, workerId: worker.id, date, reason };
}

export async function myJobs(userId, status) {
  const worker = getProfileByUserId(userId);
  const rows = status
    ? db.prepare(`SELECT * FROM bookings WHERE worker_id = ? AND status = ? ORDER BY scheduled_at DESC`).all(worker.id, status)
    : db.prepare(`SELECT * FROM bookings WHERE worker_id = ? ORDER BY scheduled_at DESC`).all(worker.id);
  return rows.map((b) => enrichBooking(b));
}

function startOfDay() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); }
function endOfDay() { const d = new Date(); d.setHours(23, 59, 59, 999); return d.toISOString(); }
