import { Router } from "express";
import authRoutes from "./auth.routes.js";
import catalogRoutes from "./catalog.routes.js";
import workerRoutes from "./worker.routes.js";
import addressRoutes from "./address.routes.js";
import bookingRoutes from "./booking.routes.js";
import paymentRoutes from "./payment.routes.js";
import reviewRoutes from "./review.routes.js";
import notificationRoutes from "./notification.routes.js";
import welfareRoutes from "./welfare.routes.js";
import adminRoutes from "./admin.routes.js";
import aiRoutes from "./ai.routes.js";
import uploadRoutes from "./upload.routes.js";
import grievanceRoutes from "./grievance.routes.js";
import messageRoutes from "./message.routes.js";
import certificationRoutes from "./certification.routes.js";
import societyAdminRoutes from "./societyAdmin.routes.js";
import institutionRoutes from "./institution.routes.js";
import contractRoutes from "./contract.routes.js";

const router = Router();

router.get("/health", (req, res) => res.json({ success: true, service: "SahakarSetu API", status: "ok", time: new Date().toISOString() }));

router.use("/auth", authRoutes);
router.use("/", catalogRoutes); // /services, /societies
router.use("/workers", workerRoutes);
router.use("/addresses", addressRoutes);
router.use("/bookings", bookingRoutes);
router.use("/payments", paymentRoutes);
router.use("/reviews", reviewRoutes);
router.use("/notifications", notificationRoutes);
router.use("/welfare", welfareRoutes);
router.use("/admin", adminRoutes);
router.use("/ai", aiRoutes);
router.use("/upload", uploadRoutes);
router.use("/grievances", grievanceRoutes);
router.use("/messages", messageRoutes);
router.use("/certifications", certificationRoutes);
router.use("/society-admin", societyAdminRoutes);
router.use("/institutions", institutionRoutes);
router.use("/contracts", contractRoutes);

export default router;
