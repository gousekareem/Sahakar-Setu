import bcrypt from "bcryptjs";
import { db, id, now, mapUser, mapWorker, mapCustomer } from "../db/index.js";
import { AppError } from "../utils/AppError.js";
import { signToken } from "../utils/jwt.js";

const publicUser = (user) => ({
  id: user.id, name: user.name, phone: user.phone, email: user.email,
  role: user.role, preferredLanguage: user.preferredLanguage,
});

function findUserByPhoneOrEmail(phone, email) {
  const row = db
    .prepare(`SELECT * FROM users WHERE phone = ? ${email ? "OR email = ?" : ""}`)
    .get(...(email ? [phone, email] : [phone]));
  return mapUser(row);
}

export async function registerCustomer({ name, phone, email, password }) {
  if (findUserByPhoneOrEmail(phone, email)) {
    throw new AppError("An account with this phone/email already exists", 409);
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = id();
  const t = now();
  db.prepare(
    `INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'CUSTOMER', ?, ?, ?)`
  ).run(userId, phone, email || null, passwordHash, name, t, t);
  db.prepare(`INSERT INTO customer_profiles (id, user_id, created_at) VALUES (?, ?, ?)`).run(id(), userId, t);

  const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId));
  return { user: publicUser(user), token: signToken(user) };
}

export async function registerWorker(payload) {
  const {
    name, phone, email, password, societyId, homeCity, homeLatitude, homeLongitude,
    serviceRadiusKm, languages, experienceYears, skillIds = [],
  } = payload;

  if (findUserByPhoneOrEmail(phone, email)) {
    throw new AppError("An account with this phone/email already exists", 409);
  }
  const society = db.prepare(`SELECT * FROM cooperative_societies WHERE id = ?`).get(societyId);
  if (!society) throw new AppError("Selected cooperative society was not found", 404);

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = id();
  const workerId = id();
  const t = now();

  const insertAll = db.transaction(() => {
    db.prepare(
      `INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'WORKER', ?, ?, ?)`
    ).run(userId, phone, email || null, passwordHash, name, t, t);

    db.prepare(
      `INSERT INTO worker_profiles
        (id, user_id, society_id, home_city, home_latitude, home_longitude, service_radius_km,
         languages, experience_years, verification_status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
    ).run(
      workerId, userId, societyId, homeCity, homeLatitude, homeLongitude,
      serviceRadiusKm ?? 6, languages ?? "en", experienceYears ?? 0, t, t
    );

    db.prepare(`INSERT INTO welfare_profiles (id, worker_id, enrolled, created_at) VALUES (?, ?, 0, ?)`).run(id(), workerId, t);

    for (const skillId of skillIds) {
      db.prepare(
        `INSERT INTO worker_skills (id, worker_id, skill_id, level, years_exp, created_at) VALUES (?, ?, ?, 'BASIC', 0, ?)`
      ).run(id(), workerId, skillId, t);
    }
  });
  insertAll();

  const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId));
  return { user: publicUser(user), token: signToken(user) };
}

export async function registerInstitutionUser({ name, phone, email, password }) {
  const existing = findUserByPhoneOrEmail(phone, email);
  if (existing) throw new AppError("An account with this phone/email already exists", 409);
  const passwordHash = await bcrypt.hash(password, 10);
  const userId = id();
  const t = now();
  db.prepare(
    `INSERT INTO users (id, phone, email, password_hash, role, name, created_at, updated_at) VALUES (?, ?, ?, ?, 'INSTITUTION', ?, ?, ?)`
  ).run(userId, phone, email || null, passwordHash, name, t, t);
  const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId));
  return { user: publicUser(user), token: signToken(user) };
}

export async function login({ phone, password }) {
  const row = db.prepare(`SELECT * FROM users WHERE phone = ?`).get(phone);
  const user = mapUser(row);
  if (!user) throw new AppError("Invalid phone number or password", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new AppError("Invalid phone number or password", 401);
  if (!user.isActive) throw new AppError("This account has been deactivated", 403);

  return { user: publicUser(user), token: signToken(user) };
}

export async function me(userId) {
  const user = mapUser(db.prepare(`SELECT * FROM users WHERE id = ?`).get(userId));
  if (!user) throw new AppError("User not found", 404);

  const workerProfile = mapWorker(db.prepare(`SELECT * FROM worker_profiles WHERE user_id = ?`).get(userId));
  const customerProfile = mapCustomer(db.prepare(`SELECT * FROM customer_profiles WHERE user_id = ?`).get(userId));

  return { ...publicUser(user), workerProfile: workerProfile || null, customerProfile: customerProfile || null };
}
