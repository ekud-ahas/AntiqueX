import re
import os

def wrap_with_transaction(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Find functions with (INSERT|UPDATE|DELETE) and pool.query but no BEGIN
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
            # We need to wrap it.
            # Replace pool.query with client.query
            new_body = func_body.replace('pool.query', 'client.query')
            
            wrapped_body = f"""
    const client = await pool.connect();
    try {{
        await client.query("BEGIN");
{new_body}
        await client.query("COMMIT");
    }} catch (error) {{
        await client.query("ROLLBACK");
        throw error;
    }} finally {{
        client.release();
    }}
"""
            # We need to handle the return statements. 
            # If the original function has `return ...`, it will now return from inside `try`, which is correct.
            # BUT the original function body already has `return`. So we just inject the try block.
            
            # Let's cleanly inject try-catch around the body
            # We will indent new_body
            indented_body = "\n".join(["        " + line if line.strip() else line for line in new_body.split('\n')])
            
            wrapped_body = f"""
    const client = await pool.connect();
    try {{
        await client.query("BEGIN");
{indented_body}
        await client.query("COMMIT");
    }} catch (error) {{
        await client.query("ROLLBACK");
        throw error;
    }} finally {{
        client.release();
    }}
"""
            # Wait, if there's a return statement in `indented_body`, the `COMMIT` won't execute if it's placed after `indented_body`!
            # Example: 
            # const result = await client.query(...)
            # return result.rows[0];
            # If we just put COMMIT at the end, the return exits the function BEFORE the COMMIT.
            # We MUST replace the `return` with `await client.query("COMMIT"); return`
            
            indented_body = re.sub(r'(\s*)(return\s+.*)', r'\1await client.query("COMMIT");\n\1\2', indented_body)
            
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
    'backend/models/categoryModel.js',
    'backend/models/notificationModel.js',
    'backend/models/paymentModel.js',
    'backend/models/userModel.js',
    'backend/models/itemModel.js',
    'backend/models/adminStatsModel.js',
    'backend/controllers/authController.js'
]

for file in files:
    wrap_with_transaction(file)
    print(f"Patched {file}")
