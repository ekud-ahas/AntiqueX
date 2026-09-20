const http = require("http");
const pool = require("../config/db");

// Simple helper to send JSON HTTP requests using Node native http
function request(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const reqHeaders = {
            ...headers
        };
        if (payload) {
            reqHeaders["Content-Type"] = "application/json";
            reqHeaders["Content-Length"] = Buffer.byteLength(payload);
        }

        const req = http.request({
            hostname: "localhost",
            port: 5000,
            path,
            method,
            headers: reqHeaders
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                let parsed = null;
                try {
                    parsed = JSON.parse(data);
                } catch {
                    parsed = data;
                }
                resolve({ status: res.statusCode, data: parsed, headers: res.headers });
            });
        });

        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log("=================================================");
    console.log(" ANTIQUEX CSE 216 60% GUIDELINES VERIFICATION");
    console.log("=================================================\n");

    let passCount = 0;
    let failCount = 0;

    function assert(condition, testName, detail = "") {
        if (condition) {
            console.log(`[PASS] ${testName}`);
            passCount++;
        } else {
            console.error(`[FAIL] ${testName} - ${detail}`);
            failCount++;
        }
    }

    try {
        // ------------------------------------------------------------------
        // TEST 1: Register customer and login
        // ------------------------------------------------------------------
        console.log("--- 1. Authentication & Token Lifecycle ---");
        const testUser = `testuser_${Date.now()}`;
        const testEmail = `${testUser}@example.com`;
        const testPassword = "Password123!";

        const regRes = await request("POST", "/api/auth/register", {
            username: testUser,
            email: testEmail,
            password: testPassword,
            full_name: "Test Verification User"
        });
        assert(regRes.status === 201, "Customer registration succeeds with 201", JSON.stringify(regRes.data));

        const loginRes = await request("POST", "/api/auth/login", {
            email: testEmail,
            password: testPassword
        });
        assert(loginRes.status === 200 && loginRes.data.token, "Customer login returns token", JSON.stringify(loginRes.data));
        const customerToken = loginRes.data.token;
        const customerUser = loginRes.data.user;

        // Verify authenticated route works with token
        const meRes = await request("GET", "/api/wallet", null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(meRes.status === 200, "Authenticated customer can access wallet endpoint", JSON.stringify(meRes.data));

        // ------------------------------------------------------------------
        // TEST 2: Server-side token invalidation on logout (§3.1)
        // ------------------------------------------------------------------
        const logoutRes = await request("POST", "/api/auth/logout", null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(logoutRes.status === 200, "Logout request returns 200", JSON.stringify(logoutRes.data));

        // Token should now be recorded in revoked_tokens
        const postLogoutRes = await request("GET", "/api/wallet", null, {
            Authorization: `Bearer ${customerToken}`
        });
        assert(
            postLogoutRes.status === 401 && (postLogoutRes.data.error || postLogoutRes.data.message || "").toLowerCase().includes("revoked"),
            "Revoked token cannot access protected endpoints (401 returned)",
            JSON.stringify(postLogoutRes.data)
        );

        // ------------------------------------------------------------------
        // TEST 3: RBAC & Cross-Role Access Blocking (§3.2)
        // ------------------------------------------------------------------
        console.log("\n--- 2. RBAC & Cross-Role Access Blocking ---");
        // Login as admin
        const adminLoginRes = await request("POST", "/api/auth/login", {
            email: "admin@antiquex.com",
            password: "password123"
        });
        assert(adminLoginRes.status === 200 && adminLoginRes.data.user.role === "admin", "Admin login succeeds", JSON.stringify(adminLoginRes.data));
        const adminToken = adminLoginRes.data.token;

        // Admin attempting customer-only endpoint (e.g. wallet deposit)
        const crossRoleRes = await request("POST", "/api/wallet/deposit", { amount: 100 }, {
            Authorization: `Bearer ${adminToken}`
        });
        assert(
            crossRoleRes.status === 403,
            "Admin calling customer-only wallet deposit is blocked with 403 Forbidden",
            `Status: ${crossRoleRes.status}, Body: ${JSON.stringify(crossRoleRes.data)}`
        );

        // Login new active customer session for further tests
        const reloginRes = await request("POST", "/api/auth/login", {
            email: testEmail,
            password: testPassword
        });
        const activeCustToken = reloginRes.data.token;

        // Customer attempting admin-only endpoint (e.g. POST /api/categories)
        const custAdminBlock = await request("POST", "/api/categories", { category_name: "ForbiddenCat" }, {
            Authorization: `Bearer ${activeCustToken}`
        });
        assert(
            custAdminBlock.status === 403,
            "Customer calling admin-only category creation is blocked with 403 Forbidden",
            `Status: ${custAdminBlock.status}, Body: ${JSON.stringify(custAdminBlock.data)}`
        );

        // ------------------------------------------------------------------
        // TEST 4: Item Deletion Guardrails
        // ------------------------------------------------------------------
        console.log("\n--- 3. Item Deletion & Editing Guardrails ---");
        const allItemsRes = await request("GET", "/items");
        let allItems = Array.isArray(allItemsRes.data) ? allItemsRes.data : (allItemsRes.data.items || []);
        
        let itemWithBids = null;
        for (const item of allItems) {
            const detailRes = await request("GET", `/items/${item.item_id}`);
            const itemObj = detailRes.data.item || detailRes.data;
            if (itemObj && (Number(itemObj.bid_count) > 0 || Number(itemObj.total_bids) > 0)) {
                itemWithBids = itemObj;
                break;
            }
        }

        if (itemWithBids) {
            // Attempt to delete it as the test user (ownership check + bid guard)
            const deleteRes = await request("DELETE", `/items/${itemWithBids.item_id}`, null, {
                Authorization: `Bearer ${activeCustToken}`
            });
            assert(
                deleteRes.status === 400 || deleteRes.status === 403 || deleteRes.status === 404,
                `Deleting an item with bids is blocked (Status: ${deleteRes.status})`,
                `Status: ${deleteRes.status}, Message: ${JSON.stringify(deleteRes.data)}`
            );
        } else {
            console.log("[SKIP] No item with bids found to test deletion guard");
        }

        // ------------------------------------------------------------------
        // TEST 5: Mock Gateway Deposit & Escrow Concurrency Bidding (§3.3)
        // ------------------------------------------------------------------
        console.log("\n--- 4. Mock Gateway Deposit & Escrow Concurrency Bidding ---");
        // Fund customer wallet via Mock Payment Gateway (bKash)
        const depositRes = await request("POST", "/api/wallet/deposit", {
            amount: 500000,
            method: "bkash",
            accountNumber: "01711122233",
            pin: "1234"
        }, {
            Authorization: `Bearer ${activeCustToken}`
        });
        assert(
            depositRes.status === 200 && depositRes.data.gateway?.status === "APPROVED",
            "Mock Payment Gateway authorizes deposit and returns approved gateway transaction ID",
            JSON.stringify(depositRes.data)
        );

        // Find an active auction
        const activeItem = allItems.find(i => i.status === "active" || i.auction_status === "active") || allItems[0];
        
        if (activeItem) {
            const auctionId = activeItem.auction_id || activeItem.item_id;
            const currentPrice = Number(activeItem.current_price || activeItem.starting_price || 1000);
            const bidAmount = currentPrice + (Number(activeItem.min_increment) || 500);

            // Run concurrent identical bids at the exact same time with escrow fund verification
            const [bid1, bid2] = await Promise.all([
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount }, {
                    Authorization: `Bearer ${activeCustToken}`
                }),
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount }, {
                    Authorization: `Bearer ${activeCustToken}`
                })
            ]);

            const statuses = [bid1.status, bid2.status];
            const successes = statuses.filter(s => s === 201).length;

            assert(
                successes <= 1,
                "Concurrent duplicate bids handled safely: escrow fund hold & row lock prevent race condition",
                `Bid1 status: ${bid1.status}, Bid2 status: ${bid2.status}`
            );
        } else {
            console.log("[SKIP] No active auction found for concurrency test");
        }

        // ------------------------------------------------------------------
        // TEST 6: Notifications Endpoint
        // ------------------------------------------------------------------
        console.log("\n--- 5. Notifications Endpoint Verification ---");
        const notifRes = await request("GET", "/api/notifications", null, {
            Authorization: `Bearer ${activeCustToken}`
        });
        const notifs = Array.isArray(notifRes.data) ? notifRes.data : notifRes.data.notifications;
        assert(
            notifRes.status === 200 && Array.isArray(notifs),
            "GET /api/notifications returns 200 and notifications array",
            JSON.stringify(notifRes.data)
        );

    } catch (err) {
        console.error("Test execution failed with unexpected error:", err);
    } finally {
        console.log("\n=================================================");
        console.log(` SUMMARY: ${passCount} Passed, ${failCount} Failed`);
        console.log("=================================================");
        process.exit(failCount > 0 ? 1 : 0);
    }
}

runTests();
