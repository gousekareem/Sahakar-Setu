import { Router } from "express";
import { authenticate, requireRole } from "../middlewares/auth.js";
import * as ctrl from "../controllers/worker.controller.js";

const router = Router();

router.get("/nearby", ctrl.nearby);

router.get("/me/dashboard", authenticate, requireRole("WORKER"), ctrl.dashboard);
router.get("/me/jobs", authenticate, requireRole("WORKER"), ctrl.myJobs);
router.post("/me/availability", authenticate, requireRole("WORKER"), ctrl.setAvailability);
router.post("/me/location", authenticate, requireRole("WORKER"), ctrl.updateLocation);
router.post("/me/bank-details", authenticate, requireRole("WORKER"), ctrl.updateBankDetails);
router.post("/me/blocked-dates", authenticate, requireRole("WORKER"), ctrl.blockDate);

router.get("/:id", ctrl.publicProfile);

export default router;
