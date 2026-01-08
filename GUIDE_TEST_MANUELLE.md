# 🧪 Guide de Test Manuelle - Interface Web

## 🚀 Démarrage Rapide

1. **Ouvrez votre navigateur** sur `http://localhost:3001` (ou le port configuré pour le frontend)
2. **Connectez-vous** avec vos identifiants
3. **Testez chaque page** selon ce guide

---

## 📋 Checklist de Test

### ✅ 1. Page /admin (Transactions améliorées)

**URL :** `http://localhost:3001/admin`

**Tests à effectuer :**
- [ ] La page se charge sans erreur
- [ ] Les transactions s'affichent dans le tableau
- [ ] Le filtre "Mode" est visible (Tous / Production / Test)
- [ ] Sélectionner "Production" → Vérifier que seules les transactions production s'affichent
- [ ] Sélectionner "Test" → Vérifier que seules les transactions test s'affichent
- [ ] Vérifier que le badge "TEST" apparaît pour les transactions en mode test
- [ ] Vérifier que `subscriptionId` s'affiche sous le `paymentId` si présent
- [ ] Tester les autres filtres (gateway, statut, dates)

**Résultat attendu :**
- ✅ Affichage correct des nouvelles colonnes
- ✅ Filtrage par isTestMode fonctionnel
- ✅ Badges visibles

---

### ✅ 2. Page /analytics

**URL :** `http://localhost:3001/analytics`

**Tests à effectuer :**
- [ ] La page se charge sans erreur
- [ ] Les analytics combinés s'affichent
- [ ] Les cartes de statistiques sont présentes
- [ ] Les graphiques de tendances sont visibles
- [ ] Changer la vue (Combiné / Paiements / Versements)
- [ ] Modifier les filtres de date
- [ ] **Exporter en CSV :**
  - Cliquer sur "Exporter CSV"
  - Vérifier que le fichier se télécharge
  - Ouvrir le CSV dans Excel/Google Sheets
  - Vérifier que les sections sont présentes (Résumé, Répartition, Tendances)
  - Vérifier que les montants sont formatés correctement
  - Vérifier que les pourcentages sont présents
- [ ] **Exporter en PDF :**
  - Cliquer sur "Exporter PDF"
  - Vérifier que le fichier se télécharge
  - Ouvrir le fichier HTML dans le navigateur
  - Vérifier que le design est correct
  - Tester l'impression (Cmd/Ctrl + P)
  - Vérifier que les graphiques sont visibles

**Résultat attendu :**
- ✅ Analytics affichés correctement
- ✅ Exports CSV et PDF fonctionnent
- ✅ Formatage professionnel dans les exports

---

### ✅ 3. Page /subscriptions

**URL :** `http://localhost:3001/subscriptions`

**Tests à effectuer :**
- [ ] La page se charge sans erreur
- [ ] La liste des subscriptions s'affiche (peut être vide)
- [ ] **Créer une subscription :**
  - Cliquer sur "Créer un abonnement"
  - Remplir le formulaire :
    - Email : `test-subscription@example.com`
    - Téléphone : `+237612345678`
    - Montant : `10000`
    - Devise : `XAF`
    - Cycle : `Mensuel`
    - Mode test : `Cocher`
  - Cliquer sur "Créer"
  - Vérifier que la subscription apparaît dans la liste
  - Vérifier que le badge "TEST" est visible
- [ ] **Filtrer les subscriptions :**
  - Sélectionner "Active" dans le filtre Statut
  - Vérifier que la liste se filtre
  - Réinitialiser le filtre
  - Saisir un email dans "Email client"
  - Vérifier que le filtrage fonctionne
- [ ] **Actions sur une subscription :**
  - Cliquer sur l'icône pause (▶️) pour mettre en pause
  - Vérifier que le statut passe à "En pause"
  - Cliquer sur l'icône play (⏸) pour reprendre
  - Vérifier que le statut passe à "Active"
  - Cliquer sur l'icône X pour annuler
  - Confirmer l'annulation
  - Vérifier que le statut passe à "Annulée"

**Résultat attendu :**
- ✅ Toutes les actions fonctionnent
- ✅ Les filtres fonctionnent
- ✅ Les badges s'affichent correctement

---

### ✅ 4. Page /sandbox

**URL :** `http://localhost:3001/sandbox`

**Tests à effectuer :**
- [ ] La page se charge sans erreur
- [ ] Les exemples de payloads se chargent automatiquement
- [ ] **Simuler un webhook :**
  - Sélectionner un type d'événement (ex: "Payment Succeeded")
  - Vérifier que l'exemple de payload se charge
  - Modifier le payload JSON (optionnel)
  - Cliquer sur "Formater"
  - Vérifier que le JSON est bien formaté avec indentation
  - Modifier l'URL de l'endpoint si nécessaire
  - Cliquer sur "Simuler le Webhook"
  - Vérifier que le message de succès apparaît
  - Vérifier que la simulation apparaît dans l'historique
- [ ] **Voir les détails d'une simulation :**
  - Cliquer sur l'icône œil (👁) sur une ligne de l'historique
  - Vérifier que le dialog s'ouvre
  - Vérifier que l'endpoint est affiché
  - Vérifier que les headers complets sont visibles
  - Vérifier que le payload complet est visible
  - Vérifier que la réponse complète est affichée (status, body)
  - Tester les boutons "Copier" pour chaque section
  - Vérifier que le contenu est bien copié dans le presse-papier
- [ ] **Filtrer l'historique :**
  - Sélectionner un type d'événement dans le filtre
  - Vérifier que la liste se filtre
  - Sélectionner un statut (ex: "Succès 2xx")
  - Vérifier que le filtrage fonctionne
  - Cliquer sur "Réinitialiser les filtres"
  - Vérifier que tous les résultats reviennent

**Résultat attendu :**
- ✅ Simulation fonctionne
- ✅ Historique complet avec détails
- ✅ Filtres fonctionnent
- ✅ Copie dans le presse-papier fonctionne

---

### ✅ 5. Page /settings

**URL :** `http://localhost:3001/settings`

**Tests à effectuer :**

#### Onglet "Devise"
- [ ] L'onglet est visible et accessible
- [ ] La devise préférée actuelle s'affiche
- [ ] Changer la devise et vérifier qu'elle est sauvegardée

#### Onglet "Notifications"
- [ ] L'onglet est visible et accessible
- [ ] Les préférences actuelles se chargent
- [ ] Modifier quelques préférences :
  - Désactiver "Notifications de paiement"
  - Activer "Notifications SMS"
- [ ] Cliquer sur "Enregistrer"
- [ ] Vérifier que le message de succès apparaît
- [ ] Rafraîchir la page
- [ ] Vérifier que les modifications sont persistées

#### Onglet "Filtres sauvegardés"
- [ ] L'onglet est visible et accessible
- [ ] La liste des filtres se charge (peut être vide)
- [ ] **Créer un filtre :**
  - Cliquer sur "Créer un filtre"
  - Remplir :
    - Nom : `Paiements Stripe réussis`
    - Type : `payment`
    - Filtres JSON : `{"gateway": "STRIPE", "status": "SUCCEEDED"}`
  - Cliquer sur "Enregistrer"
  - Vérifier que le filtre apparaît dans la liste
- [ ] **Modifier un filtre :**
  - Cliquer sur l'icône édition (✏️)
  - Modifier le nom ou les filtres
  - Cliquer sur "Enregistrer"
  - Vérifier que les modifications sont appliquées
- [ ] **Supprimer un filtre :**
  - Cliquer sur l'icône corbeille (🗑️)
  - Confirmer la suppression
  - Vérifier que le filtre est supprimé

**Résultat attendu :**
- ✅ Tous les onglets fonctionnent
- ✅ Les préférences sont sauvegardées
- ✅ Les filtres peuvent être créés/modifiés/supprimés

---

## 🔍 Vérifications Techniques

### Console du Navigateur
Ouvrez la console (F12) et vérifiez :
- [ ] Aucune erreur JavaScript
- [ ] Aucune erreur réseau (404, 500, etc.)
- [ ] Les requêtes API retournent 200 OK

### Network Tab
Dans l'onglet Network :
- [ ] Toutes les requêtes vers `/v1/admin/*` retournent 200 ou 201
- [ ] Les requêtes incluent le header `Authorization: Bearer ...`
- [ ] Les exports CSV/PDF téléchargent correctement

---

## ✅ Critères de Succès

**Toutes les fonctionnalités sont opérationnelles si :**
1. ✅ Toutes les pages se chargent sans erreur
2. ✅ Tous les formulaires peuvent être soumis
3. ✅ Tous les filtres fonctionnent
4. ✅ Toutes les actions (créer, modifier, supprimer) fonctionnent
5. ✅ Les exports CSV/PDF fonctionnent et sont bien formatés
6. ✅ Les dialogs/modal s'ouvrent et se ferment correctement
7. ✅ Les messages de succès/erreur s'affichent
8. ✅ Les données persistent après rafraîchissement

---

## 🐛 Si quelque chose ne fonctionne pas

1. **Vérifiez les logs du serveur backend** (terminal où tourne `npm run start:dev`)
2. **Vérifiez la console du navigateur** (F12)
3. **Vérifiez l'onglet Network** pour voir les erreurs HTTP
4. **Vérifiez que vous êtes bien connecté** (le token JWT est valide)
5. **Vérifiez que les migrations Prisma sont à jour** : `npx prisma migrate status`

---

## 📝 Notes

- Certaines fonctionnalités nécessitent des données de test dans la base de données
- Les filtres peuvent retourner des résultats vides si aucune donnée ne correspond
- Les exports peuvent prendre quelques secondes pour les grandes quantités de données

