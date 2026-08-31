import { Router } from "express";
import { db, mapNotification } from "../db/index.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok } from "../utils/response.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = db.prepare(`SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(req.user.id);
    ok(res, rows.map(mapNotification));
  })
);

router.patch(
  "/:id/read",
  asyncHandler(async (req, res) => {
    db.prepare(`UPDATE notifications SET is_read = 1 WHERE id = ?`).run(req.params.id);
    ok(res, mapNotification(db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(req.params.id)));
  })
);

export default router;
