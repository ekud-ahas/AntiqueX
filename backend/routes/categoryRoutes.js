const express = require("express");
const router = express.Router();

const {
    getCategories,
    getCategory,
    getCategoryItems,
    createCategory,
    deleteCategory
} = require("../controllers/categoryController");
const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

// Public endpoints
router.get("/", getCategories);
router.get("/:id", getCategory);
router.get("/:id/items", getCategoryItems);

// Admin-only endpoints: Create and Delete Category (Enforces Role Separation)
router.post("/", authenticateToken, requireRole("super_admin", "moderator", "admin"), createCategory);
router.delete("/:id", authenticateToken, requireRole("super_admin", "moderator", "admin"), deleteCategory);

module.exports = router;
