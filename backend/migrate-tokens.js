const pool = require("./config/db");

async function migrate() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS revoked_tokens (
                token_id SERIAL PRIMARY KEY,
                token TEXT NOT NULL UNIQUE,
                revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_revoked_tokens_token ON revoked_tokens(token);
        `);
        console.log("Migration SUCCESS: revoked_tokens table created.");
    } catch (err) {
        console.error("Migration ERROR:", err);
    } finally {
        await pool.end();
    }
}

migrate();
