# 🚀 Guide de migration des données vers Render

Ce guide vous explique comment migrer toutes vos données locales vers votre base de données Render.

## 📋 Prérequis

1. Avoir accès à votre base de données Render (DATABASE_URL)
2. Avoir les données locales dans votre base de données locale
3. Node.js et npm installés

## 🔍 Étape 1: Récupérer votre DATABASE_URL depuis Render

1. Allez sur https://dashboard.render.com
2. Sélectionnez votre base de données PostgreSQL (`kryptpay-db`)
3. Dans l'onglet **Info**, copiez la **Internal Database URL** ou **External Connection String**
4. Format: `postgresql://user:password@host:port/database`

**⚠️ Important**: 
- Utilisez **Internal Database URL** si vous exécutez le script depuis Render
- Utilisez **External Connection String** si vous exécutez depuis votre machine locale

## 📤 Étape 2: Exporter les données locales

Depuis votre machine locale, exécutez :

```bash
cd /Users/valerie/Desktop/booh-pay
node scripts/export-data.js
```

Cela créera un fichier `exported-data.json` avec toutes vos données :
- ✅ Utilisateurs (admins et marchands)
- ✅ Marchands
- ✅ Clés API
- ✅ Transactions (jusqu'à 10 000)
- ✅ Payouts (jusqu'à 10 000)
- ✅ Remboursements (jusqu'à 10 000)
- ✅ Abonnements
- ✅ Livraisons de webhooks
- ✅ Credentials des providers
- ✅ Préférences de notifications

## 📥 Étape 3: Importer dans Render

### Option A: Depuis votre machine locale

```bash
# Définir la DATABASE_URL de Render
export DATABASE_URL="postgresql://user:password@host:port/database"

# Importer les données
node scripts/import-to-render.js exported-data.json
```

### Option B: Depuis un service Render (SSH/Shell)

1. Connectez-vous à votre service Render via SSH ou Shell
2. Téléchargez le fichier `exported-data.json` sur le service
3. Exécutez :

```bash
# La DATABASE_URL est déjà définie dans l'environnement Render
node scripts/import-to-render.js exported-data.json
```

### Option C: Via un script temporaire sur Render

1. Créez un service temporaire ou utilisez un one-off service
2. Ajoutez le fichier `exported-data.json` dans votre repo
3. Exécutez le script d'import

## 🔐 Sécurité

**⚠️ IMPORTANT**: 
- Ne commitez JAMAIS le fichier `exported-data.json` dans Git (il contient des mots de passe hashés)
- Ne partagez JAMAIS votre DATABASE_URL publiquement
- Supprimez le fichier `exported-data.json` après l'import

## 📊 Données importées

Le script importe par défaut :
- ✅ **Marchands** (avec upsert - mise à jour si existe)
- ✅ **Utilisateurs** (admins et marchands avec leurs mots de passe)
- ✅ **Clés API**
- ✅ **Credentials des providers** (Stripe, Moneroo, etc.)
- ✅ **Préférences de notifications**

Les données suivantes ne sont **PAS** importées par défaut (trop volumineuses) :
- ⚠️ Transactions
- ⚠️ Payouts
- ⚠️ Remboursements
- ⚠️ Abonnements
- ⚠️ Livraisons de webhooks

Si vous souhaitez les importer, modifiez `scripts/import-to-render.js` et décommentez les sections correspondantes.

## 🧪 Vérification

Après l'import, vérifiez que les données sont bien présentes :

```bash
# Depuis votre machine locale avec DATABASE_URL de Render
node scripts/list-users-merchants.js
```

Ou connectez-vous directement à la base de données Render et vérifiez :

```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM merchants;
SELECT email, role FROM users;
```

## 🐛 Dépannage

### Erreur: "DATABASE_URL n'est pas défini"
- Vérifiez que vous avez bien défini la variable d'environnement
- Ou passez-la directement : `DATABASE_URL="..." node scripts/import-to-render.js`

### Erreur: "Connection refused"
- Vérifiez que vous utilisez la bonne URL (Internal vs External)
- Vérifiez que votre IP est autorisée (pour External Connection String)

### Erreur: "Unique constraint violation"
- C'est normal, le script utilise `upsert` qui ignore les doublons
- Les données existantes ne seront pas écrasées

### Données manquantes
- Vérifiez que l'export a bien fonctionné
- Vérifiez les logs du script d'import
- Certaines données peuvent être ignorées si elles existent déjà

## 📝 Notes

- Les IDs sont préservés (UUID)
- Les dates sont converties correctement
- Les relations (foreign keys) sont maintenues
- Les mots de passe hashés sont copiés tels quels (les utilisateurs peuvent se connecter avec leurs mots de passe existants)

## 🔄 Migration incrémentale

Si vous avez déjà des données sur Render et que vous voulez juste ajouter les nouvelles :

Le script utilise `upsert` qui :
- **Crée** les enregistrements qui n'existent pas
- **Met à jour** les enregistrements qui existent déjà (sauf les IDs)

Vous pouvez exécuter le script plusieurs fois sans problème.
