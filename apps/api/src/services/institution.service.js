import { db, id, now, mapInstitution, mapContract, mapContractRequirement, mapQuotation, mapSociety, mapCategory, audit } from "../db/index.js";
import { AppError } from "../utils/AppError.js";

export async function registerInstitution(userId, { orgName, orgType, city, latitude, longitude, contactDesignation }) {
  const existing = db.prepare(`SELECT id FROM institutions WHERE user_id = ?`).get(userId);
  if (existing) throw new AppError("An institution profile already exists for this account", 409);
  const instId = id();
  db.prepare(
    `INSERT INTO institutions (id, user_id, org_name, org_type, city, latitude, longitude, contact_designation, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(instId, userId, orgName, orgType, city, latitude ?? null, longitude ?? null, contactDesignation || null, now());
  return mapInstitution(db.prepare(`SELECT * FROM institutions WHERE id = ?`).get(instId));
}

function getInstitutionByUserId(userId) {
  const inst = mapInstitution(db.prepare(`SELECT * FROM institutions WHERE user_id = ?`).get(userId));
  if (!inst) throw new AppError("Institution profile not found — please complete registration", 404);
  return inst;
}

export async function myInstitution(userId) {
  return getInstitutionByUserId(userId);
}

// "An apartment association posts: 20 electricians + 10 plumbers required for 3 months."
export async function postContract(userId, { title, description, durationMonths, slaResponseHours, requirements }) {
  const institution = getInstitutionByUserId(userId);
  if (!requirements?.length) throw new AppError("At least one skill requirement is needed", 400);

  const contractId = id();
  db.prepare(
    `INSERT INTO contracts (id, institution_id, title, description, duration_months, sla_response_hours, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)`
  ).run(contractId, institution.id, title, description || null, durationMonths, slaResponseHours ?? 24, now());

  for (const r of requirements) {
    db.prepare(
      `INSERT INTO contract_requirements (id, contract_id, category_id, workers_needed, min_experience_years) VALUES (?, ?, ?, ?, ?)`
    ).run(id(), contractId, r.categoryId, r.workersNeeded, r.minExperienceYears ?? 0);
  }
  return getContractDetail(contractId);
}

export async function getContractDetail(contractId) {
  const contract = mapContract(db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(contractId));
  if (!contract) throw new AppError("Contract not found", 404);
  const requirements = db
    .prepare(`SELECT * FROM contract_requirements WHERE contract_id = ?`)
    .all(contractId)
    .map(mapContractRequirement)
    .map((r) => ({ ...r, category: mapCategory(db.prepare(`SELECT * FROM service_categories WHERE id = ?`).get(r.categoryId)) }));
  const quotations = db
    .prepare(`SELECT * FROM quotations WHERE contract_id = ? ORDER BY total_price ASC`)
    .all(contractId)
    .map(mapQuotation)
    .map((q) => ({ ...q, society: mapSociety(db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(q.societyId)) }));
  const institution = mapInstitution(db.prepare(`SELECT * FROM institutions WHERE id = ?`).get(contract.institutionId));
  return { ...contract, requirements, quotations, institution };
}

export async function myContracts(userId) {
  const institution = getInstitutionByUserId(userId);
  const rows = db.prepare(`SELECT id FROM contracts WHERE institution_id = ? ORDER BY created_at DESC`).all(institution.id);
  return Promise.all(rows.map((r) => getContractDetail(r.id)));
}

// Open contracts any cooperative society admin can browse and quote on.
export async function openContracts() {
  const rows = db.prepare(`SELECT id FROM contracts WHERE status IN ('OPEN','QUOTED') ORDER BY created_at DESC`).all();
  return Promise.all(rows.map((r) => getContractDetail(r.id)));
}

export async function submitQuotation(societyId, contractId, { totalPrice, workersOffered, notes, slaCommitmentHours }, actorUserId) {
  const contract = db.prepare(`SELECT * FROM contracts WHERE id = ?`).get(contractId);
  if (!contract) throw new AppError("Contract not found", 404);
  if (!["OPEN", "QUOTED"].includes(contract.status)) throw new AppError("This contract is no longer accepting quotations", 400);

  const quoteId = id();
  db.prepare(
    `INSERT INTO quotations (id, contract_id, society_id, total_price, workers_offered, notes, sla_commitment_hours, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?)`
  ).run(quoteId, contractId, societyId, totalPrice, workersOffered, notes || null, slaCommitmentHours, now());

  db.prepare(`UPDATE contracts SET status = 'QUOTED' WHERE id = ? AND status = 'OPEN'`).run(contractId);
  audit(actorUserId, "QUOTATION_SUBMITTED", "contract", contractId, { societyId, totalPrice });
  return mapQuotation(db.prepare(`SELECT * FROM quotations WHERE id = ?`).get(quoteId));
}

export async function awardContract(contractId, quotationId, institutionUserId) {
  const institution = getInstitutionByUserId(institutionUserId);
  const contract = db.prepare(`SELECT * FROM contracts WHERE id = ? AND institution_id = ?`).get(contractId, institution.id);
  if (!contract) throw new AppError("Contract not found", 404);
  const quotation = db.prepare(`SELECT * FROM quotations WHERE id = ? AND contract_id = ?`).get(quotationId, contractId);
  if (!quotation) throw new AppError("Quotation not found", 404);

  db.prepare(`UPDATE contracts SET status = 'AWARDED', awarded_society_id = ?, awarded_quotation_id = ?, awarded_at = ? WHERE id = ?`)
    .run(quotation.society_id, quotationId, now(), contractId);
  db.prepare(`UPDATE quotations SET status = 'AWARDED' WHERE id = ?`).run(quotationId);
  db.prepare(`UPDATE quotations SET status = 'REJECTED' WHERE contract_id = ? AND id != ?`).run(contractId, quotationId);

  return getContractDetail(contractId);
}
