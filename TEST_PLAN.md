# 📋 Plan de Tests - Fonctionnalités Avancées

## Tests à effectuer

### 1. ✅ Exports CSV et PDF améliorés
- [ ] Tester l'export CSV des analytics paiements
- [ ] Tester l'export CSV des analytics payouts
- [ ] Vérifier que le CSV contient tous les détails (pourcentages, devises, tendances)
- [ ] Tester l'export PDF (format HTML)
- [ ] Vérifier que le PDF s'ouvre correctement et peut être imprimé
- [ ] Vérifier le formatage des montants et devises

### 2. ✅ Page /subscriptions
- [ ] Lister les subscriptions
- [ ] Créer une nouvelle subscription
- [ ] Filtrer par statut
- [ ] Filtrer par email client
- [ ] Mettre en pause une subscription
- [ ] Reprendre une subscription
- [ ] Annuler une subscription
- [ ] Vérifier l'affichage du badge TEST pour les subscriptions en mode test
- [ ] Vérifier l'affichage de subscriptionId dans les transactions

### 3. ✅ Page /sandbox
- [ ] Charger les exemples de payloads
- [ ] Sélectionner un type d'événement et charger l'exemple
- [ ] Formater le JSON avec le bouton "Formater"
- [ ] Simuler un webhook
- [ ] Voir les détails d'une simulation dans le dialog
- [ ] Filtrer l'historique par type d'événement
- [ ] Filtrer l'historique par statut
- [ ] Copier le payload depuis l'historique
- [ ] Vérifier l'affichage des headers complets dans les détails

### 4. ✅ Page /settings
- [ ] Accéder à l'onglet "Notifications"
- [ ] Modifier les préférences de notification
- [ ] Vérifier que les changements sont sauvegardés
- [ ] Accéder à l'onglet "Filtres sauvegardés"
- [ ] Créer un nouveau filtre sauvegardé
- [ ] Modifier un filtre existant
- [ ] Supprimer un filtre sauvegardé
- [ ] Vérifier que les filtres sont bien listés

### 5. ✅ Analytics
- [ ] Accéder à la page /analytics
- [ ] Vérifier les analytics combinés
- [ ] Vérifier les analytics paiements
- [ ] Vérifier les analytics payouts
- [ ] Exporter en CSV depuis la page analytics
- [ ] Exporter en PDF depuis la page analytics

### 6. ✅ Transactions avec nouvelles colonnes
- [ ] Vérifier l'affichage de subscriptionId dans le tableau
- [ ] Vérifier le badge TEST pour les transactions en mode test
- [ ] Filtrer par isTestMode dans la page admin

