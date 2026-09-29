import re

with open('frontend/src/pages/ItemDetails.jsx', 'r') as f:
    content = f.read()

# 1. Add state for addresses and selected address
state_inject = """    const [newAddress, setNewAddress] = useState({ house: "", street: "", city: "" });
    const [addresses, setAddresses] = useState([]);
    const [selectedAddressId, setSelectedAddressId] = useState("");"""

content = re.sub(r'const \[newAddress, setNewAddress\] = useState\(\{ house: "", street: "", city: "" \}\);', state_inject, content)

# 2. Add a useEffect to fetch addresses
fetch_addresses = """
    // Fetch addresses for the bid modal dropdown
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
    }, [currentUser]);
"""

content = content.replace('    useEffect(() => {\n        fetchAuction();\n    }, [id]);', '    useEffect(() => {\n        fetchAuction();\n    }, [id]);\n' + fetch_addresses)

# 3. Update executeBid to send addressId
old_execute = """                    body: JSON.stringify({
                        bid_amount: Number(bidAmount),
                    }),"""
new_execute = """                    body: JSON.stringify({
                        bid_amount: Number(bidAmount),
                        addressId: selectedAddressId
                    }),"""
content = content.replace(old_execute, new_execute)

# 4. Update the bid UI to include the address dropdown if user is logged in
old_bid_ui = """                            <form onSubmit={handleBid} className="bid-form">
                                <input"""
new_bid_ui = """                            <form onSubmit={handleBid} className="bid-form">
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
                                {currentUser && addresses.length === 0 && (
                                    <p style={{ color: '#d9534f', fontSize: '0.9rem', marginBottom: '10px' }}>
                                        No address found. You will be prompted to add one.
                                    </p>
                                )}
                                <input"""
content = content.replace(old_bid_ui, new_bid_ui)

# 5. When submitAddressAndBid finishes, reload addresses
old_submit = """            setShowAddressModal(false);
            setNewAddress({ house: "", street: "", city: "" });
            await executeBid();"""
new_submit = """            setShowAddressModal(false);
            setNewAddress({ house: "", street: "", city: "" });
            // re-fetch addresses so the new one is selected
            const addrRes = await authFetch("/api/profile/addresses");
            const addrData = await addrRes.json();
            if (Array.isArray(addrData) && addrData.length > 0) {
                setAddresses(addrData);
                setSelectedAddressId(addrData[0].address_id);
            }
            // Cannot automatically execute bid here easily because selectedAddressId might not be updated in closure,
            // but we can pass it directly to a modified executeBid or let the user click submit again.
            // Let's just let the user click Place Bid again with their new address loaded.
            setMessage("Address saved! Please click Place Bid again.");"""
content = content.replace(old_submit, new_submit)

with open('frontend/src/pages/ItemDetails.jsx', 'w') as f:
    f.write(content)

print("Frontend patched")
