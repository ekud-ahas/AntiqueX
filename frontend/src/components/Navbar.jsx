import { NavLink, Link } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
    const user = JSON.parse(localStorage.getItem("user"));

    const handleLogout = () => {
        localStorage.removeItem("user");
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
                    <NavLink to="/categories" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Categories</NavLink>

                    {user && (
                        <>
                            <NavLink to="/sell" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Sell Item</NavLink>
                            <NavLink to="/my-items" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>My Items</NavLink>
                            <NavLink to="/purchases" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Orders</NavLink>
                            <NavLink to="/wallet" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Wallet</NavLink>
                            <NavLink to="/watchlist" className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}>Watchlist</NavLink>
                        </>
                    )}
                </div>

                <div className="navbar-account">
                    {user ? (
                        <>
                            <span className="welcome">
                                Hi, <strong>{user.username}</strong>
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