import re

with open('backend/controllers/profileController.js', 'r') as f:
    content = f.read()

# updateProfile
updateProfile_repl = """const updateProfile = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { userId } = req.user;
        const { full_name, phone_number } = req.body;
        
        if (!full_name) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Full name is required" });
        }
        
        const result = await client.query(
            "UPDATE users SET full_name = $1, phone_number = $2 WHERE user_id = $3 RETURNING user_id, username, full_name, email, phone_number",
            [full_name, phone_number, userId]
        );
        
        await client.query("COMMIT");
        res.json({ message: "Profile updated successfully", user: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("UPDATE PROFILE ERROR:", error);
        res.status(500).json({ error: "Server error updating profile" });
    } finally {
        client.release();
    }
};"""
content = re.sub(r'const updateProfile = async \(req, res\) => \{.*?\n\};', updateProfile_repl, content, flags=re.DOTALL)

# addAddress
addAddress_repl = """const addAddress = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { userId } = req.user;
        const { house, street, city } = req.body;
        
        if (!street || !city) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "Street and city are required" });
        }
        
        const result = await client.query(
            "INSERT INTO addresses (user_id, house, street, city) VALUES ($1, $2, $3, $4) RETURNING *",
            [userId, house, street, city]
        );
        
        await client.query("COMMIT");
        res.status(201).json({ message: "Address added successfully", address: result.rows[0] });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("ADD ADDRESS ERROR:", error);
        res.status(500).json({ error: "Server error adding address" });
    } finally {
        client.release();
    }
};"""
content = re.sub(r'const addAddress = async \(req, res\) => \{.*?\n\};', addAddress_repl, content, flags=re.DOTALL)

# deleteAddress
deleteAddress_repl = """const deleteAddress = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { userId } = req.user;
        const { id } = req.params;
        
        // Ensure ownership before deleting
        const check = await client.query("SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2", [id, userId]);
        if (check.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "Address not found" });
        }
        
        await client.query("DELETE FROM addresses WHERE address_id = $1", [id]);
        
        await client.query("COMMIT");
        res.json({ message: "Address deleted successfully" });
    } catch (error) {
        await client.query("ROLLBACK");
        // Handle foreign key constraint if it is used in shipments
        if (error.code === '23503') {
            return res.status(400).json({ error: "Cannot delete this address because it is associated with a past or active shipment." });
        }
        console.error("DELETE ADDRESS ERROR:", error);
        res.status(500).json({ error: "Server error deleting address" });
    } finally {
        client.release();
    }
};"""
content = re.sub(r'const deleteAddress = async \(req, res\) => \{.*?\n\};', deleteAddress_repl, content, flags=re.DOTALL)

# uploadPicture
uploadPicture_repl = """const uploadPicture = async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { userId } = req.user;
        if (!req.file) {
            await client.query("ROLLBACK");
            return res.status(400).json({ error: "No image file provided" });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await client.query(
            "UPDATE users SET profile_picture_url = $1 WHERE user_id = $2",
            [imageUrl, userId]
        );
        
        await client.query("COMMIT");
        res.json({ message: "Profile picture updated", profile_picture_url: imageUrl });
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("UPLOAD PICTURE ERROR:", error);
        res.status(500).json({ error: "Server error uploading picture" });
    } finally {
        client.release();
    }
};"""
content = re.sub(r'const uploadPicture = async \(req, res\) => \{.*?\n\};', uploadPicture_repl, content, flags=re.DOTALL)

with open('backend/controllers/profileController.js', 'w') as f:
    f.write(content)

print("profileController patched")
