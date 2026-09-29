import os
import re

controllers_dir = 'backend/controllers/'
for filename in os.listdir(controllers_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(controllers_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        def replacer(match):
            var_name = match.group(1)
            return f'const {{ {var_name} }} = req.params;\n        if (isNaN(Number({var_name})) || Number({var_name}) <= 0) return res.status(400).json({{ error: "Invalid ID parameter" }});'

        content = re.sub(r'const \{\s*(\w*id\w*)\s*\} = req.params;', replacer, content, flags=re.IGNORECASE)

        with open(filepath, 'w') as f:
            f.write(content)

print("Controllers patched with explicit param validation")
