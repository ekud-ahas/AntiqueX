import re

with open('frontend/src/pages/ItemDetails.jsx', 'r') as f:
    content = f.read()

old_select_block = """                                {currentUser && addresses.length > 0 && (
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
                                )}"""

new_select_block = """                                {currentUser && addresses.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', whiteSpace: 'nowrap' }}>Delivery Address:</span>
                                        <select 
                                            className="bid-input" 
                                            style={{ flex: 1 }}
                                            value={selectedAddressId}
                                            onChange={(e) => setSelectedAddressId(e.target.value)}
                                            required
                                        >
                                            <option value="" disabled>Select Address</option>
                                            {addresses.map(addr => (
                                                <option key={addr.address_id} value={addr.address_id}>
                                                    {addr.house ? addr.house + ', ' : ''}{addr.street}, {addr.city}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}"""

content = content.replace(old_select_block, new_select_block)

with open('frontend/src/pages/ItemDetails.jsx', 'w') as f:
    f.write(content)

print("Label patched")
