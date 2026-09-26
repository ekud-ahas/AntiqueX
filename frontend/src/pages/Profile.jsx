import { useState, useEffect } from "react";
import { authFetch } from "../utils/api";
import "../App.css";

function Profile() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [profile, setProfile] = useState({
        full_name: "",
        phone_number: "",
        username: "",
        email: ""
    });
    const [addresses, setAddresses] = useState([]);
    
    const [newAddress, setNewAddress] = useState({ street: "", city: "" });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);

    const loadData = async () => {
        try {
            const [profRes, addrRes] = await Promise.all([
                authFetch("/api/profile"),
                authFetch("/api/profile/addresses")
            ]);
            if (profRes.ok) setProfile(await profRes.json());
            if (addrRes.ok) setAddresses(await addrRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setMessage("");
        try {
            const res = await authFetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    full_name: profile.full_name,
                    phone_number: profile.phone_number
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setMessage("Profile updated successfully!");
            setIsError(false);
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        }
    };

    const handleAddAddress = async (e) => {
        e.preventDefault();
        setMessage("");
        try {
            const res = await authFetch("/api/profile/addresses", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newAddress)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setNewAddress({ street: "", city: "" });
            loadData();
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        }
    };

    const handleDeleteAddress = async (id) => {
        try {
            const res = await authFetch(`/api/profile/addresses/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            loadData();
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        }
    };

    if (loading) return <div className="page-container">Loading Profile...</div>;

    return (
        <div className="page-container" style={{ maxWidth: "800px", margin: "40px auto" }}>
            <h1 style={{ marginBottom: "20px" }}>My Profile</h1>
            
            {message && (
                <div className={`msg ${isError ? "msg-error" : "msg-success"}`} style={{ marginBottom: "20px" }}>
                    {message}
                </div>
            )}

            <div className="wallet-card" style={{ marginBottom: "30px" }}>
                <h3 className="wallet-card-title">Account Information</h3>
                <form onSubmit={handleUpdateProfile} style={{ marginTop: "20px" }}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Username (Read Only)</label>
                            <input type="text" value={profile.username} readOnly style={{ background: "#f5f5f5" }} />
                        </div>
                        <div className="form-group">
                            <label>Email (Read Only)</label>
                            <input type="email" value={profile.email} readOnly style={{ background: "#f5f5f5" }} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input type="text" value={profile.full_name} onChange={e => setProfile({...profile, full_name: e.target.value})} required />
                        </div>
                        <div className="form-group">
                            <label>Phone Number</label>
                            <input type="text" value={profile.phone_number || ""} onChange={e => setProfile({...profile, phone_number: e.target.value})} placeholder="e.g. +88017..." />
                        </div>
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "10px" }}>Save Changes</button>
                </form>
            </div>

            <div className="wallet-card">
                <h3 className="wallet-card-title">Delivery Addresses</h3>
                
                {addresses.length > 0 ? (
                    <div style={{ marginTop: "20px" }}>
                        {addresses.map(addr => (
                            <div key={addr.address_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "15px", border: "1px solid var(--border)", borderRadius: "8px", marginBottom: "10px" }}>
                                <div>
                                    <strong>{addr.street}</strong>
                                    <div style={{ color: "var(--muted)", fontSize: "14px", marginTop: "5px" }}>{addr.city}</div>
                                </div>
                                <button onClick={() => handleDeleteAddress(addr.address_id)} className="btn btn-danger" style={{ padding: "6px 12px", fontSize: "12px" }}>Remove</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{ marginTop: "15px", color: "var(--muted)" }}>No delivery addresses saved yet. Add one below.</p>
                )}

                <div style={{ marginTop: "30px", borderTop: "1px dashed var(--border)", paddingTop: "20px" }}>
                    <h4 style={{ marginBottom: "15px" }}>Add New Address</h4>
                    <form onSubmit={handleAddAddress}>
                        <div className="form-row">
                            <div className="form-group" style={{ flex: 2 }}>
                                <label>Street Address</label>
                                <input type="text" value={newAddress.street} onChange={e => setNewAddress({...newAddress, street: e.target.value})} required placeholder="e.g. 15 Banani Road 11" />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>City</label>
                                <input type="text" value={newAddress.city} onChange={e => setNewAddress({...newAddress, city: e.target.value})} required placeholder="e.g. Dhaka" />
                            </div>
                        </div>
                        <button type="submit" className="btn btn-outline">Add Address</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Profile;
