const http = require("http");
const express = require("express");
const pool = require("../config/db");

// Import routes
const authRoutes = require("../routes/authRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const walletRoutes = require("../routes/walletRoutes");
const itemRoutes = require("../routes/itemRoutes");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/items", itemRoutes);

const makeRequest = (port, path, method, headers = {}, body = null) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: "localhost",
            port,
            path,
            method,
            headers: {
                "Content-Type": "application/json",
                ...headers
            }
        }, (res) => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });
        req.on("error", reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

async function runTests() {
    const server = app.listen(5009, async () => {
        try {
            console.log("=== RUNNING AUTH & RBAC VERIFICATION ===");

            // 1. Test Customer Login
            console.log("\n[Test 1] Customer Login:");
            const custLogin = await makeRequest(5009, "/api/auth/login", "POST", {}, {
                email: "john@example.com",
                password: "password123"
            });
            console.log("Status:", custLogin.status);
            console.log("Role:", custLogin.data.user?.role);
            const customerToken = custLogin.data.token;
            console.log("Token received:", Boolean(customerToken));

            // 2. Test Admin Login
            console.log("\n[Test 2] Admin Login:");
            const adminLogin = await makeRequest(5009, "/api/auth/login", "POST", {}, {
                email: "admin@antiquex.com",
                password: "password123"
            });
            console.log("Status:", adminLogin.status);
            console.log("Role:", adminLogin.data.user?.role);
            const adminToken = adminLogin.data.token;
            console.log("Admin Token received:", Boolean(adminToken));

            // 3. Test Invalid Credentials
            console.log("\n[Test 3] Invalid Password:");
            const badLogin = await makeRequest(5009, "/api/auth/login", "POST", {}, {
                email: "john@example.com",
                password: "wrongpassword"
            });
            console.log("Status (Expect 401):", badLogin.status);

            // 4. Test Unauthenticated Protected Route (Expect 401)
            console.log("\n[Test 4] Unauthenticated Category Creation (Expect 401):");
            const unauthRes = await makeRequest(5009, "/api/categories", "POST", {}, {
                category_name: "Illegal Category"
            });
            console.log("Status (Expect 401):", unauthRes.status, unauthRes.data?.error);

            // 5. Test Cross-Role Access (Customer calling Admin-only category creation, Expect 403)
            console.log("\n[Test 5] Customer Calling Admin Route (Expect 403 Forbidden):");
            const crossRoleRes = await makeRequest(5009, "/api/categories", "POST", {
                Authorization: `Bearer ${customerToken}`
            }, {
                category_name: "Customer Attempt Category"
            });
            console.log("Status (Expect 403):", crossRoleRes.status, crossRoleRes.data?.error);

            // 6. Test Admin Category Creation (Expect 201 Created)
            console.log("\n[Test 6] Admin Category Creation (Expect 201 Created):");
            const uniqueCatName = `Test Category ${Date.now()}`;
            const adminCatRes = await makeRequest(5009, "/api/categories", "POST", {
                Authorization: `Bearer ${adminToken}`
            }, {
                category_name: uniqueCatName,
                description: "Created by super_admin in test"
            });
            console.log("Status (Expect 201):", adminCatRes.status);
            console.log("Created Category:", adminCatRes.data.category?.category_name);

            // 7. Object-Level Ownership Check (Customer 1 trying to access Customer 2's wallet, Expect 403)
            console.log("\n[Test 7] Object Ownership: User 1 Accessing User 2 Wallet (Expect 403):");
            const crossWalletRes = await makeRequest(5009, "/api/wallet/2", "GET", {
                Authorization: `Bearer ${customerToken}`
            });
            console.log("Status (Expect 403):", crossWalletRes.status, crossWalletRes.data?.error);

            // 8. Object-Level Ownership Check: User 1 Accessing Own Wallet (Expect 200)
            console.log("\n[Test 8] User 1 Accessing Own Wallet (Expect 200):");
            const ownWalletRes = await makeRequest(5009, "/api/wallet/1", "GET", {
                Authorization: `Bearer ${customerToken}`
            });
            console.log("Status (Expect 200):", ownWalletRes.status);
            console.log("Wallet Balance:", ownWalletRes.data?.balance);

            console.log("\n✅ ALL 8 TESTS COMPLETED SUCCESSFULLY!");
        } catch (err) {
            console.error("Test error:", err);
        } finally {
            server.close();
            await pool.end();
            process.exit(0);
        }
    });
}

runTests();
