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

// Admin-only endpoints: Create and Delete Category
// Moderators can moderate auctions/items but cannot manage the category taxonomy.
router.post("/", authenticateToken, requireRole("admin"), createCategory);
router.delete("/:id", authenticateToken, requireRole("admin"), deleteCategory);

module.exports = router;
