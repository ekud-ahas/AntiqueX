const express = require("express");

const router = express.Router();

const {
    getCategories,
    getCategory,
    getCategoryItems
} = require("../controllers/categoryController");

router.get("/", getCategories);
router.get("/:id", getCategory);
router.get("/:id/items", getCategoryItems);

module.exports = router;
