import re

with open('frontend/src/pages/ItemDetails.jsx', 'r') as f:
    content = f.read()

# 1. Insert the useEffect for fetching addresses right below the fetchAuction useEffect
fetch_addresses_code = """
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

# Find the exact end of the first useEffect block
pattern = r'    useEffect\(\(\) => \{\n\s*fetchAuction\(\);\n\s*// eslint-disable-next-line react-hooks/exhaustive-deps\n\s*\}, \[id\]\);'
match = re.search(pattern, content)
if match:
    content = content[:match.end()] + "\n" + fetch_addresses_code + content[match.end():]
else:
    print("Failed to find useEffect")

# 2. Update the UI to remove the red warning text
old_red_warning = """                                {currentUser && addresses.length === 0 && (
                                    <p style={{ color: '#d9534f', fontSize: '0.9rem', marginBottom: '10px' }}>
                                        No address found. You will be prompted to add one.
                                    </p>
                                )}"""
content = content.replace(old_red_warning, "")

# 3. Handle Auto-Submit: Modify submitAddressAndBid to auto-submit
old_submit = """            // re-fetch addresses so the new one is selected
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

new_submit = """            // re-fetch addresses so the new one is selected
            const addrRes = await authFetch("/api/profile/addresses");
            const addrData = await addrRes.json();
            let newSelectedId = null;
            if (Array.isArray(addrData) && addrData.length > 0) {
                setAddresses(addrData);
                setSelectedAddressId(addrData[0].address_id);
                newSelectedId = addrData[0].address_id;
            }
            // Auto-submit the bid using the new address id
            await executeBid(newSelectedId);"""

content = content.replace(old_submit, new_submit)

# 4. Modify executeBid to accept an optional explicitAddressId parameter
old_execute_sig = "    const executeBid = async () => {"
new_execute_sig = "    const executeBid = async (explicitAddressId = null) => {"
content = content.replace(old_execute_sig, new_execute_sig)

old_body = """                    body: JSON.stringify({
                        bid_amount: Number(bidAmount),
                        addressId: selectedAddressId
                    }),"""
new_body = """                    body: JSON.stringify({
                        bid_amount: Number(bidAmount),
                        addressId: explicitAddressId || selectedAddressId
                    }),"""
content = content.replace(old_body, new_body)


with open('frontend/src/pages/ItemDetails.jsx', 'w') as f:
    f.write(content)
print("ItemDetails.jsx successfully updated")
