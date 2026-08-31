import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as institutionService from "../services/institution.service.js";

const router = Router();
router.use(authenticate, requireRole("INSTITUTION"));

router.post(
  "/register",
  validate(
    z.object({
      orgName: z.string().min(2),
      orgType: z.enum(["apartment", "college", "hospital", "municipal", "company", "government", "other"]),
      city: z.string().min(2),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      contactDesignation: z.string().optional(),
    })
  ),
  asyncHandler(async (req, res) => ok(res, await institutionService.registerInstitution(req.user.id, req.body), null, 201))
);

router.get("/me", asyncHandler(async (req, res) => ok(res, await institutionService.myInstitution(req.user.id))));

router.post(
  "/contracts",
  validate(
    z.object({
      title: z.string().min(3),
      description: z.string().optional(),
      durationMonths: z.number().positive(),
      slaResponseHours: z.number().positive().optional(),
      requirements: z.array(z.object({ categoryId: z.string(), workersNeeded: z.number().int().positive(), minExperienceYears: z.number().optional() })).min(1),
    })
  ),
  asyncHandler(async (req, res) => ok(res, await institutionService.postContract(req.user.id, req.body), null, 201))
);

router.get("/contracts", asyncHandler(async (req, res) => ok(res, await institutionService.myContracts(req.user.id))));

router.post(
  "/contracts/:contractId/award/:quotationId",
  asyncHandler(async (req, res) => ok(res, await institutionService.awardContract(req.params.contractId, req.params.quotationId, req.user.id)))
);

export default router;
