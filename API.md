# API.md

Base URL (dev): `http://localhost:4000/api/v1`

All responses follow `{ success: boolean, data, meta }` on success or
`{ success: false, error: { message, details } }` on failure. Authenticated routes expect
`Authorization: Bearer <token>`.

## Auth

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/auth/register/customer` | public | `{ name, phone, email?, password }` |
| POST | `/auth/register/worker` | public | `{ name, phone, email?, password, societyId, homeCity, homeLatitude, homeLongitude, serviceRadiusKm?, languages?, experienceYears?, skillIds? }` |
| POST | `/auth/login` | public | `{ phone, password }` → `{ user, token }` |
| GET | `/auth/me` | any | current user + profile |

## Catalog

| Method | Path | Notes |
|---|---|---|
| GET | `/services` | all service categories with nested skills |
| GET | `/societies` | all cooperative societies with federation |

## Workers

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/workers/nearby?categoryId&latitude&longitude&isEmergency` | any | runs the AI matching engine, returns ranked candidates |
| GET | `/workers/:id` | any | public worker profile |
| GET | `/workers/me/dashboard` | WORKER | today's jobs, earnings, welfare |
| GET | `/workers/me/jobs?status` | WORKER | job list, optional status filter |
| POST | `/workers/me/availability` | WORKER | `{ isOnline?, workingHoursStart?, workingHoursEnd?, serviceRadiusKm? }` |
| POST | `/workers/me/blocked-dates` | WORKER | `{ date, reason? }` |

## Addresses

| Method | Path | Role |
|---|---|---|
| GET | `/addresses` | CUSTOMER |
| POST | `/addresses` | CUSTOMER — `{ label, line1, city, state, pincode, latitude, longitude, isDefault? }` |

## Bookings

| Method | Path | Role | Notes |
|---|---|---|---|
| POST | `/bookings` | CUSTOMER | `{ categoryId, addressId, scheduledAt, description?, photoUrl?, isEmergency?, preferredWorkerId? }` — runs AI matching + fair-wage split immediately |
| POST | `/bookings/emergency` | CUSTOMER | same minus `scheduledAt`/`isEmergency` (forced true, scheduled now) |
| GET | `/bookings?status` | CUSTOMER | own bookings |
| GET | `/bookings/:id` | any authenticated party to the booking | full detail incl. status history |
| PATCH | `/bookings/:id/status` | CUSTOMER (cancel only) / WORKER (forward transitions) / ADMIN (any) | `{ status, reason? }` — enforced state machine |

## Payments

| Method | Path | Role |
|---|---|---|
| POST | `/payments/:bookingId` | CUSTOMER — `{ method }`, only after booking is `COMPLETED` |
| GET | `/payments/:bookingId/invoice` | any party — full invoice detail |

## Reviews

| Method | Path | Role |
|---|---|---|
| POST | `/reviews` | CUSTOMER — `{ bookingId, rating, punctuality?, professionalism?, valueForMoney?, comment? }`, only once per completed booking |

## Notifications

| Method | Path | Role |
|---|---|---|
| GET | `/notifications` | any authenticated user |
| PATCH | `/notifications/:id/read` | any authenticated user |

## Welfare

| Method | Path | Role |
|---|---|---|
| GET | `/welfare/me` | WORKER |
| POST | `/welfare/me/claims` | WORKER — `{ reason, amountClaimed }` |

## Admin

| Method | Path | Notes |
|---|---|---|
| GET | `/admin/dashboard` | KPI overview |
| GET | `/admin/workers?status&search` | worker list with skills/certs |
| POST | `/admin/workers/:id/verify` | `{ status }` — PENDING/UNDER_REVIEW/VERIFIED/REJECTED/SUSPENDED |
| POST | `/admin/workers/:id/welfare/enroll` | enrolls worker in cooperative welfare scheme |
| GET | `/admin/bookings?status&isEmergency` | booking list |
| GET | `/admin/demand-heatmap` | lat/lng points for the map |
| GET | `/admin/analytics` | bookings by category/status, 14-day time series, avg rating |
| GET | `/admin/cooperatives` | federation → society → worker-count hierarchy |

## AI

| Method | Path | Role | Notes |
|---|---|---|---|
| GET | `/ai/demand-forecast?categoryId` | ADMIN | one category, or all if omitted |
| GET | `/ai/workforce-recommendation` | ADMIN | categories with a recommended worker increase |
| POST | `/ai/match-worker` | any | `{ categoryId, latitude, longitude, isEmergency? }` — same engine used internally by booking creation, exposed directly |

See `AI.md` for how these two endpoints are computed.
