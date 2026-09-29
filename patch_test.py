import re

with open('backend/test/test-comprehensive-fixes.js', 'r') as f:
    content = f.read()

# Add address creation logic
address_logic = """
            // Ensure test user has an address
            const addrRes = await request("POST", "/api/profile/addresses", {
                house: "123", street: "Test St", city: "Dhaka"
            }, { Authorization: `Bearer ${activeCustToken}` });
            const addressId = addrRes.data.address?.address_id || addrRes.data.address_id || 1;

            // Run concurrent identical bids at the exact same time with escrow fund verification
            const [bid1, bid2] = await Promise.all([
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount, addressId }, {
                    Authorization: `Bearer ${activeCustToken}`
                }),
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount, addressId }, {
                    Authorization: `Bearer ${activeCustToken}`
                })
            ]);
"""

# Replace the old logic
old_logic = """
            // Run concurrent identical bids at the exact same time with escrow fund verification
            const [bid1, bid2] = await Promise.all([
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount }, {
                    Authorization: `Bearer ${activeCustToken}`
                }),
                request("POST", `/api/auctions/${auctionId}/bids`, { bid_amount: bidAmount }, {
                    Authorization: `Bearer ${activeCustToken}`
                })
            ]);
"""

content = content.replace(old_logic, address_logic)

# Replace the assertion
old_assert = """            assert(
                successes <= 1,
                "Concurrent duplicate bids handled safely: escrow fund hold & row lock prevent race condition",
                `Bid1 status: ${bid1.status}, Bid2 status: ${bid2.status}`
            );"""
new_assert = """            assert(
                successes === 1,
                "Concurrent duplicate bids handled safely: exactly one bid succeeds and locks escrow",
                `Bid1 status: ${bid1.status}, Bid2 status: ${bid2.status}`
            );"""
content = content.replace(old_assert, new_assert)

with open('backend/test/test-comprehensive-fixes.js', 'w') as f:
    f.write(content)

print("Test patched")
