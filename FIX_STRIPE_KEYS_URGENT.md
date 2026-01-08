# ⚠️ URGENT : Correction des clés Stripe

## Problème résolu

Le fichier `.env` à la racine de BoohPay contenait l'ancienne clé publique Stripe (`pk_test_51SOQlZIRFlb...`) qui surchargeait celle de `config/docker.env`.

## Actions effectuées

✅ Fichier `.env` mis à jour avec la nouvelle clé publique : `pk_test_51SONpZEV1Rs...`
✅ BoohPay redémarré

## Action requise immédiate

### ⚠️ IMPORTANT : Vous devez mettre la vraie clé secrète

Le fichier `.env` contient actuellement un placeholder pour la clé secrète :
```
STRIPE_SECRET_KEY=sk_test_51SONpZEV1Rs_REMPLACEZ_PAR_LA_CLE_SECRETE_CORRESPONDANTE
```

**Vous devez :**

1. **Récupérer la clé secrète depuis Stripe Dashboard** :
   - Allez sur https://dashboard.stripe.com/test/apikeys
   - Cliquez sur "Reveal test key" pour la clé secrète
   - Elle doit commencer par `sk_test_51SONpZEV1Rs...` (même préfixe que la clé publique)

2. **Mettre à jour le fichier `.env`** :
   ```bash
   cd /Users/valerie/Desktop/booh-pay
   # Éditez .env et remplacez la ligne STRIPE_SECRET_KEY
   ```

3. **Redémarrer BoohPay** :
   ```bash
   docker-compose restart app
   ```

## Vérification

Après avoir mis à jour la clé secrète et redémarré :

1. Testez la création d'un paiement
2. Vérifiez dans la console du navigateur :
   - `🔑 BoohPay a retourné une clé publique Stripe: pk_test_51SONpZEV1Rs...`
   - Cette clé doit correspondre à `VITE_STRIPE_PUBLISHABLE_KEY` du frontend

## Note

- Les deux fichiers `.env` et `config/docker.env` ont été mis à jour
- Le fichier `.env` à la racine a priorité car NestJS le charge en premier
- Les deux doivent être synchronisés








