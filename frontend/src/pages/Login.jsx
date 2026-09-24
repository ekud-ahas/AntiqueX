import { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "../App.css";
import "./Auth.css";

function Login() {
    const navigate = useNavigate();
    const { login } = useContext(AuthContext);

    const [form, setForm] = useState({ email: "", password: "" });
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage("");
        setLoading(true);

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (!response.ok) {
                setIsError(true);
                setMessage(data.error || "Login failed. Please try again.");
                return;
            }

            login(data.user, data.token);
            setIsError(false);
            setMessage("Login successful! Redirecting…");

            setTimeout(() => navigate("/items"), 900);
        } catch {
            setIsError(true);
            setMessage("Could not connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">

                <div className="auth-logo">⚜</div>
                <h1>Welcome back</h1>
                <p className="auth-subtitle">Sign in to your AntiqueX account</p>

                <form className="auth-form" onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            name="password"
                            value={form.password}
                            onChange={handleChange}
                            placeholder="Your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="auth-submit"
                        disabled={loading}
                    >
                        {loading ? "Signing in…" : "Sign In"}
                    </button>

                    {message && (
                        <p className={`auth-msg ${isError ? "error" : "success"}`}>
                            {message}
                        </p>
                    )}

                </form>

                <div className="auth-link-row">
                    Don&apos;t have an account?{" "}
                    <Link to="/register">Create one</Link>
                </div>

            </div>
        </div>
    );
}

export default Login;