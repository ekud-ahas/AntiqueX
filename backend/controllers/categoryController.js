const pool = require("../config/db");

// GET /api/categories
// List all categories
const getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT category_id, category_name, description
            FROM categories
            ORDER BY category_name
            `
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
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

        const result = await pool.query(
            `
            SELECT category_id, category_name, description
            FROM categories
            WHERE category_id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Category not found"
            });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to retrieve category"
        });
    }
};

// GET /api/categories/:id/items
// Browse items belonging to a category (with primary image + auction status if any)
const getCategoryItems = async (req, res) => {
    try {
        const { id } = req.params;

        const categoryCheck = await pool.query(
            "SELECT category_id FROM categories WHERE category_id = $1",
            [id]
        );

        if (categoryCheck.rows.length === 0) {
            return res.status(404).json({
                error: "Category not found"
            });
        }

        const result = await pool.query(
            `
            SELECT
                i.item_id,
                i.title,
                i.description,
                i.year_of_origin,
                i.condition,
                i.starting_price,
                u.username AS seller,
                a.auction_id,
                a.status AS auction_status,
                (
                    SELECT img_url
                    FROM item_images
                    WHERE item_images.item_id = i.item_id
                    ORDER BY img_id
                    LIMIT 1
                ) AS thumbnail_url
            FROM items i
            JOIN users u
                ON i.seller_id = u.user_id
            LEFT JOIN auctions a
                ON a.item_id = i.item_id
            WHERE i.category_id = $1
            ORDER BY i.item_id
            `,
            [id]
        );

        res.json(result.rows);

    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: "Failed to retrieve items for category"
        });
    }
};

module.exports = {
    getCategories,
    getCategory,
    getCategoryItems
};
