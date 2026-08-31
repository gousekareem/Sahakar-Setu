# DEMO.md — Judge Demo Script

Total time: ~8 minutes. Password for every demo account: **`Demo@123`**.

## Setup (once)

```bash
npm install
npm run seed
npm run dev:api      # terminal 1 — http://localhost:4000
npm run dev:web      # terminal 2 — http://localhost:5173
```

Open **http://localhost:5173**.

## Flow 1 — Customer books a verified worker (2.5 min)

1. On the landing page, point out the SIH26089 / Ministry of Cooperation badge and the fair-wage
   section further down the page.
2. Click **Log in** -> tap the **Customer** quick-login button (or type `9000000002` /
   `Demo@123`).
3. From the customer home, click **Electrical** (or any category).
4. Click **Use my location** — note the AI match results appear with a **match %**, distance,
   ETA, rating, and a plain-English **reason** ("2.1 km away, available now, certified, 4.9
   rating, 7 years experience") next to each worker. Point out the live map on the right showing
   worker positions relative to the customer.
5. Click **Book** on the top match -> walk through the 4-step booking flow (address -> schedule ->
   description -> review) -> **Confirm booking**.
6. Land on the confirmation screen showing the assigned worker and ETA -> click **Track booking**
   to show the live status tracker.

## Flow 2 — Worker fulfills the job (2 min)

1. Open a second browser tab/window, log in as **Worker** (`9000000003`).
2. Show the **Worker Dashboard**: today's jobs, earnings (today/week/month), rating, welfare
   enrollment status, and the **Go Online/Offline** toggle.
3. Go to **Jobs**, find the booking just created, and click through the action button at each
   stage: **Accept -> Start heading over -> Mark arrived -> Start service -> Mark completed** —
   point out the button label and required action changes at each state (the enforced state
   machine).
4. Switch back to the customer tab (auto-refreshes every 6s) to show the tracker advancing live.

## Flow 3 — Customer pays & rates (1 min)

1. Once the worker marks the job completed, the customer's booking page shows the **fair-wage
   breakdown** (customer pays / worker receives / welfare contribution / cooperative operations)
   and a **Pay** button.
2. Select a payment method (UPI/Card/etc.) and pay — an invoice number and transaction reference
   are generated instantly.
3. Rate the worker (stars + optional comment) — this immediately updates the worker's aggregate
   rating (visible if you refresh the worker dashboard).

## Flow 4 — Emergency booking (1 min)

1. As the customer, click the red **Emergency Service** button (available from the home page and
   navbar).
2. Pick an emergency type (e.g. "Water leakage / blockage") -> the system widens the search
   radius, matches instantly, and shows **"Worker assigned"** with an ETA — no manual worker
   browsing needed.

## Flow 5 — Cooperative Admin & AI Insights (2 min)

1. Log in as **Admin** (`9000000001`).
2. **Dashboard**: KPIs — total/verified/active workers, today's bookings, emergency requests,
   welfare beneficiaries, total revenue, total worker payouts.
3. **Workforce & Verification**: filter by `PENDING`, change a worker's status to `VERIFIED` live
   (this immediately makes them eligible for AI matching) — also show **Enroll in welfare**.
4. **Bookings**: the live demand heatmap map, filterable to emergency-only requests.
5. **AI Insights** (the headline feature): per-category 7-day demand forecast with a week-over-week
   % change, a mini forecast bar chart, and peak-hour window; below that, the **Workforce
   Allocation Recommendations** — e.g. *"2 additional workers recommended for Electrical during
   18:00-21:00, demand is trending up 21%."* Explain (from `AI.md`) that this is a real
   linear-trend + moving-average model running over 28 days of seeded demand data, not a static
   mockup.
6. **Analytics**: bookings by category (bar), bookings by status (pie), 14-day bookings/revenue
   trend (line) — all real Recharts driven by live data.
7. **Cooperatives**: the federation -> society -> worker-count hierarchy view.

## Talking points if asked

- **"Is the AI real?"** Yes — walk through `AI.md`; both engines are plain, auditable JS running
  server-side on real (seeded) data, not hardcoded strings. Changing a worker's status or the
  demand seed changes the output live.
- **"Why SQLite, not Postgres?"** Zero-config so any judge can `npm install && npm run seed && npm
  run dev` with no external database to provision; the schema is portable SQL and `DATABASE.md`
  documents the direct Postgres migration path.
- **"Is payment real money?"** No — a clearly-labeled demo payment provider that always succeeds,
  behind a swappable interface (`ARCHITECTURE.md` -> Provider abstraction). No real gateway
  credentials are used or required.
- **"Multilingual?"** The language switcher in the navbar (English/Hindi/Telugu) is live — switch
  it and show the landing page and key UI strings change immediately.

## Flow 6 — Cooperative Workforce Network (institutional contracts + capacity sharing)

This is the headline new capability — the "not just a booking app" story.

1. Log in as **Institution** (`9000000005`). A contract titled "Demo Institution — Society
   Maintenance Contract (try this one!)" is already posted, `OPEN`, requiring 20 electricians +
   10 plumbers.
2. In a second tab, log in as **Society Admin** (`9000000004`) -> **Contracts** -> find that
   contract -> submit a quotation.
3. Back in the Institution tab, refresh the contract -> **Award** the quotation you just submitted.
4. Still as Society Admin, go to **Capacity & Federation Network** -> select "Electrical" -> the
   shortage check runs live against real capacity and demand data, and (per the seeded scenario)
   surfaces Guntur's surplus electricians as nearby capacity, with a one-click "request from
   network" action.
5. Go to **Intelligence** (the Cooperative Intelligence dashboard) to see idle capacity, skill
   gaps, and active contracts — all computed live, not hardcoded.

Alternatively, open **`/demo`** in the app for an interactive, guided version of this entire
walkthrough with one-tap login buttons at each step.

## Talking points if asked (continued)

- **"Is the capacity-sharing scenario staged?"** The Vijayawada-shortage/Guntur-surplus setup is
  seeded deliberately so it's demoable without waiting for organic data to accumulate — but the
  detection and matching logic itself runs live against the real `cooperative_capacity` table on
  every request, recomputed from actual worker/booking state, not a hardcoded response.
- **"What's a Skill Passport?"** A cooperative-verified worker credential page, deliberately
  styled to look distinct from a generic marketplace profile — visit any worker's passport via
  their booking detail page.
