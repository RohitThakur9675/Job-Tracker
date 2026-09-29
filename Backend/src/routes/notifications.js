import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import * as notificationController from "../controllers/notificationController.js";

const router = Router();
router.use(requireAuth);

router.get("/", notificationController.listNotifications);
router.get("/unread-count", notificationController.unreadCount);
router.patch("/read-all", notificationController.markAllRead);
router.patch("/:id/read", notificationController.markRead);

export default router;
