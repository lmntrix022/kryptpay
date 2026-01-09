# ⚡ Correction rapide de l'URL API

## Problème actuel

Le dashboard essaie d'appeler `kryptpay-api/auth/login` mais reçoit 404 car l'URL n'est pas complète.

## Solution immédiate

### Étape 1: Configurer la variable d'environnement sur Render

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service **`kryptpay-dashboard`**
3. Cliquez sur **Environment** dans le menu de gauche
4. Trouvez ou ajoutez la variable `NEXT_PUBLIC_API_BASE_URL`
5. Définissez la valeur à :
   ```
   https://kryptpay-api.onrender.com/v1
   ```
   ⚠️ **Important**: Remplacez `kryptpay-api` par le nom réel de votre service API si différent

6. Cliquez sur **Save Changes**

### Étape 2: Redéployer le dashboard

1. Toujours dans le service `kryptpay-dashboard`
2. Cliquez sur **Manual Deploy** → **Deploy latest commit**
   OU
   Faites un commit et push (Render redéploiera automatiquement)

### Étape 3: Vérifier

Après le redéploiement, ouvrez la console du navigateur (F12) et vérifiez que les appels API utilisent maintenant :
- ✅ `https://kryptpay-api.onrender.com/v1/auth/login`

Au lieu de :
- ❌ `kryptpay-api/auth/login`

## Alternative: Vérifier le nom de votre service API

Si vous n'êtes pas sûr du nom de votre service API :

1. Allez sur https://dashboard.render.com
2. Regardez la liste de vos services
3. Trouvez votre service backend (celui qui exécute l'API NestJS)
4. Le nom apparaît dans l'URL : `https://NOM-DU-SERVICE.onrender.com`
5. Utilisez ce nom dans `NEXT_PUBLIC_API_BASE_URL`

## Note importante

Les variables `NEXT_PUBLIC_*` sont injectées au moment du **build** Next.js, donc :
- ⚠️ Vous DEVEZ redéployer après avoir modifié cette variable
- ⚠️ Un simple redémarrage ne suffit pas
