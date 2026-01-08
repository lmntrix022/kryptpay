# 📊 Résumé du Système de TVA (BööhTax)

## 🎯 Vue d'ensemble

**BööhTax** est le module de gestion de TVA intégré à BoohPay. Il calcule automatiquement, collecte, stocke et génère des rapports pour la TVA sur toutes les transactions traitées par la plateforme.

---

## 🏗️ Architecture

### Composants principaux

1. **VatService** (`vat.service.ts`)
   - Orchestrateur principal du module
   - Coordonne les appels aux autres services
   - Gère les transactions VAT

2. **VatCalculationService** (`vat-calculation.service.ts`)
   - **Cœur du système** : Logique de calcul de TVA
   - Gère B2B vs B2C
   - Applique les règles de taxation (destination-based, origin-based, reverse-charge)
   - Gère le rounding (bankers rounding)

3. **VatRatesService** (`vat-rates.service.ts`)
   - Gestion des taux de TVA par pays/catégorie
   - Cache Redis pour performance
   - Support des taux versionnés (effective_from/effective_to)

4. **VatReportsService** (`vat-reports.service.ts`)
   - Génération de rapports périodiques
   - Agrégation des données par période
   - Export CSV/XLSX/PDF

5. **VatSettingsService** (`vat-settings.service.ts`)
   - Paramètres par marchand
   - Activation/désactivation de la TVA
   - Configuration des comportements par défaut

6. **VatAuditService** (`vat-audit.service.ts`)
   - Logs immuables de toutes les actions
   - Traçabilité complète
   - Conformité réglementaire

---

## 🔄 Flux de fonctionnement

### 1. **Configuration initiale** (Marchand)

```
Marchand → /vat/settings
  ├─ Active la TVA
  ├─ Définit le pays vendeur (seller_country)
  ├─ Configure le comportement par défaut
  └─ Sauvegarde dans `merchant_vat_settings`
```

### 2. **Calcul automatique lors d'un paiement**

```
Paiement réussi (Payment.succeeded)
  ↓
PaymentsService détecte le succès
  ↓
Appelle VatService.calculateVatForPayment()
  ↓
VatCalculationService calcule la TVA :
  ├─ Détermine B2B ou B2C (selon buyer_vat_number)
  ├─ Trouve le taux applicable (VatRatesService)
  ├─ Calcule montants HT/TTC/TVA
  └─ Applique le rounding
  ↓
VatService crée/enregistre VatTransaction
  ↓
Stockage dans `vat_transactions` avec :
  - amount_gross (TTC)
  - amount_net (HT)
  - vat_amount (TVA)
  - vat_rate_id
  - applied_rule
  - vat_calculation_version
```

### 3. **Règles de calcul**

#### **B2C (Business to Consumer)**
- TVA appliquée selon les règles du pays
- Taux déterminé par : `buyer_country` → `product_category` → `vat_rates`
- Comportement par défaut : `destination_based` (TVA du pays acheteur)

#### **B2B (Business to Business)**
- Si `buyer_vat_number` valide → Reverse charge possible
- Pas de TVA collectée si reverse charge applicable
- TVA à la charge de l'acheteur

#### **Calcul des montants**

**Si prix TTC (vat_included = true)** :
```
amount_net = floor(amount_gross / (1 + rate))
vat_amount = amount_gross - amount_net
```

**Si prix HT (vat_included = false)** :
```
vat_amount = round(amount_net * rate)
amount_gross = amount_net + vat_amount
```

**Rounding** : Bankers rounding (round half to even)

### 4. **Gestion des remboursements**

```
Remboursement créé (Refund.processed)
  ↓
RefundsService appelle VatService.adjustVatForRefund()
  ↓
VatService crée VatRefundAdjustment
  ├─ Ajuste le montant TVA (négatif)
  ├─ Met à jour les totaux des rapports
  └─ Log dans vat_audit_logs
```

### 5. **Génération de rapports**

```
Marchand → /vat/reports
  ├─ Sélectionne période (start/end)
  ├─ Clique "Générer"
  ↓
VatReportsService :
  ├─ Agrège toutes les VatTransaction de la période
  ├─ Calcule totaux (TVA, ventes TTC, ventes HT)
  ├─ Crée VatReport (status = DRAFT)
  └─ Génère fichier export (CSV/XLSX/PDF)
  ↓
Marchand peut :
  ├─ Télécharger le rapport
  ├─ Soumettre (status = SUBMITTED)
  └─ Optionnel : Reversement automatique
```

---

## 📊 Modèle de données

### Tables principales

1. **`vat_rates`**
   - Taux de TVA par pays/catégorie
   - Versionnés (effective_from/effective_to)
   - Exemple : Gabon, digital, 18%, depuis 2024-01-01

2. **`vat_transactions`**
   - Une transaction par paiement réussi
   - Contient : montants HT/TTC/TVA, taux appliqué, règle utilisée
   - Liée à `Payment` via `payment_id`

3. **`vat_reports`**
   - Rapports périodiques (mensuel, trimestriel, etc.)
   - Statuts : DRAFT → SUBMITTED → PAID → RECONCILED

4. **`merchant_vat_settings`**
   - Configuration par marchand
   - Activation, pays vendeur, comportements par défaut

5. **`vat_audit_logs`**
   - Logs immuables de toutes les actions
   - Traçabilité complète pour conformité

---

## 🔌 Intégrations

### Backend (NestJS)

**Endpoints API** :
- `GET /v1/vat/transactions` - Liste des transactions VAT
- `GET /v1/vat/merchants/:id/vat-settings` - Paramètres marchand
- `PUT /v1/vat/merchants/:id/vat-settings` - Mise à jour paramètres
- `POST /v1/vat/merchants/:id/vat-reports` - Générer rapport
- `GET /v1/vat/merchants/:id/vat-reports` - Liste rapports

**Intégration avec Payments** :
- `PaymentsService` appelle `VatService` après paiement réussi
- `RefundsService` appelle `VatService` pour ajustements

### Frontend (Next.js)

**Pages UI** :
- `/vat/dashboard` - Vue d'ensemble (KPIs, transactions récentes)
- `/vat/settings` - Configuration marchand
- `/vat/reports` - Génération et téléchargement de rapports

**Composants** :
- Cards pour KPIs (TVA collectée, à reverser, reversée)
- Table des transactions avec détails HT/TTC/TVA
- Formulaire de configuration
- Modal de génération de rapports

---

## 🎯 Fonctionnalités clés

### ✅ Automatisation
- Calcul automatique à chaque paiement réussi
- Pas d'intervention manuelle nécessaire
- Idempotence garantie (même paiement = même calcul)

### ✅ Multi-pays / Multi-taux
- Support de plusieurs pays
- Taux différents par catégorie de produit
- Gestion des changements de taux (versioning)

### ✅ Conformité
- Logs d'audit immuables
- Traçabilité complète
- Stockage des montants en unités mineures (pas de flottants)
- Versioning des calculs (vat_calculation_version)

### ✅ Performance
- Cache Redis pour les taux de TVA
- Index sur les colonnes fréquemment requêtées
- Requêtes optimisées

### ✅ Flexibilité
- Activation/désactivation par marchand
- Configuration personnalisable
- Support B2B et B2C
- Gestion des remboursements partiels/totaux

---

## 📈 Exemple concret

### Scénario : Paiement de 10 000 XAF TTC au Gabon

1. **Paiement réussi** : 10 000 XAF
2. **VatService appelé** avec :
   - `amount`: 10000 (XAF, unités mineures)`
   - `seller_country`: "GA"
   - `buyer_country`: "GA"
   - `price_includes_vat`: true
   - `product_category`: "digital"

3. **VatCalculationService** :
   - Trouve taux : 18% (Gabon, digital)
   - Calcule :
     - `amount_net = floor(10000 / 1.18) = 8474`
     - `vat_amount = 10000 - 8474 = 1526`
     - `amount_gross = 10000`

4. **Enregistrement** :
   ```json
   {
     "payment_id": "uuid-payment",
     "amount_gross": 10000,
     "amount_net": 8474,
     "vat_amount": 1526,
     "vat_rate": 0.18,
     "applied_rule": "destination_based"
   }
   ```

5. **Affichage dashboard** :
   - TVA Collectée (mois) : 1 526 XAF
   - Transaction visible dans le tableau

---

## 🔒 Sécurité & Conformité

- **Idempotence** : Même `payment_id` = même calcul (pas de doublon)
- **Audit** : Tous les calculs sont loggés
- **Versioning** : Chaque calcul stocke sa version
- **Data retention** : Conformité 7 ans (configurable)
- **Encryption** : Données sensibles chiffrées
- **RBAC** : Accès contrôlé par rôle (merchant/admin)

---

## 🚀 Évolutions possibles

- **Reversement automatique** : BööhPay peut reverser la TVA à l'administration
- **Validation VIES** : Vérification automatique des numéros TVA intracommunautaires
- **Multi-devises** : Conversion automatique pour rapports
- **Notifications** : Alertes pour échéances de reversement
- **API comptable** : Intégration avec logiciels comptables

---

## 📝 Notes importantes

1. **Montants en unités mineures** : Tous les montants sont stockés en entiers (centimes pour EUR, unités pour XAF)
2. **Idempotence critique** : Le même webhook peut être reçu plusieurs fois
3. **Performance** : Cache Redis pour éviter les requêtes DB répétées
4. **Conformité** : Les logs d'audit sont immuables (append-only)

---

## 🔗 Fichiers clés

- **Backend** :
  - `src/modules/vat/vat.service.ts` - Service principal
  - `src/modules/vat/vat-calculation.service.ts` - Logique de calcul
  - `src/modules/vat/vat.controller.ts` - API REST
  - `src/modules/payments/payments.service.ts` - Intégration paiements

- **Frontend** :
  - `apps/dashboard/app/(protected)/vat/dashboard/page.tsx` - Dashboard
  - `apps/dashboard/app/(protected)/vat/settings/page.tsx` - Paramètres
  - `apps/dashboard/app/(protected)/vat/reports/page.tsx` - Rapports

- **Base de données** :
  - `prisma/schema.prisma` - Modèles VAT (lignes 495-664)

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025

