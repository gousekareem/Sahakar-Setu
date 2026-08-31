import { db, mapWorker, mapUser, mapSociety, mapCertification } from "../db/index.js";
import { distanceKm, estimateEtaMinutes } from "../utils/geo.js";

/**
 * AI Workforce Allocation Engine.
 *
 * Scores every verified worker who has the requested skill category against
 * a weighted set of factors, and returns a ranked list with a human-readable
 * explanation for each score — this is what powers "Recommended because
 * worker is nearby, certified, available and has low current workload" on
 * the customer app and the Admin AI Insights page.
 *
 * Weights (sum to 1.0):
 *   distance       0.30  (closer is better, normalized against service radius)
 *   rating         0.20
 *   availability   0.15  (online now)
 *   workload       0.15  (lower current load is better)
 *   experience     0.10
 *   certification  0.10  (has a verified certification)
 */
const WEIGHTS = { distance: 0.3, rating: 0.2, availability: 0.15, workload: 0.15, experience: 0.1, certification: 0.1 };

export async function findAndScoreWorkers({ categoryId, latitude, longitude, isEmergency = false, limit = 10 }) {
  const rows = db
    .prepare(
      `SELECT DISTINCT wp.* FROM worker_profiles wp
       JOIN worker_skills ws ON ws.worker_id = wp.id
       JOIN skills sk ON sk.id = ws.skill_id
       WHERE sk.category_id = ? AND wp.verification_status = 'VERIFIED'`
    )
    .all(categoryId);

  const scored = rows
    .map(mapWorker)
    .map((w) => {
      const workerLat = w.currentLatitude ?? w.homeLatitude;
      const workerLng = w.currentLongitude ?? w.homeLongitude;
      const distance = distanceKm(latitude, longitude, workerLat, workerLng);
      const effectiveRadius = isEmergency ? Math.max(w.serviceRadiusKm, 20) : w.serviceRadiusKm;
      const inRadius = distance <= effectiveRadius;
      if (!inRadius) return null;

      const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(w.userId));
      const society = mapSociety(db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(w.societyId));
      const certs = db.prepare(`SELECT * FROM certifications WHERE worker_id = ?`).all(w.id).map(mapCertification);

      const distanceScore = clamp01(1 - distance / Math.max(effectiveRadius, 1));
      const ratingScore = clamp01(w.ratingAvg / 5);
      const availabilityScore = w.isOnline ? 1 : isEmergency ? 0.4 : 0;
      const workloadScore = clamp01(1 - w.currentLoad / 4);
      const experienceScore = clamp01(w.experienceYears / 10);
      const hasCert = certs.some((c) => c.verified);
      const certScore = hasCert ? 1 : 0.4;

      const score =
        distanceScore * WEIGHTS.distance +
        ratingScore * WEIGHTS.rating +
        availabilityScore * WEIGHTS.availability +
        workloadScore * WEIGHTS.workload +
        experienceScore * WEIGHTS.experience +
        certScore * WEIGHTS.certification;

      const reasons = [];
      if (distance <= 3) reasons.push(`${distance.toFixed(1)} km away`);
      if (w.isOnline) reasons.push("available now");
      if (hasCert) reasons.push("certified");
      if (w.ratingAvg >= 4.5) reasons.push(`${w.ratingAvg.toFixed(1)}★ rating`);
      if (w.experienceYears >= 3) reasons.push(`${w.experienceYears}+ yrs experience`);
      if (w.currentLoad === 0) reasons.push("low current workload");

      return {
        workerId: w.id,
        name: user?.name,
        photoUrl: w.photoUrl,
        society: society?.name,
        latitude: w.currentLatitude ?? w.homeLatitude,
        longitude: w.currentLongitude ?? w.homeLongitude,
        distanceKm: round1(distance),
        etaMinutes: estimateEtaMinutes(distance),
        rating: w.ratingAvg,
        ratingCount: w.ratingCount,
        jobsCompleted: w.jobsCompleted,
        experienceYears: w.experienceYears,
        isOnline: w.isOnline,
        verified: w.verificationStatus === "VERIFIED",
        matchScore: Math.round(score * 100),
        matchReason: reasons.length ? reasons.join(", ") : "Matches requested skill",
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);

  return scored;
}

function clamp01(n) { return Math.max(0, Math.min(1, n)); }
function round1(n) { return Math.round(n * 10) / 10; }
