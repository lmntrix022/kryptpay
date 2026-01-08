# Implémentation du modèle de monétisation BööhTax

## 📋 Résumé

Ce document décrit l'implémentation du nouveau modèle de monétisation pour le module BööhTax, qui sépare clairement les revenus PSP (BööhPay) des revenus SaaS (BööhTax).

## ✅ Modifications réalisées

### 1. Schéma de base de données (Prisma)

#### Table `transactions` (Payment)
- ✅ Ajout de `boohTaxFee BIGINT` : Frais service TVA (si reversement auto ou plan premium)

#### Table `vat_payments`
- ✅ Ajout de `reversementFee BIGINT` : Frais de service (1% du montant TVA reversée, min 300 XAF)
- ✅ Remplacement de l'ancien champ `fee` par `reversementFee` pour plus de clarté

#### Table `subscriptions`
- ✅ Ajout de l'enum `SubscriptionPlanType` : `BASIC`, `TAX_PRO`, `BUSINESS_SUITE`
- ✅ Ajout du champ `planType SubscriptionPlanType?` pour identifier le type de plan

### 2. Migration SQL

Une migration SQL a été créée dans :
- `prisma/migrations/20251130000000_add_vat_monetization_fields/migration.sql`

Cette migration :
- Ajoute `booh_tax_fee` dans `transactions`
- Ajoute `reversement_fee` dans `vat_payments` (remplace `fee` si existant)
- Crée l'enum `SubscriptionPlanType`
- Ajoute `plan_type` dans `subscriptions`
- Crée les index nécessaires pour les requêtes

### 3. Service de monétisation TVA

Nouveau service créé : `src/modules/vat/vat-monetization.service.ts`

**Fonctionnalités :**
- ✅ `hasActiveVatPlan(merchantId)`: Vérifie si un marchand a un plan TVA actif
- ✅ `getActiveVatPlanType(merchantId)`: Récupère le type de plan TVA actif
- ✅ `calculateBoohTaxFee(merchantId, vatAmount, autoReversement)`: Calcule le fee TVA
  - **Conditions** : 1% de `vatAmount` si :
    - Reversement automatique activé **OU**
    - Plan TAX_PRO/BUSINESS_SUITE actif
- ✅ `calculateReversementFee(vatAmount)`: Calcule le fee de reversement
  - **Formule** : 1% du montant TVA reversée, avec un minimum de 300 XAF

**Prix des plans :**
- `TAX_PRO`: 4000 XAF/mois
- `BUSINESS_SUITE`: 7000 XAF/mois

### 4. Intégration dans les services existants

#### `VatPaymentsService`
- ✅ Utilise `reversementFee` au lieu de `fee`
- ✅ Calcule automatiquement le `reversementFee` lors de la création d'un paiement TVA
- ✅ Injection de `VatMonetizationService`

#### `PaymentsService`
- ✅ Calcul et stockage de `boohTaxFee` après le calcul de TVA
- ✅ Injection de `VatMonetizationService` via `forwardRef`
- ✅ Mise à jour de la transaction avec `boohTaxFee` après calcul TVA

#### `VatModule`
- ✅ Export de `VatMonetizationService` pour utilisation dans d'autres modules

## 📊 Structure des revenus

Le modèle sépare clairement trois sources de revenus :

### 1. Revenus PSP (BööhPay Core)
- **Champ** : `boohpayFee` (dans `transactions`)
- **Formule** : 1,5% + 1€ par transaction
- **Statut** : Inchangé (modèle existant)

### 2. Revenus TVA - Service (BööhTax)
- **Champ** : `boohTaxFee` (dans `transactions`)
- **Formule** : 1% de `vatAmount`
- **Condition** : Si reversement automatique activé **OU** plan TAX_PRO/BUSINESS_SUITE actif

### 3. Revenus TVA - Reversement (Remittance)
- **Champ** : `reversementFee` (dans `vat_payments`)
- **Formule** : 1% du montant TVA reversée, minimum 300 XAF
- **Condition** : Si reversement automatique activé

## 🔄 Flux de calcul

### Pour une transaction avec TVA :

1. **Paiement créé** → `Payment` avec `boohpayFee` (calculé comme avant)
2. **Calcul TVA** → `VatTransaction` créé avec `vatAmount`
3. **Calcul boohTaxFee** :
   - Vérifier si reversement auto activé OU plan actif
   - Si oui : `boohTaxFee = vatAmount * 0.01`
   - Mettre à jour `Payment` avec `boohTaxFee`

### Pour un reversement automatique :

1. **Création du reversement** → `VatPayment` créé
2. **Calcul reversementFee** :
   - `reversementFee = max(vatAmount * 0.01, 300)`
   - Stocké dans `VatPayment.reversementFee`

## 📝 Prochaines étapes

### À implémenter :

1. **Gestion des abonnements TVA** (`vat-subscription-model`)
   - Service pour créer/gérer les abonnements TAX_PRO et BUSINESS_SUITE
   - Vérification de l'abonnement actif lors du calcul de `boohTaxFee`

2. **Interface UI pour les abonnements** (`vat-subscription-ui`)
   - Page de gestion des abonnements dans le dashboard
   - Sélection du plan (TAX_PRO, BUSINESS_SUITE)
   - Gestion des renouvellements

3. **Application de la migration**
   - Exécuter la migration SQL sur la base de données
   - Vérifier que les données existantes sont préservées

## ⚠️ Notes importantes

1. **La TVA n'est PAS un revenu** : Elle appartient au fisc. Seuls les **frais de service** sont des revenus BööhPay.

2. **Compatibilité ascendante** :
   - Les champs sont optionnels ou ont des valeurs par défaut (0)
   - Les transactions existantes continueront de fonctionner

3. **Traçabilité** :
   - Tous les frais sont stockés séparément pour faciliter la comptabilité
   - Chaque reversement a son propre `reversementFee` traçable

## 📚 Références

- Spécification originale : Modèle de monétisation BööhTax
- Schéma Prisma : `prisma/schema.prisma`
- Migration SQL : `prisma/migrations/20251130000000_add_vat_monetization_fields/migration.sql`
- Service de monétisation : `src/modules/vat/vat-monetization.service.ts`











