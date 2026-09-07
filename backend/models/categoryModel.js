const pool = require("../config/db");

/**
 * Get all categories
 */
const getAllCategories = async () => {
    const query = `
        SELECT category_id, category_name, description
        FROM categories
        ORDER BY category_name
    `;
    const result = await pool.query(query);
    return result.rows;
};

/**
 * Get category by ID
 */
const getCategoryById = async (categoryId) => {
    const query = `
        SELECT category_id, category_name, description
        FROM categories
        WHERE category_id = $1
    `;
    const result = await pool.query(query, [categoryId]);
    return result.rows[0] || null;
};

/**
 * Get items belonging to a category
 */
const getItemsByCategory = async (categoryId) => {
    const query = `
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
    `;
    const result = await pool.query(query, [categoryId]);
    return result.rows;
};

/**
 * Create a new category (Admin only)
 */
const createCategory = async (adminId, categoryName, description) => {
    const query = `
        INSERT INTO categories (admin_id, category_name, description)
        VALUES ($1, $2, $3)
        RETURNING *
    `;
    const result = await pool.query(query, [adminId, categoryName, description]);
    return result.rows[0];
};

/**
 * Delete a category by ID (Admin only)
 */
const deleteCategoryById = async (categoryId) => {
    const checkQuery = `SELECT COUNT(*) AS count FROM items WHERE category_id = $1`;
    const checkRes = await pool.query(checkQuery, [categoryId]);
    if (parseInt(checkRes.rows[0].count, 10) > 0) {
        const err = new Error("Cannot delete category: active items belong to this category. Delete or reassign items first.");
        err.statusCode = 400;
        throw err;
    }
    const deleteQuery = `
        DELETE FROM categories
        WHERE category_id = $1
        RETURNING category_id, category_name
    `;
    const result = await pool.query(deleteQuery, [categoryId]);
    return result.rows[0] || null;
};

module.exports = {
    getAllCategories,
    getCategoryById,
    getItemsByCategory,
    createCategory,
    deleteCategoryById
};
