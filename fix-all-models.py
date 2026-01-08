import re

# Lire le schema
with open('prisma/schema.prisma', 'r') as f:
    content = f.read()

# Liste des modèles à convertir en PascalCase (les principaux utilisés par le dashboard)
models_to_convert = [
    'payouts',
    'subscriptions', 
    'refunds',
    'transactions',
    'provider_credentials',
    'vat_transactions',
    'notification_history',
    'saved_filters',
    'sandbox_webhook_logs'
]

# Pour chaque modèle, ajouter @@map
for model_name in models_to_convert:
    # Trouver la définition du modèle
    pattern = rf'(model {model_name} \{{[^}}]+)(}})'
    
    def add_map(match):
        model_def = match.group(1)
        closing = match.group(2)
        # Vérifier si @@map existe déjà
        if '@@map(' not in model_def:
            # Ajouter @@map avant la fermeture
            return f'{model_def}\n  @@map("{model_name}")\n{closing}'
        return match.group(0)
    
    content = re.sub(pattern, add_map, content, flags=re.DOTALL)

# Sauvegarder
with open('prisma/schema.prisma', 'w') as f:
    f.write(content)

print("✅ Modèles Prisma mis à jour avec @@map")
