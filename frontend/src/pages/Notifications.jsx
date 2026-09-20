import { useState, useEffect } from "react";
import { authFetch } from "../utils/api";

function Notifications() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const res = await authFetch("/api/notifications");
            const data = await res.json();
            if (res.ok) {
                setNotifications(Array.isArray(data) ? data : (data.notifications || []));
            } else {
                setError(data.message || data.error || "Failed to load notifications");
            }
        } catch (err) {
            setError("Error loading notifications: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markAsRead = async (id) => {
        try {
            const res = await authFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
            if (res.ok) {
                setNotifications((prev) =>
                    prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
                );
            }
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };

    const markAllAsRead = async () => {
        const unread = notifications.filter((n) => !n.is_read);
        for (const n of unread) {
            await markAsRead(n.notification_id);
        }
    };

    return (
        <div style={{ maxWidth: 800, margin: "30px auto", padding: "0 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h2>Notifications</h2>
                {notifications.some((n) => !n.is_read) && (
                    <button
                        onClick={markAllAsRead}
                        style={{
                            padding: "6px 14px",
                            backgroundColor: "#2980b9",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer"
                        }}
                    >
                        Mark All as Read
                    </button>
                )}
            </div>

            {loading && <p>Loading notifications...</p>}
            {error && <p style={{ color: "red" }}>{error}</p>}

            {!loading && notifications.length === 0 && (
                <div style={{ padding: "40px 20px", textAlign: "center", background: "#f8f9fa", borderRadius: 8 }}>
                    <p style={{ color: "#666", fontSize: "16px" }}>You have no notifications yet.</p>
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {notifications.map((n) => (
                    <div
                        key={n.notification_id}
                        style={{
                            padding: "16px 20px",
                            border: "1px solid #e1e8ed",
                            borderRadius: 8,
                            backgroundColor: n.is_read ? "#ffffff" : "#f0f7ff",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                        }}
                    >
                        <div>
                            <div style={{ fontSize: "12px", color: "#888", marginBottom: 4, textTransform: "uppercase" }}>
                                {n.type || "Notification"} • {new Date(n.created_at).toLocaleString()}
                            </div>
                            <div style={{ fontSize: "15px", color: "#333", fontWeight: n.is_read ? "normal" : "600" }}>
                                {n.message}
                            </div>
                        </div>

                        {!n.is_read && (
                            <button
                                onClick={() => markAsRead(n.notification_id)}
                                style={{
                                    padding: "4px 10px",
                                    fontSize: "12px",
                                    backgroundColor: "#e2e8f0",
                                    border: "none",
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    marginLeft: 15
                                }}
                            >
                                Mark Read
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Notifications;
