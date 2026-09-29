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
            return f'if (!(typeof {var_name} === "string" && {var_name}.length > 10 && {var_name}.includes("-")) && (isNaN(Number({var_name})) || Number({var_name}) <= 0)) return res.status(400).json({{ error: "Invalid ID parameter" }});'

        content = re.sub(r'if \(isNaN\(Number\((\w*id\w*)\)\) \|\| Number\(\w*id\w*\) <= 0\) return res\.status\(400\)\.json\(\{\s*error:\s*"Invalid ID parameter"\s*\}\);', replacer, content)

        # Clean up the console.log from the previous sed mistake
        content = content.replace('console.log("TESTING GETITEMBYID:", req.params.id); ', '')

        with open(filepath, 'w') as f:
            f.write(content)

print("UUID validation fixed")
