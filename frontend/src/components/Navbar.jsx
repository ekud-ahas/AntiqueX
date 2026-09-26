import { useContext, useState, useRef, useEffect } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { authFetch } from "../utils/api";
import "./Navbar.css";

function Navbar() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (user && user.role !== 'admin' && user.role !== 'moderator') {
            authFetch("/api/wallet")
                .then(res => res.ok ? res.json() : { balance: 0 })
                .then(data => setBalance(data.balance))
                .catch(() => {});
        }
    }, [user]);

    const isAdmin = user && (user.role === "admin" || user.role === "moderator");
    const isFullAdmin = user && user.role === "admin"; // full admin only

    const handleLogout = async () => {
        await logout();
        navigate("/");
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">

                <Link to="/" className="navbar-logo">
                    <span className="navbar-logo-icon"></span>
                    AntiqueX
                </Link>

                <div className="navbar-links">
                    <NavLink to="/" end className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Home</NavLink>
                    <NavLink to="/items" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Auctions</NavLink>
                    {!isAdmin && (
                        <NavLink to="/categories" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Categories</NavLink>
                    )}

                    {/* Customer-only Links */}
                    {user && !isAdmin && (
                        <>
                            <NavLink to="/sell" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Sell Item</NavLink>
                            <NavLink to="/my-items" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>My Items</NavLink>
                            <NavLink to="/purchases" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Orders</NavLink>
                            <NavLink to="/wallet" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Wallet</NavLink>
                            <NavLink to="/watchlist" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Watchlist</NavLink>
                            <NavLink to="/notifications" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Notifications</NavLink>
                        </>
                    )}

                    {/* Admin / Moderator Links */}
                    {isAdmin && (
                        <>
                            <NavLink to="/admin" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Dashboard</NavLink>
                            {/* Categories management is admin-only; moderators cannot create/delete categories */}
                            {isFullAdmin && (
                                <NavLink to="/categories" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Categories</NavLink>
                            )}
                        </>
                    )}
                </div>

                <div className="navbar-account">
                    {user ? (
                        <div className="profile-dropdown-container" ref={dropdownRef} style={{ display: "flex", alignItems: "center", gap: "12px", marginRight: "10px" }}>
                            
                            <button className="profile-avatar-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
                                <div className="avatar-circle">
                                    {user.profile_picture_url ? (
                                        <img src={user.profile_picture_url.startsWith('http') ? user.profile_picture_url : `${user.profile_picture_url}`} alt="Avatar" style={{width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover'}} />
                                    ) : (
                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="12" cy="7" r="4"></circle>
                                        </svg>
                                    )}
                                </div>
                            </button>
                            
                            {balance !== null && (
                                <Link to="/wallet" style={{ 
                                    textDecoration: "none", 
                                    background: "#f8fafc", 
                                    padding: "6px 12px", 
                                    borderRadius: "20px", 
                                    fontWeight: "bold", 
                                    color: "var(--primary)",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "14px"
                                }}>
                                    ৳ {Number(balance).toLocaleString()}
                                </Link>
                            )}
                            
                            {dropdownOpen && (
                                <div className="profile-dropdown-menu">
                                    <div className="dropdown-header">
                                        <strong>@{user.username}</strong>
                                        {isAdmin && (
                                            <span className="dropdown-role">{user.role}</span>
                                        )}
                                    </div>
                                    <Link to="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                                        Profile Settings
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            handleLogout();
                                        }}
                                        className="dropdown-item logout-item"
                                    >
                                        Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="login-link">Login</Link>
                            <Link to="/register" className="register-button">Register</Link>
                        </>
                    )}
                </div>

            </div>
        </nav>
    );
}

export default Navbar;