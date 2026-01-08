# 🧪 Guide de Test Complet - Fonctionnalités Avancées

## Prérequis

1. **Backend en cours d'exécution** sur `http://localhost:3000`
2. **Frontend en cours d'exécution** sur `http://localhost:3001` (ou le port configuré)
3. **Token JWT valide** - Connectez-vous via `/login` pour obtenir un token

## Tests à effectuer

### 1. ✅ Exports CSV et PDF améliorés

#### Via l'interface UI :
1. Naviguer vers `/analytics`
2. Vérifier que les analytics s'affichent correctement
3. Cliquer sur "Exporter en CSV"
   - ✅ Vérifier que le fichier téléchargé est bien un CSV
   - ✅ Ouvrir le CSV dans Excel/Google Sheets
   - ✅ Vérifier que les montants sont formatés correctement
   - ✅ Vérifier que les pourcentages sont présents
   - ✅ Vérifier que les tendances sont incluses
4. Cliquer sur "Exporter en PDF"
   - ✅ Vérifier que le fichier HTML s'ouvre correctement
   - ✅ Vérifier que le design est bien formaté
   - ✅ Tester l'impression (Cmd/Ctrl + P)
   - ✅ Vérifier que les graphiques de tendances sont visibles

#### Via l'API :
```bash
# Export CSV
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/v1/admin/analytics/payments/export/csv" \
  -o analytics.csv

# Export PDF (HTML)
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/v1/admin/analytics/payments/export/pdf" \
  -o analytics.html
```

**Résultats attendus :**
- CSV avec BOM UTF-8 pour Excel
- CSV avec sections détaillées (Résumé, Répartition, Tendances)
- PDF (HTML) avec design professionnel et bouton d'impression

---

### 2. ✅ Page /subscriptions

#### Tests fonctionnels :
1. Naviguer vers `/subscriptions`
   - ✅ Vérifier que la page se charge sans erreur
   - ✅ Vérifier que la liste des subscriptions s'affiche (si existantes)

2. **Créer une subscription :**
   - Cliquer sur "Créer un abonnement"
   - Remplir le formulaire :
     - Email client : `test@example.com`
     - Téléphone (optionnel) : `+237612345678`
     - Montant : `10000`
     - Devise : `XAF`
     - Cycle : `Mensuel`
     - Mode test : `cocher`
   - Cliquer sur "Créer"
   - ✅ Vérifier que la subscription apparaît dans la liste
   - ✅ Vérifier que le badge "TEST" est visible

3. **Filtrer les subscriptions :**
   - Sélectionner "Active" dans le filtre Statut
   - ✅ Vérifier que seules les subscriptions actives s'affichent
   - Réinitialiser le filtre
   - Saisir un email dans "Email client"
   - ✅ Vérifier que le filtrage fonctionne

4. **Actions sur une subscription :**
   - **Mettre en pause :** Cliquer sur l'icône pause (▶️)
     - ✅ Vérifier que le statut passe à "En pause"
   - **Reprendre :** Cliquer sur l'icône play (⏸)
     - ✅ Vérifier que le statut passe à "Active"
   - **Annuler :** Cliquer sur l'icône X
     - ✅ Confirmer l'annulation
     - ✅ Vérifier que le statut passe à "Annulée"

---

### 3. ✅ Page /sandbox

#### Tests fonctionnels :
1. Naviguer vers `/sandbox`
   - ✅ Vérifier que la page se charge sans erreur

2. **Simuler un webhook :**
   - Sélectionner un type d'événement (ex: "Payment Succeeded")
   - ✅ Vérifier que l'exemple de payload se charge automatiquement
   - Modifier le payload JSON
   - Cliquer sur "Formater"
     - ✅ Vérifier que le JSON est bien formaté avec indentation
   - Modifier l'URL de l'endpoint si nécessaire
   - Cliquer sur "Simuler le Webhook"
   - ✅ Vérifier que le message de succès apparaît
   - ✅ Vérifier que la simulation apparaît dans l'historique

3. **Filtrer l'historique :**
   - Sélectionner un type d'événement dans le filtre
   - ✅ Vérifier que la liste se filtre correctement
   - Sélectionner un statut (ex: "Succès 2xx")
   - ✅ Vérifier que le filtrage fonctionne
   - Cliquer sur "Réinitialiser les filtres"
   - ✅ Vérifier que tous les résultats reviennent

4. **Voir les détails d'une simulation :**
   - Cliquer sur l'icône œil (👁) sur une ligne
   - ✅ Vérifier que le dialog s'ouvre
   - ✅ Vérifier que l'endpoint est affiché
   - ✅ Vérifier que les headers complets sont visibles
   - ✅ Vérifier que le payload complet est visible
   - ✅ Vérifier que la réponse complète est affichée
   - Tester les boutons "Copier" pour chaque section
   - ✅ Vérifier que le contenu est bien copié

---

### 4. ✅ Page /settings

#### Tests fonctionnels :
1. Naviguer vers `/settings`
   - ✅ Vérifier que les onglets sont visibles

2. **Onglet "Notifications" :**
   - ✅ Vérifier que les préférences actuelles se chargent
   - Modifier quelques préférences (ex: désactiver paymentNotifications)
   - Modifier les canaux (ex: activer SMS)
   - Cliquer sur "Enregistrer"
   - ✅ Vérifier que le message de succès apparaît
   - Rafraîchir la page
   - ✅ Vérifier que les modifications sont persistées

3. **Onglet "Filtres sauvegardés" :**
   - ✅ Vérifier que la liste des filtres se charge
   - **Créer un filtre :**
     - Cliquer sur "Créer un filtre"
     - Remplir :
       - Nom : `Paiements Stripe réussis`
       - Type : `payment`
       - Filtres JSON : `{"gateway": "STRIPE", "status": "SUCCEEDED"}`
     - Cliquer sur "Enregistrer"
     - ✅ Vérifier que le filtre apparaît dans la liste
   - **Modifier un filtre :**
     - Cliquer sur l'icône édition (✏️)
     - Modifier le nom ou les filtres
     - Cliquer sur "Enregistrer"
     - ✅ Vérifier que les modifications sont appliquées
   - **Supprimer un filtre :**
     - Cliquer sur l'icône corbeille (🗑️)
     - Confirmer la suppression
     - ✅ Vérifier que le filtre est supprimé

---

### 5. ✅ Page /analytics

#### Tests fonctionnels :
1. Naviguer vers `/analytics`
   - ✅ Vérifier que les analytics combinés s'affichent
   - ✅ Vérifier que les cartes de statistiques sont présentes
   - ✅ Vérifier que les graphiques de tendances sont visibles

2. **Filtres :**
   - Modifier la période (dates de début/fin)
   - ✅ Vérifier que les données se mettent à jour
   - Sélectionner un gateway spécifique
   - ✅ Vérifier le filtrage

3. **Exports :**
   - Cliquer sur "Exporter CSV"
   - ✅ Vérifier le téléchargement et le contenu
   - Cliquer sur "Exporter PDF"
   - ✅ Vérifier le téléchargement et l'affichage

---

### 6. ✅ Transactions avec nouvelles colonnes

#### Tests fonctionnels :
1. Naviguer vers `/admin`
   - ✅ Vérifier que les transactions s'affichent

2. **Nouvelles colonnes :**
   - ✅ Vérifier que subscriptionId s'affiche si présent (sous le paymentId)
   - ✅ Vérifier que le badge "TEST" apparaît pour les transactions en mode test

3. **Filtre isTestMode :**
   - Sélectionner "Production" dans le filtre Mode
   - ✅ Vérifier que seules les transactions production s'affichent
   - Sélectionner "Test"
   - ✅ Vérifier que seules les transactions test s'affichent
   - Sélectionner "Tous"
   - ✅ Vérifier que toutes les transactions s'affichent

---

## 🔍 Vérifications techniques

### Endpoints API à tester :
- ✅ `GET /v1/admin/analytics/payments`
- ✅ `GET /v1/admin/analytics/payouts`
- ✅ `GET /v1/admin/analytics/combined`
- ✅ `GET /v1/admin/analytics/payments/export/csv`
- ✅ `GET /v1/admin/analytics/payments/export/pdf`
- ✅ `GET /v1/admin/subscriptions`
- ✅ `POST /v1/admin/subscriptions`
- ✅ `PUT /v1/admin/subscriptions/:id`
- ✅ `DELETE /v1/admin/subscriptions/:id`
- ✅ `POST /v1/admin/subscriptions/:id/pause`
- ✅ `POST /v1/admin/subscriptions/:id/resume`
- ✅ `GET /v1/admin/sandbox/webhooks/examples`
- ✅ `POST /v1/admin/sandbox/webhooks/simulate`
- ✅ `GET /v1/admin/sandbox/webhooks/history`
- ✅ `GET /v1/admin/filters/saved`
- ✅ `POST /v1/admin/filters/saved`
- ✅ `PUT /v1/admin/filters/saved/:id`
- ✅ `DELETE /v1/admin/filters/saved/:id`
- ✅ `GET /v1/admin/notifications/preferences`
- ✅ `PUT /v1/admin/notifications/preferences`

### Erreurs à surveiller :
- ❌ Erreurs 401 (Unauthorized) - Vérifier le token
- ❌ Erreurs 500 (Internal Server Error) - Vérifier les logs serveur
- ❌ Erreurs de validation - Vérifier les formats de données
- ❌ Erreurs CORS - Vérifier la configuration

---

## 📝 Checklist complète

### Frontend UI
- [ ] Page `/subscriptions` fonctionne
- [ ] Page `/sandbox` fonctionne
- [ ] Page `/analytics` fonctionne avec exports
- [ ] Page `/settings` avec tous les onglets fonctionne
- [ ] Tous les formulaires fonctionnent
- [ ] Tous les filtres fonctionnent
- [ ] Tous les dialogs s'ouvrent correctement

### Backend API
- [ ] Tous les endpoints retournent des données valides
- [ ] Les exports CSV/PDF fonctionnent
- [ ] Les validations fonctionnent
- [ ] Les erreurs sont bien gérées

### Intégration
- [ ] Les données se synchronisent entre frontend et backend
- [ ] Les erreurs sont affichées correctement dans l'UI
- [ ] Les messages de succès apparaissent
- [ ] Les états de chargement fonctionnent

---

## 🚀 Commandes utiles

```bash
# Tester avec le script automatique
./test-new-features.sh <VOTRE_TOKEN_JWT>

# Vérifier les logs du serveur
tail -f logs/*.log

# Vérifier l'état des migrations
npx prisma migrate status

# Redémarrer le serveur backend
npm run start:dev
```

