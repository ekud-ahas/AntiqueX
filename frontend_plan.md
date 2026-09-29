# Dispute Resolution Frontend Implementation

We will add a new tab to the Admin Dashboard (usually `frontend/src/pages/Admin.jsx`) called "Disputes".

## 1. Fetching Data
- Fetch `/api/admin/disputes` when the tab is active.

## 2. Rendering the Dispute Cards
Each open dispute will show:
- **Item Details:** Item Name & Starting Price
- **Buyer Details:** Name, Email, and the exact Reason they opened the dispute
- **Seller Details:** Name & Email
- **Shipping Info:** Carrier & Tracking Number

## 3. Action Buttons
Two buttons per card:
1. `[ Side with Buyer (Refund) ]` -> Triggers `POST /api/admin/disputes/:id/resolve` with `{ decision: "refund_buyer" }`
2. `[ Side with Seller (Release Funds) ]` -> Triggers with `{ decision: "release_seller" }`

After the admin makes a decision, the card will disappear from the 'open' view, and the respective party will be automatically notified via the built-in notification system. The escrow funds will be moved instantly.
