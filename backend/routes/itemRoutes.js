const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

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

// GET all items
router.get("/", getItems);

// CREATE item
// Supports optional local image upload
router.post("/", upload.single("image"), createItem);

// GET one item
router.get("/:id", getItemById);

// UPDATE item
router.put("/:id", updateItem);

// DELETE item
router.delete("/:id", deleteItem);

// GET images for an item
router.get("/:id/images", getItemImages);

// ADD image URL to an item
router.post("/:id/images", addItemImage);

// DELETE an image
router.delete("/:id/images/:imgId", deleteItemImage);

module.exports = router;
