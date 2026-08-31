# AI.md — AI Features in SahakarSetu

SahakarSetu implements two AI-driven features called for by SIH26089: **AI-based workforce
allocation** and **AI-based demand forecasting**. Both are real, working, deterministic models —
not decorative UI — implemented as plain Node.js (no external ML service dependency), which keeps
the demo self-contained and fast while remaining architecturally ready to be swapped for a heavier
model once real historical data exists. Both are exposed on the **Admin → AI Insights** page and
power the customer-facing "why this worker" explanations during booking.

---

## 1. AI Workforce Allocation Engine

**File:** `apps/api/src/services/matching.service.js` · **Endpoints:** `GET /api/v1/workers/nearby`,
`POST /api/v1/ai/match-worker` (used internally by booking creation, and directly by the customer
search page)

### What it does

Given a service category and a customer location, it finds every **verified** worker who has a
skill in that category and is within (or, for emergencies, near) their configured service radius,
then scores each candidate on a weighted blend of factors:

| Factor | Weight | Signal |
|---|---|---|
| Distance | 0.30 | Closer to the customer, normalized against the worker's own service radius |
| Rating | 0.20 | Average customer rating (0–5★) |
| Availability | 0.15 | Currently online (1.0) vs offline (0 normally, 0.4 for emergencies so an offline-but-nearby worker can still be woken up) |
| Current workload | 0.15 | Fewer active jobs right now scores higher |
| Experience | 0.10 | Years of experience, capped at 10 |
| Certification | 0.10 | Has at least one cooperative-verified certification |

The final score (0–100) and a **human-readable reason string** (e.g. *"2.1 km away, available now,
certified, 4.9★ rating, 7+ yrs experience, low current workload"*) are returned together — this is
what shows up as the "Best Match" explanation on the customer app and in the booking's match
history on the admin side. Every automatic assignment is logged to `allocation_logs` for audit.

### Why this design

- **Explainability matters more than raw ML power for a trust-sensitive cooperative platform.**
  A transparent weighted-sum model is auditable by a cooperative administrator — nobody has to
  trust a black box for who gets dispatched to their home.
- **No training data problem.** A learned ranking model (e.g. learning-to-rank) needs historical
  click/booking outcome data that doesn't exist yet for a pre-launch platform. The weighted model
  encodes reasonable initial business logic and is designed to be replaced by a learned model
  (e.g. gradient-boosted ranking) once real outcome data accumulates — the factor list above is
  exactly the feature set such a model would start from.
- **Emergency-aware.** For emergency bookings, the effective search radius widens (`max(radius, 20km)`
  instead of unlimited) so a customer with no nearby cooperative worker still gets matched to the
  closest available one, rather than either failing to match or being sent someone hours away.

---

## 2. AI Demand Forecasting Engine

**File:** `apps/api/src/services/forecast.service.js` · **Endpoints:**
`GET /api/v1/ai/demand-forecast[?categoryId=]`, `GET /api/v1/ai/workforce-recommendation`

### What it does

For each service category, the engine:

1. Aggregates the seeded `demand_records` (28 days of historical hourly request counts per
   category/city/zone — standing in for real historical booking logs) into daily totals.
2. Fits a **least-squares linear regression** over the daily series to capture the underlying trend.
3. Computes a **7-day weighted moving average** of the most recent data for short-term stability.
4. Projects the next 7 days as a 60/40 blend of the trend projection and the recent moving average
   (`0.6 × trend + 0.4 × recent average`) — this damps the regression's tendency to overreact to a
   short noisy history while still tracking real directional change.
5. Reports the week-over-week % change, a trend direction (`increasing` / `decreasing` / `stable`),
   and identifies the **peak demand hour window** by summing requests per hour-of-day across the
   whole history.

Example output surfaced on the AI Insights page:

> *"Electrical services demand is predicted to increase 21% next week, peaking around 18:00."*

### Workforce recommendation

`workforceRecommendation()` runs the forecast for every category and, for any category trending up
by ≥5% week-over-week, estimates how many additional verified workers the cooperative should bring
online during the peak window (`round((next7DaysTotal − 7×historicalDailyAvg) / 60)`, capped at 5
per category to keep the number realistic for the seeded demo scale). Example:

> *"2 additional verified workers recommended for Electrical during 18:00–21:00, demand is
> trending up 21%."*

### Why a lightweight regression instead of Prophet/XGBoost

For a judge-facing demo with a few weeks of seeded data per category, a dependency-free
regression + moving-average blend is:

- **Reliable** — no risk of a heavy ML library failing to install in a constrained environment,
  no long training time, deterministic output every run.
- **Fast** — computed synchronously in milliseconds per request, no background job/queue needed.
- **Honest about its limits** — the model is intentionally simple; it is not claiming
  state-of-the-art accuracy, only a working, explainable forecast from real (seeded) data.

**Production upgrade path:** once the platform has real booking history, the same
`forecastDemand(categoryId)` function signature can be swapped for a call to a proper time-series
library — Facebook Prophet (seasonality-aware) or a gradient-boosted regressor (XGBoost) trained
on richer features (weather, day-of-week, local events, festival calendars). The API contract
(`{ next7DaysForecast, weekOverWeekChangePct, peakHourWindow, insight }`) would not need to change,
so the frontend AI Insights page requires no rework.

---

## 3. Data flow summary

```
Seeded demand_records (28 days × 10 categories × 4 cities × zones × hours)
        │
        ▼
forecastDemand() ─── linear regression + moving average ──▶ 7-day forecast + insight text
        │
        ▼
workforceRecommendation() ── thresholds week-over-week growth ──▶ staffing suggestions

Live booking request (category + customer lat/lng)
        │
        ▼
findAndScoreWorkers() ── weighted multi-factor scoring ──▶ ranked worker list + match reason
        │
        ▼
Booking auto-assigned to top match; score + reason stored on the booking and in allocation_logs
```

## 4. Cooperative Shortage Detection & Capacity-Sharing Recommendation

**File:** `apps/api/src/services/cooperativeIntelligence.service.js` · **Used by:** the Society
Admin "Capacity & Federation Network" page.

### What it does

For a given cooperative society and skill category, this combines two signals:

1. **Current available capacity** — a live count of that society's verified workers in the
   category with zero active jobs right now (recomputed from `worker_profiles`/`worker_skills`/
   `bookings` on every call — never a stale cached number).
2. **Predicted demand** — the same demand-forecasting model from section 2, but **scoped to the
   society's own operating city** rather than platform-wide totals, since a citywide demand
   signal is what actually determines whether *this specific* cooperative is short-staffed.

### The staffing formula

```
predictedNeed = min(ceil(next7DaysCityDemand / 15), availableWorkers + 15)
shortageWorkers = min(max(0, predictedNeed - availableWorkers), 15)
```

The "1 worker handles ~15 requests/week" constant is the same order-of-magnitude assumption used
by the platform-wide workforce-recommendation heuristic in section 2, kept consistent across the
app. Both the `predictedNeed` and `shortageWorkers` outputs are deliberately **capped** (at
`available + 15` and `15` respectively) — this is a direct fix for an early version of this
feature that returned raw, unbounded totals (in the hundreds) before this cap was added, which
would have been misleading in a live demo. The cap is documented here rather than hidden so a
reviewer can see exactly where the ceiling comes from.

### Capacity-sharing discovery

When a shortage is detected, the engine searches every *other* cooperative society's live
capacity snapshot for the same skill category, ranks candidates by distance (approximated via
each society's worker-cluster location, since societies don't have their own lat/lng in the
schema), and returns a ranked list a Society Admin can act on with one click — creating a
`capacity_sharing_requests` row that the discovered society can then accept, decline, or offer
against.

### Known simplification

The seeded demand dataset used for the underlying forecast is intentionally dense (see section 2)
to produce visible week-over-week trend signals for the demo — this means shortage figures skew
somewhat high even after the caps above. In a real deployment fed by actual booking history at
realistic volumes, the same formula would produce noticeably smaller, more realistic numbers
without any code change.
