import { Link } from "react-router-dom";
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
                    AntiqueX
                </Link>

                <div className="navbar-links">
                    <Link to="/">Home</Link>
                    <Link to="/items">Auctions</Link>
                    <Link to="/categories">Categories</Link>

                    {user && (
                        <>
                            <Link to="/sell">Sell Item</Link>
                            <Link to="/my-items">My Items</Link>
                            <Link to="/watchlist">Watchlist</Link>
                        </>
                    )}
                </div>

                <div className="navbar-account">
                    {user ? (
                        <>
                            <span className="welcome">
                                Hi, {user.username}
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
                            <Link
                                to="/login"
                                className="login-link"
                            >
                                Login
                            </Link>

                            <Link
                                to="/register"
                                className="register-button"
                            >
                                Register
                            </Link>
                        </>
                    )}
                </div>

            </div>
        </nav>
    );
}

export default Navbar;