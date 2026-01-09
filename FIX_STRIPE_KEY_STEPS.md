# 🔧 Guide pour corriger l'erreur de clé Stripe expirée

## Problème
L'erreur indique que la clé Stripe est expirée ou invalide :
```
Stripe API key is expired or invalid. Please update STRIPE_SECRET_KEY in your environment variables.
```

## Étapes pour résoudre

### 1. Vérifier la clé actuelle dans Stripe Dashboard

1. Allez sur https://dashboard.stripe.com/test/apikeys
2. Vérifiez que vous êtes en mode **Test** (pas Live)
3. Vérifiez si votre clé secrète est toujours active
4. Si elle est expirée ou révoquée, créez-en une nouvelle :
   - Cliquez sur "Create secret key"
   - Copiez la nouvelle clé (elle commence par `sk_test_...`)

### 2. Mettre à jour la clé dans le fichier de configuration

**Pour Docker (développement local) :**

Éditez le fichier `config/docker.env` :
```bash
STRIPE_SECRET_KEY=sk_test_VOTRE_NOUVELLE_CLE_ICI
```

**Important :** Assurez-vous que la clé correspond à la clé publique :
```bash
STRIPE_PUBLISHABLE_KEY=pk_test_...  # Doit avoir le même préfixe (après pk_test_)
```

Les deux clés doivent provenir du même compte Stripe et avoir le même préfixe (ex: `51SOQlZIRFlb...`).

### 3. Tester la clé (optionnel mais recommandé)

```bash
# Depuis le répertoire du projet
node scripts/test-stripe-key.js sk_test_VOTRE_CLE
```

Ou si vous avez déjà mis à jour `config/docker.env` :
```bash
source config/docker.env
node scripts/test-stripe-key.js $STRIPE_SECRET_KEY
```

### 4. Redémarrer Docker

**⚠️ CRUCIAL :** Après avoir modifié `config/docker.env`, vous DEVEZ redémarrer le conteneur :

```bash
# Option 1: Redémarrer uniquement le service app
docker-compose restart app

# Option 2: Arrêter et redémarrer tous les services
docker-compose down
docker-compose up -d

# Option 3: Reconstruire complètement (si nécessaire)
docker-compose down
docker-compose build --no-cache app
docker-compose up -d
```

### 5. Vérifier que la nouvelle clé est chargée

Après le redémarrage, vérifiez les logs :
```bash
docker-compose logs app | grep -i stripe
```

Vous ne devriez plus voir l'erreur "Expired API Key".

### 6. Pour la production (Render)

Si vous êtes déployé sur Render :

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service `kryptpay-api`
3. Allez dans l'onglet **Environment**
4. Trouvez `STRIPE_SECRET_KEY`
5. Mettez à jour avec votre nouvelle clé
6. **Redéployez** le service (Render redémarre automatiquement)

## Vérification finale

Testez l'endpoint qui causait l'erreur :
```bash
curl http://localhost:3000/v1/providers/stripe/connect/status \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

Vous devriez recevoir une réponse JSON au lieu d'une erreur 503.

## Notes importantes

- ⚠️ Les variables d'environnement sont chargées au démarrage de l'application
- ⚠️ Un simple changement de fichier ne suffit pas, il faut redémarrer
- ⚠️ Si vous utilisez Docker, le fichier `config/docker.env` est utilisé (voir `docker-compose.yml`)
- ⚠️ Si vous avez un fichier `.env` à la racine, il peut surcharger `config/docker.env` (NestJS charge `.env.local` puis `.env` en premier)

## Dépannage

Si l'erreur persiste après redémarrage :

1. **Vérifiez que la clé est bien dans le conteneur** :
   ```bash
   docker-compose exec app printenv | grep STRIPE_SECRET_KEY
   ```

2. **Vérifiez les logs pour voir quelle clé est utilisée** :
   ```bash
   docker-compose logs app | grep -i "stripe"
   ```

3. **Vérifiez qu'il n'y a pas de fichier `.env` à la racine qui surcharge** :
   ```bash
   ls -la .env*
   ```

4. **Testez la clé directement** :
   ```bash
   node scripts/test-stripe-key.js sk_test_VOTRE_CLE
   ```
