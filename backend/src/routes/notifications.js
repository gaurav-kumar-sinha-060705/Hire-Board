import { Router } from "express";
import { findNotificationsByUserId, countUnreadNotifications, markNotificationRead, markAllNotificationsRead } from "../db.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();

// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
  const list = await findNotificationsByUserId(req.user.id);
  const unread = await countUnreadNotifications(req.user.id);
  res.json({ notifications: list, unread });
});

// PATCH /api/notifications/:id/read
router.patch("/:id/read", authenticate, async (req, res) => {
  await markNotificationRead(Number(req.params.id), req.user.id);
  const unread = await countUnreadNotifications(req.user.id);
  res.json({ unread });
});

// PATCH /api/notifications/read-all
router.patch("/read-all", authenticate, async (req, res) => {
  await markAllNotificationsRead(req.user.id);
  res.json({ unread: 0 });
});

export default router;
