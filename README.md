# SahakarSetu (सहकार सेतु) — Cooperative Workforce Operating System

**Smart India Hackathon 2026 · Problem Statement SIH26089**
**Organization:** Ministry of Cooperation · **Department:** National Council for Cooperative Training (NCCT)
**Theme:** Agriculture, FoodTech & Rural Development · **Category:** Software

> "Trusted Services. Verified Workers. Stronger Cooperatives."

SahakarSetu began as a cooperative gig-services booking app and has evolved into a full
**cooperative workforce operating system**: a digital layer that verifies worker skills,
intelligently matches workforce to demand, forecasts requirements, detects skill-capacity
shortages, enables **capacity sharing between cooperative societies**, and supports
**institutional bulk-workforce contracts** — not just "book a plumber."

```
Traditional marketplace:   Customer -> Platform -> Individual Worker
SahakarSetu:                Customer/Institution -> SahakarSetu Intelligence Layer
                             -> Labour Cooperative -> Verified Workforce
```

---

## 1. Where this project came from

This repository was originally built starting from a ZIP of a prior, unrelated project
(**EliteSuraksha**, a parametric weather-insurance app for gig workers). None of that domain
logic was reused. What was reused was the general shape of a sound engineering setup: an
npm-workspaces monorepo, an Express API with controller/service/route layering, JWT auth, and a
React + Vite frontend with an auth context and protected routes. Everything else — the entire
data model, business logic, UI, and branding — was designed and built from scratch across three
build phases:

1. **Phase 1 — Core marketplace**: customer booking, AI worker matching, fair-wage payments,
   worker/admin dashboards.
2. **Phase 2 — Dynamic data & trust infrastructure**: eliminated every hardcoded/mock number in
   the app, added real file uploads, grievances/SOS, in-app chat, certification workflows,
   refunds, settlements, rate limiting, audit logging.
3. **Phase 3 — Cooperative Workforce Operating System**: added institutional contracts,
   inter-cooperative capacity sharing, Skill Passports, Cooperative Intelligence dashboards, and
   the `SOCIETY_ADMIN` / `INSTITUTION` roles.

## 2. Roles

| Role | What they do |
|---|---|
| **Customer** | Books verified cooperative workers for household/community services |
| **Worker** | Cooperative-society member; receives bookings, fair pay, welfare, a Skill Passport |
| **Society Admin** (`SOCIETY_ADMIN`) | Runs one cooperative society: verifies workers, sets fee config, monitors live capacity via the Cooperative Intelligence dashboard, quotes on institutional contracts, requests/shares workforce with nearby societies |
| **Institution** | Posts bulk workforce requirements ("20 electricians + 10 plumbers for 3 months"), compares quotations, awards contracts |
| **Platform Admin** (`ADMIN`) | Platform-wide dashboard, worker verification, analytics, AI insights, cooperative hierarchy, CRUD for federations/categories |

## 3. Full feature list (all working end-to-end, covered by the automated test suite)

**Booking & matching**
- Customer registration, address book, service search, AI-ranked nearby worker results on a live map with **real worker coordinates** (workers can push a live location update; no simulated jitter)
- Full booking lifecycle state machine with server-enforced valid transitions, tested against invalid-transition attempts
- Emergency booking with a bounded widened search radius and live dispatch status
- Booking-scoped in-app chat, with tested participant-only authorization

**AI**
- **AI Workforce Allocation Engine** — six-factor weighted match scoring (distance, rating, availability, workload, experience, certification) with human-readable explanations
- **AI Demand Forecasting** — linear-trend + moving-average model, continuously fed by real booking activity (not only the historical seed backfill), with per-city scoping so cooperative-level shortage checks reflect local demand, not platform-wide totals
- **Shortage detection & workforce recommendations**, bounded to sane figures (capped, not raw totals)

**Cooperative network (the core differentiator)**
- **Cooperative Intelligence dashboard** — live capacity matrix per skill category, idle capacity, skill gaps, active jobs/contracts, all computed from real data on every request
- **Federated capacity-sharing** — automatic detection of a society's predicted shortfall, discovery of nearby societies with spare capacity, and a request/offer/accept workflow. Seeded flagship scenario: Vijayawada electrician shortage -> Guntur surplus, ready to demo immediately
- **Institutional contracts** — an institution posts a bulk requirement, cooperative societies browse and submit quotations, the institution reviews and awards
- **Skill Passport** — a distinctly-styled, cooperative-verified worker credential page (not a generic marketplace profile), explicitly labeled "VERIFIED BY COOPERATIVE"

**Money & trust**
- Transparent, **cooperative-configurable Fair Wage** split, editable by each society's own admin
- Simulated digital payments with **refunds**, invoice generation, and **settlement batch runs**
- Ratings & reviews tied to completed bookings only
- **Grievance/complaint queue with SOS escalation** straight to admin notifications
- Worker **certification submission + cooperative/admin approval** workflow
- Worker welfare/insurance module with a claims workflow
- Admin **audit log** of every sensitive admin action

**Platform & ops**
- Admin CRUD for federations, cooperative societies, service categories, and skills
- CSV export and city/district rollup reporting for Ministry-facing analytics
- Login rate limiting, structured (pino) logging, a `/metrics` endpoint
- Real file uploads (booking photos, certification documents) served from disk
- Offline-capable **PWA** (installable, service-worker-cached service catalog for low-connectivity access)
- **Six-language UI** (English, Hindi, Telugu, Tamil, Kannada, Marathi) + a high-contrast/larger-text accessibility toggle
- Mobile-first responsive design throughout
- "The Problem" and "Why SahakarSetu" public pages, plus an in-app **Demo Mode** guided walkthrough for judges
- `TERMS.md`, `PRIVACY.md`, `WORKER_AGREEMENT.md` legal-draft documents
- GitHub Actions CI (`.github/workflows/ci.yml`) running the full test suite and frontend build on every push

## 4. Tech stack

| Layer | Choice | Why |
|---|---|---|
| API | Node.js + Express | Lightweight, well understood, matches the reused monorepo convention |
| Database | SQLite via `better-sqlite3` | Zero-config, runs anywhere with no external services — see `DATABASE.md` for why this replaced an originally-planned Prisma setup, and the Postgres migration path |
| Auth | JWT + bcrypt | Stateless; role-based access control across 5 roles |
| Frontend | React 18 + Vite + Tailwind CSS | Fast dev loop, small bundle, utility-first styling |
| Maps | Leaflet + OpenStreetMap tiles | No API key required |
| Charts | Recharts | Lightweight, composable admin analytics |
| Validation | Zod | Type-safe request validation |
| Uploads | Multer | Real disk-backed file storage, served statically |
| Logging | Pino | Structured JSON logs, production-ready |
| Rate limiting | express-rate-limit | Brute-force protection on login |

## 5. Repository structure

```
sahakarsetu/
├── .github/workflows/ci.yml   GitHub Actions: test API + build web on every push
├── apps/
│   ├── api/                   Express API
│   │   ├── src/
│   │   │   ├── controllers/   Thin HTTP handlers
│   │   │   ├── services/      Business logic — matching, forecasting, booking,
│   │   │   │                   admin, cooperativeIntelligence, institution, payment
│   │   │   ├── routes/        18 route modules, 70+ endpoints
│   │   │   ├── middlewares/   auth, validation, rate limiting, error handling, uploads
│   │   │   ├── db/            schema.sql, sqlite connection + migrations + row mappers, seed.js
│   │   │   └── utils/         geo, pricing, JWT, response helpers
│   │   ├── test/run.js        36-test integration suite (no external framework)
│   │   └── .env.example
│   └── web/                   React + Vite frontend
│       └── src/
│           ├── pages/          landing, auth, customer/*, worker/*, admin/*,
│           │                    societyAdmin/*, institution/*, Why/Problem/Demo pages
│           ├── components/     Navbar, MapView, badges, cards, states
│           ├── context/        AuthContext
│           ├── i18n/           6-language dictionaries
│           └── api/            axios client
│       └── public/             PWA manifest, service worker, icons
├── ARCHITECTURE.md
├── API.md
├── AI.md
├── DATABASE.md
├── DEMO.md
├── TERMS.md / PRIVACY.md / WORKER_AGREEMENT.md
└── package.json                npm workspaces root
```

## 6. Running it locally

Requires Node.js 18+.

```bash
# 1. Install dependencies (per-workspace is the most reliable path — see note below)
npm install --workspace=apps/api
npm install --workspace=apps/web

# If your environment's npm tries to compile better-sqlite3 from source and
# fails (no node-gyp toolchain), this per-workspace approach still works in
# almost every case since better-sqlite3 ships prebuilt binaries.

# 2. Configure the API (defaults already work for the demo)
cp apps/api/.env.example apps/api/.env

# 3. Seed the database with demo data (creates apps/api/dev.db)
npm run seed

# 4. Start the API (http://localhost:4000)
npm run dev:api

# 5. In a second terminal, start the web app (http://localhost:5173)
npm run dev:web

# Optional: run the 36-test API suite
npm run test --workspace=apps/api
```

Open **http://localhost:5173**, then either register a new account or use a demo account below —
or visit **`/demo`** for a guided, step-by-step judge walkthrough of the full cooperative network
story (institutional contract → quotation → award → AI matching → shortage detection → capacity
sharing → payment → Cooperative Intelligence update).

## 7. Demo accounts

Password for all demo accounts: **`Demo@123`**

| Role | Mobile number |
|---|---|
| Platform Admin | `9000000001` |
| Customer | `9000000002` |
| Worker (verified electrician) | `9000000003` |
| Society Admin (Vijayawada cooperative) | `9000000004` |
| Institution (Demo Apartments Welfare Association) | `9000000005` |

The login page has one-tap buttons for all five. A ready-to-use demo institutional contract
("Demo Institution — Society Maintenance Contract... try this one!") is seeded in `OPEN` status
specifically so judges can walk the full post → quote → award flow live.

## 8. Documentation

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — system design, layering, provider abstractions
- [`API.md`](./API.md) — REST API reference
- [`AI.md`](./AI.md) — demand forecasting and workforce allocation models, in detail
- [`DATABASE.md`](./DATABASE.md) — schema, entity relationships, Postgres migration notes
- [`DEMO.md`](./DEMO.md) — step-by-step judge demo script
- [`TERMS.md`](./TERMS.md), [`PRIVACY.md`](./PRIVACY.md), [`WORKER_AGREEMENT.md`](./WORKER_AGREEMENT.md) — legal-draft documents (explicitly marked as prototype/demo, not legally reviewed)

## 9. Known limitations & honest scope notes

Being upfront about what's simplified or out of scope in this build:

- **Payments** are simulated behind a swappable `PaymentProvider` abstraction — no real gateway credentials are used. Refunds and settlement batches are implemented on top of the simulated ledger.
- **Identity/Aadhaar verification** is a manual cooperative-admin approval workflow with a mock document reference field — no real government verification API is called.
- **Notifications** are in-app only; SMS/email/WhatsApp channels exist as a schema field ready for real adapters, but none are wired to a live provider.
- **Maps** use OpenStreetMap/Leaflet (no API key needed). Worker location is real but pushed manually/periodically by the worker app rather than continuous background GPS tracking.
- **Mobile app**: the requirement is met via a mobile-first, installable PWA rather than a separate native/Expo app — see `ARCHITECTURE.md` for the React Native migration path.
- **AI models** are deliberately lightweight (linear regression + moving average, weighted multi-factor scoring) rather than a heavyweight ML stack, chosen for reliability and explainability in a live demo. The underlying seeded demand dataset is intentionally dense (to produce interesting week-over-week trend signals for the forecasting demo), so absolute shortage figures skew a little high even though they are now bounded/sane — see `AI.md` for the exact caps applied and the real-data upgrade path.
- **Database** is SQLite for zero-config portability (Prisma's engine binaries weren't reachable in this build environment's network sandbox); `DATABASE.md` covers the Postgres migration path for production.
- **Two-way (worker-rates-customer) reviews**: the `customer_reviews` table and service pattern exist, but the frontend UI for a worker to submit one is not yet built — API-only in this build.
- **Docker**: intentionally not included per explicit request; the app runs directly via `npm`.
- **Recurring bookings, multi-worker-per-booking assignments, and a full Ministry-facing PDF export**: schema fields exist for recurring bookings (`is_recurring`, `recurrence_interval_days`) but the auto-recreate-on-completion logic and frontend UI are not yet built; multi-worker bookings were deferred as a structural schema risk; PDF export was scoped down to CSV for this pass.
- **Real-time push**: booking tracking and chat use polling (6s interval) rather than WebSockets — sufficient for a demo, documented as a production upgrade path.

## 10. Final report

**What was reused from the original ZIP:** npm-workspaces monorepo layout, Express
controller/service/route/middleware convention, JWT auth pattern, React + Vite + AuthContext +
ProtectedRoute frontend pattern.

**What was removed:** all EliteSuraksha domain logic and branding (parametric weather-insurance
policies, payout triggers, weather-station integrations, crop-loss claims flows).

**What was newly designed and built:** the entire data model across three phases (30+ tables:
cooperative hierarchy, skills, bookings, fair-wage payments, welfare, demand records,
institutions, contracts, quotations, capacity network, grievances, chat, audit logs,
settlements), the AI workforce allocation engine, the AI demand forecasting engine, the
cooperative capacity/shortage-detection engine, the full booking state machine, every page of the
customer/worker/society-admin/institution/platform-admin apps, the six-language layer, the map
integration, the PWA layer, and all documentation.

**Technology stack:** see section 4.

**AI implementation:** see `AI.md`.

**Geo-spatial implementation:** Haversine distance calculations server-side
(`apps/api/src/utils/geo.js`) feeding the matching and capacity-network engines; Leaflet/OpenStreetMap
maps client-side; workers can push a real live location update.

**Payment implementation:** simulated provider behind an interchangeable abstraction, extended
with refunds and settlement batches; see section 9.

**Database changes:** full redesign from the insurance domain to the cooperative-workforce
domain across three phases; engine changed from Prisma to `better-sqlite3` for environment
compatibility (section 4, `DATABASE.md`).

**Demo credentials:** section 7.

**How to run it:** section 6.

**Limitations:** section 9.

**Location of the final ZIP:** provided alongside this repository as `sahakarsetu.zip`.
