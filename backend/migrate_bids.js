const pool = require('./config/db');

async function migrate() {
    try {
        console.log("Adding address_id to bids...");
        await pool.query(`ALTER TABLE bids ADD COLUMN IF NOT EXISTS address_id INT REFERENCES addresses(address_id) ON DELETE SET NULL;`);
        
        // For existing bids without an address_id, assign the user's most recent address
        console.log("Backfilling address_id for existing bids...");
        await pool.query(`
            UPDATE bids b
            SET address_id = (
                SELECT address_id 
                FROM addresses a 
                WHERE a.user_id = b.bidder_id 
                ORDER BY address_id DESC 
                LIMIT 1
            )
            WHERE b.address_id IS NULL;
        `);
        
        console.log("Adding address_id to auto_bids...");
        await pool.query(`ALTER TABLE auto_bids ADD COLUMN IF NOT EXISTS address_id INT REFERENCES addresses(address_id) ON DELETE SET NULL;`);

        console.log("Migration complete!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        process.exit(0);
    }
}

migrate();
