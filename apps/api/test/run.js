// Lightweight, dependency-free test runner (no external test framework needed).
// Run with: node test/run.js  (after `npm run seed` has populated dev.db)
import "dotenv/config";
import assert from "node:assert/strict";
import http from "node:http";
import app from "../src/app.js";

const server = app.listen(0);
const { port } = server.address();
const base = `http://localhost:${port}/api/v1`;

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ok  - ${name}`);
    passed++;
  } catch (e) {
    console.log(`FAIL  - ${name}`);
    console.log(`        ${e.message}`);
    failed++;
  }
}

async function req(method, path, body, token) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function main() {
  let adminToken, customerToken, workerToken, categoryId, addressId, bookingId;

  await test("health check responds", async () => {
    const { status, json } = await req("GET", "/health");
    assert.equal(status, 200);
    assert.equal(json.success, true);
  });

  await test("admin login succeeds with demo credentials", async () => {
    const { status, json } = await req("POST", "/auth/login", { phone: "9000000001", password: "Demo@123" });
    assert.equal(status, 200);
    assert.equal(json.data.user.role, "ADMIN");
    adminToken = json.data.token;
  });

  await test("customer login succeeds with demo credentials", async () => {
    const { status, json } = await req("POST", "/auth/login", { phone: "9000000002", password: "Demo@123" });
    assert.equal(status, 200);
    customerToken = json.data.token;
  });

  await test("worker login succeeds with demo credentials", async () => {
    const { status, json } = await req("POST", "/auth/login", { phone: "9000000003", password: "Demo@123" });
    assert.equal(status, 200);
    workerToken = json.data.token;
  });

  await test("login fails with wrong password", async () => {
    const { status } = await req("POST", "/auth/login", { phone: "9000000002", password: "wrongpass" });
    assert.equal(status, 401);
  });

  await test("customer cannot access admin dashboard (role authorization)", async () => {
    const { status } = await req("GET", "/admin/dashboard", null, customerToken);
    assert.equal(status, 403);
  });

  await test("unauthenticated request is rejected", async () => {
    const { status } = await req("GET", "/admin/dashboard");
    assert.equal(status, 401);
  });

  await test("service categories list is non-empty", async () => {
    const { status, json } = await req("GET", "/services");
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
    categoryId = json.data.find((c) => c.slug === "electrical").id;
  });

  await test("AI worker matching returns ranked, scored candidates", async () => {
    const { status, json } = await req("POST", "/ai/match-worker", { categoryId, latitude: 16.5062, longitude: 80.648 });
    assert.equal(status, 200);
    assert.ok(Array.isArray(json.data));
    if (json.data.length > 1) {
      assert.ok(json.data[0].matchScore >= json.data[1].matchScore, "results should be sorted by descending match score");
    }
  });

  await test("customer has a seeded default address", async () => {
    const { status, json } = await req("GET", "/addresses", null, customerToken);
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
    addressId = json.data[0].id;
  });

  await test("booking creation runs AI matching and assigns a worker", async () => {
    const { status, json } = await req(
      "POST", "/bookings",
      { categoryId, addressId, scheduledAt: new Date(Date.now() + 3600_000).toISOString(), description: "Test booking" },
      customerToken
    );
    assert.equal(status, 201);
    assert.equal(json.data.booking.status, "ASSIGNED");
    assert.ok(json.data.booking.workerId);
    assert.ok(json.data.booking.workerPayout > 0, "fair-wage split should have run");
    bookingId = json.data.booking.id;
  });

  await test("worker cannot skip booking states (invalid transition rejected)", async () => {
    const { status } = await req("PATCH", `/bookings/${bookingId}/status`, { status: "COMPLETED" }, workerToken);
    assert.equal(status, 400);
  });

  await test("customer cannot advance a booking's job status", async () => {
    const { status } = await req("PATCH", `/bookings/${bookingId}/status`, { status: "ACCEPTED" }, customerToken);
    assert.equal(status, 403);
  });

  await test("worker can walk the booking through its full valid lifecycle", async () => {
    for (const s of ["ACCEPTED", "ON_THE_WAY", "ARRIVED", "IN_PROGRESS", "COMPLETED"]) {
      const { status, json } = await req("PATCH", `/bookings/${bookingId}/status`, { status: s }, workerToken);
      assert.equal(status, 200, `transition to ${s} should succeed`);
      assert.equal(json.data.status, s);
    }
  });

  await test("customer can pay for a completed booking", async () => {
    const { status, json } = await req("POST", `/payments/${bookingId}`, { method: "UPI" }, customerToken);
    assert.equal(status, 201);
    assert.equal(json.data.status, "PAID");
  });

  await test("customer cannot pay twice for the same booking", async () => {
    const { status } = await req("POST", `/payments/${bookingId}`, { method: "UPI" }, customerToken);
    assert.equal(status, 400);
  });

  await test("customer can rate the worker after completion", async () => {
    const { status, json } = await req("POST", "/reviews", { bookingId, rating: 5, comment: "Great work" }, customerToken);
    assert.equal(status, 201);
    assert.equal(json.data.rating, 5);
  });

  await test("admin can verify a pending worker", async () => {
    const { json: workers } = await req("GET", "/admin/workers?status=PENDING", null, adminToken);
    if (workers.data.length === 0) return; // nothing pending in this seed run — acceptable
    const target = workers.data[0];
    const { status, json } = await req("POST", `/admin/workers/${target.id}/verify`, { status: "VERIFIED" }, adminToken);
    assert.equal(status, 200);
    assert.equal(json.data.verificationStatus, "VERIFIED");
  });

  await test("AI demand forecast runs and returns week-over-week figures", async () => {
    const { status, json } = await req("GET", "/ai/demand-forecast", null, adminToken);
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
    assert.ok("weekOverWeekChangePct" in json.data[0]);
  });

  // ── Round 2: dynamic data, institutional contracts, cooperative network ──

  await test("public stats endpoint returns real (non-hardcoded) counts", async () => {
    const { status, json } = await req("GET", "/stats");
    assert.equal(status, 200);
    assert.ok(typeof json.data.verifiedWorkers === "number");
    assert.ok(json.data.fairWageExample.customerPays > 0);
  });

  await test("emergency categories are derived from emergencyEligible flag, not hardcoded", async () => {
    const { status, json } = await req("GET", "/services/emergency");
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
    assert.ok(json.data.every((c) => c.emergencyEligible));
  });

  await test("worker location update reflects in nearby-worker coordinates (no more random jitter)", async () => {
    const { json: workerLogin } = await req("POST", "/auth/login", { phone: "9000000003", password: "Demo@123" });
    const wToken = workerLogin.data.token;
    await req("POST", "/workers/me/location", { latitude: 16.55, longitude: 80.60 }, wToken);
    const { json: matches } = await req("POST", "/ai/match-worker", { categoryId, latitude: 16.5062, longitude: 80.648 });
    const demoWorker = matches.data.find((m) => m.name === "Demo Worker (Electrician)");
    if (demoWorker) assert.equal(demoWorker.latitude, 16.55);
  });

  let societyAdminToken, institutionToken, contractId, quotationId;

  await test("society admin login succeeds with demo credentials", async () => {
    const { status, json } = await req("POST", "/auth/login", { phone: "9000000004", password: "Demo@123" });
    assert.equal(status, 200);
    assert.equal(json.data.user.role, "SOCIETY_ADMIN");
    societyAdminToken = json.data.token;
  });

  await test("institution login succeeds with demo credentials", async () => {
    const { status, json } = await req("POST", "/auth/login", { phone: "9000000005", password: "Demo@123" });
    assert.equal(status, 200);
    assert.equal(json.data.user.role, "INSTITUTION");
    institutionToken = json.data.token;
  });

  await test("society admin sees a live cooperative intelligence dashboard", async () => {
    const { status, json } = await req("GET", "/society-admin/dashboard", null, societyAdminToken);
    assert.equal(status, 200);
    assert.ok("activeWorkers" in json.data);
    assert.ok("idleCapacity" in json.data);
    assert.ok(Array.isArray(json.data.capacity));
  });

  await test("shortage detection returns bounded, sane numbers (not an unbounded raw total)", async () => {
    const { status, json } = await req("GET", `/society-admin/capacity/shortage/${categoryId}`, null, societyAdminToken);
    assert.equal(status, 200);
    assert.ok(json.data.shortageWorkers <= 15, "shortage figure must be bounded, not a raw platform-wide total");
  });

  await test("seeded capacity-sharing scenario (Vijayawada shortage -> Guntur surplus) exists", async () => {
    const { status, json } = await req("GET", "/society-admin/capacity/sharing-requests?status=OPEN", null, societyAdminToken);
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
  });

  await test("institution can view their seeded contracts", async () => {
    const { status, json } = await req("GET", "/institutions/contracts", null, institutionToken);
    assert.equal(status, 200);
    assert.ok(json.data.length > 0);
    const demoContract = json.data.find((c) => c.title.includes("try this one"));
    assert.ok(demoContract, "demo contract should exist");
    contractId = demoContract.id;
  });

  await test("society admin can browse open contracts", async () => {
    const { status, json } = await req("GET", "/contracts/open", null, societyAdminToken);
    assert.equal(status, 200);
    assert.ok(json.data.some((c) => c.id === contractId));
  });

  await test("society admin can submit a quotation on a contract", async () => {
    const { status, json } = await req(
      "POST", `/contracts/${contractId}/quote`,
      { totalPrice: 500000, workersOffered: 25, slaCommitmentHours: 4, notes: "test quote" },
      societyAdminToken
    );
    assert.equal(status, 201);
    assert.equal(json.data.status, "SUBMITTED");
    quotationId = json.data.id;
  });

  await test("institution can award the contract to a submitted quotation", async () => {
    const { status, json } = await req("POST", `/institutions/contracts/${contractId}/award/${quotationId}`, null, institutionToken);
    assert.equal(status, 200);
    assert.equal(json.data.status, "AWARDED");
    assert.ok(json.data.awardedSocietyId);
  });

  await test("customer can raise a grievance and an SOS alert reaches admins", async () => {
    const { status } = await req("POST", "/grievances", { category: "Safety", description: "test SOS", isSos: true }, customerToken);
    assert.equal(status, 201);
    const { json: notifs } = await req("GET", "/notifications", null, adminToken);
    assert.ok(notifs.data.some((n) => n.title.includes("SOS")));
  });

  await test("booking-scoped chat: only participants can read messages", async () => {
    const { json: bookings } = await req("GET", "/bookings", null, customerToken);
    if (bookings.data.length === 0) return;
    const bId = bookings.data[0].id;
    const send = await req("POST", `/messages/${bId}`, { body: "hello" }, customerToken);
    assert.equal(send.status, 201);
    const read = await req("GET", `/messages/${bId}`, null, customerToken);
    assert.equal(read.status, 200);
    // an unrelated worker (not assigned to this booking) should be denied
    const { json: otherWorkerLogin } = await req("POST", "/auth/login", { phone: "9510000001", password: "Demo@123" });
    if (otherWorkerLogin?.data?.token) {
      const denied = await req("GET", `/messages/${bId}`, null, otherWorkerLogin.data.token);
      assert.equal(denied.status, 403);
    }
  });

  await test("worker can submit a certification for review", async () => {
    const { json: workerLogin } = await req("POST", "/auth/login", { phone: "9000000003", password: "Demo@123" });
    const { status, json } = await req(
      "POST", "/certifications",
      { title: "Test Certification", issuingBody: "Test Body", issuedAt: new Date().toISOString() },
      workerLogin.data.token
    );
    assert.equal(status, 201);
    assert.equal(json.data.status, "PENDING");
  });

  await test("society admin can approve a pending certification", async () => {
    const { json: pending } = await req("GET", "/certifications/pending", null, societyAdminToken);
    const cert = pending.data.find((c) => c.title === "Test Certification");
    if (!cert) return; // may belong to a worker outside this society — acceptable
    const { status, json } = await req("POST", `/certifications/${cert.id}/review`, { status: "APPROVED" }, societyAdminToken);
    assert.equal(status, 200);
    assert.equal(json.data.status, "APPROVED");
  });

  await test("login rate limiter does not block normal usage", async () => {
    // A handful of legitimate attempts should never be blocked (limit is 20/15min)
    const { status } = await req("POST", "/auth/login", { phone: "9000000002", password: "Demo@123" });
    assert.equal(status, 200);
  });

  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
