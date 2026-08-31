import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import * as ctrl from "../controllers/auth.controller.js";

const router = Router();

const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number");

router.post(
  "/register/customer",
  validate(
    z.object({
      name: z.string().min(2),
      phone: phoneSchema,
      email: z.string().email().optional(),
      password: z.string().min(6),
    })
  ),
  ctrl.registerCustomer
);

router.post(
  "/register/worker",
  validate(
    z.object({
      name: z.string().min(2),
      phone: phoneSchema,
      email: z.string().email().optional(),
      password: z.string().min(6),
      societyId: z.string(),
      homeCity: z.string(),
      homeLatitude: z.number(),
      homeLongitude: z.number(),
      serviceRadiusKm: z.number().optional(),
      languages: z.string().optional(),
      experienceYears: z.number().optional(),
      skillIds: z.array(z.string()).optional(),
    })
  ),
  ctrl.registerWorker
);

router.post(
  "/login",
  validate(z.object({ phone: phoneSchema, password: z.string().min(6) })),
  ctrl.login
);

router.post(
  "/register/institution",
  validate(z.object({ name: z.string().min(2), phone: phoneSchema, email: z.string().email().optional(), password: z.string().min(6) })),
  ctrl.registerInstitution
);

router.get("/me", authenticate, ctrl.me);

export default router;
