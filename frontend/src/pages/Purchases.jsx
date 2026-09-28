import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/api";
import "../App.css";

function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric"
    });
}

function Purchases() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [transactions, setTransactions] = useState([]);
    const [walletBalance, setWalletBalance] = useState(0);
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeTab, setActiveTab] = useState(user?.role === "Seller" ? "seller" : "buyer");

    // Shipping State (for Sellers)
    const [selectedShipmentId, setSelectedShipmentId] = useState(null);
    const [carrier, setCarrier] = useState("Pathao");
    const [trackingNumber, setTrackingNumber] = useState("");

    // Dispute State (for Buyers)
    const [disputeReason, setDisputeReason] = useState("");
    const [disputeShipmentId, setDisputeShipmentId] = useState(null);

    const fetchData = async () => {
        try {
            const [txnRes, wRes, mRes] = await Promise.all([
                authFetch(`/api/transactions/user/${user.user_id}`),
                authFetch(`/api/wallet/${user.user_id}`),
                authFetch(`/api/payments/methods/${user.user_id}`)
            ]);
            if (txnRes.ok) setTransactions(await txnRes.json());
            if (wRes.ok) {
                const wData = await wRes.json();
                setWalletBalance(Number(wData.balance));
            }
            if (mRes.ok) {
                const mData = await mRes.json();
                setPaymentMethods(mData);
                if (mData.length > 0) setSelectedMethodId(mData[0].method_id);
            }
        } catch (err) {
            console.error("Failed to fetch purchases data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- DELIVERY & ESCROW LOGIC ---
    const handleShipItem = async (e, shipmentId) => {
        e.preventDefault();
        try {
            const res = await authFetch(`/api/shipments/${shipmentId}/ship`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ carrier, trackingNumber })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to ship");
            
            setSelectedShipmentId(null);
            setCarrier("Pathao");
            setTrackingNumber("");
            await fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleMarkDelivered = async (shipmentId) => {
        if (!window.confirm("Are you sure you received this item? Escrow funds will be released to the seller.")) return;
        try {
            const res = await authFetch(`/api/shipments/${shipmentId}/deliver`, { method: "POST" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            await fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleOpenDispute = async (e) => {
        e.preventDefault();
        try {
            const res = await authFetch(`/api/shipments/${disputeShipmentId}/dispute`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reason: disputeReason })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setDisputeShipmentId(null);
            setDisputeReason("");
            await fetchData();
        } catch (err) {
            alert(err.message);
        }
    };

    if (!user) {
        return (
            <div className="page-wrapper" style={{ textAlign: "center", padding: "50px" }}>
                <h2>Authentication Required</h2>
                <p>Please <Link to="/login">login</Link> to view your orders.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="loading-spinner">Loading Orders...</div>;
    }

    const filteredTxns = transactions.filter(t => 
        activeTab === "buyer" ? t.buyer_username === user.username : t.seller_username === user.username
    );

    return (
        <div className="page-wrapper wallet-page">
            <div className="wallet-hero" style={{ background: "linear-gradient(135deg, #16a085 0%, #27ae60 100%)" }}>
                <div className="wallet-hero-content">
                    <h1>Orders & Deliveries</h1>
                    <div className="wallet-balance-display">
                        <span className="balance-label">Total Records</span>
                        <span className="balance-amount">{transactions.length}</span>
                    </div>
                </div>
            </div>

            <div className="wallet-container">
                <div className="wallet-tabs">
                    
                        <button 
                            className={`wallet-tab-btn ${activeTab === "buyer" ? "active" : ""}`}
                            onClick={() => setActiveTab("buyer")}
                        >
                             My Purchases
                        </button>
                    
                        <button 
                            className={`wallet-tab-btn ${activeTab === "seller" ? "active" : ""}`}
                            onClick={() => setActiveTab("seller")}
                        >
                             My Sales
                        </button>
                </div>

                <div className="wallet-content-area">
                    {filteredTxns.length === 0 ? (
                        <div className="empty-state">
                            <div style={{ fontSize: "40px", marginBottom: "15px" }}></div>
                            <h3>No {activeTab === "buyer" ? "purchases" : "sales"} found</h3>
                            <p style={{ color: "var(--muted)" }}>When you win or sell an item, it will appear here.</p>
                            <Link to="/items" className="btn btn-primary" style={{ marginTop: "12px", display: "inline-block", color: "#fff" }}>
                                Browse Active Auctions
                            </Link>
                        </div>
                    ) : (
                        <div className="saved-methods-grid">
                            {filteredTxns.map((txn) => {
                                const isUnpaid = txn.payment_status === "pending" || txn.payment_status === "failed";
                                
                                return (
                                    <div key={txn.txn_id} className="saved-method-box" style={{ flexDirection: "column", alignItems: "flex-start", gap: "10px", padding: "20px" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                                                {txn.thumbnail_url ? (
                                                    <img 
                                                        src={txn.thumbnail_url.startsWith("/uploads") ? txn.thumbnail_url : `${txn.thumbnail_url}`} 
                                                        alt="thumbnail" 
                                                        style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "8px" }}
                                                    />
                                                ) : (
                                                    <div style={{ width: "50px", height: "50px", background: "#eee", borderRadius: "8px" }}></div>
                                                )}
                                                <div>
                                                    <h3 style={{ margin: "0 0 5px 0", fontSize: "18px" }}>{txn.item_title}</h3>
                                                    <span className={`type-badge ${isUnpaid ? 'withdrawal' : (txn.shipment_status === 'delivered' ? 'deposit' : 'sale_proceeds')}`}>
                                                        {isUnpaid ? "AWAITING PAYMENT" : txn.shipment_status ? txn.shipment_status.toUpperCase() : "PAID"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: "right" }}>
                                                <div style={{ fontWeight: "bold", fontSize: "18px", color: isUnpaid ? "#e74c3c" : "#27ae60" }}>
                                                    ৳{Number(txn.amount).toLocaleString()}
                                                </div>
                                                <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                                                    {formatDateTime(txn.close_date)}
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: "flex", gap: "20px", width: "100%", marginTop: "10px", fontSize: "14px", color: "var(--muted)", background: "#f8fafc", padding: "10px", borderRadius: "8px" }}>
                                            <div><strong>{activeTab === "buyer" ? "Seller:" : "Buyer:"}</strong> {activeTab === "buyer" ? txn.seller_username : txn.buyer_username}</div>
                                            {txn.street && (
                                                <div><strong>Ship To:</strong> {txn.street}, {txn.city}</div>
                                            )}
                                        </div>

                                        {/* PAID LOGIC (Shipping & Delivery) */}
                                        {!isUnpaid && txn.shipment_id && (
                                            <div style={{ width: "100%" }}>
                                                
                                                {/* Buyer Action: Mark Received or Dispute */}
                                                {activeTab === "buyer" && txn.shipment_status === "shipped" && disputeShipmentId !== txn.shipment_id && (
                                                    <div style={{ background: "#fff", border: "1px solid #e2e8f0", padding: "15px", borderRadius: "8px", marginTop: "15px" }}>
                                                        <h4 style={{ margin: "0 0 10px 0" }}>Did you receive the package?</h4>
                                                        <div style={{ display: "flex", gap: "10px" }}>
                                                            <button 
                                                                className="btn btn-primary" 
                                                                style={{ background: "#27ae60", borderColor: "#27ae60" }}
                                                                onClick={() => handleMarkDelivered(txn.shipment_id)}
                                                            >
                                                                Yes, I received it
                                                            </button>
                                                            <button 
                                                                className="btn btn-outline"
                                                                style={{ color: "#e74c3c", borderColor: "#e74c3c" }}
                                                                onClick={() => setDisputeShipmentId(txn.shipment_id)}
                                                            >
                                                                No, file a dispute
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Buyer Action: Dispute Form */}
                                                {activeTab === "buyer" && disputeShipmentId === txn.shipment_id && (
                                                    <form onSubmit={handleOpenDispute} style={{ background: "#fef2f2", padding: "15px", borderRadius: "8px", marginTop: "15px", border: "1px solid #fecaca" }}>
                                                        <h4 style={{ margin: "0 0 10px 0", color: "#991b1b" }}>File a Dispute</h4>
                                                        <textarea 
                                                            className="wallet-input" 
                                                            rows="3" 
                                                            placeholder="Please explain what went wrong (e.g., arrived broken, never arrived...)"
                                                            value={disputeReason}
                                                            onChange={(e) => setDisputeReason(e.target.value)}
                                                            required
                                                        />
                                                        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                                                            <button type="submit" className="btn btn-primary" style={{ background: "#e74c3c", borderColor: "#e74c3c" }}>Submit Dispute</button>
                                                            <button type="button" className="btn btn-outline" onClick={() => setDisputeShipmentId(null)}>Cancel</button>
                                                        </div>
                                                    </form>
                                                )}

                                                {/* Seller Action: Ship Item */}
                                                {activeTab === "seller" && txn.shipment_status === "pending" && selectedShipmentId !== txn.shipment_id && (
                                                    <div style={{ marginTop: "10px", width: "100%", textAlign: "right" }}>
                                                        <button 
                                                            className="btn btn-primary" 
                                                            onClick={() => setSelectedShipmentId(txn.shipment_id)}
                                                        >
                                                            Add Tracking Info
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Seller Action: Shipping Form */}
                                                {activeTab === "seller" && selectedShipmentId === txn.shipment_id && (
                                                    <form onSubmit={(e) => handleShipItem(e, txn.shipment_id)} style={{ background: "#f8fafc", padding: "15px", borderRadius: "8px", marginTop: "15px", border: "1px solid #e2e8f0" }}>
                                                        <div style={{ display: "flex", gap: "15px" }}>
                                                            <div style={{ flex: 1 }}>
                                                                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Carrier</label>
                                                                <select className="wallet-select" value={carrier} onChange={e => setCarrier(e.target.value)}>
                                                                    <option value="Pathao">Pathao</option>
                                                                    <option value="Sundarban Courier">Sundarban Courier</option>
                                                                    <option value="FedEx">FedEx</option>
                                                                </select>
                                                            </div>
                                                            <div style={{ flex: 2 }}>
                                                                <label style={{ display: "block", marginBottom: "5px", fontSize: "14px", fontWeight: "bold" }}>Tracking Number</label>
                                                                <input 
                                                                    type="text" 
                                                                    className="wallet-input" 
                                                                    value={trackingNumber} 
                                                                    onChange={e => setTrackingNumber(e.target.value)} 
                                                                    required 
                                                                    placeholder="e.g. PTH-12345678" 
                                                                />
                                                            </div>
                                                        </div>
                                                        <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                                                            <button type="submit" className="btn btn-primary">Mark as Shipped</button>
                                                            <button type="button" className="btn btn-outline" onClick={() => setSelectedShipmentId(null)}>Cancel</button>
                                                        </div>
                                                    </form>
                                                )}

                                                {/* Shared: Tracking Info Readonly */}
                                                {txn.shipment_status !== "pending" && txn.carrier && (
                                                    <div style={{ marginTop: "15px", fontSize: "14px", color: "var(--text)", background: "#fff", padding: "12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                                        <strong>Shipped via:</strong> {txn.carrier} &nbsp;&nbsp;|&nbsp;&nbsp; <strong>Tracking:</strong> {txn.tracking_number}
                                                    </div>
                                                )}

                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                            </div>
        </div>
    );
}

export default Purchases;
