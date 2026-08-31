-- SahakarSetu database schema (SQLite for zero-config demo).
-- Swap-ready for Postgres in production — see DATABASE.md.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('CUSTOMER','WORKER','ADMIN')),
  name TEXT NOT NULL,
  preferred_language TEXT NOT NULL DEFAULT 'en',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  line1 TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  pincode TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS federations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state TEXT NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cooperative_societies (
  id TEXT PRIMARY KEY,
  federation_id TEXT NOT NULL REFERENCES federations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  registration_no TEXT UNIQUE NOT NULL,
  contact_phone TEXT NOT NULL,
  welfare_contribution_pct REAL NOT NULL DEFAULT 8,
  platform_fee_pct REAL NOT NULL DEFAULT 8,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS service_categories (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT NOT NULL DEFAULT 'wrench',
  description TEXT,
  base_rate REAL NOT NULL,
  emergency_eligible INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS worker_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  society_id TEXT NOT NULL REFERENCES cooperative_societies(id),
  bio TEXT,
  photo_url TEXT,
  home_city TEXT NOT NULL,
  home_latitude REAL NOT NULL,
  home_longitude REAL NOT NULL,
  service_radius_km REAL NOT NULL DEFAULT 6,
  languages TEXT NOT NULL DEFAULT 'en',
  experience_years REAL NOT NULL DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED','SUSPENDED')),
  id_document_ref TEXT,
  is_online INTEGER NOT NULL DEFAULT 0,
  working_hours_start TEXT NOT NULL DEFAULT '08:00',
  working_hours_end TEXT NOT NULL DEFAULT '20:00',
  current_load INTEGER NOT NULL DEFAULT 0,
  rating_avg REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  jobs_completed INTEGER NOT NULL DEFAULT 0,
  reliability_score REAL NOT NULL DEFAULT 90,
  bank_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS worker_skills (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'BASIC' CHECK (level IN ('BASIC','SKILLED','EXPERT')),
  years_exp REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (worker_id, skill_id)
);

CREATE TABLE IF NOT EXISTS certifications (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issuing_body TEXT NOT NULL,
  issued_at TEXT NOT NULL,
  expires_at TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocked_dates (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS welfare_profiles (
  id TEXT PRIMARY KEY,
  worker_id TEXT UNIQUE NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  enrolled INTEGER NOT NULL DEFAULT 0,
  policy_provider TEXT NOT NULL DEFAULT 'Cooperative Welfare Fund (Demo)',
  policy_number TEXT,
  coverage_amount REAL NOT NULL DEFAULT 200000,
  premium_paid_by_coop INTEGER NOT NULL DEFAULT 1,
  enrolled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS welfare_claims (
  id TEXT PRIMARY KEY,
  welfare_id TEXT NOT NULL REFERENCES welfare_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  amount_claimed REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','UNDER_REVIEW','APPROVED','REJECTED','SETTLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id),
  worker_id TEXT REFERENCES worker_profiles(id),
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  address_id TEXT NOT NULL REFERENCES addresses(id),
  is_emergency INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  photo_url TEXT,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN
    ('PENDING','MATCHING','ASSIGNED','ACCEPTED','ON_THE_WAY','ARRIVED','IN_PROGRESS','COMPLETED','CANCELLED','DISPUTED')),
  estimated_price REAL NOT NULL,
  final_price REAL,
  worker_payout REAL,
  welfare_share REAL,
  platform_share REAL,
  match_score REAL,
  match_reason TEXT,
  eta_minutes INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  cancelled_at TEXT,
  cancel_reason TEXT
);

CREATE TABLE IF NOT EXISTS booking_status_logs (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS allocation_logs (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  score REAL NOT NULL,
  distance_km REAL NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('UPI','CARD','NETBANKING','WALLET','CASH')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
  transaction_ref TEXT UNIQUE NOT NULL,
  invoice_no TEXT UNIQUE NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id),
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id),
  rating INTEGER NOT NULL,
  punctuality INTEGER NOT NULL DEFAULT 5,
  professionalism INTEGER NOT NULL DEFAULT 5,
  value_for_money INTEGER NOT NULL DEFAULT 5,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'in_app',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS demand_records (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  city TEXT NOT NULL,
  zone TEXT NOT NULL,
  date TEXT NOT NULL,
  hour INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);

-- Worker verification history (item: admin action audit for verification changes)
CREATE TABLE IF NOT EXISTS worker_verification_logs (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reason TEXT,
  actor_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Grievance / complaint queue (customer or worker can report an issue on a booking)
CREATE TABLE IF NOT EXISTS grievances (
  id TEXT PRIMARY KEY,
  booking_id TEXT REFERENCES bookings(id) ON DELETE CASCADE,
  raised_by_user_id TEXT NOT NULL REFERENCES users(id),
  against_worker_id TEXT REFERENCES worker_profiles(id),
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','UNDER_REVIEW','RESOLVED','DISMISSED')),
  resolution_note TEXT,
  is_sos INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

-- In-app chat, scoped to a booking
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL REFERENCES users(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  read_at TEXT
);

-- Worker rates customer (two-way trust)
CREATE TABLE IF NOT EXISTS customer_reviews (
  id TEXT PRIMARY KEY,
  booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id),
  customer_id TEXT NOT NULL REFERENCES customer_profiles(id),
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Admin action audit log
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Booking settlement batches (weekly payout runs)
CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES cooperative_societies(id),
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_amount REAL NOT NULL,
  booking_count INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by_user_id TEXT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settlement_bookings (
  settlement_id TEXT NOT NULL REFERENCES settlements(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES bookings(id),
  PRIMARY KEY (settlement_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_grievances_status ON grievances(status);
CREATE INDEX IF NOT EXISTS idx_messages_booking ON messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);


-- ── Schema additions (round 2: dynamic data, trust & safety, ops depth) ──
-- SQLite ALTER TABLE ADD COLUMN is idempotent-unsafe (errors if column exists),
-- so these are executed conditionally in db/index.js's migrate() step instead
-- of unconditionally here. See db/index.js.

-- ── Institutional contracts & inter-cooperative capacity network ─────────
-- (added for the "cooperative workforce operating system" pivot)

CREATE TABLE IF NOT EXISTS institutions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  org_type TEXT NOT NULL, -- apartment | college | hospital | municipal | company | government | other
  city TEXT NOT NULL,
  latitude REAL,
  longitude REAL,
  contact_designation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_months REAL NOT NULL,
  sla_response_hours REAL NOT NULL DEFAULT 24,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','QUOTED','AWARDED','ACTIVE','COMPLETED','CANCELLED')),
  awarded_society_id TEXT REFERENCES cooperative_societies(id),
  awarded_quotation_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  awarded_at TEXT
);

CREATE TABLE IF NOT EXISTS contract_requirements (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  workers_needed INTEGER NOT NULL,
  min_experience_years REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  contract_id TEXT NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  society_id TEXT NOT NULL REFERENCES cooperative_societies(id),
  total_price REAL NOT NULL,
  workers_offered INTEGER NOT NULL,
  notes TEXT,
  sla_commitment_hours REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','SHORTLISTED','AWARDED','REJECTED','WITHDRAWN')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Snapshot of each society's available (idle, verified, online-eligible)
-- capacity per skill category — refreshed on demand by
-- cooperativeIntelligence.service.js, not just at seed time.
CREATE TABLE IF NOT EXISTS cooperative_capacity (
  id TEXT PRIMARY KEY,
  society_id TEXT NOT NULL REFERENCES cooperative_societies(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE,
  total_workers INTEGER NOT NULL DEFAULT 0,
  available_workers INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (society_id, category_id)
);

CREATE TABLE IF NOT EXISTS capacity_sharing_requests (
  id TEXT PRIMARY KEY,
  requesting_society_id TEXT NOT NULL REFERENCES cooperative_societies(id),
  fulfilling_society_id TEXT REFERENCES cooperative_societies(id),
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  workers_requested INTEGER NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','OFFERED','ACCEPTED','DECLINED','FULFILLED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS training_records (
  id TEXT PRIMARY KEY,
  worker_id TEXT NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'National Council for Cooperative Training (NCCT)',
  completed_at TEXT,
  status TEXT NOT NULL DEFAULT 'RECOMMENDED' CHECK (status IN ('RECOMMENDED','ENROLLED','COMPLETED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Persisted forecast snapshots (so the "predicted shortage" story is backed
-- by a stored record, not only computed fresh on every request)
CREATE TABLE IF NOT EXISTS forecasts (
  id TEXT PRIMARY KEY,
  society_id TEXT REFERENCES cooperative_societies(id),
  category_id TEXT NOT NULL REFERENCES service_categories(id),
  generated_at TEXT NOT NULL DEFAULT (datetime('now')),
  next7_total INTEGER NOT NULL,
  week_over_week_pct REAL NOT NULL,
  shortage_workers INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_contracts_institution ON contracts(institution_id);
CREATE INDEX IF NOT EXISTS idx_quotations_contract ON quotations(contract_id);
CREATE INDEX IF NOT EXISTS idx_capacity_society ON cooperative_capacity(society_id);
CREATE INDEX IF NOT EXISTS idx_sharing_requests_status ON capacity_sharing_requests(status);
