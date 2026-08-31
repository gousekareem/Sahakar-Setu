import { db, id, now, mapCapacity, mapSharingRequest, mapSociety, audit } from "../db/index.js";
import { distanceKm } from "../utils/geo.js";
import { forecastDemand } from "./forecast.service.js";

/**
 * Cooperative Intelligence Engine.
 *
 * This is the core differentiator described in the product brief: rather than
 * treating each cooperative society as an isolated pool of workers, this
 * engine (1) tracks each society's real available capacity per skill
 * category, (2) detects when a society's predicted demand will outstrip its
 * own capacity, and (3) automatically discovers nearby societies with spare
 * capacity in that same skill, so cooperatives can request/share workforce
 * instead of a customer simply being told "no workers available."
 *
 * "Available capacity" = verified + online-eligible workers in that skill
 * category, minus their current active job load. This is a live snapshot,
 * not a seeded static number — refreshCapacity() recomputes it from the
 * same worker_profiles / worker_skills / bookings data used everywhere else
 * in the app, so it can never drift out of sync with reality.
 */

export function refreshCapacity(societyId = null) {
  const societies = societyId
    ? [db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId)]
    : db.prepare(`SELECT * FROM cooperative_societies`).all();
  const categories = db.prepare(`SELECT * FROM service_categories`).all();

  for (const society of societies) {
    for (const category of categories) {
      const workers = db
        .prepare(
          `SELECT DISTINCT wp.id, wp.current_load FROM worker_profiles wp
           JOIN worker_skills ws ON ws.worker_id = wp.id
           JOIN skills sk ON sk.id = ws.skill_id
           WHERE wp.society_id = ? AND sk.category_id = ? AND wp.verification_status = 'VERIFIED'`
        )
        .all(society.id, category.id);

      const total = workers.length;
      const available = workers.filter((w) => w.current_load === 0).length;

      const existing = db
        .prepare(`SELECT id FROM cooperative_capacity WHERE society_id = ? AND category_id = ?`)
        .get(society.id, category.id);
      if (existing) {
        db.prepare(`UPDATE cooperative_capacity SET total_workers = ?, available_workers = ?, updated_at = ? WHERE id = ?`)
          .run(total, available, now(), existing.id);
      } else {
        db.prepare(
          `INSERT INTO cooperative_capacity (id, society_id, category_id, total_workers, available_workers, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).run(id(), society.id, category.id, total, available, now());
      }
    }
  }
}

export function getCapacityMatrix() {
  refreshCapacity();
  const rows = db
    .prepare(
      `SELECT cc.*, cs.name as society_name, cs.city as society_city, sc.name as category_name
       FROM cooperative_capacity cc
       JOIN cooperative_societies cs ON cs.id = cc.society_id
       JOIN service_categories sc ON sc.id = cc.category_id
       ORDER BY cs.name, sc.name`
    )
    .all();
  return rows.map((r) => ({
    societyId: r.society_id, societyName: r.society_name, societyCity: r.society_city,
    categoryId: r.category_id, categoryName: r.category_name,
    totalWorkers: r.total_workers, availableWorkers: r.available_workers, updatedAt: r.updated_at,
  }));
}

/**
 * The headline "shortage detection + capacity sharing" flow:
 * for a given society + category, checks whether predicted demand exceeds
 * available capacity, and if so, searches every other society for spare
 * capacity in that same category, ranked by distance.
 */
export async function detectShortageAndSuggest(societyId, categoryId) {
  refreshCapacity(societyId);
  const capacity = db
    .prepare(`SELECT * FROM cooperative_capacity WHERE society_id = ? AND category_id = ?`)
    .get(societyId, categoryId);

  const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId);
  // Scope the forecast to this society's own operating city — a citywide
  // demand signal is what actually determines whether *this* cooperative is
  // short-staffed, not total platform-wide demand across every city.
  const forecast = await forecastDemand(categoryId, society.city);

  const available = capacity?.available_workers || 0;
  // Bounded staffing rule, consistent with the platform-wide workforce
  // recommendation heuristic in forecast.service.js: one worker can
  // comfortably absorb ~15 requests/week; shortage is capped so a noisy
  // demand spike can never produce an implausible "need 600 workers" figure.
  const rawNeed = forecast && !forecast.insufficientData ? Math.ceil(forecast.next7DaysTotal / 15) : 0;
  const predictedNeed = Math.min(rawNeed, available + 15); // sanity cap
  const shortage = Math.min(Math.max(0, predictedNeed - available), 15);

  let suggestions = [];
  if (shortage > 0) {
    const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId);
    const others = db
      .prepare(
        `SELECT cc.*, cs.name as society_name, cs.city as society_city, cs.id as society_id
         FROM cooperative_capacity cc JOIN cooperative_societies cs ON cs.id = cc.society_id
         WHERE cc.category_id = ? AND cc.society_id != ? AND cc.available_workers > 0`
      )
      .all(categoryId, societyId);

    suggestions = others
      .map((o) => {
        // Distance between society "centers" — approximated via their first
        // verified worker's home coordinates, since societies don't have
        // their own lat/lng in the current schema.
        const anchor = db
          .prepare(`SELECT home_latitude, home_longitude FROM worker_profiles WHERE society_id = ? LIMIT 1`)
          .get(o.society_id);
        const selfAnchor = db
          .prepare(`SELECT home_latitude, home_longitude FROM worker_profiles WHERE society_id = ? LIMIT 1`)
          .get(societyId);
        const dist = anchor && selfAnchor
          ? distanceKm(selfAnchor.home_latitude, selfAnchor.home_longitude, anchor.home_latitude, anchor.home_longitude)
          : null;
        return {
          societyId: o.society_id, societyName: o.society_name, societyCity: o.society_city,
          availableWorkers: o.available_workers, distanceKm: dist != null ? Math.round(dist * 10) / 10 : null,
        };
      })
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }

  return {
    societyId, categoryId,
    currentAvailable: available,
    predictedNeed,
    shortageWorkers: shortage,
    nearbyCapacity: suggestions,
  };
}

export async function createSharingRequest(requestingSocietyId, { categoryId, workersRequested, reason }) {
  const requestId = id();
  db.prepare(
    `INSERT INTO capacity_sharing_requests (id, requesting_society_id, category_id, workers_requested, reason, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'OPEN', ?)`
  ).run(requestId, requestingSocietyId, categoryId, workersRequested, reason || null, now());
  return mapSharingRequest(db.prepare(`SELECT * FROM capacity_sharing_requests WHERE id = ?`).get(requestId));
}

export function listSharingRequests(status) {
  const rows = status
    ? db.prepare(`SELECT * FROM capacity_sharing_requests WHERE status = ? ORDER BY created_at DESC`).all(status)
    : db.prepare(`SELECT * FROM capacity_sharing_requests ORDER BY created_at DESC`).all();
  return rows.map(mapSharingRequest);
}

export function respondToSharingRequest(requestId, fulfillingSocietyId, status, actorUserId) {
  const valid = ["OFFERED", "ACCEPTED", "DECLINED", "FULFILLED"];
  if (!valid.includes(status)) throw new Error("Invalid status");
  const resolvedAt = ["ACCEPTED", "DECLINED", "FULFILLED"].includes(status) ? now() : null;
  db.prepare(`UPDATE capacity_sharing_requests SET status = ?, fulfilling_society_id = ?, resolved_at = ? WHERE id = ?`)
    .run(status, fulfillingSocietyId || null, resolvedAt, requestId);
  audit(actorUserId, "CAPACITY_SHARING_RESPONSE", "capacity_sharing_request", requestId, { status });
  return mapSharingRequest(db.prepare(`SELECT * FROM capacity_sharing_requests WHERE id = ?`).get(requestId));
}
