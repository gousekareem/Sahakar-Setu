import "dotenv/config";
import bcrypt from "bcryptjs";
import { db, id, now } from "./index.js";

console.log("Seeding SahakarSetu demo data...");

const hash = (pwd) => bcrypt.hashSync(pwd, 8);
const DEMO_PASSWORD = "Demo@123";

const t = now();

// ── wipe existing data (idempotent re-seed) ────────────────────────────
const tables = [
  "welfare_claims", "welfare_profiles", "reviews", "payments", "notifications",
  "allocation_logs", "booking_status_logs", "bookings", "addresses",
  "blocked_dates", "certifications", "worker_skills", "worker_profiles",
  "customer_profiles", "skills", "service_categories", "cooperative_societies",
  "federations", "demand_records", "users",
];
for (const table of tables) db.prepare(`DELETE FROM ${table}`).run();

// ── Federations & Cooperative Societies ─────────────────────────────────
const federations = [
  { id: id(), name: "Andhra Pradesh Labour Cooperative Federation", state: "Andhra Pradesh" },
  { id: id(), name: "Telangana Skilled Workers Federation", state: "Telangana" },
];
for (const f of federations) {
  db.prepare(`INSERT INTO federations (id, name, state, description, created_at) VALUES (?, ?, ?, ?, ?)`)
    .run(f.id, f.name, f.state, "Registered under the Ministry of Cooperation, NCCT framework (demo data).", t);
}

const societies = [
  { id: id(), federationId: federations[0].id, name: "Vijayawada Karmika Seva Sahakara Sangham", city: "Vijayawada", reg: "APLCF/VJA/2019/0142", phone: "9440011122", welfare: 8, platform: 8 },
  { id: id(), federationId: federations[0].id, name: "Guntur Nirmana Karmikula Cooperative", city: "Guntur", reg: "APLCF/GNT/2020/0087", phone: "9440022233", welfare: 7, platform: 8 },
  { id: id(), federationId: federations[0].id, name: "Visakhapatnam Skilled Workers Society", city: "Visakhapatnam", reg: "APLCF/VSP/2018/0231", phone: "9440033344", welfare: 8, platform: 7 },
  { id: id(), federationId: federations[1].id, name: "Hyderabad Sahakara Seva Sangham", city: "Hyderabad", reg: "TSSWF/HYD/2017/0311", phone: "9440044455", welfare: 8, platform: 8 },
];
for (const s of societies) {
  db.prepare(
    `INSERT INTO cooperative_societies (id, federation_id, name, city, registration_no, contact_phone, welfare_contribution_pct, platform_fee_pct, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(s.id, s.federationId, s.name, s.city, s.reg, s.phone, s.welfare, s.platform, t);
}

// ── Service categories & skills ─────────────────────────────────────────
const categoryDefs = [
  { name: "Electrical", slug: "electrical", icon: "zap", baseRate: 350, skills: ["House Wiring", "Fan & Light Fitting", "Inverter Installation", "MCB/Fuse Repair"] },
  { name: "Plumbing", slug: "plumbing", icon: "droplet", baseRate: 300, skills: ["Pipe Leak Repair", "Tap & Fitting Installation", "Bathroom Fitting", "Water Tank Cleaning"] },
  { name: "Carpentry", slug: "carpentry", icon: "hammer", baseRate: 400, skills: ["Furniture Repair", "Door & Window Fitting", "Modular Work", "Polishing"] },
  { name: "Cleaning", slug: "cleaning", icon: "sparkles", baseRate: 250, skills: ["Deep Home Cleaning", "Bathroom Cleaning", "Sofa & Carpet Cleaning", "Kitchen Cleaning"] },
  { name: "Painting", slug: "painting", icon: "paintbrush", baseRate: 500, skills: ["Wall Painting", "Waterproofing", "Texture Work", "Wood Polish Painting"] },
  { name: "Home Care", slug: "home-care", icon: "heart-handshake", baseRate: 450, skills: ["Elderly Care", "Patient Attendant", "Baby Care", "Post-Surgery Care"] },
  { name: "Driving", slug: "driving", icon: "car", baseRate: 300, skills: ["Daily Commute Driving", "Outstation Driving", "Event Driving"] },
  { name: "Gardening", slug: "gardening", icon: "leaf", baseRate: 300, skills: ["Lawn Maintenance", "Plant Care", "Landscaping"] },
  { name: "Appliance Repair", slug: "appliance-repair", icon: "settings", baseRate: 350, skills: ["AC Service & Repair", "Washing Machine Repair", "Refrigerator Repair", "RO Water Purifier Service"] },
  { name: "Technician Services", slug: "technician", icon: "cpu", baseRate: 400, skills: ["CCTV Installation", "Wi-Fi/Networking Setup", "Solar Panel Maintenance"] },
];

const categories = [];
const skillsByCategory = {};
for (const c of categoryDefs) {
  const catId = id();
  db.prepare(
    `INSERT INTO service_categories (id, name, slug, icon, description, base_rate, emergency_eligible, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)`
  ).run(catId, c.name, c.slug, c.icon, `Verified cooperative ${c.name.toLowerCase()} services for households and communities.`, c.baseRate, t);
  categories.push({ id: catId, ...c });
  skillsByCategory[catId] = [];
  for (const skillName of c.skills) {
    const skillId = id();
    db.prepare(`INSERT INTO skills (id, category_id, name, created_at) VALUES (?, ?, ?, ?)`).run(skillId, catId, skillName, t);
    skillsByCategory[catId].push(skillId);
  }
}

// ── Workers (20+) across cities near Vijayawada/Guntur/Vizag/Hyderabad ──
const cityCenters = {
  Vijayawada: [16.5062, 80.6480],
  Guntur: [16.3067, 80.4365],
  Visakhapatnam: [17.6868, 83.2185],
  Hyderabad: [17.3850, 78.4867],
};

const firstNames = ["Ravi", "Suresh", "Venkatesh", "Anil", "Srinivas", "Ramesh", "Naga Raju", "Krishna", "Mahesh", "Prasad",
  "Lakshmi", "Padma", "Kavitha", "Sunitha", "Anitha", "Rajani", "Swathi", "Divya", "Bhavani", "Radha",
  "Chandra Sekhar", "Vijay Kumar", "Satyanarayana", "Murali", "Prakash"];
const lastNames = ["Reddy", "Naidu", "Rao", "Babu", "Kumar", "Chowdary", "Varma", "Sarma", "Yadav", "Goud"];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randFloat(min, max, dp = 1) { return Number((Math.random() * (max - min) + min).toFixed(dp)); }
function jitter(base, km = 8) {
  const degPerKm = 1 / 111;
  return base + (Math.random() - 0.5) * 2 * km * degPerKm;
}

const cities = Object.keys(cityCenters);
const workers = [];
let phoneCounter = 9500000001;

for (let i = 0; i < 26; i++) {
  const city = cities[i % cities.length];
  const [lat, lng] = cityCenters[city];
  const society = societies.find((s) => s.city === city) || rand(societies);
  const cat = categories[i % categories.length];
  const name = `${rand(firstNames)} ${rand(lastNames)}`;
  const phone = String(phoneCounter++);
  const userId = id();
  const workerId = id();
  const experience = randFloat(1, 12);
  const verificationStatus = i < 22 ? "VERIFIED" : i < 25 ? "PENDING" : "UNDER_REVIEW";
  const isOnline = Math.random() > 0.35 ? 1 : 0;

  db.prepare(
    `INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, 'WORKER', ?, ?, ?)`
  ).run(userId, phone, `${name.split(" ")[0].toLowerCase()}${i}@sahakarsetu.demo`, hash(DEMO_PASSWORD), name, t, t);

  db.prepare(
    `INSERT INTO worker_profiles
      (id, user_id, society_id, bio, home_city, home_latitude, home_longitude, service_radius_km, languages,
       experience_years, verification_status, is_online, working_hours_start, working_hours_end, current_load,
       rating_avg, rating_count, jobs_completed, reliability_score, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '08:00', '20:00', ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    workerId, userId, society.id, `Cooperative-verified ${cat.name.toLowerCase()} professional serving ${city} and nearby areas.`,
    city, jitter(lat), jitter(lng), randFloat(4, 10, 0), rand(["en,hi,te", "te,en", "en,hi"]),
    experience, verificationStatus, isOnline, Math.floor(Math.random() * 3),
    verificationStatus === "VERIFIED" ? randFloat(3.6, 5.0) : 0,
    verificationStatus === "VERIFIED" ? Math.floor(Math.random() * 250) + 10 : 0,
    verificationStatus === "VERIFIED" ? Math.floor(Math.random() * 400) + 5 : 0,
    randFloat(80, 99, 0), t, t
  );

  // primary + one secondary skill
  const primarySkill = rand(skillsByCategory[cat.id]);
  db.prepare(`INSERT INTO worker_skills (id, worker_id, skill_id, level, years_exp, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id(), workerId, primarySkill, rand(["SKILLED", "EXPERT"]), experience, t);
  const otherCat = rand(categories.filter((c) => c.id !== cat.id));
  const secondarySkill = rand(skillsByCategory[otherCat.id]);
  db.prepare(`INSERT INTO worker_skills (id, worker_id, skill_id, level, years_exp, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(id(), workerId, secondarySkill, "BASIC", randFloat(0.5, 3), t);

  if (verificationStatus === "VERIFIED") {
    db.prepare(
      `INSERT INTO certifications (id, worker_id, title, issuing_body, issued_at, verified, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`
    ).run(id(), workerId, `Certified ${cat.name} Technician — Level ${rand(["1", "2", "3"])}`, "National Council for Cooperative Training (NCCT)", t, t);
  }

  const welfareEnrolled = verificationStatus === "VERIFIED" && Math.random() > 0.3 ? 1 : 0;
  db.prepare(
    `INSERT INTO welfare_profiles (id, worker_id, enrolled, policy_number, enrolled_at, created_at) VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id(), workerId, welfareEnrolled, welfareEnrolled ? `CWF-${100000 + i}` : null, welfareEnrolled ? t : null, t);

  workers.push({ id: workerId, userId, city, categoryId: cat.id, name, phone });
}

// ── Customers (8) ────────────────────────────────────────────────────────
const customerNames = ["Ananya Sharma", "Rahul Verma", "Priya Iyer", "Karthik Menon", "Sneha Patil", "Arjun Nair", "Deepika Rao", "Vikram Singh"];
const customers = [];
let custPhone = 9600000001;
for (const name of customerNames) {
  const userId = id();
  const customerId = id();
  const phone = String(custPhone++);
  db.prepare(`INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, 'CUSTOMER', ?, ?, ?)`)
    .run(userId, phone, `${name.split(" ")[0].toLowerCase()}@sahakarsetu.demo`, hash(DEMO_PASSWORD), name, t, t);
  db.prepare(`INSERT INTO customer_profiles (id, user_id, created_at) VALUES (?, ?, ?)`).run(customerId, userId, t);

  const city = rand(cities);
  const [lat, lng] = cityCenters[city];
  const addressId = id();
  db.prepare(
    `INSERT INTO addresses (id, customer_id, label, line1, city, state, pincode, latitude, longitude, is_default, created_at)
     VALUES (?, ?, 'Home', ?, ?, 'Andhra Pradesh', ?, ?, ?, 1, ?)`
  ).run(addressId, customerId, `${Math.floor(Math.random() * 200) + 1}, MG Road`, city, String(520000 + Math.floor(Math.random() * 900)), jitter(lat, 4), jitter(lng, 4), t);

  customers.push({ id: customerId, userId, name, phone, addressId, city });
}

// ── Demo accounts (fixed credentials for judges) ─────────────────────────
function createFixedUser(role, name, phone, email, extra) {
  const userId = id();
  db.prepare(`INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(userId, phone, email, hash(DEMO_PASSWORD), role, name, t, t);
  return userId;
}

const demoAdminId = createFixedUser("ADMIN", "NCCT Cooperative Admin", "9000000001", "admin@sahakarsetu.demo");

const demoCustomerId = createFixedUser("CUSTOMER", "Demo Customer", "9000000002", "customer@sahakarsetu.demo");
const demoCustomerProfileId = id();
db.prepare(`INSERT INTO customer_profiles (id, user_id, created_at) VALUES (?, ?, ?)`).run(demoCustomerProfileId, demoCustomerId, t);
const demoAddressId = id();
db.prepare(
  `INSERT INTO addresses (id, customer_id, label, line1, city, state, pincode, latitude, longitude, is_default, created_at)
   VALUES (?, ?, 'Home', '12-3-45, Bandar Road', 'Vijayawada', 'Andhra Pradesh', '520001', ?, ?, 1, ?)`
).run(demoAddressId, demoCustomerProfileId, jitter(cityCenters.Vijayawada[0], 3), jitter(cityCenters.Vijayawada[1], 3), t);

const demoWorkerId = createFixedUser("WORKER", "Demo Worker (Electrician)", "9000000003", "worker@sahakarsetu.demo");
const demoWorkerProfileId = id();
const electricalCat = categories.find((c) => c.slug === "electrical");
db.prepare(
  `INSERT INTO worker_profiles
    (id, user_id, society_id, bio, home_city, home_latitude, home_longitude, service_radius_km, languages,
     experience_years, verification_status, is_online, working_hours_start, working_hours_end, current_load,
     rating_avg, rating_count, jobs_completed, reliability_score, created_at, updated_at)
   VALUES (?, ?, ?, 'Demo verified electrician account for judges to explore the Worker app.', 'Vijayawada', ?, ?, 8, 'en,hi,te',
     8, 'VERIFIED', 1, '08:00', '20:00', 0, 4.8, 132, 240, 96, ?, ?)`
).run(demoWorkerProfileId, demoWorkerId, societies[0].id, jitter(cityCenters.Vijayawada[0], 2), jitter(cityCenters.Vijayawada[1], 2), t, t);
db.prepare(`INSERT INTO worker_skills (id, worker_id, skill_id, level, years_exp, created_at) VALUES (?, ?, ?, 'EXPERT', 8, ?)`)
  .run(id(), demoWorkerProfileId, skillsByCategory[electricalCat.id][0], t);
db.prepare(`INSERT INTO certifications (id, worker_id, title, issuing_body, issued_at, verified, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`)
  .run(id(), demoWorkerProfileId, "Certified Electrical Technician — Level 3", "National Council for Cooperative Training (NCCT)", t, t);
db.prepare(`INSERT INTO welfare_profiles (id, worker_id, enrolled, policy_number, enrolled_at, created_at) VALUES (?, ?, 1, 'CWF-900003', ?, ?)`)
  .run(id(), demoWorkerProfileId, t, t);
workers.push({ id: demoWorkerProfileId, userId: demoWorkerId, city: "Vijayawada", categoryId: electricalCat.id, name: "Demo Worker (Electrician)" });

// ── Demand records (28 days x categories x few hours) for AI forecasting ─
const zonesByCity = { Vijayawada: ["Zone A", "Zone B"], Guntur: ["Zone A"], Visakhapatnam: ["Zone A", "Zone B"], Hyderabad: ["Zone A", "Zone B", "Zone C"] };
const peakHours = [9, 10, 18, 19, 20];
for (const cat of categories) {
  // Force a couple of flagship categories into a strong, judge-visible uptrend;
  // let the rest vary naturally so the forecast dashboard shows a realistic mix.
  const forcedUptrend = ["electrical", "plumbing"].includes(cat.slug);
  const trendFactor = forcedUptrend ? randFloat(3.5, 5, 2) : randFloat(-1.5, 2.5, 2);
  for (let dayOffset = 27; dayOffset >= 0; dayOffset--) {
    const date = new Date(Date.now() - dayOffset * 86400000).toISOString().slice(0, 10);
    for (const city of cities) {
      for (const zone of zonesByCity[city]) {
        for (const hour of [8, 12, ...peakHours]) {
          const isPeak = peakHours.includes(hour);
          const base = isPeak ? randFloat(3, 8, 0) : randFloat(1, 4, 0);
          const trendBoost = Math.max(0, (27 - dayOffset) * trendFactor * 0.05);
          const count = Math.max(0, Math.round(base + trendBoost));
          if (count === 0) continue;
          db.prepare(
            `INSERT INTO demand_records (id, category_id, city, zone, date, hour, request_count) VALUES (?, ?, ?, ?, ?, ?, ?)`
          ).run(id(), cat.id, city, zone, date, hour, count);
        }
      }
    }
  }
}

// ── Sample bookings (mix of statuses) so dashboards aren't empty ─────────
function pickWorkerFor(categoryId, city) {
  return workers.find((w) => w.categoryId === categoryId && w.city === city) || workers.find((w) => w.categoryId === categoryId) || workers[0];
}

const bookingStatuses = ["COMPLETED", "COMPLETED", "COMPLETED", "IN_PROGRESS", "ASSIGNED", "CANCELLED", "COMPLETED"];
let bookingCount = 0;
for (const customer of customers) {
  const numBookings = Math.floor(Math.random() * 3) + 1;
  for (let n = 0; n < numBookings; n++) {
    const cat = rand(categories);
    const worker = pickWorkerFor(cat.id, customer.city);
    const status = rand(bookingStatuses);
    const bookingId = id();
    const daysAgo = Math.floor(Math.random() * 20);
    const scheduledAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
    const price = cat.baseRate + Math.floor(Math.random() * 100);
    const workerPayout = Math.round(price * 0.84);
    const welfareShare = Math.round(price * 0.08);
    const platformShare = price - workerPayout - welfareShare;

    db.prepare(
      `INSERT INTO bookings
        (id, customer_id, worker_id, category_id, address_id, is_emergency, description, scheduled_at, status,
         estimated_price, final_price, worker_payout, welfare_share, platform_share, match_score, match_reason,
         eta_minutes, created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      bookingId, customer.id, worker.id, cat.id, customer.addressId, Math.random() > 0.85 ? 1 : 0,
      `${cat.name} service requested`, scheduledAt, status, price,
      status === "COMPLETED" ? price : null,
      status === "COMPLETED" ? workerPayout : null,
      status === "COMPLETED" ? welfareShare : null,
      status === "COMPLETED" ? platformShare : null,
      randFloat(70, 98, 0), "nearby, certified, available", Math.floor(Math.random() * 20) + 5,
      scheduledAt, scheduledAt, status === "COMPLETED" ? scheduledAt : null
    );
    db.prepare(`INSERT INTO booking_status_logs (id, booking_id, status, created_at) VALUES (?, ?, 'PENDING', ?)`).run(id(), bookingId, scheduledAt);
    db.prepare(`INSERT INTO booking_status_logs (id, booking_id, status, created_at) VALUES (?, ?, ?, ?)`).run(id(), bookingId, status, scheduledAt);

    if (status === "COMPLETED") {
      const paid = Math.random() > 0.2;
      if (paid) {
        db.prepare(
          `INSERT INTO payments (id, booking_id, amount, method, status, transaction_ref, invoice_no, paid_at, created_at)
           VALUES (?, ?, ?, ?, 'PAID', ?, ?, ?, ?)`
        ).run(id(), bookingId, price, rand(["UPI", "CARD", "WALLET", "CASH"]), `DEMO-${Date.now()}-${bookingCount}`, `INV-2026-${100000 + bookingCount}`, scheduledAt, scheduledAt);

        if (Math.random() > 0.3) {
          const rating = Math.floor(Math.random() * 2) + 4; // 4-5
          db.prepare(
            `INSERT INTO reviews (id, booking_id, customer_id, worker_id, rating, punctuality, professionalism, value_for_money, comment, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).run(id(), bookingId, customer.id, worker.id, rating, rating, rating, rating, "Great service, on time and professional.", scheduledAt);
        }
      }
    }
    bookingCount++;
  }
}

// ── Society Admins (one per society) + Institutions + Contracts + Quotations
// ── + the flagship "Cooperative A shortage / Cooperative B surplus" scenario
console.log("Seeding institutional contracts, society admins, and capacity network demo...");

const societyAdminIds = [];
let societyAdminPhone = 9700000001;
for (const society of societies) {
  const userId = id();
  db.prepare(`INSERT INTO users (id, phone, email, password_hash, role, name, society_id, created_at, updated_at) VALUES (?, ?, ?, ?, 'SOCIETY_ADMIN', ?, ?, ?, ?)`)
    .run(userId, String(societyAdminPhone++), `admin.${society.city.toLowerCase()}@sahakarsetu.demo`, hash(DEMO_PASSWORD), `${society.city} Cooperative Admin`, society.id, t, t);
  societyAdminIds.push({ userId, societyId: society.id, city: society.city });
}
// Fixed demo society admin account for judges (Vijayawada society)
const demoSocietyAdminId = createFixedUser("SOCIETY_ADMIN", "Vijayawada Cooperative Admin", "9000000004", "society.admin@sahakarsetu.demo");
db.prepare(`UPDATE users SET society_id = ? WHERE id = ?`).run(societies[0].id, demoSocietyAdminId);

// Institutions
const institutionDefs = [
  { name: "Sri Sai Apartments Welfare Association", type: "apartment", city: "Vijayawada" },
  { name: "KL University", type: "college", city: "Guntur" },
  { name: "Andhra Government Hospital", type: "hospital", city: "Visakhapatnam" },
  { name: "Vijayawada Municipal Corporation", type: "municipal", city: "Vijayawada" },
  { name: "Tech Mahindra Business Park", type: "company", city: "Hyderabad" },
];
const institutions = [];
let instPhone = 9800000001;
for (const def of institutionDefs) {
  const userId = id();
  const phone = String(instPhone++);
  db.prepare(`INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, 'INSTITUTION', ?, ?, ?)`)
    .run(userId, phone, `contact@${def.name.toLowerCase().replace(/[^a-z]/g, "").slice(0, 15)}.demo`, hash(DEMO_PASSWORD), def.name, t, t);
  const instId = id();
  const [lat, lng] = cityCenters[def.city];
  db.prepare(`INSERT INTO institutions (id, user_id, org_name, org_type, city, latitude, longitude, contact_designation, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(instId, userId, def.name, def.type, def.city, jitter(lat, 2), jitter(lng, 2), "Facility Manager", t);
  institutions.push({ id: instId, userId, name: def.name, city: def.city });
}
// Fixed demo institution account for judges
const demoInstUserId = createFixedUser("INSTITUTION", "Demo Institution (Apartment Assoc.)", "9000000005", "institution@sahakarsetu.demo");
const demoInstId = id();
db.prepare(`INSERT INTO institutions (id, user_id, org_name, org_type, city, latitude, longitude, contact_designation, created_at) VALUES (?, ?, 'Demo Apartments Welfare Association', 'apartment', 'Vijayawada', ?, ?, 'Secretary', ?)`)
  .run(demoInstId, demoInstUserId, jitter(cityCenters.Vijayawada[0], 2), jitter(cityCenters.Vijayawada[1], 2), t);
institutions.push({ id: demoInstId, userId: demoInstUserId, name: "Demo Apartments Welfare Association", city: "Vijayawada" });

// Contracts + requirements + quotations ("20 electricians + 10 plumbers for 3 months")
const electricalCatForContracts = categories.find((c) => c.slug === "electrical");
const plumbingCat = categories.find((c) => c.slug === "plumbing");
const cleaningCat = categories.find((c) => c.slug === "cleaning");

function makeContract(institution, title, description, durationMonths, slaHours, requirements, status = "OPEN") {
  const contractId = id();
  db.prepare(`INSERT INTO contracts (id, institution_id, title, description, duration_months, sla_response_hours, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(contractId, institution.id, title, description, durationMonths, slaHours, status, t);
  for (const r of requirements) {
    db.prepare(`INSERT INTO contract_requirements (id, contract_id, category_id, workers_needed, min_experience_years) VALUES (?, ?, ?, ?, ?)`)
      .run(id(), contractId, r.categoryId, r.workersNeeded, r.minExperienceYears ?? 1);
  }
  return contractId;
}

const contract1 = makeContract(
  institutions[0], "Apartment Complex Annual Maintenance",
  "20 electricians + 10 plumbers required for 3 months of on-call maintenance coverage.",
  3, 4, [
    { categoryId: electricalCatForContracts.id, workersNeeded: 20, minExperienceYears: 2 },
    { categoryId: plumbingCat.id, workersNeeded: 10, minExperienceYears: 2 },
  ], "QUOTED"
);
const contract2 = makeContract(
  institutions[1], "Campus Facility Upkeep — Semester Contract",
  "Ongoing electrical and cleaning support across university campus buildings.",
  6, 8, [
    { categoryId: electricalCatForContracts.id, workersNeeded: 8, minExperienceYears: 1 },
    { categoryId: cleaningCat.id, workersNeeded: 15, minExperienceYears: 0 },
  ], "AWARDED"
);
const contract3 = makeContract(
  institutions[2], "Hospital Facility Maintenance", "Round-the-clock electrical and plumbing support for hospital wards.",
  12, 2, [
    { categoryId: electricalCatForContracts.id, workersNeeded: 5, minExperienceYears: 3 },
    { categoryId: plumbingCat.id, workersNeeded: 3, minExperienceYears: 3 },
  ], "OPEN"
);
const contract4 = makeContract(
  institutions[institutions.length - 1], "Demo Institution — Society Maintenance Contract (try this one!)",
  "20 electricians + 10 plumbers required for 3 months — post/quote/award this one live in the demo.",
  3, 6, [
    { categoryId: electricalCatForContracts.id, workersNeeded: 20, minExperienceYears: 2 },
    { categoryId: plumbingCat.id, workersNeeded: 10, minExperienceYears: 1 },
  ], "OPEN"
);

// Quotations from societies on contract1 (QUOTED) and contract2 (AWARDED)
function makeQuotation(contractId, society, totalPrice, workersOffered, slaHours, status = "SUBMITTED") {
  const qId = id();
  db.prepare(`INSERT INTO quotations (id, contract_id, society_id, total_price, workers_offered, notes, sla_commitment_hours, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(qId, contractId, society.id, totalPrice, workersOffered, "Verified cooperative workforce, welfare-enrolled.", slaHours, status, t);
  return qId;
}
makeQuotation(contract1, societies[0], 450000, 30, 4, "SUBMITTED");
makeQuotation(contract1, societies[1], 480000, 30, 3, "SUBMITTED");
const awardedQuoteId = makeQuotation(contract2, societies[0], 620000, 23, 6, "AWARDED");
db.prepare(`UPDATE contracts SET awarded_society_id = ?, awarded_quotation_id = ?, awarded_at = ? WHERE id = ?`)
  .run(societies[0].id, awardedQuoteId, t, contract2);

// ── Flagship demo scenario: Cooperative A (Vijayawada) has an electrician
// shortage; Cooperative B (Guntur) has surplus capacity. Achieved by simply
// having far fewer online/verified electricians in society[0] than in
// society[1] within the worker seed above — this block adds a couple more
// verified, online electricians specifically to Guntur's society to make
// the surplus obvious in the capacity matrix, and logs an OPEN sharing
// request from Vijayawada so the admin UI has something to act on immediately.
for (let i = 0; i < 3; i++) {
  const userId = id();
  const workerId = id();
  const phone = String(9510000001 + i);
  db.prepare(`INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, 'WORKER', ?, ?, ?)`)
    .run(userId, phone, `guntur.electrician${i}@sahakarsetu.demo`, hash(DEMO_PASSWORD), `${rand(firstNames)} ${rand(lastNames)}`, t, t);
  db.prepare(
    `INSERT INTO worker_profiles (id, user_id, society_id, home_city, home_latitude, home_longitude, service_radius_km, languages, experience_years, verification_status, is_online, current_load, rating_avg, rating_count, jobs_completed, reliability_score, created_at, updated_at)
     VALUES (?, ?, ?, 'Guntur', ?, ?, 8, 'en,te', ?, 'VERIFIED', 1, 0, ?, ?, ?, 92, ?, ?)`
  ).run(workerId, userId, societies[1].id, jitter(cityCenters.Guntur[0]), jitter(cityCenters.Guntur[1]), randFloat(3, 8), randFloat(4.2, 4.9), Math.floor(Math.random() * 100) + 20, Math.floor(Math.random() * 150) + 30, t, t);
  db.prepare(`INSERT INTO worker_skills (id, worker_id, skill_id, level, years_exp, created_at) VALUES (?, ?, ?, 'EXPERT', ?, ?)`)
    .run(id(), workerId, skillsByCategory[electricalCatForContracts.id][0], randFloat(3, 8), t);
}

const shortageRequestId = id();
db.prepare(`INSERT INTO capacity_sharing_requests (id, requesting_society_id, category_id, workers_requested, reason, status, created_at) VALUES (?, ?, ?, ?, ?, 'OPEN', ?)`)
  .run(shortageRequestId, societies[0].id, electricalCatForContracts.id, 6, "Predicted 21% demand increase next week exceeds current available electricians.", t);

// Training records (a few workers get a recommended/enrolled/completed record)
for (const w of workers.slice(0, 6)) {
  const statuses = ["RECOMMENDED", "ENROLLED", "COMPLETED"];
  db.prepare(`INSERT INTO training_records (id, worker_id, title, provider, status, completed_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(id(), w.id, "Advanced Safety & Customer Service Training", "National Council for Cooperative Training (NCCT)", rand(statuses), Math.random() > 0.5 ? t : null, t);
}

// A couple of demo grievances so the admin queue isn't empty
if (customers.length && workers.length) {
  db.prepare(`INSERT INTO grievances (id, raised_by_user_id, against_worker_id, category, description, status, is_sos, created_at) VALUES (?, ?, ?, ?, ?, 'OPEN', 0, ?)`)
    .run(id(), customers[0].userId, workers[0].id, "Service Quality", "Worker arrived later than the ETA shown in the app.", t);
}

console.log(`  Institutions: ${institutions.length}
  Contracts: 4 (mixed OPEN/QUOTED/AWARDED)
  Society Admins: ${societyAdminIds.length + 1} (incl. demo account)
  Capacity-sharing demo: Vijayawada electrician shortage -> Guntur surplus
  Demo institution login: 9000000005
  Demo society admin login: 9000000004`);

console.log(`Seed complete:
  Federations: ${federations.length}
  Cooperative societies: ${societies.length}
  Service categories: ${categories.length}
  Workers: ${workers.length}
  Customers: ${customers.length + 1}
  Bookings: ${bookingCount}

Demo credentials (password for all: ${DEMO_PASSWORD}):
  Admin:    9000000001
  Customer: 9000000002
  Worker:   9000000003
`);
