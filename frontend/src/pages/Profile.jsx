import { useState, useEffect } from "react";
import { authFetch } from "../utils/api";
import "../App.css";

function Profile() {
    const user = JSON.parse(sessionStorage.getItem("user"));
    const [profile, setProfile] = useState({
        full_name: "",
        phone_number: "",
        username: user?.username || "",
        email: user?.email || "",
        profile_picture_url: user?.profile_picture_url || null
    });
    const [uploadingPic, setUploadingPic] = useState(false);
    const [addresses, setAddresses] = useState([]);
    
    const [newAddress, setNewAddress] = useState({ house: "", street: "", city: "" });
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

    const handlePictureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append("image", file);
        
        setUploadingPic(true);
        setMessage("");
        
        try {
            const token = sessionStorage.getItem("token");
            const res = await fetch("/api/profile/picture", {
                method: "POST",
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            
            setProfile({ ...profile, profile_picture_url: data.profile_picture_url });
            
            // Update session storage
            const updatedUser = { ...user, profile_picture_url: data.profile_picture_url };
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
            // Force reload to update navbar
            window.location.reload();
        } catch (err) {
            setMessage(err.message);
            setIsError(true);
        } finally {
            setUploadingPic(false);
        }
    };
    
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
            
            setNewAddress({ house: "", street: "", city: "" });
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
                
                <div style={{ display: "flex", alignItems: "center", gap: "20px", marginTop: "20px", marginBottom: "25px" }}>
                    <div style={{ 
                        width: "80px", height: "80px", borderRadius: "50%", background: "#f1f5f9", 
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                        border: "2px solid var(--border)", position: "relative"
                    }}>
                        {profile.profile_picture_url ? (
                            <img src={profile.profile_picture_url} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        )}
                        {uploadingPic && (
                            <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: "12px", fontWeight: "bold" }}>...</span>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="pic-upload" className="btn btn-outline" style={{ cursor: "pointer", display: "inline-block", padding: "8px 15px" }}>
                            {profile.profile_picture_url ? "Change Picture" : "Upload Picture"}
                        </label>
                        <input id="pic-upload" type="file" accept="image/*" style={{ display: "none" }} onChange={handlePictureUpload} />
                        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "5px" }}>Recommended: Square JPG/PNG</div>
                    </div>
                </div>

                <form onSubmit={handleUpdateProfile}>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Username</label>
                            <input type="text" value={profile.username} readOnly style={{ background: "#f5f5f5" }} />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
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
                                    <strong>{addr.house ? `${addr.house}, ` : ""}{addr.street}</strong>
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
                            <div className="form-group" style={{ flex: 1 }}>
                                <label>House/Apt</label>
                                <input type="text" value={newAddress.house} onChange={e => setNewAddress({...newAddress, house: e.target.value})} placeholder="e.g. 5A" />
                            </div>
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
