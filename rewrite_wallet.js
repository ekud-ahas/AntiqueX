const fs = require('fs');

const content = `import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/api";
import "../App.css";

function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric",
        hour: "numeric", minute: "2-digit", hour12: true
    });
}

function Wallet() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [wallet, setWallet] = useState(null);
    const [paymentMethods, setPaymentMethods] = useState([]);
    
    const [activeTab, setActiveTab] = useState("overview"); 

    // Deposit State
    const [depositAmount, setDepositAmount] = useState("");
    const [selectedMethodId, setSelectedMethodId] = useState("new");
    const [depositMethod, setDepositMethod] = useState("bkash");
    const [accountNumber, setAccountNumber] = useState("");
    const [gatewayPin, setGatewayPin] = useState("");
    
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMsg, setSuccessMsg] = useState("");

    // Withdraw State
    const [withdrawAmount, setWithdrawAmount] = useState("");

    // Add Method State
    const [newMethodName, setNewMethodName] = useState("");
    const [newMethodProvider, setNewMethodProvider] = useState("bkash");
    const [newMethodAccount, setNewMethodAccount] = useState("");
    const [newMethodSecret, setNewMethodSecret] = useState("");

    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    const fetchWalletData = async () => {
        if (!user) return;
        try {
            const [wRes, mRes] = await Promise.all([
                authFetch(\`/api/wallet/\${user.user_id}\`),
                authFetch(\`/api/payments/methods/\${user.user_id}\`)
            ]);

            if (wRes.ok) setWallet(await wRes.json());
            if (mRes.ok) setPaymentMethods(await mRes.json());
        } catch (err) {
            console.error(err);
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
            let finalMethod = depositMethod;
            let finalAccount = accountNumber;
            let finalPin = gatewayPin;

            if (selectedMethodId !== "new") {
                const saved = paymentMethods.find(m => m.method_id === Number(selectedMethodId));
                if (saved) {
                    finalMethod = saved.provider || "bkash";
                    finalAccount = saved.account_number || "saved";
                    finalPin = "saved"; 
                }
            }

            const res = await authFetch("/api/wallet/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: amount,
                    method: finalMethod,
                    accountNumber: finalAccount,
                    pin: finalPin
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Deposit failed");

            const ref = data.gateway_reference ? \` (Ref: \${data.gateway_reference})\` : "";
            setSuccessMsg(\`Successfully deposited ৳\${amount.toLocaleString()}!\${ref}\`);
            setShowSuccessModal(true);
            
            setDepositAmount("");
            setAccountNumber("");
            setGatewayPin("");
            await fetchWalletData();
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

        setActionLoading(true);
        try {
            const res = await authFetch("/api/wallet/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdrawal failed");

            setMessage(\`Successfully withdrew ৳\${amount.toLocaleString()}!\`);
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
            const res = await authFetch("/api/payments/methods", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    method_name: newMethodName.trim(),
                    provider: newMethodProvider,
                    account_number: newMethodAccount,
                    secret_code: newMethodSecret
                })
            });

            if (!res.ok) throw new Error("Failed to add payment method");
            setNewMethodName("");
            setNewMethodAccount("");
            setNewMethodSecret("");
            await fetchWalletData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteMethod = async (methodId) => {
        if (!window.confirm("Delete this saved payment method?")) return;
        try {
            await authFetch(\`/api/payments/methods/\${methodId}\`, { method: "DELETE" });
            await fetchWalletData();
            if (selectedMethodId === String(methodId)) {
                setSelectedMethodId("new");
            }
        } catch (err) {
            alert("Failed to delete method");
        }
    };

    if (loading) {
        return <div className="loading-spinner">Loading Wallet...</div>;
    }

    if (!user) {
        return (
            <div className="container" style={{ textAlign: "center", marginTop: "50px" }}>
                <h2>Authentication Required</h2>
                <p>Please <Link to="/login">login</Link> to view your wallet.</p>
            </div>
        );
    }

    const currentBalance = Number(wallet?.balance || 0);

    return (
        <div className="container">
            <div className="wallet-header">
                <h2>Digital Wallet</h2>
                <div className="wallet-balance-box">
                    <span className="balance-label">Current Balance</span>
                    <span className="balance-amount">৳{currentBalance.toLocaleString()}</span>
                </div>
            </div>

            <div className="wallet-dashboard">
                {/* Left Sidebar Menu */}
                <div className="wallet-sidebar">
                    <button 
                        className={\`sidebar-btn \${activeTab === "overview" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("overview"); setMessage(""); }}
                    >
                        📊 Overview
                    </button>
                    <button 
                        className={\`sidebar-btn \${activeTab === "deposit" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("deposit"); setMessage(""); }}
                    >
                        📥 Deposit Funds
                    </button>
                    <button 
                        className={\`sidebar-btn \${activeTab === "withdraw" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("withdraw"); setMessage(""); }}
                    >
                        📤 Withdraw Funds
                    </button>
                    <button 
                        className={\`sidebar-btn \${activeTab === "methods" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("methods"); setMessage(""); }}
                    >
                        💳 Payment Methods
                    </button>
                </div>

                {/* Right Content Area */}
                <div className="wallet-content">

                    {/* Deposit Modal Popup */}
                    {showSuccessModal && (
                        <div style={{
                            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.6)", zIndex: 9999,
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            <div style={{
                                background: "#fff", padding: "30px", borderRadius: "12px",
                                maxWidth: "400px", textAlign: "center", boxShadow: "0 10px 25px rgba(0,0,0,0.2)"
                            }}>
                                <div style={{ fontSize: "50px", marginBottom: "15px" }}>🎉</div>
                                <h2 style={{ color: "#27ae60", marginBottom: "10px" }}>Success!</h2>
                                <p style={{ fontSize: "16px", marginBottom: "25px", color: "#333" }}>{successMsg}</p>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => setShowSuccessModal(false)}
                                    style={{ width: "100%" }}
                                >
                                    Close & Return to Wallet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab: Overview */}
                    {activeTab === "overview" && (
                        <div className="wallet-card-action" style={{ border: "none", boxShadow: "none" }}>
                            <h3>Welcome to your Wallet</h3>
                            <p style={{ color: "var(--muted)" }}>Select an action from the menu to manage your funds.</p>
                        </div>
                    )}

                    {/* Tab: Deposit */}
                    {activeTab === "deposit" && (
                        <div className="wallet-card-action">
                            <h3>Deposit Funds</h3>
                            <p className="action-hint">Top up your wallet balance instantly.</p>

                            <form onSubmit={handleDeposit} className="wallet-form">
                                
                                <div className="form-group">
                                    <label>Select Payment Method</label>
                                    <select 
                                        value={selectedMethodId} 
                                        onChange={(e) => setSelectedMethodId(e.target.value)}
                                        style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                                    >
                                        <option value="new">➕ Add New Temporary Method</option>
                                        {paymentMethods.map(m => (
                                            <option key={m.method_id} value={m.method_id}>
                                                {m.method_name} ({m.provider === 'card' ? 'Card' : m.provider.charAt(0).toUpperCase() + m.provider.slice(1)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show full form only if "new" is selected */}
                                {selectedMethodId === "new" && (
                                    <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #eee" }}>
                                        <div className="form-group">
                                            <label htmlFor="depositMethod">Gateway Provider</label>
                                            <select
                                                id="depositMethod"
                                                value={depositMethod}
                                                onChange={(e) => setDepositMethod(e.target.value)}
                                                className="gateway-select"
                                            >
                                                <option value="bkash">Bkash</option>
                                                <option value="nagad">Nagad</option>
                                                <option value="card">Credit/Debit Card</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="accountNumber">{depositMethod === "card" ? "Card Number" : "Mobile Number"}</label>
                                            <input
                                                id="accountNumber"
                                                type="text"
                                                placeholder={depositMethod === "card" ? "e.g. 4111222233334444" : "e.g. 017XXXXXX"}
                                                value={accountNumber}
                                                onChange={(e) => setAccountNumber(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="gatewayPin">{depositMethod === "card" ? "CVV" : "PIN"}</label>
                                            <input
                                                id="gatewayPin"
                                                type="password"
                                                placeholder="***"
                                                value={gatewayPin}
                                                onChange={(e) => setGatewayPin(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-group">
                                    <label htmlFor="depositAmount">Amount (BDT)</label>
                                    <input
                                        id="depositAmount"
                                        type="number"
                                        min="100"
                                        step="100"
                                        placeholder="Enter amount to deposit"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                    {actionLoading ? "Processing…" : \`Deposit ৳\${Number(depositAmount || 0).toLocaleString()}\`}
                                </button>
                            </form>
                            
                            {message && (
                                <p className={\`msg \${isError ? "msg-error" : "msg-success"}\`} style={{ marginTop: "15px" }}>
                                    {message}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tab: Withdraw */}
                    {activeTab === "withdraw" && (
                        <div className="wallet-card-action">
                            <h3>Withdraw Funds</h3>
                            <p className="action-hint">Transfer funds from your wallet back to your bank or mobile wallet.</p>

                            <form onSubmit={handleWithdraw} className="wallet-form">
                                <div className="form-group">
                                    <label htmlFor="withdrawAmount">Amount (BDT)</label>
                                    <div style={{ display: "flex", gap: "10px" }}>
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
                                    {actionLoading ? "Processing…" : \`Confirm Withdrawal of ৳\${Number(withdrawAmount || 0).toLocaleString()}\`}
                                </button>
                            </form>
                            {message && (
                                <p className={\`msg \${isError ? "msg-error" : "msg-success"}\`} style={{ marginTop: "15px" }}>
                                    {message}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Tab: Payment Methods */}
                    {activeTab === "methods" && (
                        <div className="wallet-card-action">
                            <h3>Saved Payment Methods</h3>
                            <p className="action-hint">
                                Add payment methods here to quickly deposit funds without re-entering details.
                            </p>

                            {paymentMethods.length > 0 ? (
                                <div className="methods-grid" style={{ marginBottom: "25px" }}>
                                    {paymentMethods.map((m) => (
                                        <div key={m.method_id} className="method-card" style={{ display: "flex", justifyContent: "space-between", padding: "12px", border: "1px solid #ccc", borderRadius: "6px", marginBottom: "10px" }}>
                                            <div className="method-info">
                                                <span className="method-icon" style={{ marginRight: "10px" }}>💳</span>
                                                <strong>{m.method_name}</strong> 
                                                <span style={{ color: "#7f8c8d", fontSize: "12px", marginLeft: "10px" }}>
                                                    ({m.provider}) ending in {m.account_number ? m.account_number.slice(-4) : "****"}
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMethod(m.method_id)}
                                                title="Delete payment method"
                                                style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontWeight: "bold" }}
                                            >
                                                ✕ Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: "var(--muted)", fontSize: "14px", margin: "10px 0 25px 0" }}>
                                    No saved payment methods yet. Add one below!
                                </p>
                            )}

                            <div style={{ background: "#f8f9fa", padding: "15px", borderRadius: "8px", border: "1px solid #eee" }}>
                                <h4 style={{ margin: "0 0 15px 0" }}>Add New Method</h4>
                                <form onSubmit={handleAddMethod} className="wallet-form">
                                    <div className="form-group">
                                        <label>Custom Label Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. My Personal Bkash"
                                            value={newMethodName}
                                            onChange={(e) => setNewMethodName(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Gateway Provider</label>
                                        <select
                                            value={newMethodProvider}
                                            onChange={(e) => setNewMethodProvider(e.target.value)}
                                            style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #ccc" }}
                                        >
                                            <option value="bkash">Bkash</option>
                                            <option value="nagad">Nagad</option>
                                            <option value="card">Credit/Debit Card</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>{newMethodProvider === "card" ? "Card Number" : "Mobile Number"}</label>
                                        <input
                                            type="text"
                                            placeholder={newMethodProvider === "card" ? "e.g. 4111222233334444" : "e.g. 017XXXXXX"}
                                            value={newMethodAccount}
                                            onChange={(e) => setNewMethodAccount(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>{newMethodProvider === "card" ? "CVV" : "PIN"}</label>
                                        <input
                                            type="password"
                                            placeholder="***"
                                            value={newMethodSecret}
                                            onChange={(e) => setNewMethodSecret(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                        {actionLoading ? "Saving..." : "+ Save Method"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* Wallet Transactions History */}
                    {/* Reusing existing logic... */}
                    <div className="wallet-history-card">
                        <div className="history-header">
                            <h3>📜 Wallet Activity & Transaction Logs</h3>
                            <span className="badge badge-outline">
                                {wallet?.transactions?.length || 0} activity records
                            </span>
                        </div>

                        {wallet?.transactions && wallet.transactions.length > 0 ? (
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
                                            const isCredit = tx.type === "deposit" || tx.type === "sale_proceeds" || tx.type === "bid_refund";
                                            return (
                                                <tr key={tx.wallet_txn_id}>
                                                    <td>
                                                        <div className="txn-type-cell">
                                                            <span className={\`txn-badge txn-\${tx.type}\`}>
                                                                {tx.type === "deposit" && "📥 Deposit"}
                                                                {tx.type === "withdrawal" && "📤 Withdrawal"}
                                                                {tx.type === "payment" && "🛍️ Item Purchase"}
                                                                {tx.type === "sale_proceeds" && "💰 Auction Earnings"}
                                                                {tx.type === "bid_escrow" && "🔒 Escrow Hold"}
                                                                {tx.type === "bid_refund" && "🔓 Escrow Refund"}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className={\`txn-amount-cell \${isCredit ? "amount-credit" : "amount-debit"}\`}>
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
        </div>
    );
}

export default Wallet;
`;

fs.writeFileSync('frontend/src/pages/Wallet.jsx', content);
