const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// All notification routes require authenticated customer
router.get("/", authenticateToken, requireRole("customer"), notificationController.getMyNotifications);
router.patch("/:id/read", authenticateToken, requireRole("customer"), notificationController.markRead);

module.exports = router;
