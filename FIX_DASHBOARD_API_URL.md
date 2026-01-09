# 🔧 Correction de l'URL de l'API dans le Dashboard Render

## Problème

Le dashboard essaie d'appeler `kryptpay-api/auth/login` mais reçoit une erreur 404. Cela signifie que la variable d'environnement `NEXT_PUBLIC_API_BASE_URL` n'est pas correctement configurée.

## Solution

### Option 1: Configuration via Render Dashboard (Recommandé)

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre service **`kryptpay-dashboard`**
3. Allez dans l'onglet **Environment**
4. Trouvez ou ajoutez la variable `NEXT_PUBLIC_API_BASE_URL`
5. Définissez la valeur à :
   ```
   https://kryptpay-api.onrender.com/v1
   ```
   (Remplacez `kryptpay-api` par le nom réel de votre service API si différent)

6. **Redéployez** le service dashboard

### Option 2: Mise à jour du render.yaml

Si vous utilisez un Blueprint (render.yaml), mettez à jour le fichier :

```yaml
# Dans la section du service kryptpay-dashboard
envVars:
  - key: NEXT_PUBLIC_API_BASE_URL
    value: "https://kryptpay-api.onrender.com/v1"
    # OU utilisez fromService si votre API s'appelle différemment
    # fromService:
    #   type: web
    #   name: kryptpay-api
    #   property: host
    #   # Puis ajoutez /v1 manuellement
```

**Important**: Les variables `NEXT_PUBLIC_*` doivent être définies au moment du build Next.js, donc après modification, vous devez **redéployer** le service.

## Vérification

Après redéploiement, vérifiez dans la console du navigateur que les appels API utilisent la bonne URL :

- ✅ Correct: `https://kryptpay-api.onrender.com/v1/auth/login`
- ❌ Incorrect: `kryptpay-api/auth/login` (URL relative)

## Note

Le dashboard utilise `apiUrl()` qui construit l'URL complète à partir de `NEXT_PUBLIC_API_BASE_URL`. Si cette variable n'est pas définie, il utilise par défaut `http://localhost:3000/v1`, ce qui ne fonctionne pas en production.
