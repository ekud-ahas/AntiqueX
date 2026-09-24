import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error("Failed to parse user from localStorage", error);
            }
        }
    }, []);

    const login = (userData, token) => {
        if (token) localStorage.setItem("token", token);
        if (userData) {
            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
        }
    };

    const logout = async () => {
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
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
