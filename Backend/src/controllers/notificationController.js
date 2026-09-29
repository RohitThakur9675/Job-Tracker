import { Notification } from "../models/Notification.js";

export async function listNotifications(req, res) {
  const notifications = await Notification.find({ user: req.userId }).sort({ createdAt: -1 }).limit(100);
  res.json(notifications);
}

export async function unreadCount(req, res) {
  const count = await Notification.countDocuments({ user: req.userId, isRead: false });
  res.json({ count });
}

export async function markRead(req, res) {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, user: req.userId },
    { isRead: true },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Notification not found." });
  res.json(notification);
}

export async function markAllRead(req, res) {
  await Notification.updateMany({ user: req.userId, isRead: false }, { isRead: true });
  res.json({ message: "All notifications marked as read." });
}
