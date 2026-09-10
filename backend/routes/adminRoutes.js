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

// ─── Role Permission Guards ───────────────────────────────────────────────────
//
// Role model (two admin roles):
//   admin     → full control (users, categories, items, auctions, stats)
//   moderator → limited control (stats, items, auction status only)
//
// The customer role is implicitly encoded by table membership: a row in the
// `users` table is always a customer. A row in the `admins` table carries an
// explicit `role` column ('admin' | 'moderator') read from the DB at login.
// This two-table design is intentional per the ERD and avoids duplicating
// role data across a shared users table.
//
// ─────────────────────────────────────────────────────────────────────────────

// Admin only — sensitive operations (user management, category management)
const adminOnly = [authenticateToken, requireRole("admin")];

// Admin or Moderator — moderation operations (view stats, moderate auctions/items)
const adminOrModerator = [authenticateToken, requireRole("admin", "moderator")];

// 1. Platform Statistics — admin & moderator can view
router.get("/stats", ...adminOrModerator, getPlatformStats);

// 2. User Management — admin only
router.get("/users", ...adminOnly, getAdminUsers);
router.patch("/users/:id/status", ...adminOnly, toggleUserStatus);

// 3. Item & Auction Moderation — admin & moderator can moderate
router.get("/items", ...adminOrModerator, getAdminItems);
router.patch("/auctions/:id/status", ...adminOrModerator, toggleAuctionStatus);

// 4. Category Management — admin only
router.delete("/categories/:id", ...adminOnly, deleteAdminCategory);

module.exports = router;

