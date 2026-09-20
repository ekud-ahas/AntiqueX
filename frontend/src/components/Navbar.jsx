import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
    const user = JSON.parse(localStorage.getItem("user"));
    const isAdmin = user && (user.role === "admin" || user.role === "moderator");
    const isFullAdmin = user && user.role === "admin"; // full admin only

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem("token");
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: token ? { "Authorization": `Bearer ${token}` } : {}
            });
        } catch {
            // Ignore network failure on logout
        }
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        window.location.href = "/";
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">

                <Link to="/" className="navbar-logo">
                    <span className="navbar-logo-icon">⚜</span>
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
                        <>
                            <span className="welcome">
                                Hi, <strong>{user.username}</strong>{" "}
                                <span style={{
                                    fontSize: "0.72rem",
                                    padding: "2px 7px",
                                    borderRadius: "10px",
                                    background: isFullAdmin ? "#d35400" : isAdmin ? "#16a085" : "#2980b9",
                                    color: "#fff",
                                    fontWeight: "bold",
                                    textTransform: "uppercase",
                                    marginLeft: "4px"
                                }}>
                                    {user.role}
                                </span>
                            </span>

                            <button
                                onClick={handleLogout}
                                className="logout-button"
                            >
                                Logout
                            </button>
                        </>
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