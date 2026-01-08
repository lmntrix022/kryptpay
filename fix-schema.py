import re

with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Remplacer merchants par Merchant dans les relations (mais pas dans le nom du modèle)
content = re.sub(r'(\s+\w+\s+)merchants(\s+@relation)', r'\1Merchant\2', content)
content = re.sub(r'(\s+\w+\s+)merchants\?(\s+@relation)', r'\1Merchant?\2', content)

with open('prisma/schema.prisma', 'w') as f:
    f.write(content)

print("✅ Schema corrigé avec Python")
