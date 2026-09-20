const express = require("express");
const router = express.Router();

const {
    register,
    login,
    logout,
    me
} = require("../controllers/authController");
const { authenticateToken } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, me);

module.exports = router;
