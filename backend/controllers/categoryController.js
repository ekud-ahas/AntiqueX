const categoryModel = require("../models/categoryModel");

// GET /api/categories
// List all categories
const getCategories = async (req, res) => {
    try {
        const categories = await categoryModel.getAllCategories();
        res.json(categories);
    } catch (error) {
        console.error("GET CATEGORIES ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve categories"
        });
    }
};

// GET /api/categories/:id
// Get a single category
const getCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const category = await categoryModel.getCategoryById(id);

        if (!category) {
            return res.status(404).json({
                error: "Category not found"
            });
        }

        res.json(category);
    } catch (error) {
        console.error("GET CATEGORY ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve category"
        });
    }
};

// GET /api/categories/:id/items
// Browse items belonging to a category
const getCategoryItems = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await categoryModel.getCategoryById(id);
        if (!category) {
            return res.status(404).json({
                error: "Category not found"
            });
        }

        const items = await categoryModel.getItemsByCategory(id);
        res.json(items);
    } catch (error) {
        console.error("GET CATEGORY ITEMS ERROR:", error);
        res.status(500).json({
            error: "Failed to retrieve items for category"
        });
    }
};

// POST /api/categories
// Create a new category (Admin / Moderator only)
const createCategory = async (req, res) => {
    try {
        const { category_name, description } = req.body;

        if (!category_name || !category_name.trim()) {
            return res.status(400).json({
                error: "Category name is required"
            });
        }

        const adminId = req.user.userId;
        const newCategory = await categoryModel.createCategory(adminId, category_name.trim(), description || null);

        res.status(201).json({
            message: "Category created successfully",
            category: newCategory
        });
    } catch (error) {
        console.error("CREATE CATEGORY ERROR:", error);
        res.status(500).json({
            error: "Failed to create category"
        });
    }
};

// DELETE /api/categories/:id
// Delete a category (Admin / Moderator only)
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await categoryModel.deleteCategoryById(id);
        if (!deleted) {
            return res.status(404).json({
                error: "Category not found"
            });
        }
        res.json({
            message: `Category "${deleted.category_name}" deleted successfully`,
            deleted
        });
    } catch (error) {
        console.error("DELETE CATEGORY ERROR:", error);
        res.status(error.statusCode || 500).json({
            error: error.message || "Failed to delete category"
        });
    }
};

module.exports = {
    getCategories,
    getCategory,
    getCategoryItems,
    createCategory,
    deleteCategory
};
