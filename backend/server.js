const express = require("express");
const cors = require("cors");
const path = require("path");

const itemRoutes = require("./routes/itemRoutes");
const authRoutes = require("./routes/authRoutes");
const auctionRoutes = require("./routes/auctionRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const watchlistRoutes = require("./routes/watchlistRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const walletRoutes = require("./routes/walletRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use(
    "/uploads",
    express.static(path.join(__dirname, "uploads"))
);

// Home
app.get("/", (req, res) => {
    res.json({
        message: "AntiqueX API is running!"
    });
});

// Item APIs
app.use("/items", itemRoutes);

// Authentication APIs
app.use("/api/auth", authRoutes);

// Auction APIs
app.use("/api/auctions", auctionRoutes);

// Category APIs
app.use("/api/categories", categoryRoutes);

// Watchlist APIs
app.use("/api/watchlist", watchlistRoutes);

// Transaction & Payment APIs
app.use("/api/transactions", transactionRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/payments", paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`AntiqueX server running on port ${PORT}`);
});
