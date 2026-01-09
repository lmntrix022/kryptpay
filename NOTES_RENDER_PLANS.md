# 📋 Notes sur les Plans Render - Mise à Jour 2024/2025

## ⚠️ Changements Importants

Render a mis à jour ses plans de base de données PostgreSQL. Les plans Legacy (comme `starter`) ne sont plus pris en charge pour les nouvelles bases de données.

## 🗄️ Nouveaux Plans PostgreSQL

### Plan `free` (Gratuit)
- **Limitations** :
  - 90 jours de rétention automatique (données supprimées après inactivité)
  - Stockage limité
  - Connexions limitées
  - Parfait pour le développement et les tests
- **Recommandation** : Utilisez ce plan pour commencer, puis migrez vers un plan payant pour la production

### Plan `standard` (Payant - ~$20/mois)
- Rétention illimitée
- Plus de stockage
- Plus de connexions
- Support technique prioritaire
- **Recommandation** : Pour la production avec trafic modéré

### Plan `pro` (Payant - ~$90/mois)
- Toutes les fonctionnalités du plan standard
- Encore plus de ressources
- Haute disponibilité
- **Recommandation** : Pour la production avec fort trafic

## 🔧 Configuration dans render.yaml

Le fichier `render.yaml` a été mis à jour pour utiliser le plan `free` :

```yaml
databases:
  - name: kryptpay-db
    databaseName: kryptpay
    user: kryptpay
    plan: free  # Nouveau plan gratuit
```

## 📝 Alternatives Gratuites pour PostgreSQL

Si vous préférez éviter les limitations du plan `free` de Render, considérez :

### Option 1 : Neon (Recommandé pour PostgreSQL gratuit)
- **URL** : https://neon.tech
- **Plan gratuit** : Illimité, 3GB stockage
- **Avantage** : Pas de rétention limitée, excellent pour PostgreSQL
- **Configuration** : Créez un compte Neon, obtenez la connection string, ajoutez-la comme `DATABASE_URL` dans Render

### Option 2 : Supabase
- **URL** : https://supabase.com
- **Plan gratuit** : 500MB stockage, 2GB bande passante
- **Avantage** : PostgreSQL + features supplémentaires (Auth, Storage)
- **Configuration** : Créez un projet, obtenez la connection string PostgreSQL

### Option 3 : Railway
- **URL** : https://railway.app
- **Plan gratuit** : $5 de crédit mensuel (suffisant pour une petite DB)
- **Avantage** : Simple à utiliser, pas de rétention limitée

## 🚀 Recommandation

**Pour commencer :**
1. Utilisez le plan `free` de Render pour tester
2. OU créez un compte Neon (gratuit, illimité) et utilisez-le avec Render

**Pour la production :**
1. Migrez vers le plan `standard` de Render (~$20/mois)
2. OU continuez avec Neon (plans payants disponibles)

## 🔄 Migration depuis le plan Legacy

Si vous avez déjà une base de données avec le plan `starter` :
1. Render vous demandera de migrer vers un nouveau plan
2. Suivez les instructions dans le Dashboard Render
3. Les données seront migrées automatiquement

---

**Note :** Le fichier `render.yaml` a été mis à jour pour utiliser `plan: free` au lieu de `plan: starter`.
