import re

with open('frontend/src/pages/ItemDetails.jsx', 'r') as f:
    content = f.read()

# 1. Fix the useEffect dependency
old_useEffect = """    // Fetch addresses for the bid modal dropdown
    useEffect(() => {
        if (currentUser) {
            authFetch("/api/profile/addresses")
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setAddresses(data);
                        if (data.length > 0) {
                            setSelectedAddressId(data[0].address_id);
                        }
                    }
                })
                .catch(err => console.error("Failed to load addresses", err));
        }
    }, [currentUser]);"""

new_useEffect = """    // Fetch addresses for the bid modal dropdown
    useEffect(() => {
        if (currentUser) {
            authFetch("/api/profile/addresses")
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setAddresses(data);
                        if (data.length > 0) {
                            setSelectedAddressId(data[0].address_id);
                        }
                    }
                })
                .catch(err => console.error("Failed to load addresses", err));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.user_id]);"""

content = content.replace(old_useEffect, new_useEffect)

# 2. Fix the flex layout so the select dropdown isn't squeezed into the same row as the input/button
old_form = """                            <form onSubmit={handleBid} className="bid-form">
                                {currentUser && addresses.length > 0 && (
                                    <select 
                                        className="bid-input" 
                                        style={{ marginBottom: '10px' }}
                                        value={selectedAddressId}
                                        onChange={(e) => setSelectedAddressId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select Delivery Address</option>
                                        {addresses.map(addr => (
                                            <option key={addr.address_id} value={addr.address_id}>
                                                {addr.house ? addr.house + ', ' : ''}{addr.street}, {addr.city}
                                            </option>
                                        ))}
                                    </select>
                                )}

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
                            </form>"""

new_form = """                            <form onSubmit={handleBid} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {currentUser && addresses.length > 0 && (
                                    <select 
                                        className="bid-input" 
                                        style={{ width: '100%' }}
                                        value={selectedAddressId}
                                        onChange={(e) => setSelectedAddressId(e.target.value)}
                                        required
                                    >
                                        <option value="" disabled>Select Delivery Address</option>
                                        {addresses.map(addr => (
                                            <option key={addr.address_id} value={addr.address_id}>
                                                {addr.house ? addr.house + ', ' : ''}{addr.street}, {addr.city}
                                            </option>
                                        ))}
                                    </select>
                                )}

                                <div className="bid-form" style={{ width: '100%', margin: 0 }}>
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
                                </div>
                            </form>"""

content = content.replace(old_form, new_form)

with open('frontend/src/pages/ItemDetails.jsx', 'w') as f:
    f.write(content)
print("ItemDetails patched for layout and useEffect bug")
