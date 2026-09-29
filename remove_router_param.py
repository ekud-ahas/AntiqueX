import os
import re

routes_dir = 'backend/routes/'
for filename in os.listdir(routes_dir):
    if filename.endswith('.js'):
        filepath = os.path.join(routes_dir, filename)
        with open(filepath, 'r') as f:
            content = f.read()

        content = re.sub(r'router\.param\([^;]*;\n\}\);\n', '', content, flags=re.MULTILINE|re.DOTALL)
        
        with open(filepath, 'w') as f:
            f.write(content)

print("Router params removed")
