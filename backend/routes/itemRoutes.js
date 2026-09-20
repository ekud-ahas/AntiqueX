const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { authenticateToken, requireRole, optionalAuth } = require("../middleware/authMiddleware");

const {
    getItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
    addItemImage,
    getItemImages,
    deleteItemImage
} = require("../controllers/itemController");

// Public endpoints
router.get("/", getItems);
router.get("/:id", getItemById);
router.get("/:id/images", getItemImages);

// Protected endpoints (Requires Authentication & Ownership)
router.post("/", authenticateToken, requireRole("customer"), upload.single("image"), createItem);
router.put("/:id", authenticateToken, updateItem);
router.delete("/:id", authenticateToken, deleteItem);
router.post("/:id/images", authenticateToken, addItemImage);
router.delete("/:id/images/:imgId", authenticateToken, deleteItemImage);

module.exports = router;
