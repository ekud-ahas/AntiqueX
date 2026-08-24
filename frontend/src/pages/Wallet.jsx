import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Wallet.css";

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

function Wallet() {
    const user = JSON.parse(localStorage.getItem("user"));

    const [wallet, setWallet] = useState({ balance: 0, transactions: [] });
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview"); // 'overview', 'deposit', 'withdraw', 'methods'

    // Forms
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [newMethodName, setNewMethodName] = useState("");

    const [actionLoading, setActionLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const fetchWalletData = async () => {
        if (!user) return;
        try {
            const [walletRes, methodsRes] = await Promise.all([
                fetch(`http://localhost:5000/api/wallet/${user.user_id}`),
                fetch(`http://localhost:5000/api/payments/methods/${user.user_id}`)
            ]);

            const walletData = await walletRes.json();
            const methodsData = await methodsRes.json();

            if (walletRes.ok) setWallet(walletData);
            if (methodsRes.ok) setPaymentMethods(methodsData);
        } catch (err) {
            console.error("Failed to load wallet:", err);
            setMessage("Failed to load wallet data");
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWalletData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleDeposit = async (e) => {
        e.preventDefault();
        setMessage("");
        setIsError(false);

        const amount = Number(depositAmount);
        if (isNaN(amount) || amount <= 0) {
            setMessage("Please enter a valid deposit amount.");
            setIsError(true);
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/wallet/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.user_id,
                    amount: amount
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Deposit failed");

            setMessage(`🎉 Successfully deposited ৳${amount.toLocaleString()} into your wallet!`);
            setIsError(false);
            setDepositAmount("");
            await fetchWalletData();
            setActiveTab("overview");
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleWithdraw = async (e) => {
        e.preventDefault();
        setMessage("");
        setIsError(false);

        const amount = Number(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setMessage("Please enter a valid withdrawal amount.");
            setIsError(true);
            return;
        }

        if (amount > Number(wallet.balance)) {
            setMessage(`Insufficient balance. Maximum withdrawable: ৳${Number(wallet.balance).toLocaleString()}`);
            setIsError(true);
            return;
        }

        setActionLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/wallet/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.user_id,
                    amount: amount
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdrawal failed");

            setMessage(`✅ Successfully withdrew ৳${amount.toLocaleString()} from your wallet.`);
            setIsError(false);
            setWithdrawAmount("");
            await fetchWalletData();
            setActiveTab("overview");
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleAddMethod = async (e) => {
        e.preventDefault();
        if (!newMethodName.trim()) return;

        setActionLoading(true);
        try {
            const res = await fetch("http://localhost:5000/api/payments/methods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    user_id: user.user_id,
                    method_name: newMethodName.trim()
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to add payment method");

            setNewMethodName("");
            await fetchWalletData();
            setMessage("Payment method saved successfully!");
            setIsError(false);
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMethod = async (methodId) => {
        try {
            const res = await fetch(`http://localhost:5000/api/payments/methods/${methodId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: user.user_id })
            });

            if (!res.ok) throw new Error("Failed to delete payment method");

            setPaymentMethods(paymentMethods.filter(m => m.method_id !== methodId));
            setMessage("Payment method removed.");
            setIsError(false);
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        }
    };

    if (!user) {
        return (
            <div className="page-wrapper wallet-page">
                <div className="empty-state">
                    <h1>AntiqueX Wallet</h1>
                    <p>Please log in to manage your wallet and balance.</p>
                    <Link to="/login" className="btn btn-primary" style={{ marginTop: "14px" }}>
                        Sign In
                    </Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return <div className="page-wrapper wallet-page"><div className="items-message">Loading wallet balance…</div></div>;
    }

    const currentBalance = Number(wallet.balance || 0);

    return (
        <div className="page-wrapper wallet-page">
            <div className="wallet-container">
                <div className="wallet-header">
                    <div>
                        <h1>💰 My Wallet</h1>
                        <p className="wallet-subtitle">
                            Manage your AntiqueX auction balance, deposit funds, and view earnings.
                        </p>
                    </div>
                    <Link to="/purchases" className="btn btn-outline" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                        🛍️ View Orders & Purchases &rarr;
                    </Link>
                </div>

                {message && (
                    <div style={{ marginBottom: "20px" }}>
                        <p className={`msg ${isError ? "msg-error" : "msg-success"}`}>{message}</p>
                    </div>
                )}

                {/* Balance Hero Card */}
                <div className="balance-hero-card">
                    <div className="balance-info">
                        <span className="balance-label">Available Balance</span>
                        <h2 className="balance-amount">৳{currentBalance.toLocaleString()}</h2>
                        <span className="balance-account-tag">Account: @{user.username} (ID #{user.user_id})</span>
                    </div>

                    <div className="balance-actions">
                        <button
                            className={`btn ${activeTab === "deposit" ? "btn-primary" : "btn-light"}`}
                            onClick={() => { setActiveTab("deposit"); setMessage(""); }}
                        >
                            + Deposit Funds
                        </button>
                        <button
                            className={`btn ${activeTab === "withdraw" ? "btn-primary" : "btn-light"}`}
                            onClick={() => { setActiveTab("withdraw"); setMessage(""); }}
                        >
                            ↑ Withdraw
                        </button>
                        <button
                            className={`btn ${activeTab === "methods" ? "btn-primary" : "btn-light"}`}
                            onClick={() => { setActiveTab("methods"); setMessage(""); }}
                        >
                            💳 Payment Methods
                        </button>
                    </div>
                </div>

                {/* Tab: Deposit Form */}
                {activeTab === "deposit" && (
                    <div className="wallet-card-action">
                        <div className="action-card-header">
                            <h3>Deposit Funds into Wallet</h3>
                            <button className="close-tab-btn" onClick={() => setActiveTab("overview")}>✕ Close</button>
                        </div>
                        <p className="action-hint">
                            Select a quick deposit amount or enter a custom amount to fund your account for auction bidding.
                        </p>

                        <div className="quick-amount-chips">
                            {[5000, 10000, 25000, 50000, 100000].map((amt) => (
                                <button
                                    key={amt}
                                    type="button"
                                    className={`chip-btn ${Number(depositAmount) === amt ? "active" : ""}`}
                                    onClick={() => setDepositAmount(String(amt))}
                                >
                                    +৳{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleDeposit} className="action-form">
                            <div className="form-group">
                                <label htmlFor="depositAmount">Amount (৳) *</label>
                                <input
                                    id="depositAmount"
                                    type="number"
                                    min="100"
                                    step="100"
                                    placeholder="Enter deposit amount (e.g. 10000)"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    required
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                {actionLoading ? "Processing…" : `Confirm Deposit of ৳${Number(depositAmount || 0).toLocaleString()}`}
                            </button>
                        </form>
                    </div>
                )}

                {/* Tab: Withdraw Form */}
                {activeTab === "withdraw" && (
                    <div className="wallet-card-action">
                        <div className="action-card-header">
                            <h3>Withdraw Funds from Wallet</h3>
                            <button className="close-tab-btn" onClick={() => setActiveTab("overview")}>✕ Close</button>
                        </div>
                        <p className="action-hint">
                            Withdraw your auction earnings back to your bank account or mobile wallet.
                        </p>

                        <form onSubmit={handleWithdraw} className="action-form">
                            <div className="form-group">
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <label htmlFor="withdrawAmount">Amount (৳) *</label>
                                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                                        Max: ৳{currentBalance.toLocaleString()}
                                    </span>
                                </div>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <input
                                        id="withdrawAmount"
                                        type="number"
                                        min="100"
                                        max={currentBalance}
                                        step="100"
                                        placeholder="Enter amount to withdraw"
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        required
                                        style={{ flex: 1 }}
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        onClick={() => setWithdrawAmount(String(currentBalance))}
                                    >
                                        Max All
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={actionLoading || currentBalance <= 0}
                            >
                                {actionLoading ? "Processing…" : `Confirm Withdrawal of ৳${Number(withdrawAmount || 0).toLocaleString()}`}
                            </button>
                        </form>
                    </div>
                )}

                {/* Tab: Payment Methods */}
                {activeTab === "methods" && (
                    <div className="wallet-card-action">
                        <div className="action-card-header">
                            <h3>Saved Payment Methods</h3>
                            <button className="close-tab-btn" onClick={() => setActiveTab("overview")}>✕ Close</button>
                        </div>
                        <p className="action-hint">
                            Manage your saved payment methods (Bkash, Nagad, Cards, Bank accounts) for seamless transactions.
                        </p>

                        {paymentMethods.length > 0 ? (
                            <div className="methods-grid">
                                {paymentMethods.map((m) => (
                                    <div key={m.method_id} className="method-card">
                                        <div className="method-info">
                                            <span className="method-icon">💳</span>
                                            <strong>{m.method_name}</strong>
                                        </div>
                                        <button
                                            type="button"
                                            className="btn-remove-method"
                                            onClick={() => handleDeleteMethod(m.method_id)}
                                            title="Delete payment method"
                                        >
                                            ✕ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p style={{ color: "var(--muted)", fontSize: "14px", margin: "10px 0" }}>
                                No saved payment methods yet. Add one below!
                            </p>
                        )}

                        <form onSubmit={handleAddMethod} className="add-method-form">
                            <input
                                type="text"
                                placeholder="e.g. Bkash (01712-XXXXXX) or Visa Card"
                                value={newMethodName}
                                onChange={(e) => setNewMethodName(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                + Add Method
                            </button>
                        </form>
                    </div>
                )}

                {/* Wallet Transactions History */}
                <div className="wallet-history-card">
                    <div className="history-header">
                        <h3>📜 Wallet Activity & Transaction Logs</h3>
                        <span className="badge badge-outline">
                            {wallet.transactions?.length || 0} activity records
                        </span>
                    </div>

                    {wallet.transactions && wallet.transactions.length > 0 ? (
                        <div className="history-table-wrapper">
                            <table className="history-table">
                                <thead>
                                    <tr>
                                        <th>Activity Type</th>
                                        <th>Amount</th>
                                        <th>Date & Time</th>
                                        <th>Log ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {wallet.transactions.map((tx) => {
                                        const isCredit = tx.type === "deposit" || tx.type === "sale_proceeds";
                                        return (
                                            <tr key={tx.wallet_txn_id}>
                                                <td>
                                                    <div className="txn-type-cell">
                                                        <span className={`txn-badge txn-${tx.type}`}>
                                                            {tx.type === "deposit" && "📥 Deposit"}
                                                            {tx.type === "withdrawal" && "📤 Withdrawal"}
                                                            {tx.type === "payment" && "🛍️ Item Purchase"}
                                                            {tx.type === "sale_proceeds" && "💰 Auction Earnings"}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className={`txn-amount-cell ${isCredit ? "amount-credit" : "amount-debit"}`}>
                                                    {isCredit ? "+" : "-"}৳{Number(tx.amount).toLocaleString()}
                                                </td>
                                                <td className="txn-time-cell">
                                                    {formatDateTime(tx.transaction_time)}
                                                </td>
                                                <td className="txn-id-cell">
                                                    #{tx.wallet_txn_id}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="empty-history-box">
                            No wallet transactions yet. Funds deposited or earnings from auctions will appear here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Wallet;
