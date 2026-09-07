const bcrypt = require("bcrypt");
const userModel = require("../models/userModel");
const adminModel = require("../models/adminModel");
const { generateToken } = require("../utils/jwt");

const register = async (req, res) => {
    try {
        const { username, full_name, email, password } = req.body;

        if (!username || !full_name || !email || !password) {
            return res.status(400).json({
                error: "All fields are required"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters long"
            });
        }

        // Check if username or email already exists in users
        const existingUser = await userModel.findByUsernameOrEmail(username, email);
        if (existingUser) {
            return res.status(409).json({
                error: "Username or email already exists"
            });
        }

        // Check if email already exists in admins
        const existingAdmin = await adminModel.findByEmail(email);
        if (existingAdmin) {
            return res.status(409).json({
                error: "Email is already registered"
            });
        }

        // Salt and hash password with bcrypt
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        const newUser = await userModel.createUser({
            username,
            full_name,
            email,
            passwordHash
        });

        // Issue signed JWT token
        const token = generateToken({
            userId: newUser.user_id,
            username: newUser.username,
            email: newUser.email,
            role: "customer"
        });

        res.status(201).json({
            message: "Registration successful",
            token,
            user: {
                user_id: newUser.user_id,
                username: newUser.username,
                full_name: newUser.full_name,
                email: newUser.email,
                role: "customer"
            }
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
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

        // 1. Try finding regular user first
        const user = await userModel.findByEmail(email);

        if (user) {
            const isMatch = await bcrypt.compare(password, user.password);

            if (!isMatch) {
                return res.status(401).json({
                    error: "Invalid email or password"
                });
            }

            if (user.status === "suspended") {
                return res.status(403).json({
                    error: "Your account has been suspended by an administrator."
                });
            }

            const token = generateToken({
                userId: user.user_id,
                username: user.username,
                email: user.email,
                role: "customer"
            });

            return res.json({
                message: "Login successful",
                token,
                user: {
                    user_id: user.user_id,
                    username: user.username,
                    full_name: user.full_name,
                    email: user.email,
                    role: "customer"
                }
            });
        }

        // 2. If not found in users, check admins table
        const admin = await adminModel.findByEmail(email);

        if (admin) {
            const isMatch = await bcrypt.compare(password, admin.password);

            if (!isMatch) {
                return res.status(401).json({
                    error: "Invalid email or password"
                });
            }

            const adminRole = admin.role || "admin";
            const token = generateToken({
                userId: admin.admin_id,
                username: admin.username,
                email: admin.email,
                role: adminRole,
                isAdmin: true
            });

            return res.json({
                message: "Admin login successful",
                token,
                user: {
                    user_id: admin.admin_id,
                    username: admin.username,
                    email: admin.email,
                    role: adminRole,
                    isAdmin: true
                }
            });
        }

        // 3. User not found anywhere
        return res.status(401).json({
            error: "Invalid email or password"
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        res.status(500).json({
            error: "Login failed"
        });
    }
};

// Logout endpoint
const logout = async (req, res) => {
    res.json({
        message: "Logged out successfully"
    });
};

// Get authenticated user profile
const me = async (req, res) => {
    res.json({
        user: req.user
    });
};

module.exports = {
    register,
    login,
    logout,
    me
};