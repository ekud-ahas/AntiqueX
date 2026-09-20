const pool = require("../config/db");
const bcrypt = require("bcrypt");
const { placeBidWithLock } = require("../models/auctionModel");
const { cancelAuctionAndRefundEscrow } = require("../models/adminStatsModel");

async function runCancellationTest() {
    console.log("=================================================");
    console.log(" TESTING AUCTION CANCELLATION ESCROW REFUND FIX ");
    console.log("=================================================\n");

    const createdUserIds = [];
    let passCount = 0;
    let failCount = 0;

    function assert(condition, name, detail = "") {
        if (condition) {
            console.log(`[PASS] ${name}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${name} - ${detail}`);
            failCount++;
        }
    }

    try {
        const hash = await bcrypt.hash("password123", 10);
        const uniqueSuffix = Date.now();

        // 1. Create 1 seller and 2 bidders with wallets (100,000 BDT each)
        const sellerRes = await pool.query(
            `INSERT INTO users (username, full_name, email, password)
             VALUES ($1, $2, $3, $4) RETURNING user_id`,
            [`seller_${uniqueSuffix}`, "Test Seller", `seller_${uniqueSuffix}@example.com`, hash]
        );
        const sellerId = sellerRes.rows[0].user_id;
        createdUserIds.push(sellerId);

        const bidder1Res = await pool.query(
            `INSERT INTO users (username, full_name, email, password)
             VALUES ($1, $2, $3, $4) RETURNING user_id`,
            [`bidder1_${uniqueSuffix}`, "Test Bidder 1", `bidder1_${uniqueSuffix}@example.com`, hash]
        );
        const bidder1Id = bidder1Res.rows[0].user_id;
        createdUserIds.push(bidder1Id);

        const bidder2Res = await pool.query(
            `INSERT INTO users (username, full_name, email, password)
             VALUES ($1, $2, $3, $4) RETURNING user_id`,
            [`bidder2_${uniqueSuffix}`, "Test Bidder 2", `bidder2_${uniqueSuffix}@example.com`, hash]
        );
        const bidder2Id = bidder2Res.rows[0].user_id;
        createdUserIds.push(bidder2Id);

        // Fund wallets: 100,000 each
        await pool.query(
            `INSERT INTO wallets (user_id, balance) VALUES ($1, 100000.00), ($2, 100000.00)`,
            [bidder1Id, bidder2Id]
        );

        // Fetch category ID
        const catRes = await pool.query(`SELECT category_id FROM categories LIMIT 1`);
        const categoryId = catRes.rows[0].category_id;

        // 2. Create test item and auction
        const itemRes = await pool.query(
            `INSERT INTO items (seller_id, category_id, title, description, starting_price)
             VALUES ($1, $2, $3, $4, $5) RETURNING item_id`,
            [sellerId, categoryId, `Cancellation Test Item ${uniqueSuffix}`, "Test antique item", 10000.00]
        );
        const itemId = itemRes.rows[0].item_id;

        const auctionRes = await pool.query(
            `INSERT INTO auctions (item_id, start_time, end_time, min_increment, status)
             VALUES ($1, NOW(), NOW() + INTERVAL '3 days', 1000.00, 'active')
             RETURNING auction_id`,
            [itemId]
        );
        const auctionId = auctionRes.rows[0].auction_id;

        console.log(`Setup complete: Auction #${auctionId} created with Seller #${sellerId}, Bidders #${bidder1Id} & #${bidder2Id}.`);

        // 3. Place competing bids
        // Bid 1: Bidder 1 bids 15,000
        console.log("\nPlacing Bid 1: Bidder 1 bids ৳15,000...");
        await placeBidWithLock({ id: auctionId, bidderId: bidder1Id, bidAmount: 15000 });

        let b1Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder1Id]);
        let b2Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder2Id]);
        assert(Number(b1Wallet.rows[0].balance) === 85000, "Bidder 1 wallet debited ৳15,000 (balance: ৳85,000)");

        // Bid 2: Bidder 2 bids 20,000
        console.log("Placing Bid 2: Bidder 2 bids ৳20,000 (outbidding Bidder 1)...");
        await placeBidWithLock({ id: auctionId, bidderId: bidder2Id, bidAmount: 20000 });

        b1Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder1Id]);
        b2Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder2Id]);
        assert(Number(b1Wallet.rows[0].balance) === 100000, "Bidder 1 immediately refunded ৳15,000 on being outbid (balance: ৳100,000)");
        assert(Number(b2Wallet.rows[0].balance) === 80000, "Bidder 2 wallet debited ৳20,000 (balance: ৳80,000)");

        // Bid 3: Bidder 1 bids 25,000
        console.log("Placing Bid 3: Bidder 1 bids ৳25,000 (outbidding Bidder 2)...");
        await placeBidWithLock({ id: auctionId, bidderId: bidder1Id, bidAmount: 25000 });

        b1Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder1Id]);
        b2Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder2Id]);
        assert(Number(b1Wallet.rows[0].balance) === 75000, "Bidder 1 debited ৳25,000 as current top bidder (balance: ৳75,000)");
        assert(Number(b2Wallet.rows[0].balance) === 100000, "Bidder 2 immediately refunded ৳20,000 on being outbid (balance: ৳100,000)");

        // 4. Cancel the auction
        console.log("\nCancelling auction as administrator via cancelAuctionAndRefundEscrow...");
        const cancelResult = await cancelAuctionAndRefundEscrow(auctionId);
        assert(cancelResult && cancelResult.status === "cancelled", "Auction status updated to 'cancelled'");

        // 5. Verify balances after cancellation
        b1Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder1Id]);
        b2Wallet = await pool.query(`SELECT balance FROM wallets WHERE user_id = $1`, [bidder2Id]);

        const b1Final = Number(b1Wallet.rows[0].balance);
        const b2Final = Number(b2Wallet.rows[0].balance);
        const totalSystemMoney = b1Final + b2Final;

        console.log(`\nFinal Balances:`);
        console.log(`  Bidder 1: ৳${b1Final.toLocaleString()} (Expected: ৳100,000)`);
        console.log(`  Bidder 2: ৳${b2Final.toLocaleString()} (Expected: ৳100,000)`);
        console.log(`  Total Invariant: ৳${totalSystemMoney.toLocaleString()} (Expected: ৳200,000)`);

        assert(b1Final === 100000, "Bidder 1 (top bidder) refunded their active ৳25,000 escrow (final: ৳100,000)");
        assert(b2Final === 100000, "Bidder 2 (outbid bidder) received NO duplicate refund (final: ৳100,000, NOT ৳120,000)");
        assert(totalSystemMoney === 200000, "Financial Invariant Preserved: Zero phantom money created (Total = ৳200,000)");

        // Verify wallet_transactions
        const cancelRefundTxns = await pool.query(
            `SELECT wt.wallet_txn_id, wt.amount, w.user_id
             FROM wallet_transactions wt
             JOIN wallets w ON wt.wallet_id = w.wallet_id
             WHERE wt.type = 'auction_cancel_refund' AND w.user_id IN ($1, $2)`,
            [bidder1Id, bidder2Id]
        );
        assert(cancelRefundTxns.rows.length === 1, "Exactly one 'auction_cancel_refund' transaction logged in database");
        assert(
            cancelRefundTxns.rows.length === 1 &&
            cancelRefundTxns.rows[0].user_id === bidder1Id &&
            Number(cancelRefundTxns.rows[0].amount) === 25000,
            "Cancellation refund specifically attributed to Bidder 1 for ৳25,000"
        );

        // 6. Test cancellation on an auction with 0 bids
        console.log("\nTesting cancellation on an auction with ZERO bids...");
        const zeroBidItemRes = await pool.query(
            `INSERT INTO items (seller_id, category_id, title, starting_price)
             VALUES ($1, $2, $3, $4) RETURNING item_id`,
            [sellerId, categoryId, `Zero Bid Item ${uniqueSuffix}`, 5000.00]
        );
        const zeroBidAuctionRes = await pool.query(
            `INSERT INTO auctions (item_id, start_time, end_time, min_increment, status)
             VALUES ($1, NOW(), NOW() + INTERVAL '2 days', 500.00, 'active')
             RETURNING auction_id`,
            [zeroBidItemRes.rows[0].item_id]
        );
        const zeroBidAuctionId = zeroBidAuctionRes.rows[0].auction_id;

        const zeroBidCancelRes = await cancelAuctionAndRefundEscrow(zeroBidAuctionId);
        assert(zeroBidCancelRes && zeroBidCancelRes.status === "cancelled", "Auction with 0 bids cancels cleanly without error");

    } catch (err) {
        console.error("Test error:", err);
        failCount++;
    } finally {
        // Cleanup test data
        if (createdUserIds.length > 0) {
            await pool.query(`DELETE FROM users WHERE user_id = ANY($1::int[])`, [createdUserIds]);
            console.log("\nTest accounts and associated items/auctions/bids successfully cleaned up.");
        }
        await pool.end();

        console.log("\n=================================================");
        console.log(` RESULTS: ${passCount} Passed, ${failCount} Failed`);
        console.log("=================================================");
        process.exit(failCount > 0 ? 1 : 0);
    }
}

runCancellationTest();
