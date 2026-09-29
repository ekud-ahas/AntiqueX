import re

with open('backend/controllers/authController.js', 'r') as f:
    content = f.read()

logout_replacement = """const logout = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const token = req.token;
        const expiresAt = new Date(req.user.exp * 1000);

        await client.query(
            `INSERT INTO revoked_tokens (token, expires_at)
             VALUES ($1, $2)
             ON CONFLICT (token) DO NOTHING`,
            [token, expiresAt]
        );
        
        await client.query("COMMIT");
        res.json({ message: "Logged out successfully and token invalidated" });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("LOGOUT ERROR:", error);
        res.status(500).json({ error: "Failed to logout" });
    } finally {
        client.release();
    }
};"""

content = re.sub(r'const logout = async \(req, res\) => \{.*?    \}\};', logout_replacement, content, flags=re.DOTALL)

with open('backend/controllers/authController.js', 'w') as f:
    f.write(content)

print("Fixed logout")
