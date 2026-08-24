import { Link } from "react-router-dom";
import "../App.css";
import "./Home.css";

function Home() {
    return (
        <div className="home">

            <section className="hero">
                <div className="hero-content">
                    <p className="hero-eyebrow">Trusted Antique Auction Platform</p>
                    <h1>Discover Timeless<br />Treasures</h1>

                    <p>
                        Explore rare antiques, place bids, and connect
                        with collectors worldwide — all in one place.
                    </p>

                    <div className="hero-actions">
                        <Link to="/items" className="hero-button">
                            Browse Auctions
                        </Link>
                        <Link to="/categories" className="hero-button-outline">
                            View Categories
                        </Link>
                    </div>
                </div>
            </section>

            <section className="home-section">
                <h2>How AntiqueX Works</h2>

                <p className="section-description">
                    A simple three-step process to buy or sell
                    antique treasures with confidence.
                </p>

                <div className="home-features">

                    <div className="feature-card">
                        <div className="feature-icon">🔍</div>
                        <h3>Browse</h3>
                        <p>
                            Explore curated antiques across five
                            categories — furniture, art, jewelry,
                            coins, and sculptures.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">🏷️</div>
                        <h3>Bid</h3>
                        <p>
                            Place competitive bids on live auctions.
                            Set auto-bids so you never miss a deal.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon">💼</div>
                        <h3>Sell</h3>
                        <p>
                            List your own antique items in minutes
                            and reach a wide collector audience.
                        </p>
                    </div>

                </div>
            </section>

        </div>
    );
}

export default Home;