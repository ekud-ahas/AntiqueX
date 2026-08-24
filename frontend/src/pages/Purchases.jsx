import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Purchases.css";

function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function Purchases() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [transactions, setTransactions] = useState([]);
    const [wallet, setWallet] = useState({ balance: 0 });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("buyer"); // 'buyer' or 'seller'

    // Checkout modal state
    const [checkoutTxn, setCheckoutTxn] = useState(null);
    const [paymentType, setPaymentType] = useState("wallet"); // 'wallet' or 'method'
    const [selectedMethodId, setSelectedMethodId] = useState("");
    const [deliveryAddress, setDeliveryAddress] = useState("");
    const [paying, setPaying] = useState(false);
    const [payMessage, setPayMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const loadData = async () => {
        if (!user) return;
        try {
            const [txnsRes, walletRes, methodsRes] = await Promise.all([
                fetch(`http://localhost:5000/api/transactions/user/${user.user_id}`),
                fetch(`http://localhost:5000/api/wallet/${user.user_id}`),
                fetch(`http://localhost:5000/api/payments/methods/${user.user_id}`)
            ]);

            const txnsData = await txnsRes.json();
            const walletData = await walletRes.json();
            const methodsData = await methodsRes.json();

            if (txnsRes.ok) setTransactions(txnsData);
            if (walletRes.ok) setWallet(walletData);
            if (methodsRes.ok) {
                setPaymentMethods(methodsData);
                if (methodsData.length > 0) {
                    setSelectedMethodId(String(methodsData[0].method_id));
                }
            }
        } catch (err) {
            console.error("Failed to load orders data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const openCheckout = (txn) => {
        setCheckoutTxn(txn);
        setPayMessage("");
        setIsError(false);
        setPaymentType("wallet");
    };

    const closeCheckout = () => {
        setCheckoutTxn(null);
        setPayMessage("");
        setIsError(false);
    };

    const handlePayTransaction = async (e) => {
        e.preventDefault();
        if (!checkoutTxn) return;

        setPaying(true);
        setPayMessage("");
        setIsError(false);

        try {
            const payload = {
                buyer_id: user.user_id,
                payment_method_type: paymentType,
                payment_method_id: paymentType === "method" ? Number(selectedMethodId) : null,
                delivery_address_note: deliveryAddress
            };

            const res = await fetch(`http://localhost:5000/api/transactions/${checkoutTxn.txn_id}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Payment failed to process");
            }

            setPayMessage("🎉 Payment completed successfully! Shipment will be prepared.");
            setIsError(false);

            await loadData();
            setTimeout(() => {
                closeCheckout();
            }, 1800);

        } catch (err) {
            console.error("Payment error:", err);
            setPayMessage(err.message);
            setIsError(true);
        } finally {
            setPaying(false);
        }
    };

    if (!user) {
        return (
            <div className="page-wrapper purchases-page">
                <div className="empty-state">
                    <h1>My Orders & Purchases</h1>
                    <p>Please sign in to view your won auctions and transactions.</p>
                    <Link to="/login" className="btn btn-primary" style={{ marginTop: "14px" }}>
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="page-wrapper purchases-page"><div className="items-message">Loading transactions & orders…</div></div>;
    }

    const wonItems = transactions.filter(t => t.buyer_id === user.user_id);
    const soldItems = transactions.filter(t => t.seller_id === user.user_id);
    const currentList = activeTab === "buyer" ? wonItems : soldItems;
    const walletBalance = Number(wallet.balance || 0);

    return (
        <div className="page-wrapper purchases-page">
            <div className="purchases-container">
                <div className="purchases-header">
                    <div>
                        <h1>🛍️ Orders & Transactions</h1>
                        <p className="purchases-subtitle">
                            Manage payments for won antiques, track shipments, and view seller payouts.
                        </p>
                    </div>
                    <Link to="/wallet" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        💰 My Wallet (৳{walletBalance.toLocaleString()})
                    </Link>
                </div>

                {/* Tabs */}
                <div className="purchases-tabs">
                    <button
                        className={`tab-btn ${activeTab === "buyer" ? "active" : ""}`}
                        onClick={() => setActiveTab("buyer")}
                    >
                        🎁 Won Antiques ({wonItems.length})
                    </button>
                    <button
                        className={`tab-btn ${activeTab === "seller" ? "active" : ""}`}
                        onClick={() => setActiveTab("seller")}
                    >
                        🏷️ Sold Antiques ({soldItems.length})
                    </button>
                </div>

                {/* List of Orders */}
                {currentList.length > 0 ? (
                    <div className="orders-grid">
                        {currentList.map((txn) => {
                            const isBuyer = txn.buyer_id === user.user_id;
                            const isPaid = txn.payment_status === "completed" || txn.payment_status === "paid";

                            return (
                                <div key={txn.txn_id} className={`order-card ${!isPaid ? "order-pending-card" : ""}`}>
                                    <div className="order-card-img">
                                        {txn.thumbnail_url ? (
                                            <img
                                                src={txn.thumbnail_url.startsWith("/uploads/") ? `http://localhost:5000${txn.thumbnail_url}` : txn.thumbnail_url}
                                                alt={txn.item_title}
                                            />
                                        ) : (
                                            <div className="img-placeholder">⚜</div>
                                        )}
                                    </div>

                                    <div className="order-card-body">
                                        <div className="order-top-tags">
                                            <span className="order-id-tag">Order #{txn.txn_id} &bull; Auction #{txn.auction_id}</span>
                                            <span className={`badge badge-${isPaid ? "active" : "ended"}`}>
                                                {isPaid ? "✅ Paid" : "⏳ Payment Pending"}
                                            </span>
                                        </div>

                                        <h3 className="order-title">
                                            <Link to={`/items/${txn.item_id}`}>
                                                {txn.item_title}
                                            </Link>
                                        </h3>

                                        <div className="order-meta-grid">
                                            <div>
                                                <span className="meta-label">{isBuyer ? "Seller:" : "Buyer:"}</span>
                                                <span className="meta-val">@{isBuyer ? txn.seller_username : txn.buyer_username}</span>
                                            </div>
                                            <div>
                                                <span className="meta-label">Closed Date:</span>
                                                <span className="meta-val">{formatDateTime(txn.close_date)}</span>
                                            </div>
                                            <div>
                                                <span className="meta-label">Winning Amount:</span>
                                                <strong className="meta-price">৳{Number(txn.amount).toLocaleString()}</strong>
                                            </div>
                                            <div>
                                                <span className="meta-label">Shipment:</span>
                                                <span className="meta-val">
                                                    {txn.shipment_status === "delivered" && "📦 Delivered"}
                                                    {txn.shipment_status === "in_transit" && `🚚 In Transit (${txn.tracking_number || "Tracked"})`}
                                                    {(!txn.shipment_status || txn.shipment_status === "pending") && (isPaid ? "📦 Preparing to Ship" : "Waiting for Payment")}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="order-card-actions">
                                            {isBuyer && !isPaid && (
                                                <button
                                                    className="btn btn-primary btn-pay-now"
                                                    onClick={() => openCheckout(txn)}
                                                >
                                                    💳 Pay Now (৳{Number(txn.amount).toLocaleString()})
                                                </button>
                                            )}

                                            <Link to={`/items/${txn.item_id}`} className="btn btn-outline btn-sm">
                                                View Item Details
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-orders-box">
                        <div className="empty-icon">🏺</div>
                        <h3>No {activeTab === "buyer" ? "won auctions" : "sold items"} found</h3>
                        <p>
                            {activeTab === "buyer"
                                ? "When you place the winning bid on an antique auction, your order receipt will appear here."
                                : "When buyers win your listed antique auctions, payout information will appear here."}
                        </p>
                        <Link to="/items" className="btn btn-primary" style={{ marginTop: "12px" }}>
                            Browse Active Auctions
                        </Link>
                    </div>
                )}

                {/* Checkout Modal */}
                {checkoutTxn && (
                    <div className="checkout-modal-backdrop" onClick={closeCheckout}>
                        <div className="checkout-modal-card" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>💳 Checkout & Order Payment</h2>
                                <button className="modal-close-btn" onClick={closeCheckout}>✕</button>
                            </div>

                            <div className="checkout-summary">
                                <div className="checkout-item-row">
                                    <span>Item:</span>
                                    <strong>{checkoutTxn.item_title}</strong>
                                </div>
                                <div className="checkout-item-row">
                                    <span>Seller:</span>
                                    <span>@{checkoutTxn.seller_username}</span>
                                </div>
                                <div className="checkout-item-row highlight-row">
                                    <span>Total Amount Due:</span>
                                    <strong>৳{Number(checkoutTxn.amount).toLocaleString()}</strong>
                                </div>
                            </div>

                            <form onSubmit={handlePayTransaction} className="checkout-form">
                                <div className="form-group">
                                    <label>Choose Payment Method *</label>
                                    <div className="payment-options-grid">
                                        <div
                                            className={`payment-option ${paymentType === "wallet" ? "selected" : ""}`}
                                            onClick={() => setPaymentType("wallet")}
                                        >
                                            <div className="opt-radio">{paymentType === "wallet" ? "●" : "○"}</div>
                                            <div className="opt-info">
                                                <strong>💰 AntiqueX Wallet</strong>
                                                <small>Available: ৳{walletBalance.toLocaleString()}</small>
                                            </div>
                                        </div>

                                        <div
                                            className={`payment-option ${paymentType === "method" ? "selected" : ""}`}
                                            onClick={() => setPaymentType("method")}
                                        >
                                            <div className="opt-radio">{paymentType === "method" ? "●" : "○"}</div>
                                            <div className="opt-info">
                                                <strong>💳 Saved Payment Method</strong>
                                                <small>Bkash, Nagad, Cards</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {paymentType === "wallet" && walletBalance < Number(checkoutTxn.amount) && (
                                    <div className="wallet-warning-banner">
                                        <span>⚠️ Insufficient wallet balance (Short by ৳{(Number(checkoutTxn.amount) - walletBalance).toLocaleString()}).</span>
                                        <Link to="/wallet" className="btn btn-outline btn-sm">
                                            + Deposit Funds
                                        </Link>
                                    </div>
                                )}

                                {paymentType === "method" && (
                                    <div className="form-group">
                                        <label htmlFor="methodSelect">Select Method *</label>
                                        {paymentMethods.length > 0 ? (
                                            <select
                                                id="methodSelect"
                                                value={selectedMethodId}
                                                onChange={(e) => setSelectedMethodId(e.target.value)}
                                                required
                                            >
                                                {paymentMethods.map((m) => (
                                                    <option key={m.method_id} value={m.method_id}>
                                                        {m.method_name}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <div style={{ fontSize: "13px", color: "var(--muted)" }}>
                                                No saved payment methods. <Link to="/wallet">Add one in Wallet</Link> or pay via Wallet balance.
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="delivAddr">Delivery Address / Notes (Optional)</label>
                                    <textarea
                                        id="delivAddr"
                                        rows="2"
                                        placeholder="House #, Street, City, District, Phone number…"
                                        value={deliveryAddress}
                                        onChange={(e) => setDeliveryAddress(e.target.value)}
                                    />
                                </div>

                                {payMessage && (
                                    <p className={`msg ${isError ? "msg-error" : "msg-success"}`}>
                                        {payMessage}
                                    </p>
                                )}

                                <button
                                    type="submit"
                                    className="btn btn-primary checkout-submit-btn"
                                    disabled={paying || (paymentType === "wallet" && walletBalance < Number(checkoutTxn.amount))}
                                >
                                    {paying ? "Processing Payment…" : `Confirm & Pay ৳${Number(checkoutTxn.amount).toLocaleString()}`}
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Purchases;
