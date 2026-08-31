import { db, mapWorker, mapUser, mapCategory, mapCertification } from "../db/index.js";
import { AppError } from "../utils/AppError.js";

export async function dashboardOverview() {
  const totalWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles`).get().c;
  const verifiedWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles WHERE verification_status = 'VERIFIED'`).get().c;
  const activeWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles WHERE is_online = 1`).get().c;
  const totalCustomers = db.prepare(`SELECT COUNT(*) c FROM customer_profiles`).get().c;
  const todaysBookings = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE date(created_at) = date('now')`).get().c;
  const completedServices = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status = 'COMPLETED'`).get().c;
  const emergencyRequests = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE is_emergency = 1`).get().c;
  const welfareBeneficiaries = db.prepare(`SELECT COUNT(*) c FROM welfare_profiles WHERE enrolled = 1`).get().c;
  const totalRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) s FROM payments WHERE status = 'PAID'`).get().s;
  const totalWorkerPayouts = db.prepare(`SELECT COALESCE(SUM(worker_payout),0) s FROM bookings WHERE status = 'COMPLETED'`).get().s;

  return { totalWorkers, verifiedWorkers, activeWorkers, totalCustomers, todaysBookings, completedServices, emergencyRequests, welfareBeneficiaries, totalRevenue, totalWorkerPayouts };
}

export async function listWorkers({ status, search }) {
  let query = `SELECT wp.* FROM worker_profiles wp JOIN users u ON u.id = wp.user_id WHERE 1=1`;
  const params = [];
  if (status) { query += ` AND wp.verification_status = ?`; params.push(status); }
  if (search) { query += ` AND u.name LIKE ?`; params.push(`%${search}%`); }
  query += ` ORDER BY wp.created_at DESC`;

  const rows = db.prepare(query).all(...params).map(mapWorker);
  return rows.map((w) => {
    const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(w.userId));
    const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(w.societyId);
    const skills = db
      .prepare(`SELECT ws.*, sk.name as skill_name FROM worker_skills ws JOIN skills sk ON sk.id = ws.skill_id WHERE ws.worker_id = ?`)
      .all(w.id);
    const certifications = db.prepare(`SELECT * FROM certifications WHERE worker_id = ?`).all(w.id).map(mapCertification);
    return { ...w, user: { name: user.name, phone: user.phone }, society, skills, certifications };
  });
}

export async function verifyWorker(workerId, status) {
  const valid = ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED", "SUSPENDED"];
  if (!valid.includes(status)) throw new AppError("Invalid verification status", 400);
  const worker = db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(workerId);
  if (!worker) throw new AppError("Worker not found", 404);
  db.prepare(`UPDATE worker_profiles SET verification_status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, workerId);
  return mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(workerId));
}

export async function listBookings({ status, isEmergency }) {
  let query = `SELECT * FROM bookings WHERE 1=1`;
  const params = [];
  if (status) { query += ` AND status = ?`; params.push(status); }
  if (isEmergency) { query += ` AND is_emergency = 1`; }
  query += ` ORDER BY created_at DESC LIMIT 200`;
  const rows = db.prepare(query).all(...params);

  return rows.map((row) => {
    const category = mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(row.category_id));
    const address = db.prepare(`SELECT * FROM addresses WHERE id = ?`).get(row.address_id);
    const customerProfile = db.prepare(`SELECT * FROM customer_profiles WHERE id = ?`).get(row.customer_id);
    const customerUser = customerProfile ? db.prepare(`SELECT * FROM users WHERE id = ?`).get(customerProfile.user_id) : null;
    let worker = null;
    if (row.worker_id) {
      const w = db.prepare(`SELECT * FROM worker_profiles WHERE id = ?`).get(row.worker_id);
      const wUser = w ? db.prepare(`SELECT * FROM users WHERE id = ?`).get(w.user_id) : null;
      worker = wUser ? { id: w.id, name: wUser.name } : null;
    }
    const payment = db.prepare(`SELECT * FROM payments WHERE booking_id = ?`).get(row.id) || null;
    return {
      id: row.id, status: row.status, isEmergency: !!row.is_emergency, estimatedPrice: row.estimated_price,
      scheduledAt: row.scheduled_at, createdAt: row.created_at, category, address,
      customer: customerUser ? { name: customerUser.name } : null, worker, payment,
    };
  });
}

export async function demandHeatmap() {
  const rows = db
    .prepare(
      `SELECT b.is_emergency, b.status, a.latitude as lat, a.longitude as lng, sc.name as category
       FROM bookings b JOIN addresses a ON a.id = b.address_id JOIN service_categories sc ON sc.id = b.category_id
       ORDER BY b.created_at DESC LIMIT 500`
    )
    .all();
  return rows.map((r) => ({ lat: r.lat, lng: r.lng, category: r.category, isEmergency: !!r.is_emergency, status: r.status }));
}

export async function analytics() {
  const byCategory = db
    .prepare(
      `SELECT sc.name as category, COUNT(*) as count FROM bookings b JOIN service_categories sc ON sc.id = b.category_id GROUP BY sc.id`
    )
    .all();

  const byStatus = db.prepare(`SELECT status, COUNT(*) as count FROM bookings GROUP BY status`).all();

  const byDay = db
    .prepare(
      `SELECT date(created_at) as date, COUNT(*) as bookings, COALESCE(SUM(estimated_price),0) as revenue
       FROM bookings WHERE created_at >= datetime('now', '-14 day') GROUP BY date(created_at) ORDER BY date ASC`
    )
    .all();

  const avgRating = db.prepare(`SELECT AVG(rating_avg) as avg FROM worker_profiles WHERE rating_count > 0`).get();

  return {
    bookingsByCategory: byCategory,
    bookingsByStatus: byStatus,
    bookingsOverTime: byDay,
    avgWorkerRating: Math.round((avgRating.avg || 0) * 10) / 10,
  };
}

export async function cooperativeHierarchy() {
  const federations = db.prepare(`SELECT * FROM federations`).all();
  const societies = db.prepare(`SELECT * FROM cooperative_societies`).all();
  const workerCounts = db.prepare(`SELECT society_id, COUNT(*) as c FROM worker_profiles GROUP BY society_id`).all();

  return federations.map((f) => ({
    id: f.id, name: f.name, state: f.state,
    societies: societies
      .filter((s) => s.federation_id === f.id)
      .map((s) => ({
        id: s.id, name: s.name, city: s.city,
        workerCount: workerCounts.find((w) => w.society_id === s.id)?.c || 0,
      })),
  }));
}
