import { Router } from "express";
import * as ctrl from "../controllers/catalog.controller.js";

const router = Router();

router.get("/services", ctrl.listCategories);
router.get("/services/emergency", ctrl.listEmergencyCategories);
router.get("/societies", ctrl.listSocieties);
router.get("/stats", ctrl.publicStats);

export default router;
