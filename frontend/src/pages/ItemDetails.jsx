import { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import WatchlistButton from "../components/WatchlistButton";
import "../App.css";
import "./ItemDetails.css";

function formatDateTime(dateString) {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    });
}

function ItemDetails() {
    const { id } = useParams();
    const currentUser = JSON.parse(localStorage.getItem("user"));

    const [auction, setAuction] = useState(null);
    const [images, setImages] = useState([]);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [bidAmount, setBidAmount] = useState("");
    const [message, setMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submittingBid, setSubmittingBid] = useState(false);
    const [timeLeft, setTimeLeft] = useState("");

    const fetchAuction = async () => {
        try {
            const response = await fetch(
                `http://localhost:5000/api/auctions/${id}`
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Auction not found");
            }

            setAuction(data);

            fetch(
                `http://localhost:5000/items/${data.item_id}/images`
            )
                .then((res) => (res.ok ? res.json() : []))
                .then((imgData) => setImages(imgData))
                .catch(() => setImages([]));
        } catch (error) {
            console.error("Auction error:", error);
            setMessage(error.message);
            setIsError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuction();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    // Live countdown timer
    useEffect(() => {
        if (!auction?.end_time) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(auction.end_time).getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("Auction Ended");
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [auction?.end_time]);

    const currentHighest = Number(auction?.highest_bid || 0);
    const minInc = Number(auction?.min_increment || 100);
    const startingPrice = Number(auction?.starting_price || 0);
    const minAllowedBid = currentHighest === 0 ? startingPrice : currentHighest + minInc;

    const quickBids = useMemo(() => {
        return [
            { label: "Min Next Bid", amount: minAllowedBid },
            { label: `+৳${minInc.toLocaleString()}`, amount: minAllowedBid + minInc },
            { label: `+৳${(minInc * 2).toLocaleString()}`, amount: minAllowedBid + minInc * 2 },
            { label: `+৳${(minInc * 5).toLocaleString()}`, amount: minAllowedBid + minInc * 5 }
        ];
    }, [minAllowedBid, minInc]);

    const handleBid = async (event) => {
        event.preventDefault();
        setMessage("");
        setIsError(false);

        if (!currentUser) {
            setIsError(true);
            setMessage("Please login before placing a bid.");
            return;
        }

        if (auction.seller_id === currentUser.user_id) {
            setIsError(true);
            setMessage("You cannot bid on your own listed antique.");
            return;
        }

        if (!bidAmount || Number(bidAmount) < minAllowedBid) {
            setIsError(true);
            setMessage(`Bid must be at least ৳${minAllowedBid.toLocaleString()}`);
            return;
        }

        setSubmittingBid(true);

        try {
            const response = await fetch(
                `http://localhost:5000/api/auctions/${id}/bids`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bidder_id: currentUser.user_id,
                        bid_amount: Number(bidAmount),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setIsError(true);
                setMessage(data.error || "Failed to place bid.");
                return;
            }

            setIsError(false);
            setMessage("🎉 Bid placed successfully!");
            setBidAmount("");

            await fetchAuction();
        } catch {
            setIsError(true);
            setMessage("Could not connect to the server.");
        } finally {
            setSubmittingBid(false);
        }
    };

    if (loading) {
        return (
            <div className="details-message">
                Loading auction details…
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="details-message">
                <h2>Could not load auction.</h2>
                <p>{message}</p>
                <Link to="/items" className="btn btn-primary" style={{ marginTop: "14px" }}>
                    Browse other auctions
                </Link>
            </div>
        );
    }

    const activeImage = images[selectedImageIndex]?.img_url;
    const isEnded = auction.status === "ended" || timeLeft === "Auction Ended";
    const isWinner = currentUser && auction.winner_id === currentUser.user_id && isEnded;

    return (
        <div className="details-page">
            <div style={{ maxWidth: "1100px", margin: "0 auto 18px" }}>
                <Link to="/items" style={{ color: "var(--muted)", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    &larr; Back to Auctions
                </Link>
            </div>

            <div className="details-container">
                {/* Image Gallery */}
                <div className="details-gallery">
                    <div className="main-image-wrapper">
                        {images.length > 0 && activeImage ? (
                            <img
                                className="main-image"
                                src={
                                    activeImage.startsWith("/uploads/")
                                        ? `http://localhost:5000${activeImage}`
                                        : activeImage
                                }
                                alt={auction.title}
                            />
                        ) : (
                            <div className="image-placeholder">
                                No Image Available
                            </div>
                        )}
                    </div>

                    {images.length > 1 && (
                        <div className="thumbnail-list">
                            {images.map((img, idx) => (
                                <img
                                    key={img.img_id || idx}
                                    className={`thumbnail ${selectedImageIndex === idx ? "active" : ""}`}
                                    src={
                                        img.img_url?.startsWith("/uploads/")
                                            ? `http://localhost:5000${img.img_url}`
                                            : img.img_url
                                    }
                                    alt=""
                                    onClick={() => setSelectedImageIndex(idx)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Full Bid History Table */}
                    <div className="bid-history-section">
                        <div className="bid-history-header">
                            <h3>📜 Bid History</h3>
                            <span className="badge badge-outline">
                                {auction.total_bids || 0} {auction.total_bids === 1 ? "bid" : "bids"}
                            </span>
                        </div>

                        {auction.bids && auction.bids.length > 0 ? (
                            <div className="bid-table-wrapper">
                                <table className="bid-table">
                                    <thead>
                                        <tr>
                                            <th>Bidder</th>
                                            <th>Amount</th>
                                            <th>Time</th>
                                            <th>Bid ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {auction.bids.map((b, idx) => (
                                            <tr key={b.bid_id} className={idx === 0 ? "top-bid-row" : ""}>
                                                <td>
                                                    <div className="bidder-cell">
                                                        <span>{b.bidder_username}</span>
                                                        {idx === 0 && <span className="leader-tag">Leading</span>}
                                                    </div>
                                                </td>
                                                <td className="bid-amount-cell">
                                                    ৳{Number(b.bid_amount).toLocaleString()}
                                                </td>
                                                <td className="bid-time-cell">
                                                    {formatDateTime(b.bid_time)}
                                                </td>
                                                <td className="bid-id-cell">
                                                    #{b.bid_id}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="no-bids-message">
                                No bids have been placed on this item yet. Be the first bidder!
                            </div>
                        )}
                    </div>
                </div>

                {/* Details Info Panel */}
                <div className="details-info">
                    <div className="details-header-tag">
                        <span className="auction-label">
                            AntiqueX Verified Auction #{auction.auction_id}
                        </span>
                        <span className={`badge badge-${isEnded ? "ended" : auction.status || "scheduled"}`}>
                            {isEnded ? "Ended" : auction.status}
                        </span>
                    </div>

                    <h1>{auction.title}</h1>

                    <p className="description">
                        {auction.description || "No specific description provided by seller."}
                    </p>

                    {/* Winner Banner (if ended) */}
                    {isEnded && (
                        <div className={`winner-card ${isWinner ? "winner-user-card" : ""}`}>
                            {auction.winner_username ? (
                                <>
                                    <div className="winner-icon">🏆</div>
                                    <div className="winner-details">
                                        <h4>Auction Closed</h4>
                                        <p>
                                            Winning Bidder: <strong>{auction.winner_username}</strong> with bid of <strong>৳{currentHighest.toLocaleString()}</strong>
                                        </p>
                                        {auction.winner_bid_id && (
                                            <span className="winner-bid-badge">
                                                Winning Bid ID: #{auction.winner_bid_id}
                                            </span>
                                        )}
                                        {isWinner && (
                                            <div className="winner-congrats">
                                                🎉 Congratulations! You won this antique auction.
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="winner-details">
                                    <h4>Auction Concluded</h4>
                                    <p>This auction closed with no bids placed.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Countdown / Time Banner */}
                    {!isEnded && auction.status === "active" && (
                        <div className="countdown-card">
                            <div className="countdown-icon">⏳</div>
                            <div className="countdown-info">
                                <span className="countdown-label">Time Remaining</span>
                                <span className="countdown-timer">{timeLeft || "Calculating…"}</span>
                            </div>
                        </div>
                    )}

                    {/* Price & Bid Metrics Card */}
                    <div className="auction-price-card">
                        <div className="price-grid">
                            <div className="price-item highlight">
                                <span>Current Highest Bid</span>
                                <strong>
                                    ৳{currentHighest > 0 ? currentHighest.toLocaleString() : "No bids yet"}
                                </strong>
                                {auction.highest_bidder && (
                                    <small className="highest-bidder-note">
                                        by @{auction.highest_bidder}
                                    </small>
                                )}
                            </div>

                            <div className="price-item">
                                <span>Starting Price</span>
                                <strong>
                                    ৳{startingPrice.toLocaleString()}
                                </strong>
                            </div>

                            <div className="price-item">
                                <span>Min Increment</span>
                                <strong>
                                    ৳{minInc.toLocaleString()}
                                </strong>
                                <small className="min-inc-note">per new bid</small>
                            </div>
                        </div>

                        {/* Timing & Item Specs */}
                        <div className="item-specs">
                            <div className="spec-row">
                                <span className="spec-label">Seller:</span>
                                <span className="spec-val">{auction.seller}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Category:</span>
                                <span className="spec-val">{auction.category_name || "Antiques"}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Year of Origin:</span>
                                <span className="spec-val">{auction.year_of_origin ? `Circa ${auction.year_of_origin}` : "Not specified"}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Condition:</span>
                                <span className="spec-val">{auction.condition || "Not specified"}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Auction Started:</span>
                                <span className="spec-val">{formatDateTime(auction.start_time)}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Auction Ends:</span>
                                <span className="spec-val">{formatDateTime(auction.end_time)}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Item ID:</span>
                                <span className="spec-val">#{auction.item_id}</span>
                            </div>
                            <div className="spec-row">
                                <span className="spec-label">Auction ID:</span>
                                <span className="spec-val">#{auction.auction_id}</span>
                            </div>
                        </div>

                        <WatchlistButton itemId={auction.item_id} />
                    </div>

                    {/* Bidding Section */}
                    {!isEnded && auction.status === "active" ? (
                        <div className="bid-section">
                            <h2>Place Your Bid</h2>
                            <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--muted)" }}>
                                Next minimum bid: <strong>৳{minAllowedBid.toLocaleString()}</strong> (must increase by at least ৳{minInc.toLocaleString()})
                            </p>

                            {/* Quick Bid Chips */}
                            <div className="quick-bids-container">
                                <span className="quick-bids-title">Quick Bid:</span>
                                <div className="quick-bids-chips">
                                    {quickBids.map((qb, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            className={`chip-btn ${Number(bidAmount) === qb.amount ? "active" : ""}`}
                                            onClick={() => setBidAmount(String(qb.amount))}
                                        >
                                            ৳{qb.amount.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleBid} className="bid-form">
                                <input
                                    className="bid-input"
                                    type="number"
                                    placeholder={`Min ৳${minAllowedBid}`}
                                    value={bidAmount}
                                    onChange={(event) =>
                                        setBidAmount(event.target.value)
                                    }
                                    min={minAllowedBid}
                                    step="1"
                                    required
                                />

                                <button
                                    type="submit"
                                    className="bid-btn"
                                    disabled={submittingBid}
                                >
                                    {submittingBid ? "Submitting…" : "Place Bid"}
                                </button>
                            </form>

                            {message && (
                                <p className={`msg ${isError ? "msg-error" : "msg-success"}`}>
                                    {message}
                                </p>
                            )}
                        </div>
                    ) : (
                        <div className="bid-section" style={{ textAlign: "center", color: "var(--muted)" }}>
                            <p style={{ margin: 0 }}>
                                This auction is currently <strong>{isEnded ? "Ended" : auction.status}</strong>. Bidding is not open.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ItemDetails;

