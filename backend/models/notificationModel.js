const pool = require("../config/db");

/**
 * Get all notifications for a specific user ordered newest first
 */
const getUserNotifications = async (userId) => {
    const query = `
        SELECT notification_id, user_id, type, message, created_at, is_read
        FROM notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
    `;
    const result = await pool.query(query, [userId]);
    return result.rows;
};

/**
 * Mark a single notification or all notifications as read
 */
const markAsRead = async (userId, notificationId = null) => {
    if (notificationId) {
        const query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE notification_id = $1 AND user_id = $2
            RETURNING *
        `;
        const result = await pool.query(query, [notificationId, userId]);
        return result.rows[0] || null;
    } else {
        const query = `
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1
            RETURNING *
        `;
        const result = await pool.query(query, [userId]);
        return result.rows;
    }
};

module.exports = {
    getUserNotifications,
    markAsRead
};
