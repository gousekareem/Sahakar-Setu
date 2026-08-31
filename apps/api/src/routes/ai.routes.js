import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import * as forecastService from "../services/forecast.service.js";
import { findAndScoreWorkers } from "../services/matching.service.js";

const router = Router();

router.get(
  "/demand-forecast",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    const { categoryId } = req.query;
    ok(res, categoryId ? await forecastService.forecastDemand(categoryId) : await forecastService.forecastAllCategories());
  })
);

router.get(
  "/workforce-recommendation",
  authenticate,
  requireRole("ADMIN"),
  asyncHandler(async (req, res) => {
    ok(res, await forecastService.workforceRecommendation());
  })
);

router.post(
  "/match-worker",
  asyncHandler(async (req, res) => {
    const { categoryId, latitude, longitude, isEmergency } = req.body;
    ok(res, await findAndScoreWorkers({ categoryId, latitude, longitude, isEmergency }));
  })
);

export default router;
