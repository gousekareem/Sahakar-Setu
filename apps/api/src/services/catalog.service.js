import { db, mapCategory, mapSkill, mapSociety, mapFederation } from "../db/index.js";

export async function listCategories() {
  const categories = db.prepare(`SELECT * FROM service_categories ORDER BY name ASC`).all().map(mapCategory);
  const skills = db.prepare(`SELECT * FROM skills`).all().map(mapSkill);
  return categories.map((c) => ({ ...c, skills: skills.filter((s) => s.categoryId === c.id) }));
}

// Real emergency-type list, driven by the emergencyEligible flag on each
// category — replaces the previously hardcoded 4-item list in the frontend.
export async function listEmergencyCategories() {
  const rows = db.prepare(`SELECT * FROM service_categories WHERE emergency_eligible = 1 ORDER BY name ASC`).all();
  return rows.map(mapCategory);
}

export async function listSocieties() {
  const societies = db.prepare(`SELECT * FROM cooperative_societies ORDER BY name ASC`).all().map(mapSociety);
  const federations = db.prepare(`SELECT * FROM federations`).all().map(mapFederation);
  return societies.map((s) => ({ ...s, federation: federations.find((f) => f.id === s.federationId) }));
}

// Public, real-time platform trust metrics — replaces any hardcoded landing-page numbers.
export async function publicStats() {
  const verifiedWorkers = db.prepare(`SELECT COUNT(*) c FROM worker_profiles WHERE verification_status = 'VERIFIED'`).get().c;
  const societies = db.prepare(`SELECT COUNT(*) c FROM cooperative_societies`).get().c;
  const completedServices = db.prepare(`SELECT COUNT(*) c FROM bookings WHERE status = 'COMPLETED'`).get().c;
  const distinctCities = db.prepare(`SELECT COUNT(DISTINCT home_city) c FROM worker_profiles`).get().c;
  const avgRatingRow = db.prepare(`SELECT AVG(rating_avg) a FROM worker_profiles WHERE rating_count > 0`).get();

  // Real fair-wage example computed from actual data instead of a hardcoded illustration.
  const avgPriceRow = db.prepare(`SELECT AVG(estimated_price) a FROM bookings`).get();
  const avgSociety = db.prepare(`SELECT AVG(welfare_contribution_pct) w, AVG(platform_fee_pct) p FROM cooperative_societies`).get();
  const examplePrice = Math.round(avgPriceRow.a || 500);
  const welfarePct = avgSociety.w || 8;
  const platformPct = avgSociety.p || 8;
  const welfareShare = Math.round((examplePrice * welfarePct) / 100);
  const platformShare = Math.round((examplePrice * platformPct) / 100);
  const workerShare = examplePrice - welfareShare - platformShare;

  return {
    verifiedWorkers,
    cooperativeSocieties: societies,
    servicesCompleted: completedServices,
    citiesCovered: distinctCities,
    avgWorkerRating: Math.round((avgRatingRow.a || 0) * 10) / 10,
    fairWageExample: {
      customerPays: examplePrice,
      workerReceives: workerShare,
      welfareContribution: welfareShare,
      platformOperations: platformShare,
      welfarePct: Math.round(welfarePct * 10) / 10,
      platformPct: Math.round(platformPct * 10) / 10,
    },
  };
}
