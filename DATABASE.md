# DATABASE.md

## Engine

SQLite via `better-sqlite3`, chosen for zero-config portability (no external database service to
stand up for a demo/judge environment) — see `ARCHITECTURE.md` for why this replaced the
originally-planned Prisma setup. The schema lives in `apps/api/src/db/schema.sql` as plain SQL and
is bootstrapped automatically on API startup (`db/index.js` runs it with `CREATE TABLE IF NOT
EXISTS` on every boot, so it's idempotent).

## Entity overview

```
federations 1--* cooperative_societies 1--* worker_profiles
users 1--1 customer_profiles 1--* addresses
users 1--1 worker_profiles 1--* worker_skills *--1 skills *--1 service_categories
worker_profiles 1--* certifications
worker_profiles 1--1 welfare_profiles 1--* welfare_claims
customer_profiles 1--* bookings *--1 worker_profiles
bookings 1--1 payments
bookings 1--1 reviews
bookings 1--* booking_status_logs
bookings 1--* allocation_logs (AI matching audit trail)
service_categories 1--* demand_records (AI forecasting input)
users 1--* notifications
```

## Key design decisions

- **IDs** are `TEXT` UUIDs (`crypto.randomUUID()`), not auto-increment integers — makes it safe to
  generate an ID client-side/service-side before insert (needed for the multi-row transactional
  inserts in booking creation and worker registration) and avoids ID-guessing.
- **Timestamps** are ISO-8601 strings (`TEXT`), consistent with what SQLite's `datetime('now')`
  produces and what JS `Date.toISOString()` produces — no timezone ambiguity.
- **Booleans** are stored as `INTEGER 0/1` (SQLite has no native boolean) and converted to real
  JS booleans in `db/index.js`'s row mappers (e.g. `isOnline: !!row.is_online`) so no
  service/controller code ever has to think about the 0/1 representation.
- **Money** (`base_rate`, `estimated_price`, `worker_payout`, etc.) is stored as `REAL`
  (floating-point) for simplicity in this demo. A production system handling real payments should
  switch to integer paise/cents to avoid floating-point rounding, or a `DECIMAL` type on Postgres.
- **The fair-wage split percentages** (`welfare_contribution_pct`, `platform_fee_pct`) live on
  `cooperative_societies`, not hardcoded anywhere in application code — each cooperative society
  can set its own rates, matching the brief's "configurable by the cooperative administrator"
  requirement. `worker_payout`/`welfare_share`/`platform_share` are then snapshotted onto the
  `bookings` row at assignment time, so a later change to a society's percentages never rewrites
  the pricing on historical bookings.
- **`allocation_logs`** is an audit trail, separate from the booking itself: every time the AI
  matching engine assigns a worker, the score, distance, and reason are recorded independently of
  the booking's current state — useful for later auditing "why did the AI pick this worker" even
  after the booking has moved through several more status changes.
- **`booking_status_logs`** gives a full timeline of every state transition a booking has been
  through, which powers the customer-facing live tracking UI.
- **Indexes** exist on the columns actually queried in hot paths: `bookings(customer_id)`,
  `bookings(worker_id)`, `bookings(status)`, `worker_skills(worker_id)`,
  `demand_records(category_id, date)`, `notifications(user_id)`.

## Migrating to Postgres for production

The schema was written in portable SQL specifically to make this migration low-effort:

1. Swap `better-sqlite3` for `pg` (or an ORM of choice — Prisma, Drizzle, Knex) in
   `apps/api/src/db/index.js`; the rest of the codebase talks to `db.prepare(...).run(...)` /
   `.get(...)` / `.all(...)`, so the cleanest path is writing a small adapter with the same three
   methods backed by `pg`, or migrating the schema into whichever ORM's migration format is
   preferred.
2. Change column types where SQLite was permissive: `TEXT` timestamps -> `TIMESTAMPTZ`, boolean
   `INTEGER` columns -> real `BOOLEAN`, money `REAL` -> `NUMERIC(10,2)`.
3. `CHECK (... IN (...))` constraints translate directly to Postgres `CHECK` constraints, or can
   become native Postgres `ENUM` types.
4. Foreign keys and indexes translate as-is.

## Re-seeding

`npm run seed` (or `node apps/api/src/db/seed.js` directly) wipes and repopulates every table —
safe to re-run at any time during development or before a demo to reset to a clean state.

## Phase 2/3 entity additions

Beyond the core marketplace tables described above, the following were added to support dynamic
data, trust & safety, and the cooperative workforce network:

```
grievances                 — customer/worker complaints, with an is_sos flag for urgent escalation
messages                   — booking-scoped in-app chat
customer_reviews           — worker-rates-customer (API-complete; frontend UI not yet built)
audit_logs                 — every sensitive admin/society-admin action, with actor + details
settlements / settlement_bookings  — weekly payout batch runs per cooperative society
worker_verification_logs   — full history of verification status changes, not just the current state

institutions                — apartment associations, colleges, hospitals, municipal bodies, companies
contracts / contract_requirements  — bulk workforce requirements posted by institutions
quotations                  — cooperative society bids on a contract
cooperative_capacity        — live snapshot of each society's total/available workers per category
capacity_sharing_requests   — inter-cooperative "I'm short, who has spare capacity" requests
training_records             — NCCT training recommendations/enrollment/completion per worker
forecasts                    — persisted forecast snapshots (schema present; not yet written to on a schedule — see "known limitations")
```

Several existing tables also gained columns via an idempotent migration system
(`apps/api/src/db/index.js`, since SQLite has no `ADD COLUMN IF NOT EXISTS`): worker live
location (`current_latitude`/`current_longitude`), masked bank details, certification
review status/documents, booking completion photos and recurring-booking fields, payment refund
fields, and a `society_id` + `accessibility_mode` on `users` (plus widening the `role` CHECK
constraint to add `SOCIETY_ADMIN`, `INSTITUTION`, and `SUPER_ADMIN` via a table-rebuild migration,
since SQLite cannot alter a CHECK constraint in place).
