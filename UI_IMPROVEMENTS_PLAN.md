# 🎨 Plan d'Amélioration de l'UI

## 📋 Objectif
Intégrer toutes les nouvelles fonctionnalités dans l'interface du dashboard de manière cohérente.

## ✅ Fonctionnalités à intégrer

### 1. **Remboursements (Refunds)**
- [ ] Page `/refunds` pour voir tous les remboursements
- [ ] Ajouter une colonne "Remboursements" dans TransactionsTable
- [ ] Bouton "Rembourser" sur les transactions réussies
- [ ] Afficher le statut des remboursements

### 2. **Webhooks Marchands**
- [ ] Page `/webhooks` pour configurer webhook_url
- [ ] Liste des webhook deliveries avec statuts
- [ ] Afficher les tentatives et erreurs
- [ ] Configuration du webhook secret

### 3. **Navigation**
- [ ] Ajouter "Remboursements" dans la sidebar
- [ ] Ajouter "Webhooks" dans la sidebar
- [ ] Icônes appropriées (RotateCcw pour refunds, Webhook pour webhooks)

### 4. **Améliorations visuelles**
- [ ] Badges de statut cohérents
- [ ] Affichage des montants avec conversion de devise
- [ ] Filtres et recherche

## 🔧 Endpoints Backend à créer

### Refunds
- `GET /v1/admin/refunds` - Lister les remboursements
- `GET /v1/admin/refunds/:id` - Détails d'un remboursement

### Webhooks
- `GET /v1/admin/webhooks` - Liste des webhook deliveries
- `GET /v1/admin/webhooks/config` - Configuration webhook du marchand
- `PUT /v1/admin/webhooks/config` - Mettre à jour la configuration

## 📁 Fichiers à créer/modifier

### Backend
1. `src/modules/payments/refunds.service.ts` - Ajouter `listRefunds()`
2. `src/modules/dashboard/dashboard.controller.ts` - Ajouter endpoints refunds/webhooks
3. `src/modules/webhooks/` - Ajouter méthodes pour lister deliveries

### Frontend
1. `apps/dashboard/app/(protected)/refunds/page.tsx` - Page remboursements
2. `apps/dashboard/app/(protected)/webhooks/page.tsx` - Page webhooks
3. `apps/dashboard/components/RefundsTable.tsx` - Table des remboursements
4. `apps/dashboard/components/WebhookDeliveriesTable.tsx` - Table des deliveries
5. `apps/dashboard/app/(protected)/layout.tsx` - Mettre à jour navigation
6. `apps/dashboard/components/TransactionsTable.tsx` - Ajouter colonne refunds
7. `apps/dashboard/lib/types.ts` - Ajouter types pour refunds/webhooks

## 🎯 Priorités
1. ✅ Endpoints backend
2. ✅ Pages UI de base
3. ✅ Navigation
4. ✅ Améliorations visuelles


