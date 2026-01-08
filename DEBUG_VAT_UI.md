# 🔍 Debug - Pages TVA ne s'affichent pas

## ✅ Corrections appliquées

### 1. Appels API corrigés
- ✅ Utilisation correcte de `apiUrl()` (fonction avec parenthèses)
- ✅ Gestion des erreurs améliorée
- ✅ Conversion BigInt → number pour l'affichage

### 2. Gestion des états
- ✅ État de chargement visible
- ✅ Messages d'erreur clairs
- ✅ Gestion du cas "pas de données"

### 3. Imports corrigés
- ✅ Suppression de l'import inutile `formatCurrency`
- ✅ Utilisation correcte de `formatAmount` depuis `useCurrency()`

## 🔧 Vérifications à faire

### 1. Migration de base de données
```bash
# Si pas encore fait, lancer la migration
npm run prisma:migrate dev --name add_vat_module
npm run prisma:generate
```

### 2. Vérifier que le backend répond
```bash
# Tester l'endpoint
curl -X GET http://localhost:3000/v1/vat/transactions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Vérifier les logs du navigateur
- Ouvrir la console du navigateur (F12)
- Vérifier les erreurs dans l'onglet Console
- Vérifier les requêtes réseau dans l'onglet Network

### 4. Vérifier l'authentification
- S'assurer d'être connecté
- Vérifier que le token JWT est valide
- Vérifier que `user.merchantId` ou `user.id` existe

## 🐛 Problèmes courants

### Problème 1 : "Cannot read property 'merchantId' of undefined"
**Solution** : Vérifier que l'utilisateur est bien connecté et a un `merchantId`

### Problème 2 : "404 Not Found" sur `/vat/transactions`
**Solution** : 
- Vérifier que le module VatModule est bien importé dans AppModule
- Vérifier que le serveur backend est démarré
- Vérifier l'URL de l'API dans `.env.local`

### Problème 3 : "Empty response" ou tableau vide
**Solution** :
- C'est normal si aucune transaction TVA n'a été calculée
- Activer la TVA dans `/vat/settings`
- Créer un paiement pour déclencher le calcul TVA

### Problème 4 : Erreur CORS
**Solution** : Vérifier la configuration CORS dans `src/main.ts`

## 📝 Checklist de débogage

- [ ] Migration Prisma effectuée
- [ ] Backend démarré et accessible
- [ ] Frontend démarré (`npm run dev` dans `apps/dashboard`)
- [ ] Utilisateur connecté avec un `merchantId`
- [ ] TVA activée dans les paramètres (`/vat/settings`)
- [ ] Au moins un paiement réussi avec TVA calculée
- [ ] Console du navigateur sans erreurs
- [ ] Requêtes réseau réussies (status 200)

## 🚀 Test rapide

1. Aller sur `/vat/settings`
2. Activer la TVA
3. Configurer le pays vendeur (ex: GA)
4. Sauvegarder
5. Créer un paiement de test
6. Attendre que le paiement soit `SUCCEEDED`
7. Vérifier que la TVA est calculée automatiquement
8. Aller sur `/vat/dashboard`
9. Les données devraient s'afficher

## 📞 Si le problème persiste

Vérifier :
1. Les logs du serveur backend
2. Les logs du navigateur (Console + Network)
3. La structure de la réponse API
4. Les types TypeScript (BigInt vs number)

