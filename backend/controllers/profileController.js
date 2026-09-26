const pool = require("../config/db");

const getProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const result = await pool.query(
            "SELECT user_id, username, full_name, email, phone_number, profile_picture_url, status FROM users WHERE user_id = $1",
            [userId]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: "User not found" });
        res.json(result.rows[0]);
    } catch (error) {
        console.error("GET PROFILE ERROR:", error);
        res.status(500).json({ error: "Server error getting profile" });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { userId } = req.user;
        const { full_name, phone_number } = req.body;
        
        if (!full_name) {
            return res.status(400).json({ error: "Full name is required" });
        }
        
        const result = await pool.query(
            "UPDATE users SET full_name = $1, phone_number = $2 WHERE user_id = $3 RETURNING user_id, username, full_name, email, phone_number",
            [full_name, phone_number, userId]
        );
        
        res.json({ message: "Profile updated successfully", user: result.rows[0] });
    } catch (error) {
        console.error("UPDATE PROFILE ERROR:", error);
        res.status(500).json({ error: "Server error updating profile" });
    }
};

const getAddresses = async (req, res) => {
    try {
        const { userId } = req.user;
        const result = await pool.query("SELECT * FROM addresses WHERE user_id = $1 ORDER BY address_id DESC", [userId]);
        res.json(result.rows);
    } catch (error) {
        console.error("GET ADDRESSES ERROR:", error);
        res.status(500).json({ error: "Server error getting addresses" });
    }
};

const addAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { street, city } = req.body;
        
        if (!street || !city) {
            return res.status(400).json({ error: "Street and city are required" });
        }
        
        const result = await pool.query(
            "INSERT INTO addresses (user_id, street, city) VALUES ($1, $2, $3) RETURNING *",
            [userId, street, city]
        );
        
        res.status(201).json({ message: "Address added successfully", address: result.rows[0] });
    } catch (error) {
        console.error("ADD ADDRESS ERROR:", error);
        res.status(500).json({ error: "Server error adding address" });
    }
};

const deleteAddress = async (req, res) => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        
        // Ensure ownership before deleting
        const check = await pool.query("SELECT * FROM addresses WHERE address_id = $1 AND user_id = $2", [id, userId]);
        if (check.rows.length === 0) return res.status(404).json({ error: "Address not found" });
        
        await pool.query("DELETE FROM addresses WHERE address_id = $1", [id]);
        res.json({ message: "Address deleted successfully" });
    } catch (error) {
        // Handle foreign key constraint if it is used in shipments
        if (error.code === '23503') {
            return res.status(400).json({ error: "Cannot delete this address because it is associated with a past or active shipment." });
        }
        console.error("DELETE ADDRESS ERROR:", error);
        res.status(500).json({ error: "Server error deleting address" });
    }
};


const uploadPicture = async (req, res) => {
    try {
        const { userId } = req.user;
        if (!req.file) {
            return res.status(400).json({ error: "No image file provided" });
        }
        
        const imageUrl = `/uploads/${req.file.filename}`;
        
        await pool.query(
            "UPDATE users SET profile_picture_url = $1 WHERE user_id = $2",
            [imageUrl, userId]
        );
        
        res.json({ message: "Profile picture updated", profile_picture_url: imageUrl });
    } catch (error) {
        console.error("UPLOAD PICTURE ERROR:", error);
        res.status(500).json({ error: "Server error uploading picture" });
    }
};

module.exports = {

    getProfile,
    updateProfile,
    getAddresses,
    addAddress,
    deleteAddress,
    uploadPicture
};
