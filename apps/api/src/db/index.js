import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbPath = (process.env.DATABASE_URL || "file:./dev.db").replace(/^file:/, "");
const resolvedPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

export const db = new Database(resolvedPath);
db.pragma("journal_mode = DELETE"); // simple, single-file durability across short-lived processes (seed, server, tests)
db.pragma("foreign_keys = ON");

const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf-8");
db.exec(schema);

// ── migrations: idempotent ALTER TABLE additions ──────────────────────────
// SQLite has no "ADD COLUMN IF NOT EXISTS", so each addition is guarded by
// checking pragma table_info first. Safe to run on every boot.
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}
function addColumn(table, column, definition) {
  if (!columnExists(table, column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumn("worker_profiles", "current_latitude", "REAL");
addColumn("worker_profiles", "current_longitude", "REAL");
addColumn("worker_profiles", "location_updated_at", "TEXT");
addColumn("worker_profiles", "bank_account_last4", "TEXT");
addColumn("worker_profiles", "bank_ifsc", "TEXT");
addColumn("worker_profiles", "bank_account_holder", "TEXT");
addColumn("worker_profiles", "suspension_reason", "TEXT");

addColumn("certifications", "status", "TEXT NOT NULL DEFAULT 'PENDING'");
addColumn("certifications", "document_url", "TEXT");
addColumn("certifications", "review_note", "TEXT");

addColumn("bookings", "completion_photo_url", "TEXT");
addColumn("bookings", "is_recurring", "INTEGER NOT NULL DEFAULT 0");
addColumn("bookings", "recurrence_interval_days", "INTEGER");
addColumn("bookings", "parent_booking_id", "TEXT");
addColumn("bookings", "tax_amount", "REAL NOT NULL DEFAULT 0");
addColumn("bookings", "settlement_id", "TEXT");

addColumn("payments", "refunded_at", "TEXT");
addColumn("payments", "refund_reason", "TEXT");

addColumn("users", "society_id", "TEXT");
addColumn("users", "accessibility_mode", "TEXT NOT NULL DEFAULT 'default'");

// SOCIETY_ADMIN is a new role value; SQLite CHECK constraints on the original
// `role` column would reject it, so widen the constraint by rebuilding if needed.
const roleCheckHasSocietyAdmin = db
  .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`)
  .get().sql.includes("INSTITUTION");
if (!roleCheckHasSocietyAdmin) {
  db.exec(`
    CREATE TABLE users_new (
      id TEXT PRIMARY KEY, phone TEXT UNIQUE NOT NULL, email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('CUSTOMER','WORKER','ADMIN','SOCIETY_ADMIN','INSTITUTION','SUPER_ADMIN')),
      name TEXT NOT NULL, preferred_language TEXT NOT NULL DEFAULT 'en',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      society_id TEXT, accessibility_mode TEXT NOT NULL DEFAULT 'default'
    );
    INSERT INTO users_new SELECT id, phone, email, password_hash, role, name, preferred_language, is_active, created_at, updated_at, society_id, accessibility_mode FROM users;
    DROP TABLE users;
    ALTER TABLE users_new RENAME TO users;
    CREATE INDEX IF NOT EXISTS idx_users_society ON users(society_id);
  `);
}

export const id = () => crypto.randomUUID();
export const now = () => new Date().toISOString();
export const bool = (v) => (v ? 1 : 0);

export function audit(actorUserId, action, entityType, entityId, details) {
  db.prepare(
    `INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id(), actorUserId, action, entityType, entityId || null, details ? JSON.stringify(details) : null, now());
}

// ── entity mappers: snake_case DB rows -> camelCase API objects ──────────

export const mapUser = (r) =>
  r && {
    id: r.id, phone: r.phone, email: r.email, passwordHash: r.password_hash,
    role: r.role, name: r.name, preferredLanguage: r.preferred_language,
    isActive: !!r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
    societyId: r.society_id, accessibilityMode: r.accessibility_mode,
  };

export const mapCustomer = (r) => r && { id: r.id, userId: r.user_id, createdAt: r.created_at };

export const mapAddress = (r) =>
  r && {
    id: r.id, customerId: r.customer_id, label: r.label, line1: r.line1,
    city: r.city, state: r.state, pincode: r.pincode,
    latitude: r.latitude, longitude: r.longitude, isDefault: !!r.is_default,
    createdAt: r.created_at,
  };

export const mapFederation = (r) => r && { id: r.id, name: r.name, state: r.state, description: r.description };

export const mapSociety = (r) =>
  r && {
    id: r.id, federationId: r.federation_id, name: r.name, city: r.city,
    registrationNo: r.registration_no, contactPhone: r.contact_phone,
    welfareContributionPct: r.welfare_contribution_pct, platformFeePct: r.platform_fee_pct,
  };

export const mapCategory = (r) =>
  r && {
    id: r.id, name: r.name, slug: r.slug, icon: r.icon, description: r.description,
    baseRate: r.base_rate, emergencyEligible: !!r.emergency_eligible,
  };

export const mapSkill = (r) => r && { id: r.id, categoryId: r.category_id, name: r.name };

export const mapWorkerSkill = (r) =>
  r && { id: r.id, workerId: r.worker_id, skillId: r.skill_id, level: r.level, yearsExp: r.years_exp };

export const mapCertification = (r) =>
  r && {
    id: r.id, workerId: r.worker_id, title: r.title, issuingBody: r.issuing_body,
    issuedAt: r.issued_at, expiresAt: r.expires_at, verified: !!r.verified,
    status: r.status, documentUrl: r.document_url, reviewNote: r.review_note,
  };

export const mapWorker = (r) =>
  r && {
    id: r.id, userId: r.user_id, societyId: r.society_id, bio: r.bio, photoUrl: r.photo_url,
    homeCity: r.home_city, homeLatitude: r.home_latitude, homeLongitude: r.home_longitude,
    serviceRadiusKm: r.service_radius_km, languages: r.languages, experienceYears: r.experience_years,
    verificationStatus: r.verification_status, idDocumentRef: r.id_document_ref,
    isOnline: !!r.is_online, workingHoursStart: r.working_hours_start, workingHoursEnd: r.working_hours_end,
    currentLoad: r.current_load, ratingAvg: r.rating_avg, ratingCount: r.rating_count,
    jobsCompleted: r.jobs_completed, reliabilityScore: r.reliability_score, bankRef: r.bank_ref,
    createdAt: r.created_at, updatedAt: r.updated_at,
    currentLatitude: r.current_latitude, currentLongitude: r.current_longitude,
    locationUpdatedAt: r.location_updated_at, bankAccountLast4: r.bank_account_last4,
    bankIfsc: r.bank_ifsc, bankAccountHolder: r.bank_account_holder,
    suspensionReason: r.suspension_reason,
  };

export const mapWelfare = (r) =>
  r && {
    id: r.id, workerId: r.worker_id, enrolled: !!r.enrolled, policyProvider: r.policy_provider,
    policyNumber: r.policy_number, coverageAmount: r.coverage_amount,
    premiumPaidByCoop: !!r.premium_paid_by_coop, enrolledAt: r.enrolled_at,
  };

export const mapWelfareClaim = (r) =>
  r && {
    id: r.id, welfareId: r.welfare_id, reason: r.reason, amountClaimed: r.amount_claimed,
    status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at,
  };

export const mapBooking = (r) =>
  r && {
    id: r.id, customerId: r.customer_id, workerId: r.worker_id, categoryId: r.category_id,
    addressId: r.address_id, isEmergency: !!r.is_emergency, description: r.description,
    photoUrl: r.photo_url, scheduledAt: r.scheduled_at, status: r.status,
    estimatedPrice: r.estimated_price, finalPrice: r.final_price, workerPayout: r.worker_payout,
    welfareShare: r.welfare_share, platformShare: r.platform_share, matchScore: r.match_score,
    matchReason: r.match_reason, etaMinutes: r.eta_minutes, createdAt: r.created_at,
    updatedAt: r.updated_at, completedAt: r.completed_at, cancelledAt: r.cancelled_at,
    cancelReason: r.cancel_reason,
    completionPhotoUrl: r.completion_photo_url, isRecurring: !!r.is_recurring,
    recurrenceIntervalDays: r.recurrence_interval_days, parentBookingId: r.parent_booking_id,
    taxAmount: r.tax_amount, settlementId: r.settlement_id,
  };

export const mapBookingLog = (r) =>
  r && { id: r.id, bookingId: r.booking_id, status: r.status, note: r.note, createdAt: r.created_at };

export const mapPayment = (r) =>
  r && {
    id: r.id, bookingId: r.booking_id, amount: r.amount, method: r.method, status: r.status,
    transactionRef: r.transaction_ref, invoiceNo: r.invoice_no, paidAt: r.paid_at, createdAt: r.created_at,
    refundedAt: r.refunded_at, refundReason: r.refund_reason,
  };

export const mapReview = (r) =>
  r && {
    id: r.id, bookingId: r.booking_id, customerId: r.customer_id, workerId: r.worker_id,
    rating: r.rating, punctuality: r.punctuality, professionalism: r.professionalism,
    valueForMoney: r.value_for_money, comment: r.comment, createdAt: r.created_at,
  };

export const mapNotification = (r) =>
  r && {
    id: r.id, userId: r.user_id, bookingId: r.booking_id, title: r.title, body: r.body,
    channel: r.channel, isRead: !!r.is_read, createdAt: r.created_at,
  };

export const mapDemand = (r) =>
  r && {
    id: r.id, categoryId: r.category_id, city: r.city, zone: r.zone, date: r.date,
    hour: r.hour, requestCount: r.request_count,
  };

export const mapGrievance = (r) =>
  r && {
    id: r.id, bookingId: r.booking_id, raisedByUserId: r.raised_by_user_id,
    againstWorkerId: r.against_worker_id, category: r.category, description: r.description,
    status: r.status, resolutionNote: r.resolution_note, isSos: !!r.is_sos,
    createdAt: r.created_at, resolvedAt: r.resolved_at,
  };

export const mapMessage = (r) =>
  r && {
    id: r.id, bookingId: r.booking_id, senderUserId: r.sender_user_id, body: r.body,
    createdAt: r.created_at, readAt: r.read_at,
  };

export const mapCustomerReview = (r) =>
  r && {
    id: r.id, bookingId: r.booking_id, workerId: r.worker_id, customerId: r.customer_id,
    rating: r.rating, comment: r.comment, createdAt: r.created_at,
  };

export const mapAuditLog = (r) =>
  r && {
    id: r.id, actorUserId: r.actor_user_id, action: r.action, entityType: r.entity_type,
    entityId: r.entity_id, details: r.details, createdAt: r.created_at,
  };

export const mapSettlement = (r) =>
  r && {
    id: r.id, societyId: r.society_id, periodStart: r.period_start, periodEnd: r.period_end,
    totalAmount: r.total_amount, bookingCount: r.booking_count, createdAt: r.created_at,
  };

export const mapInstitution = (r) =>
  r && {
    id: r.id, userId: r.user_id, orgName: r.org_name, orgType: r.org_type, city: r.city,
    latitude: r.latitude, longitude: r.longitude, contactDesignation: r.contact_designation,
    createdAt: r.created_at,
  };

export const mapContract = (r) =>
  r && {
    id: r.id, institutionId: r.institution_id, title: r.title, description: r.description,
    durationMonths: r.duration_months, slaResponseHours: r.sla_response_hours, status: r.status,
    awardedSocietyId: r.awarded_society_id, awardedQuotationId: r.awarded_quotation_id,
    createdAt: r.created_at, awardedAt: r.awarded_at,
  };

export const mapContractRequirement = (r) =>
  r && { id: r.id, contractId: r.contract_id, categoryId: r.category_id, workersNeeded: r.workers_needed, minExperienceYears: r.min_experience_years };

export const mapQuotation = (r) =>
  r && {
    id: r.id, contractId: r.contract_id, societyId: r.society_id, totalPrice: r.total_price,
    workersOffered: r.workers_offered, notes: r.notes, slaCommitmentHours: r.sla_commitment_hours,
    status: r.status, createdAt: r.created_at,
  };

export const mapCapacity = (r) =>
  r && {
    id: r.id, societyId: r.society_id, categoryId: r.category_id, totalWorkers: r.total_workers,
    availableWorkers: r.available_workers, updatedAt: r.updated_at,
  };

export const mapSharingRequest = (r) =>
  r && {
    id: r.id, requestingSocietyId: r.requesting_society_id, fulfillingSocietyId: r.fulfilling_society_id,
    categoryId: r.category_id, workersRequested: r.workers_requested, reason: r.reason,
    status: r.status, createdAt: r.created_at, resolvedAt: r.resolved_at,
  };

export const mapTrainingRecord = (r) =>
  r && {
    id: r.id, workerId: r.worker_id, title: r.title, provider: r.provider,
    completedAt: r.completed_at, status: r.status, createdAt: r.created_at,
  };

export const mapForecastSnapshot = (r) =>
  r && {
    id: r.id, societyId: r.society_id, categoryId: r.category_id, generatedAt: r.generated_at,
    next7Total: r.next7_total, weekOverWeekPct: r.week_over_week_pct, shortageWorkers: r.shortage_workers,
  };
