# BööhTax - Module TVA - Implémentation

## 📋 Vue d'ensemble

Le module **BööhTax** a été intégré à BoohPay pour gérer le calcul, la collecte, le reporting et le reversement de TVA sur les transactions.

## ✅ Ce qui a été implémenté

### 1. Schéma de base de données (Prisma)

✅ **Tables créées** :
- `VatRate` - Taux de TVA versionnés par pays/catégorie
- `VatTransaction` - Transactions enrichies avec données TVA
- `VatRefundAdjustment` - Ajustements TVA pour remboursements
- `VatReport` - Rapports TVA périodiques
- `VatPayment` - Reversements TVA à l'administration
- `MerchantVatSettings` - Paramètres TVA par marchand
- `VatAuditLog` - Logs d'audit immuables

✅ **Relations** :
- `Payment` → `VatTransaction` (1:1)
- `Refund` → `VatRefundAdjustment` (1:N)
- `Merchant` → `VatTransaction`, `VatReport`, `MerchantVatSettings`

### 2. Module NestJS

✅ **Structure créée** :
```
src/modules/vat/
├── vat.module.ts              # Module principal
├── vat.controller.ts          # Contrôleur REST API
├── vat.service.ts             # Service principal
├── vat-calculation.service.ts # Service de calcul TVA (cœur)
├── vat-rates.service.ts       # Gestion des taux TVA
├── vat-reports.service.ts     # Génération de rapports
├── vat-payments.service.ts    # Gestion des reversements
├── vat-audit.service.ts       # Logs d'audit
└── dto/
    ├── calculate-vat.dto.ts   # DTO calcul TVA
    ├── vat-settings.dto.ts    # DTO paramètres
    └── vat-report.dto.ts      # DTO rapports
```

### 3. Fonctionnalités implémentées

#### ✅ Calcul TVA
- Calcul déterministe avec entiers (pas de flottants)
- Support TTC et HT
- Détection B2B vs B2C
- Reverse charge pour B2B
- Bankers rounding (round half to even)
- Idempotence via `idempotency_key`

#### ✅ Gestion des taux
- Taux versionnés avec dates d'effet
- Cache Redis pour performance
- Recherche par pays/catégorie/date

#### ✅ Rapports TVA
- Génération de rapports périodiques
- Agrégation automatique des transactions
- Statuts : DRAFT → SUBMITTED → PAID → RECONCILED

#### ✅ Audit
- Logs immuables de toutes les actions
- Traçabilité complète (qui, quand, quoi)

### 4. API REST

✅ **Endpoints créés** :
- `POST /v1/vat/calculate` - Calcul TVA (idempotent)
- `GET /v1/vat/transactions` - Liste transactions TVA
- `GET /v1/vat/transactions/:paymentId` - Détail transaction
- `GET /v1/vat/merchants/:id/vat-settings` - Paramètres TVA
- `PUT /v1/vat/merchants/:id/vat-settings` - Mettre à jour paramètres
- `POST /v1/vat/merchants/:id/vat-reports` - Générer rapport
- `GET /v1/vat/merchants/:id/vat-reports` - Liste rapports
- `GET /v1/vat/vat-reports/:id` - Détail rapport
- `POST /v1/vat/vat-reports/:id/submit` - Soumettre rapport

## 🔄 Intégration avec Payments

### À faire : Intégration webhook

Pour intégrer le calcul TVA automatique lors des paiements réussis, modifier `payments.service.ts` :

```typescript
// Dans payments.service.ts, méthode applyWebhookEvent()
// Après la mise à jour du statut à SUCCEEDED :

if (event.status === PaymentStatus.SUCCEEDED) {
  // ... code existant ...
  
  // Appeler le calcul TVA si activé pour le marchand
  const vatSettings = await this.prisma.merchantVatSettings.findUnique({
    where: { merchantId: payment.merchantId },
  });
  
  if (vatSettings?.enabled) {
    // Calculer la TVA de manière asynchrone (via queue recommandé)
    await this.vatCalculationService.calculateVat({
      idempotencyKey: payment.id, // Utiliser payment.id comme clé
      paymentId: payment.id,
      sellerId: payment.merchantId,
      sellerCountry: vatSettings.sellerCountry,
      buyerCountry: payment.countryCode, // Ou depuis metadata
      currency: payment.currency,
      amount: payment.amountMinor,
      priceIncludesVat: true, // À déterminer selon les besoins
      productCategory: (payment.metadata as any)?.productCategory || 'default',
      buyerVatNumber: (payment.metadata as any)?.buyerVatNumber,
    });
  }
}
```

## 📝 Prochaines étapes

### 1. Migration de base de données

```bash
# Générer la migration
npm run prisma:migrate dev --name add_vat_module

# Appliquer en production
npm run prisma:migrate deploy
```

### 2. Seed des taux de TVA initiaux

Créer un script de seed pour les taux de base :

```typescript
// scripts/seed-vat-rates.ts
const defaultRates = [
  { countryCode: 'GA', category: 'default', rate: 0.18, effectiveFrom: new Date('2020-01-01') },
  { countryCode: 'FR', category: 'default', rate: 0.20, effectiveFrom: new Date('2020-01-01') },
  { countryCode: 'SN', category: 'default', rate: 0.18, effectiveFrom: new Date('2020-01-01') },
  // ...
];
```

### 3. Implémenter les paramètres TVA marchand

Compléter les méthodes dans `vat.controller.ts` :
- `getVatSettings()`
- `updateVatSettings()`

### 4. Génération de fichiers (CSV/XLSX/PDF)

Intégrer une bibliothèque pour générer les rapports :
- CSV : `csv-writer` ou `fast-csv`
- XLSX : `exceljs`
- PDF : `pdfkit` ou `puppeteer`

### 5. Validation numéro TVA

Intégrer un service de validation :
- **VIES** (EU) : https://ec.europa.eu/taxation_customs/vies/
- Services locaux pour autres pays

### 6. UI Dashboard

Créer les pages Next.js :
- `/vat/settings` - Configuration TVA
- `/vat/dashboard` - Dashboard TVA (KPIs, graphiques)
- `/vat/reports` - Liste et génération de rapports
- `/vat/transactions` - Liste des transactions avec TVA

### 7. Tests

Créer les tests unitaires et E2E :
- Tests de calcul (edge cases)
- Tests B2B/B2C
- Tests idempotence
- Tests remboursements

## 🧪 Exemples d'utilisation

### Calcul TVA

```bash
curl -X POST http://localhost:3000/v1/vat/calculate \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
    "paymentId": "pay_01HXYZ",
    "sellerId": "mrc_01M",
    "sellerCountry": "GA",
    "buyerCountry": "FR",
    "currency": "XAF",
    "amount": 10000,
    "priceIncludesVat": true,
    "productCategory": "digital"
  }'
```

### Générer un rapport

```bash
curl -X POST http://localhost:3000/v1/vat/merchants/mrc_01M/vat-reports \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "periodStart": "2025-11-01",
    "periodEnd": "2025-11-30",
    "format": "csv",
    "includeRefunds": true
  }'
```

## 📊 Métriques à suivre

- `vat.calculations.count` - Nombre de calculs
- `vat.calculation.latency` - Latence des calculs
- `vat.amount.total_per_period` - TVA totale par période
- `vat.reports.generated` - Rapports générés
- `vat.payments.executed` - Reversements exécutés

## 🔒 Sécurité

- ✅ Authentification : API Key ou JWT
- ✅ Isolation multi-tenant (merchant-scoped)
- ✅ Audit logs immuables
- ⚠️ À faire : Validation stricte des inputs
- ⚠️ À faire : Rate limiting spécifique

## 📚 Documentation

- ✅ DTOs documentés avec Swagger
- ⚠️ À faire : Guide d'intégration développeur
- ⚠️ À faire : Exemples de code SDK
- ⚠️ À faire : Runbook opérationnel

---

**Statut** : ✅ Core implémenté, ⚠️ Intégrations et UI à compléter

