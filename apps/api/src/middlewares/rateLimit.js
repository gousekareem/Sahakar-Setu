import rateLimit from "express-rate-limit";

// Protects the login endpoint against brute-force credential guessing.
// 20 attempts per 15 minutes per IP is generous enough for a real user who
// mistypes a password a few times, but blocks scripted brute force.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many login attempts. Please try again in a few minutes." } },
});
