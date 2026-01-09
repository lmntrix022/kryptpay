# ➕ Ajouter NEXT_PUBLIC_API_BASE_URL sur Render

## Étapes détaillées

### 1. Trouver le nom de votre service API

1. Allez sur https://dashboard.render.com
2. Regardez la liste de vos services
3. Trouvez votre service backend (celui qui exécute l'API NestJS)
4. Notez le nom exact (ex: `kryptpay-api`, `boohpay-api`, etc.)
5. L'URL complète sera : `https://NOM-DU-SERVICE.onrender.com/v1`

### 2. Ajouter la variable dans le Dashboard

1. Dans Render Dashboard, sélectionnez votre service **`kryptpay-dashboard`** (ou le nom de votre dashboard)
2. Cliquez sur **Environment** dans le menu de gauche
3. Cliquez sur **Add Environment Variable** (ou le bouton "+" / "Add")
4. Remplissez :
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://kryptpay-api.onrender.com/v1`
     (Remplacez `kryptpay-api` par le nom réel de votre service API)
5. Cliquez sur **Save Changes**

### 3. Redéployer le service

**⚠️ IMPORTANT**: Après avoir ajouté la variable, vous DEVEZ redéployer :

1. Toujours dans le service `kryptpay-dashboard`
2. Cliquez sur **Manual Deploy** dans le menu
3. Sélectionnez **Deploy latest commit**
4. Attendez que le déploiement se termine

OU

Faites un commit et push dans Git, Render redéploiera automatiquement.

### 4. Vérifier

Après le redéploiement :
1. Ouvrez votre dashboard : `https://kryptpay-dashboard.onrender.com`
2. Ouvrez la console du navigateur (F12)
3. Essayez de vous connecter
4. Vérifiez que les appels API utilisent maintenant :
   - ✅ `https://kryptpay-api.onrender.com/v1/auth/login`

## Exemple visuel

```
Environment Variables
┌─────────────────────────────────────┬──────────────────────────────────────┐
│ Key                                │ Value                                 │
├─────────────────────────────────────┼──────────────────────────────────────┤
│ NODE_ENV                           │ production                            │
│ PORT                               │ 10000                                 │
│ NEXT_PUBLIC_API_BASE_URL           │ https://kryptpay-api.onrender.com/v1 │ ← À ajouter
└─────────────────────────────────────┴──────────────────────────────────────┘
```

## Note importante

- Les variables `NEXT_PUBLIC_*` sont injectées au **moment du build** Next.js
- Un simple redémarrage ne suffit pas, il faut **redéployer**
- La variable doit être définie AVANT le build
