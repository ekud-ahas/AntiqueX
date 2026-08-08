const pool = require("../config/db");

const register = async (req, res) => {
    try {
        const { username, full_name, email, password } = req.body;

        if (!username || !full_name || !email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        const existingUser = await pool.query(
            "SELECT user_id FROM users WHERE username = $1 OR email = $2",
            [username, email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Username or email already exists"
            });
        }

        const result = await pool.query(
            `
            INSERT INTO users
            (username, full_name, email, password)
            VALUES ($1, $2, $3, $4)
            RETURNING user_id, username, full_name, email
            `,
            [username, full_name, email, password]
        );

        res.status(201).json({
            message: "Registration successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Registration failed"
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required"
            });
        }

        const result = await pool.query(
            `
            SELECT user_id, username, full_name, email
            FROM users
            WHERE email = $1 AND password = $2
            `,
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Invalid email or password"
            });
        }

        res.json({
            message: "Login successful",
            user: result.rows[0]
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            error: "Login failed"
        });
    }
};

module.exports = {
    register,
    login
};