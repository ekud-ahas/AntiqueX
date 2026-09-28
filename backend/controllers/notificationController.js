const notificationModel = require("../models/notificationModel");

// GET /api/notifications
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user.userId;
        const notifications = await notificationModel.getUserNotifications(userId);
        res.json(notifications);
    } catch (error) {
        console.error("GET NOTIFICATIONS ERROR:", error);
        res.status(500).json({ error: "Failed to retrieve notifications" });
    }
};

// PATCH /api/notifications/:id/read or PATCH /api/notifications/read-all
const markRead = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { id } = req.params;
        if (!(typeof id === "string" && id.length > 10 && id.includes("-")) && (isNaN(Number(id)) || Number(id) <= 0)) return res.status(400).json({ error: "Invalid ID parameter" });
        const result = await notificationModel.markAsRead(userId, id === "all" ? null : id);
        res.json({ message: "Marked as read", result });
    } catch (error) {
        console.error("MARK READ ERROR:", error);
        res.status(500).json({ error: "Failed to update notifications" });
    }
};

module.exports = {
    getMyNotifications,
    markRead
};
