const fs = require('fs');

const jsxContent = `import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../utils/api";
import "../App.css";
import "./Wallet.css";

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
    const [withdrawSelectedMethodId, setWithdrawSelectedMethodId] = useState("new");
    const [withdrawMethod, setWithdrawMethod] = useState("bkash");
    const [withdrawAccount, setWithdrawAccount] = useState("");

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
            // Using existing mock withdraw logic, just verifying the amount here
            const res = await authFetch("/api/wallet/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: amount })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Withdrawal failed");

            setSuccessMsg(\`Successfully withdrew ৳\${amount.toLocaleString()}!\`);
            setShowSuccessModal(true);
            
            setWithdrawAmount("");
            setWithdrawAccount("");
            await fetchWalletData();
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
            setMessage("Payment method saved successfully.");
            setIsError(false);
            await fetchWalletData();
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
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
            if (withdrawSelectedMethodId === String(methodId)) {
                setWithdrawSelectedMethodId("new");
            }
        } catch (err) {
            alert("Failed to delete method");
        }
    };

    if (loading) {
        return <div className="wallet-loading">Loading Wallet Data...</div>;
    }

    if (!user) {
        return (
            <div className="page-wrapper" style={{ textAlign: "center" }}>
                <h2>Authentication Required</h2>
                <p>Please <Link to="/login">login</Link> to view your wallet.</p>
            </div>
        );
    }

    const currentBalance = Number(wallet?.balance || 0);

    return (
        <div className="page-wrapper wallet-page">
            <div className="wallet-hero">
                <div className="wallet-hero-content">
                    <h1>Digital Wallet</h1>
                    <div className="wallet-balance-display">
                        <span className="balance-label">Available Balance</span>
                        <span className="balance-amount">৳{currentBalance.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="wallet-container">
                {/* Top Tabs */}
                <div className="wallet-tabs">
                    <button 
                        className={\`wallet-tab-btn \${activeTab === "overview" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("overview"); setMessage(""); }}
                    >
                        📊 Overview
                    </button>
                    <button 
                        className={\`wallet-tab-btn \${activeTab === "deposit" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("deposit"); setMessage(""); }}
                    >
                        📥 Deposit Funds
                    </button>
                    <button 
                        className={\`wallet-tab-btn \${activeTab === "withdraw" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("withdraw"); setMessage(""); }}
                    >
                        📤 Withdraw Funds
                    </button>
                    <button 
                        className={\`wallet-tab-btn \${activeTab === "methods" ? "active" : ""}\`}
                        onClick={() => { setActiveTab("methods"); setMessage(""); }}
                    >
                        💳 Saved Methods
                    </button>
                </div>

                {/* Content Area */}
                <div className="wallet-content-area">

                    {/* Deposit Modal Popup */}
                    {showSuccessModal && (
                        <div className="wallet-modal-overlay">
                            <div className="wallet-modal-content">
                                <div className="modal-icon">🎉</div>
                                <h2>Success!</h2>
                                <p>{successMsg}</p>
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => setShowSuccessModal(false)}
                                    style={{ width: "100%", marginTop: "15px" }}
                                >
                                    Close & Return to Wallet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Tab: Overview */}
                    {activeTab === "overview" && (
                        <div className="wallet-card fade-in">
                            <h3 className="wallet-card-title">Welcome to your Wallet</h3>
                            <p className="wallet-card-desc">Select an action from the menu above to manage your funds.</p>
                            
                            <div className="wallet-history-section">
                                <div className="history-header">
                                    <h3>📜 Transaction Logs</h3>
                                    <span className="history-badge">
                                        {wallet?.transactions?.length || 0} records
                                    </span>
                                </div>

                                {wallet?.transactions && wallet.transactions.length > 0 ? (
                                    <div className="table-responsive">
                                        <table className="styled-table">
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
                                                                <span className={\`type-badge \${tx.type}\`}>
                                                                    {tx.type === "deposit" && "📥 Deposit"}
                                                                    {tx.type === "withdrawal" && "📤 Withdrawal"}
                                                                    {tx.type === "payment" && "🛍️ Item Purchase"}
                                                                    {tx.type === "sale_proceeds" && "💰 Auction Earnings"}
                                                                    {tx.type === "bid_escrow" && "🔒 Escrow Hold"}
                                                                    {tx.type === "bid_refund" && "🔓 Escrow Refund"}
                                                                </span>
                                                            </td>
                                                            <td className={\`amt-cell \${isCredit ? "credit" : "debit"}\`}>
                                                                {isCredit ? "+" : "-"}৳{Number(tx.amount).toLocaleString()}
                                                            </td>
                                                            <td>{formatDateTime(tx.transaction_time)}</td>
                                                            <td className="id-cell">#{tx.wallet_txn_id}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="empty-state">
                                        No wallet transactions yet. Funds deposited or earnings from auctions will appear here.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Tab: Deposit */}
                    {activeTab === "deposit" && (
                        <div className="wallet-card fade-in">
                            <h3 className="wallet-card-title">Deposit Funds</h3>
                            <p className="wallet-card-desc">Add money securely to your AntiqueX wallet.</p>

                            <form onSubmit={handleDeposit} className="wallet-form-container">
                                
                                <div className="form-group">
                                    <label>Payment Method</label>
                                    <select 
                                        value={selectedMethodId} 
                                        onChange={(e) => setSelectedMethodId(e.target.value)}
                                        className="wallet-select"
                                    >
                                        <option value="new">Select Payment Method</option>
                                        {paymentMethods.map(m => (
                                            <option key={m.method_id} value={m.method_id}>
                                                {m.method_name} ({m.provider === 'card' ? 'Card' : m.provider.charAt(0).toUpperCase() + m.provider.slice(1)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show full form only if "new" is selected */}
                                {selectedMethodId === "new" && (
                                    <div className="wallet-nested-form">
                                        <div className="form-group">
                                            <label htmlFor="depositMethod">Gateway Provider</label>
                                            <select
                                                id="depositMethod"
                                                value={depositMethod}
                                                onChange={(e) => setDepositMethod(e.target.value)}
                                                className="wallet-select"
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
                                                className="wallet-input"
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
                                                className="wallet-input"
                                                placeholder="***"
                                                value={gatewayPin}
                                                onChange={(e) => setGatewayPin(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-group amount-group">
                                    <label htmlFor="depositAmount">Deposit Amount (BDT)</label>
                                    <input
                                        id="depositAmount"
                                        type="number"
                                        className="wallet-input amount-input"
                                        min="100"
                                        step="100"
                                        placeholder="Enter amount to deposit"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary wallet-submit-btn" disabled={actionLoading}>
                                    {actionLoading ? "Processing…" : \`Confirm Deposit ৳\${Number(depositAmount || 0).toLocaleString()}\`}
                                </button>
                            </form>
                            
                            {message && (
                                <div className={\`wallet-alert \${isError ? "alert-error" : "alert-success"}\`}>
                                    {message}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Withdraw */}
                    {activeTab === "withdraw" && (
                        <div className="wallet-card fade-in">
                            <h3 className="wallet-card-title">Withdraw Funds</h3>
                            <p className="wallet-card-desc">Transfer funds from your wallet to your personal accounts.</p>

                            <form onSubmit={handleWithdraw} className="wallet-form-container">
                                
                                <div className="form-group">
                                    <label>Destination Account</label>
                                    <select 
                                        value={withdrawSelectedMethodId} 
                                        onChange={(e) => setWithdrawSelectedMethodId(e.target.value)}
                                        className="wallet-select"
                                    >
                                        <option value="new">Select Destination Account</option>
                                        {paymentMethods.map(m => (
                                            <option key={m.method_id} value={m.method_id}>
                                                {m.method_name} ({m.provider === 'card' ? 'Card' : m.provider.charAt(0).toUpperCase() + m.provider.slice(1)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Show full form only if "new" is selected */}
                                {withdrawSelectedMethodId === "new" && (
                                    <div className="wallet-nested-form">
                                        <div className="form-group">
                                            <label htmlFor="withdrawMethod">Transfer Destination</label>
                                            <select
                                                id="withdrawMethod"
                                                value={withdrawMethod}
                                                onChange={(e) => setWithdrawMethod(e.target.value)}
                                                className="wallet-select"
                                            >
                                                <option value="bkash">Bkash</option>
                                                <option value="nagad">Nagad</option>
                                                <option value="card">Bank / Card Account</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="withdrawAccount">{withdrawMethod === "card" ? "Account / Card Number" : "Mobile Number"}</label>
                                            <input
                                                id="withdrawAccount"
                                                type="text"
                                                className="wallet-input"
                                                placeholder={withdrawMethod === "card" ? "e.g. 4111222233334444" : "e.g. 017XXXXXX"}
                                                value={withdrawAccount}
                                                onChange={(e) => setWithdrawAccount(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="form-group amount-group">
                                    <label htmlFor="withdrawAmount">Withdrawal Amount (BDT)</label>
                                    <div className="amount-input-wrapper">
                                        <input
                                            id="withdrawAmount"
                                            type="number"
                                            className="wallet-input amount-input"
                                            min="100"
                                            max={currentBalance}
                                            step="100"
                                            placeholder="Enter amount to withdraw"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-outline max-btn"
                                            onClick={() => setWithdrawAmount(String(currentBalance))}
                                        >
                                            Max All
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn btn-primary wallet-submit-btn"
                                    disabled={actionLoading || currentBalance <= 0}
                                >
                                    {actionLoading ? "Processing…" : \`Confirm Withdrawal ৳\${Number(withdrawAmount || 0).toLocaleString()}\`}
                                </button>
                            </form>
                            
                            {message && (
                                <div className={\`wallet-alert \${isError ? "alert-error" : "alert-success"}\`}>
                                    {message}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Payment Methods */}
                    {activeTab === "methods" && (
                        <div className="wallet-card fade-in">
                            <h3 className="wallet-card-title">Saved Payment Methods</h3>
                            <p className="wallet-card-desc">
                                Manage your connected accounts for fast deposits and withdrawals.
                            </p>

                            {message && (
                                <div className={\`wallet-alert \${isError ? "alert-error" : "alert-success"}\`} style={{ marginBottom: "20px" }}>
                                    {message}
                                </div>
                            )}

                            {paymentMethods.length > 0 ? (
                                <div className="saved-methods-grid">
                                    {paymentMethods.map((m) => (
                                        <div key={m.method_id} className="saved-method-box">
                                            <div className="method-details">
                                                <span className="method-icon">💳</span>
                                                <div className="method-text">
                                                    <strong>{m.method_name}</strong>
                                                    <span className="method-sub">
                                                        {m.provider.toUpperCase()} • ending in {m.account_number ? m.account_number.slice(-4) : "****"}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                className="remove-method-btn"
                                                onClick={() => handleDeleteMethod(m.method_id)}
                                                title="Delete payment method"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">
                                    No saved payment methods yet. Add one below!
                                </div>
                            )}

                            <div className="wallet-nested-form" style={{ marginTop: "30px" }}>
                                <h4 style={{ margin: "0 0 15px 0", color: "var(--text)" }}>Add New Method</h4>
                                <form onSubmit={handleAddMethod} className="wallet-form-container">
                                    <div className="form-group">
                                        <label>Custom Label Name</label>
                                        <input
                                            type="text"
                                            className="wallet-input"
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
                                            className="wallet-select"
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
                                            className="wallet-input"
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
                                            className="wallet-input"
                                            placeholder="***"
                                            value={newMethodSecret}
                                            onChange={(e) => setNewMethodSecret(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <button type="submit" className="btn btn-primary wallet-submit-btn" disabled={actionLoading}>
                                        {actionLoading ? "Saving..." : "+ Save Method"}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default Wallet;
`;

const cssContent = `/* Wallet.css */
.wallet-page {
    max-width: 900px;
}

.wallet-hero {
    background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
    border-radius: 12px;
    color: white;
    padding: 35px 40px;
    margin-bottom: 30px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.wallet-hero-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.wallet-hero h1 {
    margin: 0;
    font-size: 32px;
    font-weight: 700;
}

.wallet-balance-display {
    text-align: right;
}

.balance-label {
    display: block;
    font-size: 14px;
    opacity: 0.8;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
}

.balance-amount {
    font-size: 36px;
    font-weight: bold;
    color: #ffd700;
}

.wallet-container {
    background: var(--card);
    border-radius: 12px;
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: var(--shadow-sm);
}

.wallet-tabs {
    display: flex;
    border-bottom: 1px solid var(--border);
    background: #f8fafc;
}

.wallet-tab-btn {
    flex: 1;
    padding: 18px 10px;
    background: transparent;
    border: none;
    font-size: 15px;
    font-weight: 600;
    color: var(--muted);
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 3px solid transparent;
}

.wallet-tab-btn:hover {
    background: #f1f5f9;
    color: var(--text);
}

.wallet-tab-btn.active {
    color: var(--primary);
    border-bottom-color: var(--primary);
    background: #fff;
}

.wallet-content-area {
    padding: 30px 40px;
    min-height: 400px;
}

.wallet-card-title {
    font-size: 24px;
    color: var(--text);
    margin: 0 0 8px 0;
}

.wallet-card-desc {
    color: var(--muted);
    font-size: 15px;
    margin: 0 0 25px 0;
}

.wallet-form-container {
    max-width: 500px;
}

.form-group {
    margin-bottom: 20px;
}

.form-group label {
    display: block;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 8px;
    font-size: 14px;
}

.wallet-input, .wallet-select {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 15px;
    background: #fff;
    transition: border-color 0.2s ease;
}

.wallet-input:focus, .wallet-select:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(41, 128, 185, 0.1);
}

.wallet-nested-form {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
}

.amount-input-wrapper {
    display: flex;
    gap: 10px;
}

.amount-input-wrapper .amount-input {
    flex: 1;
}

.max-btn {
    padding: 0 20px;
    background: #f1f5f9;
    border: 1px solid #cbd5e1;
    color: #475569;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.max-btn:hover {
    background: #e2e8f0;
    color: var(--text);
}

.wallet-submit-btn {
    width: 100%;
    padding: 14px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    margin-top: 10px;
}

.wallet-alert {
    padding: 15px;
    border-radius: 8px;
    margin-top: 20px;
    font-weight: 500;
}

.alert-success {
    background: #ecfdf5;
    color: #065f46;
    border: 1px solid #a7f3d0;
}

.alert-error {
    background: #fef2f2;
    color: #991b1b;
    border: 1px solid #fecaca;
}

.saved-methods-grid {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.saved-method-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.saved-method-box:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-color: #cbd5e1;
}

.method-details {
    display: flex;
    align-items: center;
    gap: 15px;
}

.method-icon {
    font-size: 24px;
    background: #f1f5f9;
    padding: 10px;
    border-radius: 8px;
}

.method-text {
    display: flex;
    flex-direction: column;
}

.method-text strong {
    font-size: 16px;
    color: var(--text);
}

.method-sub {
    font-size: 13px;
    color: var(--muted);
    margin-top: 2px;
}

.remove-method-btn {
    background: none;
    border: none;
    color: #ef4444;
    font-weight: 600;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 6px;
    transition: background 0.2s;
}

.remove-method-btn:hover {
    background: #fef2f2;
}

/* History Table Styles */
.styled-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 15px;
}

.styled-table th, .styled-table td {
    padding: 15px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

.styled-table th {
    background: #f8fafc;
    font-weight: 600;
    color: var(--muted);
    font-size: 14px;
    text-transform: uppercase;
}

.type-badge {
    display: inline-block;
    padding: 6px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    background: #f1f5f9;
    color: #475569;
}

.type-badge.deposit, .type-badge.sale_proceeds, .type-badge.bid_refund {
    background: #dcfce7;
    color: #166534;
}

.type-badge.withdrawal, .type-badge.payment, .type-badge.bid_escrow {
    background: #fef3c7;
    color: #92400e;
}

.amt-cell {
    font-weight: 700;
    font-size: 15px;
}

.amt-cell.credit { color: #10b981; }
.amt-cell.debit { color: #ef4444; }

.wallet-modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.6);
    backdrop-filter: blur(4px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.2s ease;
}

.wallet-modal-content {
    background: #fff;
    padding: 40px;
    border-radius: 16px;
    max-width: 400px;
    text-align: center;
    box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    animation: slideUp 0.3s ease;
}

.modal-icon {
    font-size: 60px;
    margin-bottom: 20px;
}

.wallet-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 50vh;
    font-size: 20px;
    color: var(--primary);
    font-weight: 600;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
`;

fs.writeFileSync('frontend/src/pages/Wallet.jsx', jsxContent);
fs.writeFileSync('frontend/src/pages/Wallet.css', cssContent);
