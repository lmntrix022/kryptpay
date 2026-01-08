# 🔒 Résolution du Problème de Secrets GitHub

GitHub a détecté une clé secrète Stripe dans `config/docker.env` et bloque le push.

## 🎯 Solution Rapide

### Option 1 : Retirer le fichier et créer un nouveau commit (Recommandé)

```bash
# 1. Retirer le fichier de l'index Git
git rm --cached config/docker.env

# 2. Vérifier que config/docker.env est dans .gitignore
# (Déjà fait automatiquement)

# 3. Créer un nouveau commit
git add .gitignore
git commit -m "chore: Remove secrets from repository (config/docker.env)"

# 4. Pousser à nouveau
git push -u origin main
```

### Option 2 : Utiliser le script automatique

```bash
./scripts/fix-git-secrets.sh
git push -u origin main
```

## ⚠️ Important

**Le commit précédent (`ad487fe`) contient encore le secret dans l'historique Git.**

### Option A : Laisser tel quel (Recommandé pour l'instant)
- Le secret est dans l'historique mais ne sera plus poussé
- Vous pouvez continuer le déploiement
- Plus tard, vous pourrez réécrire l'historique si nécessaire

### Option B : Réécrire l'historique (Avancé)

Si vous voulez supprimer complètement le secret de l'historique :

```bash
# ⚠️ ATTENTION : Cela réécrit tout l'historique Git
# Ne faites cela que si vous êtes sûr et que personne d'autre n'a cloné le repo

git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch config/docker.env' \
  --prune-empty --tag-name-filter cat -- --all

# Force push (nécessite autorisation GitHub)
git push origin --force --all
```

**⚠️ Ne faites cela que si :**
- Vous êtes le seul à avoir cloné le repository
- Vous êtes sûr de vouloir réécrire l'historique
- Vous avez sauvegardé vos clés secrètes ailleurs

## ✅ Vérifications

Après avoir retiré le fichier, vérifiez :

1. **Le fichier est dans .gitignore :**
   ```bash
   grep "config/docker.env" .gitignore
   ```

2. **Le fichier n'est plus suivi par Git :**
   ```bash
   git ls-files | grep docker.env
   # Ne devrait rien retourner
   ```

3. **Le fichier existe toujours localement :**
   ```bash
   ls -la config/docker.env
   # Devrait exister (pour votre usage local)
   ```

## 🔐 Sécurité

**Actions à prendre immédiatement :**

1. ✅ Retirer `config/docker.env` du repository
2. ✅ Ajouter au `.gitignore` (déjà fait)
3. ⚠️ **RÉVOQUER la clé Stripe détectée** dans votre Dashboard Stripe :
   - Allez sur https://dashboard.stripe.com/test/apikeys
   - Trouvez la clé `sk_test_51SOQlZIRFlbBRxmQ...`
   - Cliquez sur "Revoke" pour l'invalider
   - Créez une nouvelle clé secrète

4. ⚠️ **RÉVOQUER la clé Resend** si elle est réelle :
   - Allez sur https://resend.com/api-keys
   - Révoquez la clé exposée
   - Créez une nouvelle clé

## 📝 Fichiers à ne JAMAIS commiter

- `config/docker.env` ✅ (maintenant dans .gitignore)
- `.render-keys/` ✅ (déjà dans .gitignore)
- `.env` ✅ (déjà dans .gitignore)
- Tout fichier contenant des clés API réelles

## 🎯 Prochaines Étapes

Une fois le problème résolu :

1. ✅ Retirer `config/docker.env` du commit
2. ✅ Pousser le code sur GitHub
3. ⚠️ Révoquer les clés exposées
4. 🚀 Continuer le déploiement sur Render

---

**Note :** GitHub a détecté le secret et l'a bloqué. C'est une bonne chose pour la sécurité ! Assurez-vous de révoquer les clés exposées.
