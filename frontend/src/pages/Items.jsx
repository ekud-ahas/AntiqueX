import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import "./Items.css";

function formatTimeLeft(endTimeStr) {
    if (!endTimeStr) return null;
    const end = new Date(endTimeStr).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return "Ended";

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
}

function Items() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [sortBy, setSortBy] = useState("ending_soon");

    useEffect(() => {
        fetch("/api/items")
            .then((res) => {
                if (!res.ok) {
                    throw new Error("Failed to load items");
                }
                return res.json();
            })
            .then((data) => {
                setItems(data);
                setLoading(false);
            })
            .catch((err) => {
                console.error(err);
                setError("Unable to load auctions. Make sure backend is running.");
                setLoading(false);
            });
    }, []);

    // Distinct category list derived from fetched items
    const categories = useMemo(() => {
        const set = new Set();
        items.forEach((item) => {
            if (item.category_name) set.add(item.category_name);
        });
        return Array.from(set);
    }, [items]);

    // Filtered and sorted items
    const filteredItems = useMemo(() => {
        return items
            .filter((item) => {
                const matchSearch =
                    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (item.description &&
                        item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (item.condition &&
                        item.condition.toLowerCase().includes(searchQuery.toLowerCase()));

                const matchCategory =
                    selectedCategory === "all" || item.category_name === selectedCategory;

                return matchSearch && matchCategory;
            })
            .sort((a, b) => {
                if (sortBy === "price_asc") {
                    return (
                        parseFloat(a.current_price || a.starting_price) -
                        parseFloat(b.current_price || b.starting_price)
                    );
                }
                if (sortBy === "price_desc") {
                    return (
                        parseFloat(b.current_price || b.starting_price) -
                        parseFloat(a.current_price || a.starting_price)
                    );
                }
                if (sortBy === "ending_soon") {
                    const timeA = a.end_time ? new Date(a.end_time).getTime() : Infinity;
                    const timeB = b.end_time ? new Date(b.end_time).getTime() : Infinity;
                    return timeA - timeB;
                }
                if (sortBy === "newest") {
                    return b.item_id - a.item_id;
                }
                return 0;
            });
    }, [items, searchQuery, selectedCategory, sortBy]);

    if (loading) {
        return <div className="items-message">Loading live auctions…</div>;
    }

    if (error) {
        return <div className="items-message error">{error}</div>;
    }

    return (
        <div className="items-page">
            <div className="items-header">
                <h1> Live Antique Auctions</h1>
                <p>
                    Explore verified historical artifacts, rare coins, and fine heirlooms available for active bidding.
                </p>
            </div>

            {/* ── Search & Filter Controls ────────────────────────── */}
            <div className="auction-filter-bar">
                <div className="search-box">
                    <span className="search-icon"></span>
                    <input
                        type="text"
                        placeholder="Search antiques by title, keyword, era..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {searchQuery && (
                        <button
                            className="clear-search-btn"
                            onClick={() => setSearchQuery("")}
                        >
                            
                        </button>
                    )}
                </div>

                <div className="filter-dropdowns">
                    <div className="filter-group">
                        <label>Category:</label>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="filter-select"
                        >
                            <option value="all">All Categories ({items.length})</option>
                            {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                    {cat}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Sort By:</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="filter-select"
                        >
                            <option value="ending_soon"> Ending Soonest</option>
                            <option value="newest"> Newest Listed</option>
                            <option value="price_asc"> Price: Low to High</option>
                            <option value="price_desc"> Price: High to Low</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* ── Results Count ─────────────────────────────────── */}
            <div className="results-info-row">
                <span>
                    Showing <strong>{filteredItems.length}</strong> of{" "}
                    <strong>{items.length}</strong> auctions
                </span>
                {(searchQuery || selectedCategory !== "all") && (
                    <button
                        className="reset-filters-btn"
                        onClick={() => {
                            setSearchQuery("");
                            setSelectedCategory("all");
                        }}
                    >
                        Reset Filters
                    </button>
                )}
            </div>

            {filteredItems.length === 0 ? (
                <div className="no-results-box">
                    <span style={{ fontSize: "3rem" }}></span>
                    <h3>No matching antiques found</h3>
                    <p>Try refining your search terms or clearing category filters.</p>
                </div>
            ) : (
                <div className="items-grid">
                    {filteredItems.map((item) => {
                        const timeLeft = formatTimeLeft(item.end_time);
                        const isLive = item.auction_status === "active" && timeLeft !== "Ended";
                        const isEnded = item.auction_status === "ended" || timeLeft === "Ended";
                        const isCancelled = item.auction_status === "cancelled";

                        return (
                            <div className="item-card" key={item.item_id}>
                                <div className="item-image-container">
                                    {/* Category pill */}
                                    {item.category_name && (
                                        <span className="item-category-tag">
                                            {item.category_name}
                                        </span>
                                    )}

                                    {/* Live Status Badge */}
                                    {isLive && (
                                        <span className="status-badge live">
                                            <span className="live-dot"></span> LIVE • {timeLeft}
                                        </span>
                                    )}
                                    {isEnded && (
                                        <span className="status-badge ended">
                                            ENDED
                                        </span>
                                    )}
                                    {isCancelled && (
                                        <span className="status-badge cancelled">
                                            FLAGGED / REMOVED
                                        </span>
                                    )}
                                    {!isLive && !isEnded && !isCancelled && item.auction_status === "scheduled" && (
                                        <span className="status-badge scheduled">
                                            UPCOMING
                                        </span>
                                    )}

                                    {/* Item Thumbnail */}
                                    {item.thumbnail_url ? (
                                        <img
                                            className="item-image"
                                            src={
                                                item.thumbnail_url?.startsWith("/uploads/")
                                                    ? `${item.thumbnail_url}`
                                                    : item.thumbnail_url
                                            }
                                            alt={item.title}
                                        />
                                    ) : (
                                        <div className="no-image">
                                            No Image Available
                                        </div>
                                    )}
                                </div>

                                <div className="item-content">
                                    <div className="card-top-meta">
                                        {item.condition && (
                                            <span className="condition-chip">{item.condition}</span>
                                        )}
                                        {item.total_bids > 0 && (
                                            <span className="bids-chip"> {item.total_bids} bids</span>
                                        )}
                                    </div>

                                    <h2>{item.title}</h2>

                                    <p className="item-description">
                                        {item.description
                                            ? item.description.length > 90
                                                ? item.description.substring(0, 90) + "…"
                                                : item.description
                                            : "No description available."}
                                    </p>

                                    <div className="item-meta-row">
                                        <div>
                                            <p className="item-price-label">
                                                {item.total_bids > 0 ? "Current Highest Bid" : "Starting Price"}
                                            </p>
                                            <p className="item-price-val">
                                                ৳{Number(item.current_price || item.starting_price).toLocaleString()}
                                            </p>
                                        </div>
                                        {item.year_of_origin && (
                                            <span className="circa-tag">
                                                Circa {item.year_of_origin}
                                            </span>
                                        )}
                                    </div>

                                    <Link
                                        to={`/items/${item.item_uuid || item.item_id}`}
                                        className={`view-button ${isEnded || isCancelled ? "ended-btn" : ""}`}
                                    >
                                        {isCancelled ? "View Item (Cancelled)" : isEnded ? "View Results" : "Place Bid / Inspect"}
                                    </Link>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Items;