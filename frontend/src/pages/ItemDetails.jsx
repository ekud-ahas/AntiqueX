import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import WatchlistButton from "../components/WatchlistButton";
import "./ItemDetails.css";

function ItemDetails() {
    const { id } = useParams();

    const [auction, setAuction] = useState(null);
    const [images, setImages] = useState([]);
    const [bidAmount, setBidAmount] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAuction();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const handleBid = async (event) => {
        event.preventDefault();

        const user = JSON.parse(localStorage.getItem("user"));

        if (!user) {
            setMessage("Please login before placing a bid.");
            return;
        }

        if (!bidAmount) {
            setMessage("Please enter a bid amount.");
            return;
        }

        try {
            const response = await fetch(
                `http://localhost:5000/api/auctions/${id}/bids`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        bidder_id: user.user_id,
                        bid_amount: Number(bidAmount),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Failed to place bid.");
                return;
            }

            setMessage("Bid placed successfully!");
            setBidAmount("");

            await fetchAuction();
        } catch (error) {
            console.error("Bid error:", error);
            setMessage("Could not connect to the server.");
        }
    };

    if (loading) {
        return (
            <div className="details-message">
                Loading auction...
            </div>
        );
    }

    if (!auction) {
        return (
            <div className="details-message">
                <h2>Could not load auction.</h2>
                <p>{message}</p>
            </div>
        );
    }

    return (
        <div className="details-page">

            <div className="details-container">

                <div className="details-gallery">

                    {images.length > 0 ? (
                        <img
                            className="main-image"
                            src={images[0].img_url}
                            alt={auction.title}
                        />
                    ) : (
                        <div className="image-placeholder">
                            No Image Available
                        </div>
                    )}

                    {images.length > 1 && (
                        <div className="thumbnail-list">
                            {images.map((img) => (
                                <img
                                    key={img.img_id}
                                    src={
                                        img.img_url?.startsWith("/uploads/")
                                            ? `http://localhost:5000${img.img_url}`
                                            : img.img_url
                                    }
                                    alt={auction.title}
                                    width="200"
                                    style={{ marginRight: "8px" }}
                                />
                            ))}
                        </div>
                    )}

                </div>

                <div className="details-info">

                    <span className="auction-label">
                        AntiqueX Auction
                    </span>

                    <h1>{auction.title}</h1>

                    <p className="description">
                        {auction.description}
                    </p>

                    <div className="auction-info">

                        <div>
                            <span>Current Highest Bid</span>
                            <strong>
                                ৳{auction.highest_bid || auction.starting_price}
                            </strong>
                        </div>

                        <div>
                            <span>Starting Price</span>
                            <strong>
                                ৳{auction.starting_price}
                            </strong>
                        </div>

                        <div>
                            <span>Minimum Increment</span>
                            <strong>
                                ৳{auction.min_increment}
                            </strong>
                        </div>

                    </div>

                    <div className="item-information">

                        <p>
                            <strong>Seller:</strong>{" "}
                            {auction.seller}
                        </p>

                        <p>
                            <strong>Year:</strong>{" "}
                            {auction.year_of_origin || "Not specified"}
                        </p>

                        <p>
                            <strong>Condition:</strong>{" "}
                            {auction.condition || "Not specified"}
                        </p>

                        <p>
                            <strong>Status:</strong>{" "}
                            <span className="status">
                                {auction.status}
                            </span>
                        </p>

                    </div>

                    <div className="watchlist-area">
                        <WatchlistButton itemId={auction.item_id} />
                    </div>

                    <div className="bid-section">

                        <h2>Place Your Bid</h2>

                        <form onSubmit={handleBid} className="bid-form">

                            <input
                                type="number"
                                placeholder="Enter bid amount"
                                value={bidAmount}
                                onChange={(event) =>
                                    setBidAmount(event.target.value)
                                }
                                min="0"
                                step="0.01"
                                required
                            />

                            <button type="submit">
                                Place Bid
                            </button>

                        </form>

                        {message && (
                            <p className="bid-message">
                                {message}
                            </p>
                        )}

                    </div>

                </div>

            </div>

        </div>
    );
}

export default ItemDetails;
