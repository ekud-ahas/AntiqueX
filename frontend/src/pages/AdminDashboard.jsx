import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const token = sessionStorage.getItem("token");

    // Two admin roles: 'admin' (full control) | 'moderator' (items/auctions only)
    const isAdmin     = user && (user.role === "admin" || user.role === "moderator");
    const isFullAdmin = user && user.role === "admin"; // can manage users & categories

    // Tabs: overview (both roles) | users (admin only) | items (both roles)
    const [activeTab, setActiveTab] = useState("overview");

    // Data states
    const [stats, setStats] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [itemsList, setItemsList] = useState([]);
    const [userSearch, setUserSearch] = useState("");
    const [itemSearch, setItemSearch] = useState("");
    const [disputesList, setDisputesList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionMsg, setActionMsg] = useState("");
    const [actionLoading, setActionLoading] = useState(false);

    // Auth header used by every API call
    
    const filteredUsers = usersList.filter(u => {
        if (!userSearch) return true;
        const q = userSearch.toLowerCase();
        return u.user_id.toString().includes(q) ||
               u.username.toLowerCase().includes(q) ||
               u.full_name.toLowerCase().includes(q) ||
               u.email.toLowerCase().includes(q);
    });

    const filteredItems = itemsList.filter(i => {
        if (!itemSearch) return true;
        const q = itemSearch.toLowerCase();
        return i.item_id.toString().includes(q) ||
               i.title.toLowerCase().includes(q) ||
               i.category_name.toLowerCase().includes(q) ||
               i.seller_username.toLowerCase().includes(q);
    });

    const authHeader = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };

    const fetchAllAdminData = useCallback(async () => {
        setLoading(true);
        try {
            const requestHeaders = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
            // Stats and items are available to both roles
            const requests = [
                fetch("/api/admin/stats", { headers: requestHeaders }),
                fetch("/api/admin/items",  { headers: requestHeaders }),
                fetch("/api/admin/disputes", { headers: requestHeaders })
            ];
            // Users endpoint is admin-only — don't fetch for moderators
            if (isFullAdmin) {
                requests.push(fetch("/api/admin/users", { headers: requestHeaders }));
            }

            const [statsRes, itemsRes, disputesRes, usersRes] = await Promise.all(requests);

            if (!statsRes.ok) throw new Error("Failed to load platform stats");

            const statsData = await statsRes.json();
            const itemsData = itemsRes.ok ? await itemsRes.json() : [];
            const disputesData = disputesRes.ok ? await disputesRes.json() : [];
            const usersData = (isFullAdmin && usersRes?.ok) ? await usersRes.json() : [];

            setStats(statsData);
            setItemsList(itemsData);
            setDisputesList(disputesData);
            setUsersList(usersData);
            setLoading(false);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    }, [isFullAdmin, token]);

    useEffect(() => {
        if (!isAdmin) return;
        void fetchAllAdminData();
    }, [fetchAllAdminData, isAdmin]);

    
    const handleResolveDispute = async (disputeId, decision) => {
        const actionStr = decision === 'refund_buyer' ? "side with the BUYER (issue full refund)" : "side with the SELLER (release funds)";
        if (!window.confirm(`Are you sure you want to ${actionStr}?`)) return;

        setActionLoading(true);
        setActionMsg("");
        try {
            const res = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
                method: "POST",
                headers: authHeader,
                body: JSON.stringify({ decision })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setActionMsg("Dispute successfully resolved.");
            void fetchAllAdminData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };


    // User status toggle handler (admin only)
    const handleToggleUserStatus = async (targetUser) => {
        const newStatus = targetUser.status === "active" ? "suspended" : "active";
        const confirmMsg =
            newStatus === "suspended"
                ? `Are you sure you want to suspend @${targetUser.username}? They will not be able to log in.`
                : `Reactivate account for @${targetUser.username}?`;

        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        setActionMsg("");
        try {
            const res = await fetch(`/api/admin/users/${targetUser.user_id}/status`, {
                method: "PATCH",
                headers: authHeader,
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to update user status");

            setActionMsg(` Success: User @${targetUser.username} is now ${newStatus.toUpperCase()}`);
            setUsersList((prev) =>
                prev.map((u) => (u.user_id === targetUser.user_id ? { ...u, status: newStatus } : u))
            );
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // Auction moderation toggle handler
    const handleToggleAuction = async (item) => {
        const newStatus = item.auction_status === "cancelled" ? "active" : "cancelled";
        const confirmMsg =
            newStatus === "cancelled"
                ? `Flag and remove item "${item.title}"? Bidding will be halted immediately.`
                : `Reactivate auction for "${item.title}"?`;

        if (!window.confirm(confirmMsg)) return;

        setActionLoading(true);
        setActionMsg("");
        try {
            const res = await fetch(`/api/admin/auctions/${item.auction_id}/status`, {
                method: "PATCH",
                headers: authHeader,
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || "Failed to update auction status");

            setActionMsg(` Item "${item.title}" auction status set to ${newStatus.toUpperCase()}`);
            setItemsList((prev) =>
                prev.map((i) =>
                    i.auction_id === item.auction_id ? { ...i, auction_status: newStatus } : i
                )
            );
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setActionLoading(false);
        }
    };

    // ── 403 Route Guard ─────────────────────────────────────────
    if (!user || !isAdmin) {
        return (
            <div className="admin-forbidden">
                <div className="forbidden-box">
                    <span className="forbidden-icon"></span>
                    <h1>403 — Access Denied</h1>
                    <p>
                        You do not have permission to view the Admin Dashboard.
                        <br />
                        This area is strictly restricted to administrators and moderators.
                    </p>
                    <Link to="/" className="forbidden-home-btn">
                        Go Back Home
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) return <div className="admin-loading">Loading administrative console…</div>;
    if (error) return <div className="admin-error"> Error: {error}</div>;

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <div>
                    <h1> Administrative Control Panel</h1>
                    <p className="admin-subtitle">
                        Logged in as <strong>{user.username}</strong>{" "}
                        <span className={`role-badge ${!isFullAdmin ? "role-badge-moderator" : ""}`}>
                            {user.role.toUpperCase()}
                        </span>
                        {!isFullAdmin && (
                            <span style={{ marginLeft: "8px", fontSize: "0.82rem", color: "#888" }}>
                                — Moderation access only
                            </span>
                        )}
                    </p>
                </div>
                {/* Manage Categories button only shown to full admins */}
                {isFullAdmin && (
                    <div className="admin-header-actions">
                        <Link to="/categories" className="action-btn">
                             Manage Categories
                        </Link>
                    </div>
                )}
            </div>

            {/* Notification Banner */}
            {actionMsg && (
                <div className="admin-alert-banner">
                    <span>{actionMsg}</span>
                    <button onClick={() => setActionMsg("")}></button>
                </div>
            )}

            {/* Tab Navigation — Users tab hidden from moderators */}
            <div className="admin-tabs">
                <button
                    className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
                    onClick={() => setActiveTab("overview")}
                >
                     Overview & Stats
                </button>
                {isFullAdmin && (
                    <button
                        className={`tab-btn ${activeTab === "users" ? "active" : ""}`}
                        onClick={() => setActiveTab("users")}
                    >
                         User Directory
                    </button>
                )}
                <button
                    className={`tab-btn ${activeTab === "items" ? "active" : ""}`}
                    onClick={() => setActiveTab("items")}
                >
                     Item Moderation
                </button>
                <button
                    className={`tab-btn ${activeTab === "disputes" ? "active" : ""}`}
                    onClick={() => setActiveTab("disputes")}
                >
                     Disputes ({disputesList.length})
                </button>
            </div>

            {/* ══════════════ TAB 1: OVERVIEW ══════════════ */}
            {activeTab === "overview" && stats && (
                <div>
                    <div className="stats-grid">
                        <div className="stat-card blue">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{stats.totalUsers.toLocaleString()}</div>
                            <div className="stat-label">Registered Customers</div>
                        </div>

                        <div className="stat-card green">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{stats.activeAuctions.toLocaleString()}</div>
                            <div className="stat-label">Active Auctions</div>
                        </div>

                        <div className="stat-card orange">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{stats.totalItems.toLocaleString()}</div>
                            <div className="stat-label">Total Artifacts Listed</div>
                        </div>

                        <div className="stat-card purple">
                            <div className="stat-icon"></div>
                            <div className="stat-value">
                                ৳{stats.totalSalesVolume.toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2
                                })}
                            </div>
                            <div className="stat-label">Settled Sales Volume</div>
                        </div>

                        <div className="stat-card teal">
                            <div className="stat-icon"></div>
                            <div className="stat-value">{stats.totalTransactions.toLocaleString()}</div>
                            <div className="stat-label">Completed Transactions</div>
                        </div>
                    </div>

                    <div className="admin-section">
                        <h2>Recent Live Bids Across Platform</h2>
                        {stats.recentBids.length === 0 ? (
                            <p className="no-data">No bids placed yet.</p>
                        ) : (
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>Artifact</th>
                                        <th>Bidder</th>
                                        <th>Bid Amount</th>
                                        <th>Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentBids.map((bid) => (
                                        <tr key={bid.bid_id}>
                                            <td><strong>{bid.item_title}</strong></td>
                                            <td>@{bid.bidder}</td>
                                            <td style={{ color: "#27ae60", fontWeight: "bold" }}>
                                                ৳{parseFloat(bid.bid_amount).toLocaleString(undefined, {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2
                                                })}
                                            </td>
                                            <td>{new Date(bid.bid_time).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* ══════════════ TAB 2: USER DIRECTORY ══════════════ */}
            {activeTab === "users" && (
                <div className="admin-section">
                    <div className="section-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2>Registered User Directory</h2>
                        <input
                            type="text"
                            placeholder="Search ID, Username, Name, Email..."
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", width: "300px" }}
                        />
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Username</th>
                                <th>Full Name</th>
                                <th>Email</th>
                                <th>Wallet Balance</th>
                                <th>Items Listed</th>
                                <th>Status</th>
                                <th>Moderation Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => (
                                <tr key={u.user_id}>
                                    <td>#{u.user_id}</td>
                                    <td><strong>@{u.username}</strong></td>
                                    <td>{u.full_name}</td>
                                    <td>{u.email}</td>
                                    <td>৳{parseFloat(u.wallet_balance).toLocaleString()}</td>
                                    <td>{u.items_listed} items</td>
                                    <td>
                                        <span className={`pill-status ${u.status === "active" ? "active-pill" : "suspended-pill"}`}>
                                            {u.status ? u.status.toUpperCase() : "ACTIVE"}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            disabled={actionLoading}
                                            onClick={() => handleToggleUserStatus(u)}
                                            className={`mod-btn ${u.status === "suspended" ? "reactivate" : "suspend"}`}
                                        >
                                            {u.status === "suspended" ? "Reactivate" : "Suspend"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════════════ TAB 3: ITEM MODERATION ══════════════ */}
            {activeTab === "items" && (
                <div className="admin-section">
                    <div className="section-header-flex" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h2>All Listed Artifacts & Auctions</h2>
                        <input
                            type="text"
                            placeholder="Search ID, Title, Category, Seller..."
                            value={itemSearch}
                            onChange={(e) => setItemSearch(e.target.value)}
                            style={{ padding: "8px", borderRadius: "4px", border: "1px solid var(--border)", width: "300px" }}
                        />
                    </div>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Artifact Title</th>
                                <th>Category</th>
                                <th>Seller</th>
                                <th>Starting Price</th>
                                <th>Current Highest Bid</th>
                                <th>Auction Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map((item) => (
                                <tr key={item.item_id}>
                                    <td>#{item.item_id}</td>
                                    <td>
                                        <Link to={`/items/${item.item_id}`} style={{ color: "#2c3e50", fontWeight: "bold" }}>
                                            {item.title}
                                        </Link>
                                    </td>
                                    <td>{item.category_name}</td>
                                    <td>@{item.seller_username}</td>
                                    <td>৳{parseFloat(item.starting_price).toLocaleString()}</td>
                                    <td style={{ color: "#d35400", fontWeight: "bold" }}>
                                        ৳{parseFloat(item.current_price).toLocaleString()}
                                        <span style={{ fontSize: "11px", color: "#888", display: "block" }}>
                                            ({item.total_bids} bids)
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`pill-status auction-${item.auction_status}`}>
                                            {item.auction_status?.toUpperCase()}
                                        </span>
                                    </td>
                                    <td>
                                        {item.auction_id ? (
                                            <button
                                                disabled={actionLoading}
                                                onClick={() => handleToggleAuction(item)}
                                                className={`mod-btn ${item.auction_status === "cancelled" ? "reactivate" : "suspend"}`}
                                            >
                                                {item.auction_status === "cancelled" ? "Restore" : "Flag / Remove"}
                                            </button>
                                        ) : (
                                            <span style={{ color: "#999", fontSize: "12px" }}>No Auction</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ══════════════ TAB 4: DISPUTES ══════════════ */}
            {activeTab === "disputes" && (
                <div>
                    <h2 style={{ color: "var(--text-dark)", marginBottom: "15px" }}>Dispute Resolution Desk</h2>
                    {disputesList.length === 0 ? (
                        <p style={{ color: "var(--muted)" }}>No disputes available.</p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {disputesList.map(d => (
                                <div key={d.dispute_id} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "15px", background: "white" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                                        <h3 style={{ margin: 0, color: "var(--primary)" }}>Dispute #{d.dispute_id}</h3>
                                        <span style={{ 
                                            background: d.dispute_status === 'open' ? '#f39c12' : '#27ae60', 
                                            color: 'white', padding: "3px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold"
                                        }}>
                                            {d.dispute_status.toUpperCase()}
                                        </span>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px", fontSize: "14px" }}>
                                        <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                                            <strong>Item:</strong> {d.item_title} <br/>
                                            <strong>Escrow Held:</strong> ৳{Number(d.payment_amount).toLocaleString()} <br/>
                                            <strong>Shipping:</strong> {d.carrier} - {d.tracking_number}
                                        </div>
                                        <div style={{ background: "#f8fafc", padding: "10px", borderRadius: "6px" }}>
                                            <strong>Reason for Dispute:</strong><br/>
                                            <span style={{ color: "#e74c3c" }}>"{d.reason}"</span>
                                        </div>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px", fontSize: "14px" }}>
                                        <div>
                                            <strong>Buyer:</strong> {d.buyer_username} <br/>
                                            <strong>Email:</strong> {d.buyer_email}
                                        </div>
                                        <div>
                                            <strong>Seller:</strong> {d.seller_username} <br/>
                                            <strong>Email:</strong> {d.seller_email}
                                        </div>
                                    </div>

                                    {d.dispute_status === 'open' ? (
                                        <div style={{ display: "flex", gap: "10px", borderTop: "1px solid var(--border)", paddingTop: "15px" }}>
                                            <button 
                                                onClick={() => handleResolveDispute(d.dispute_id, 'refund_buyer')}
                                                disabled={actionLoading}
                                                style={{ background: "#e74c3c", color: "white", padding: "8px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                                            >
                                                Side with Buyer (Refund)
                                            </button>
                                            <button 
                                                onClick={() => handleResolveDispute(d.dispute_id, 'release_seller')}
                                                disabled={actionLoading}
                                                style={{ background: "#27ae60", color: "white", padding: "8px 12px", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
                                            >
                                                Side with Seller (Release)
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ borderTop: "1px solid var(--border)", paddingTop: "15px", fontWeight: "bold" }}>
                                            Resolution Decision: 
                                            {d.shipment_status === 'dispute_refunded' ? (
                                                <span style={{ color: "#e74c3c", marginLeft: "10px" }}>Sided with Buyer (Refunded)</span>
                                            ) : (
                                                <span style={{ color: "#27ae60", marginLeft: "10px" }}>Sided with Seller (Released)</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

        </div>
    );
}

export default AdminDashboard;
