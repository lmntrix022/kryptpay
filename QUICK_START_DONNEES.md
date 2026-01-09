# 🚀 Quick Start - Ajouter des Données Réelles

## ⚡ Méthode Rapide (3 Étapes)

### 1️⃣ Obtenir ADMIN_TOKEN

1. Render Dashboard → **kryptpay-api** → **Environment**
2. Copiez la valeur de `ADMIN_TOKEN`

### 2️⃣ Créer un Utilisateur ADMIN

```bash
cd /Users/valerie/Desktop/booh-pay

export ADMIN_TOKEN='votre_token_ici'

node scripts/create-admin.js admin@boohpay.com "VotreMotDePasse123!"
```

### 3️⃣ Créer un Marchand

```bash
node scripts/create-merchant.js "Bööh" "Clé API Production"
```

**⚠️ IMPORTANT** : Sauvegardez l'API Key retournée !

## 📋 Exemple Complet

```bash
# 1. Définir ADMIN_TOKEN
export ADMIN_TOKEN='votre_token_depuis_render'

# 2. Créer un admin
node scripts/create-admin.js admin@boohpay.com "Admin123!"

# 3. Créer un marchand
node scripts/create-merchant.js "Bööh" "Production"

# 4. (Optionnel) Créer un utilisateur marchand
curl -X POST https://kryptpay-api.onrender.com/internal/users \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{
    "email": "merchant@boohpay.com",
    "password": "Merchant123!",
    "role": "MERCHANT",
    "merchantId": "MERCHANT_ID_FROM_STEP_3"
  }'
```

## ✅ Vérification

1. **Connectez-vous au dashboard** :
   - https://kryptpay-dashboard.onrender.com/login
   - Utilisez l'email et mot de passe créés

2. **Vérifiez dans PostgreSQL** (optionnel) :
   ```sql
   SELECT * FROM users;
   SELECT * FROM merchants;
   ```

## 🔑 Prochaines Étapes

1. ✅ Connectez-vous au dashboard
2. ✅ Configurez les credentials des providers (Stripe, Moneroo, etc.)
3. ✅ Testez les paiements

---

**💡 Pour plus de détails, voir `GUIDE_AJOUT_DONNEES.md`**
