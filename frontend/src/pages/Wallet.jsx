import { useState, useEffect } from "react";
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
    const user = JSON.parse(sessionStorage.getItem("user"));
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
                authFetch(`/api/wallet/${user.user_id}`),
                authFetch(`/api/payments/methods/${user.user_id}`)
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

            setSuccessMsg(`Successfully deposited ৳${amount.toLocaleString()}!`);
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

            setSuccessMsg(`Successfully withdrew ৳${amount.toLocaleString()}!`);
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
            await authFetch(`/api/payments/methods/${methodId}`, { method: "DELETE" });
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
                        className={`wallet-tab-btn ${activeTab === "overview" ? "active" : ""}`}
                        onClick={() => { setActiveTab("overview"); setMessage(""); }}
                    >
                         Overview
                    </button>
                    <button 
                        className={`wallet-tab-btn ${activeTab === "deposit" ? "active" : ""}`}
                        onClick={() => { setActiveTab("deposit"); setMessage(""); }}
                    >
                         Deposit Funds
                    </button>
                    <button 
                        className={`wallet-tab-btn ${activeTab === "withdraw" ? "active" : ""}`}
                        onClick={() => { setActiveTab("withdraw"); setMessage(""); }}
                    >
                         Withdraw Funds
                    </button>
                    <button 
                        className={`wallet-tab-btn ${activeTab === "methods" ? "active" : ""}`}
                        onClick={() => { setActiveTab("methods"); setMessage(""); }}
                    >
                         Saved Methods
                    </button>
                </div>

                {/* Content Area */}
                <div className="wallet-content-area">

                    {/* Deposit Modal Popup */}
                    {showSuccessModal && (
                        <div className="wallet-modal-overlay">
                            <div className="wallet-modal-content">
                                <div className="modal-icon"></div>
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
                            
                            
                            <div className="wallet-history-section">
                                <div className="history-header">
                                    <h3> Transaction Logs</h3>
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
                                                    <th>Trx ID</th>
                                                    
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {wallet.transactions.map((tx) => {
                                                    const isCredit = tx.type === "deposit" || tx.type === "sale_proceeds" || tx.type === "bid_refund";
                                                    return (
                                                        <tr key={tx.wallet_txn_id}>
                                                            <td>
                                                                <span className={`type-badge ${tx.type}`}>
                                                                    {tx.type === "deposit" && " Deposit"}
                                                                    {tx.type === "withdrawal" && " Withdrawal"}
                                                                    {tx.type === "payment" && " Item Purchase"}
                                                                    {tx.type === "sale_proceeds" && " Auction Earnings"}
                                                                    {tx.type === "bid_escrow" && " Escrow Hold"}
                                                                    {tx.type === "bid_refund" && " Escrow Refund"}
                                                                </span>
                                                            </td>
                                                            <td className={`amt-cell ${isCredit ? "credit" : "debit"}`}>
                                                                {isCredit ? "+" : "-"}৳{Number(tx.amount).toLocaleString()}
                                                            </td>
                                                            <td>{formatDateTime(tx.transaction_time)}</td>
                                                            <td className="id-cell">{tx.trx_id}</td>
                                                            
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
                                        min="1"
                                        step="any"
                                        placeholder="Enter amount to deposit"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        required
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary wallet-submit-btn" disabled={actionLoading}>
                                    {actionLoading ? "Processing…" : `Confirm Deposit ৳${Number(depositAmount || 0).toLocaleString()}`}
                                </button>
                            </form>
                            
                            {message && (
                                <div className={`wallet-alert ${isError ? "alert-error" : "alert-success"}`}>
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
                                            min="1"
                                            max={currentBalance}
                                            step="any"
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
                                    {actionLoading ? "Processing…" : `Confirm Withdrawal ৳${Number(withdrawAmount || 0).toLocaleString()}`}
                                </button>
                            </form>
                            
                            {message && (
                                <div className={`wallet-alert ${isError ? "alert-error" : "alert-success"}`}>
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
                                <div className={`wallet-alert ${isError ? "alert-error" : "alert-success"}`} style={{ marginBottom: "20px" }}>
                                    {message}
                                </div>
                            )}

                            {paymentMethods.length > 0 ? (
                                <div className="saved-methods-grid">
                                    {paymentMethods.map((m) => (
                                        <div key={m.method_id} className="saved-method-box">
                                            <div className="method-details">
                                                <span className="method-icon"></span>
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
