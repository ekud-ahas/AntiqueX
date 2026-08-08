import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
    return (
        <div className="home">

            <section className="hero">
                <div className="hero-content">
                    <h1>Discover Timeless Treasures</h1>

                    <p>
                        Explore unique antiques and discover
                        something special for your collection.
                    </p>

                    <Link to="/items" className="hero-button">
                        Browse Auctions
                    </Link>
                </div>
            </section>

            <section className="home-section">
                <h2>Welcome to AntiqueX</h2>

                <p className="section-description">
                    AntiqueX is an online auction platform where
                    users can discover, sell, and bid on interesting
                    antique items.
                </p>

                <div className="home-features">

                    <div className="feature-card">
                        <h3>Browse</h3>
                        <p>
                            Explore antiques from different
                            categories.
                        </p>
                    </div>

                    <div className="feature-card">
                        <h3>Bid</h3>
                        <p>
                            Place bids on items you are interested in.
                        </p>
                    </div>

                    <div className="feature-card">
                        <h3>Sell</h3>
                        <p>
                            List your own antique items for auction.
                        </p>
                    </div>

                </div>
            </section>

        </div>
    );
}

export default Home;