# ARCHITECTURE.md

## Overview

SahakarSetu is a conventional three-tier web application: a React SPA, a stateless JSON API, and
a relational database — chosen deliberately over anything more exotic so that the AI and
geo-spatial features (the actual differentiators for this problem statement) get the engineering
attention instead of infrastructure.

```
┌─────────────────┐      HTTPS/JSON       ┌──────────────────┐      SQL      ┌──────────────┐
│  React + Vite     │ ───────────────────▶ │  Express API      │ ────────────▶ │  SQLite (dev) │
│  (apps/web)        │ ◀─────────────────── │  (apps/api)        │ ◀──────────── │  / Postgres   │
└─────────────────┘      JWT bearer        └──────────────────┘               │  (prod path)  │
                                                     │                         └──────────────┘
                                                     ├── matching.service.js   (AI allocation)
                                                     ├── forecast.service.js   (AI forecasting)
                                                     ├── booking.service.js    (state machine)
                                                     └── payment.service.js    (provider abstraction)
```

## API layering

Each resource follows the same four-layer convention (the pattern reused from the original ZIP):

1. **routes/** — maps HTTP verb + path to a controller function, applies `authenticate` /
   `requireRole` / `validate` middleware.
2. **controllers/** — thin: pull params from `req`, call a service, wrap the result with
   `ok(res, data)`. No business logic lives here.
3. **services/** — all business logic: SQL queries, the AI engines, the booking state machine,
   pricing. Pure functions where possible, easy to unit test in isolation from Express.
4. **db/** — `schema.sql` (source of truth for the data model), `index.js` (connection + row
   mappers that translate `snake_case` SQL rows into `camelCase` JS objects), `seed.js`.

Errors are raised as `AppError(message, statusCode, details)` from anywhere in a service and
caught by a single Express error-handling middleware (`middlewares/errorHandler.js`), so
controllers never need `try/catch` boilerplate — `asyncHandler` forwards rejections automatically.

## Frontend layering

- **`api/client.js`** — one Axios instance, attaches the JWT from `localStorage` on every request,
  unwraps `{ success, data }` responses, and turns API error payloads into `Error` objects so
  pages can just `catch (err) { setError(err.message) }`.
- **`context/AuthContext.jsx`** — holds the current user, exposes `login`/`registerCustomer`/
  `registerWorker`/`logout`; persists the session in `localStorage` (a real deployment would move
  to httpOnly cookies — see Security below).
- **`components/ProtectedRoute.jsx`** — redirects to `/login` if unauthenticated, or `/` if the
  logged-in user's role doesn't match the route's required role. Used to give customers, workers,
  and admins entirely separate navigation trees from one shared app shell.
- **`i18n/I18nContext.jsx`** — a deliberately tiny translation layer (a `{lang: {key: value}}`
  dictionary plus a `t(key)` hook) rather than pulling in a full i18n framework. This keeps every
  page's JSX as the single source of truth for structure, with only user-facing strings swapped —
  which is exactly the "don't duplicate pages per language" requirement from the brief. Adding a
  new language is one new dictionary entry, not new files.
- **Pages are organized by role** (`pages/customer/*`, `pages/worker/*`, `pages/admin/*`) so each
  persona's app can be reasoned about independently, mirroring the way the product brief separates
  customer/worker/admin experiences.

## Provider abstraction (payments, and the pattern for everything else "pluggable")

`services/payment.service.js` isolates the actual charge behind one function,
`demoProviderCharge()`, which always succeeds and returns a fake transaction reference. Swapping
in Razorpay or a UPI PSP in production means replacing that one function with a real API call —
none of the booking, pricing, or invoice code needs to change. The same pattern is designed to
extend to:

- **Notifications** — the `notifications` table already has a `channel` column
  (`in_app | sms | email | whatsapp`); only `in_app` is actually delivered today, but adding a
  real SMS/WhatsApp adapter is a matter of reading unread rows with `channel != 'in_app'` and
  calling a provider, not a schema change.
- **Identity verification** — `worker_profiles.id_document_ref` is a free-text reference field
  today (cooperative admin manually reviews and flips `verification_status`); a real DigiLocker/
  Aadhaar e-KYC integration would populate that field automatically and could auto-advance the
  status.
- **Maps** — `MapView.jsx` wraps Leaflet/OpenStreetMap in one component; swapping to Google Maps
  (if an API key becomes available) means changing that one file, not every page that renders a
  map.

## The booking state machine

`services/booking.service.js` defines an explicit `TRANSITIONS` map:

```
PENDING -> MATCHING -> ASSIGNED -> ACCEPTED -> ON_THE_WAY -> ARRIVED -> IN_PROGRESS -> COMPLETED
                                       | (any of the above, except COMPLETED)
                                   CANCELLED
                          IN_PROGRESS -> DISPUTED -> COMPLETED | CANCELLED
```

`transition(bookingId, actorUserId, actorRole, nextStatus)` checks two things before writing
anything: (1) does this role have permission to *make* this transition at all (customers may only
cancel; workers may only move a job forward; admins can do anything), and (2) is `nextStatus` a
legal next state from the booking's *current* status per the map above. This means invalid
transitions (e.g. a worker trying to mark a `PENDING` booking `COMPLETED`) are rejected with a
400, not silently accepted — this is the "do not allow invalid state transitions" requirement.

## Why SQLite instead of the originally-planned Prisma/Postgres setup

The build environment's outbound network allowlist does not include Prisma's engine-binary CDN
(`binaries.prisma.sh`), so `prisma generate` cannot download its query engine here. Rather than
ship a project that fails to install, the persistence layer was rewritten on `better-sqlite3` — a
synchronous, pure-native (no download-at-install-time) SQLite driver — with a hand-written
`schema.sql` and small per-entity row-mapping helpers in `db/index.js`. The database opens in
SQLite's default `DELETE` journal mode rather than `WAL`, specifically because this project's
usage pattern is short-lived Node processes (a one-off `seed.js` run, then a separately-started
API process, then separately-run tests) rather than one long-lived connection — `DELETE` mode
writes directly to the single `.db` file on every commit, which is the simplest and most robust
choice for that pattern. This keeps the same service-layer architecture and is trivial to run
anywhere with just `npm install`. For a real multi-user deployment, `DATABASE.md` describes the
concrete path to Postgres (the schema is already close to standard SQL; the main changes are id
conventions and swapping `better-sqlite3` for `pg`).

## Security

- Passwords hashed with bcrypt (cost factor 10).
- JWTs signed with `JWT_SECRET` from environment (never hardcoded; `.env.example` provided,
  actual `.env` is git-ignored).
- All mutating routes require `authenticate` and, where relevant, `requireRole(...)`.
- Request bodies validated with Zod schemas before touching business logic (`middlewares/validate.js`).
- SQL is parameterized throughout (`db.prepare(...).run(values)`) — no string-concatenated queries,
  so no SQL injection surface.
- CORS is restricted to `CORS_ORIGIN` from environment.
- For a production deployment, the recommended next steps (not implemented in this demo) are:
  moving the JWT out of `localStorage` into an httpOnly cookie to reduce XSS blast radius, adding
  rate limiting on `/auth/login`, and rotating `JWT_SECRET` per environment via a secrets manager.

## Deployment shape (for a real rollout)

- **API**: any Node host (Render, Railway, a plain VM); swap SQLite for managed Postgres.
- **Web**: static hosting (Vercel/Netlify/S3+CloudFront) serving the Vite build output, or served
  by the API itself in production for a single-origin deployment.
- **Cloud computing** requirement from the brief: the stateless API + externalized Postgres +
  static frontend split is exactly the shape that scales horizontally on any cloud provider
  without code changes.
