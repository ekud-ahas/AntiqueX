const bcrypt = require("bcrypt");
const pool = require("../config/db");

async function updatePasswords() {
    try {
        const hash = await bcrypt.hash("password123", 10);
        console.log("Using hash:", hash);

        const userRes = await pool.query("UPDATE users SET password = $1", [hash]);
        console.log("Updated users count:", userRes.rowCount);

        const adminRes = await pool.query("UPDATE admins SET password = $1", [hash]);
        console.log("Updated admins count:", adminRes.rowCount);

    } catch (err) {
        console.error("Failed to update passwords:", err);
    } finally {
        await pool.end();
    }
}

updatePasswords();
