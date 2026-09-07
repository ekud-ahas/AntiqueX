const express = require("express");
const router = express.Router();

const {
    getPlatformStats,
    getAdminUsers,
    toggleUserStatus,
    getAdminItems,
    toggleAuctionStatus,
    deleteAdminCategory
} = require("../controllers/adminController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Middleware helper
const adminAuth = [authenticateToken, requireRole("super_admin", "moderator", "admin")];

// 1. Platform Statistics
router.get("/stats", ...adminAuth, getPlatformStats);

// 2. User Management
router.get("/users", ...adminAuth, getAdminUsers);
router.patch("/users/:id/status", ...adminAuth, toggleUserStatus);

// 3. Item & Auction Moderation
router.get("/items", ...adminAuth, getAdminItems);
router.patch("/auctions/:id/status", ...adminAuth, toggleAuctionStatus);

// 4. Category Management
router.delete("/categories/:id", ...adminAuth, deleteAdminCategory);

module.exports = router;
