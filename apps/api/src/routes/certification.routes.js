import { Router } from "express";
import { z } from "zod";
import { db, id, now, audit, mapCertification } from "../db/index.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validate } from "../middlewares/validate.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
router.use(authenticate);

// Worker submits a certification (with an uploaded document URL) for review —
// previously certifications could only be created via seed data.
router.post(
  "/",
  requireRole("WORKER"),
  validate(z.object({ title: z.string().min(3), issuingBody: z.string().min(2), issuedAt: z.string(), documentUrl: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const worker = db.prepare(`SELECT * FROM worker_profiles WHERE user_id = ?`).get(req.user.id);
    if (!worker) throw new AppError("Worker profile not found", 404);
    const certId = id();
    db.prepare(
      `INSERT INTO certifications (id, worker_id, title, issuing_body, issued_at, verified, status, document_url, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 'PENDING', ?, ?)`
    ).run(certId, worker.id, req.body.title, req.body.issuingBody, req.body.issuedAt, req.body.documentUrl || null, now());
    ok(res, mapCertification(db.prepare(`SELECT * FROM certifications WHERE id = ?`).get(certId)), null, 201);
  })
);

router.get(
  "/pending",
  requireRole("ADMIN", "SOCIETY_ADMIN", "SUPER_ADMIN"),
  asyncHandler(async (req, res) => {
    let query = `SELECT c.*, wp.society_id, u.name as worker_name FROM certifications c
       JOIN worker_profiles wp ON wp.id = c.worker_id JOIN users u ON u.id = wp.user_id WHERE c.status = 'PENDING'`;
    const params = [];
    if (req.user.role === "SOCIETY_ADMIN") {
      const admin = db.prepare(`SELECT society_id FROM users WHERE id = ?`).get(req.user.id);
      query += ` AND wp.society_id = ?`;
      params.push(admin.society_id);
    }
    const rows = db.prepare(query).all(...params);
    ok(res, rows.map((r) => ({ ...mapCertification(r), workerName: r.worker_name })));
  })
);

router.post(
  "/:id/review",
  requireRole("ADMIN", "SOCIETY_ADMIN", "SUPER_ADMIN"),
  validate(z.object({ status: z.enum(["APPROVED", "REJECTED"]), reviewNote: z.string().optional() })),
  asyncHandler(async (req, res) => {
    const cert = db.prepare(`SELECT * FROM certifications WHERE id = ?`).get(req.params.id);
    if (!cert) throw new AppError("Certification not found", 404);
    db.prepare(`UPDATE certifications SET status = ?, verified = ?, review_note = ? WHERE id = ?`)
      .run(req.body.status, req.body.status === "APPROVED" ? 1 : 0, req.body.reviewNote || null, cert.id);
    audit(req.user.id, "CERTIFICATION_REVIEW", "certification", cert.id, { status: req.body.status });
    ok(res, mapCertification(db.prepare(`SELECT * FROM certifications WHERE id = ?`).get(cert.id)));
  })
);

export default router;
