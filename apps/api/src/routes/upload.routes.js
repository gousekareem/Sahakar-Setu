import { Router } from "express";
import { authenticate } from "../middlewares/auth.js";
import { upload, publicUrlFor } from "../middlewares/upload.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate);

// Generic authenticated file upload — used for booking issue/completion
// photos, worker profile photos, and certification documents. Returns a
// real, served URL (not a placeholder) that other endpoints store verbatim
// in photoUrl / documentUrl columns.
router.post(
  "/",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) return next(new AppError(err.message, 400));
      next();
    });
  },
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError("No file uploaded", 400);
    ok(res, { url: publicUrlFor(req.file.filename), originalName: req.file.originalname, size: req.file.size }, null, 201);
  })
);

export default router;
