import re

with open('backend/models/watchlistModel.js', 'r') as f:
    content = f.read()

addToWatchlist_replacement = """const addToWatchlist = async (userId, itemId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const query = `
            INSERT INTO watchlist (user_id, item_id)
            VALUES ($1, $2)
            RETURNING *
        `;
        const result = await client.query(query, [userId, itemId]);
        await client.query("COMMIT");
        return result.rows[0];
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};"""

content = re.sub(r'const addToWatchlist = async \(userId, itemId\) => \{.*?return result\.rows\[0\];\n\};', addToWatchlist_replacement, content, flags=re.DOTALL)

removeFromWatchlist_replacement = """const removeFromWatchlist = async (userId, itemId) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const query = `
            DELETE FROM watchlist
            WHERE user_id = $1 AND item_id = $2
            RETURNING *
        `;
        const result = await client.query(query, [userId, itemId]);
        await client.query("COMMIT");
        return result.rows[0] || null;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};"""

content = re.sub(r'const removeFromWatchlist = async \(userId, itemId\) => \{.*?return result\.rows\[0\] \|\| null;\n\};', removeFromWatchlist_replacement, content, flags=re.DOTALL)

with open('backend/models/watchlistModel.js', 'w') as f:
    f.write(content)

print("watchlistModel patched")
