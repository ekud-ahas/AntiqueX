import re

def wrap_with_transaction(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    func_pattern = re.compile(r'(const\s+(\w+)\s*=\s*async\s*\([^)]*\)\s*=>\s*\{)(.*?)(^\};?|module\.exports)', re.MULTILINE | re.DOTALL)
    
    new_content = ""
    last_idx = 0
    
    for match in func_pattern.finditer(content):
        func_start = match.group(1)
        func_name = match.group(2)
        func_body = match.group(3)
        
        has_dml = re.search(r'(INSERT\s+INTO|UPDATE\s+|DELETE\s+FROM)', func_body, re.IGNORECASE)
        has_begin = re.search(r'(BEGIN)', func_body, re.IGNORECASE)
        has_pool_query = re.search(r'pool\.query', func_body)
        
        if has_dml and has_pool_query and not has_begin:
            new_body = func_body.replace('pool.query', 'client.query')
            
            indented_body = "\n".join(["        " + line if line.strip() else line for line in new_body.split('\n')])
            indented_body = re.sub(r'(\s*)(return\s+.*)', r'\1await client.query("COMMIT");\n\1\2', indented_body)
            
            # If the function does not have a return, we need to add COMMIT before it ends
            if 'await client.query("COMMIT");' not in indented_body:
                indented_body += '\n        await client.query("COMMIT");'
            
            wrapped_body = f"""
    const client = await pool.connect();
    try {{
        await client.query("BEGIN");
{indented_body}
    }} catch (error) {{
        await client.query("ROLLBACK");
        throw error;
    }} finally {{
        client.release();
    }}"""
            
            new_content += content[last_idx:match.start()] + func_start + wrapped_body
        else:
            new_content += content[last_idx:match.end(3)]
        
        last_idx = match.end(3)

    new_content += content[last_idx:]
    
    with open(filepath, 'w') as f:
        f.write(new_content)

files = [
    'backend/models/auctionModel.js',
    'backend/models/walletModel.js'
]

for file in files:
    wrap_with_transaction(file)
    print(f"Patched {file}")
