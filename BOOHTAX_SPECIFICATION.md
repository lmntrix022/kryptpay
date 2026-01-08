# BööhTax - Spécification Technique Complète

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Modèle de données](#modèle-de-données)
4. [API REST](#api-rest)
5. [Calcul TVA](#calcul-tva)
6. [Intégration](#intégration)
7. [UI/UX](#uiux)
8. [Sécurité](#sécurité)
9. [Tests](#tests)
10. [Déploiement](#déploiement)

---

## 🎯 Vue d'ensemble

**BööhTax** est le module TVA de BoohPay qui gère :
- ✅ Calcul automatique de TVA par transaction
- ✅ Support multi-pays / multi-taux
- ✅ Détection B2B vs B2C
- ✅ Génération de rapports périodiques
- ✅ Reversement optionnel à l'administration
- ✅ Audit complet et traçabilité

### Principes clés

- **Déterministe** : Même input = même output
- **Idempotent** : Appels multiples = résultat identique
- **Précision** : Utilisation d'entiers (pas de flottants)
- **Auditable** : Logs immuables de toutes les opérations

---

## 🏗️ Architecture

### Composants

```
┌─────────────────────────────────────────┐
│         BoohPay Orchestrator            │
│  (Payment Success Event)                │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│         BööhTax Service                 │
│  ┌──────────────────────────────────┐  │
│  │  VatCalculationService           │  │
│  │  - calculateVat()                 │  │
│  │  - determineB2B()                 │  │
│  │  - calculateAmounts()             │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  VatRatesService                 │  │
│  │  - findRate()                     │  │
│  │  - upsertRate()                   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │  VatReportsService               │  │
│  │  - generateReport()               │  │
│  │  - submitReport()                 │  │
│  └──────────────────────────────────┘  │
└──────────────┬──────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────┐
│         Database (PostgreSQL)          │
│  - vat_transactions                    │
│  - vat_rates                           │
│  - vat_reports                         │
│  - vat_payments                        │
│  - vat_audit_logs                      │
└─────────────────────────────────────────┘
```

---

## 💾 Modèle de données

### Tables principales

#### `vat_rates`
Taux de TVA versionnés par pays/catégorie.

```sql
CREATE TABLE vat_rates (
  id UUID PRIMARY KEY,
  country_code VARCHAR(2) NOT NULL,
  region VARCHAR NULL,
  product_category VARCHAR NOT NULL,
  rate DECIMAL(5,4) NOT NULL,  -- 0.1800 = 18%
  effective_from TIMESTAMP NOT NULL,
  effective_to TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `vat_transactions`
Transactions enrichies avec données TVA.

```sql
CREATE TABLE vat_transactions (
  id UUID PRIMARY KEY,
  payment_id UUID UNIQUE NOT NULL,
  merchant_id UUID NOT NULL,
  buyer_country VARCHAR(2),
  seller_country VARCHAR(2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  amount_gross BIGINT NOT NULL,  -- TTC
  amount_net BIGINT NOT NULL,    -- HT
  vat_amount BIGINT NOT NULL,     -- TVA
  vat_rate_id UUID,
  vat_calculation_version VARCHAR(32) NOT NULL,
  vat_included BOOLEAN NOT NULL,
  applied_rule VARCHAR(50) NOT NULL,
  buyer_vat_number VARCHAR,
  is_b2b BOOLEAN DEFAULT false,
  product_category VARCHAR,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);
```

#### `vat_reports`
Rapports TVA périodiques.

```sql
CREATE TABLE vat_reports (
  id UUID PRIMARY KEY,
  merchant_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_vat BIGINT NOT NULL,
  total_sales BIGINT NOT NULL,
  total_net BIGINT NOT NULL,
  transaction_count INT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'DRAFT',
  generated_at TIMESTAMP DEFAULT now(),
  submitted_at TIMESTAMP,
  paid_at TIMESTAMP
);
```

---

## 🔌 API REST

### Endpoints

#### 1. Calculer TVA

```http
POST /v1/vat/calculate
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "idempotencyKey": "550e8400-e29b-41d4-a716-446655440000",
  "paymentId": "pay_01HXYZ",
  "sellerId": "mrc_01M",
  "sellerCountry": "GA",
  "buyerCountry": "FR",
  "currency": "XAF",
  "amount": 10000,
  "priceIncludesVat": true,
  "productCategory": "digital",
  "buyerVatNumber": null
}
```

**Réponse** :
```json
{
  "transactionId": "vat_txn_01HXYZ",
  "amountGross": 10000,
  "amountNet": 8474,
  "vatAmount": 1526,
  "vatRate": 0.18,
  "vatRateId": "vat_rate_01HXYZ",
  "calculationVersion": "v1.0.0",
  "appliedRule": "destination_based",
  "isB2B": false
}
```

#### 2. Récupérer transaction TVA

```http
GET /v1/vat/transactions/:paymentId
x-api-key: YOUR_API_KEY
```

#### 3. Générer rapport

```http
POST /v1/vat/merchants/:merchantId/vat-reports
Content-Type: application/json
x-api-key: YOUR_API_KEY

{
  "periodStart": "2025-11-01",
  "periodEnd": "2025-11-30",
  "format": "csv",
  "includeRefunds": true
}
```

---

## 🧮 Calcul TVA

### Algorithme

#### Prix TTC (priceIncludesVat = true)

```
HT = TTC / (1 + taux)
TVA = TTC - HT
```

**Exemple** : 10 000 XAF TTC, taux 18%
```
HT = 10 000 / 1.18 = 8 474 XAF
TVA = 10 000 - 8 474 = 1 526 XAF
```

#### Prix HT (priceIncludesVat = false)

```
TVA = HT × taux
TTC = HT + TVA
```

**Exemple** : 10 000 XAF HT, taux 18%
```
TVA = 10 000 × 0.18 = 1 800 XAF
TTC = 10 000 + 1 800 = 11 800 XAF
```

### Arrondi

Utilise **bankers rounding** (round half to even) :
- 0.5 → 0 (si pair) ou 1 (si impair)
- Évite les biais statistiques

### B2B vs B2C

**B2C** (Business to Consumer) :
- TVA collectée normalement
- Règle : destination-based (pays acheteur)

**B2B** (Business to Business) :
- Si numéro TVA valide + reverse charge applicable → pas de TVA
- Sinon → TVA collectée normalement

---

## 🔗 Intégration

### Avec Payments Module

**Option 1 : Webhook** (recommandé)

```typescript
// Dans payments.service.ts
async applyWebhookEvent(event: PaymentWebhookEvent) {
  // ... code existant ...
  
  if (event.status === PaymentStatus.SUCCEEDED) {
    // Calculer TVA de manière asynchrone
    await this.vatCalculationService.calculateVat({
      idempotencyKey: payment.id,
      paymentId: payment.id,
      sellerId: payment.merchantId,
      // ... autres champs
    });
  }
}
```

**Option 2 : Queue asynchrone**

Utiliser Bull Queue pour découpler le calcul TVA :

```typescript
// vat-queue.processor.ts
@Process('calculate-vat')
async handleVatCalculation(job: Job<CalculateVatDto>) {
  return this.vatCalculationService.calculateVat(job.data);
}
```

---

## 🎨 UI/UX

### Pages Dashboard

#### 1. `/vat/settings`
- Toggle ON/OFF TVA
- Pays vendeur
- Détection automatique pays acheteur
- Comportement fiscal par défaut
- Taux par catégorie

#### 2. `/vat/dashboard`
- KPIs : TVA collectée (mois), TVA à reverser, TVA reversée (YTD)
- Graphiques : TVA collectée quotidienne/hebdomadaire
- Liste transactions récentes avec colonnes :
  - Date
  - Payment ID
  - Pays acheteur
  - Montant HT
  - TVA
  - Montant TTC

#### 3. `/vat/reports`
- Générer rapport (modal)
- Liste des rapports
- Télécharger (CSV/XLSX/PDF)

#### 4. `/vat/payments`
- Liste reversements
- Bouton "Payer" (manuel)
- Configuration auto-reversement

---

## 🔒 Sécurité

### Authentification
- ✅ API Key (merchant)
- ✅ JWT (dashboard)

### Autorisation
- ✅ Isolation multi-tenant (merchant-scoped)
- ✅ Vérification merchantId sur toutes les requêtes

### Audit
- ✅ Logs immuables (append-only)
- ✅ Traçabilité complète (qui, quand, quoi)

### Données sensibles
- ⚠️ Chiffrement au repos (DB encryption)
- ⚠️ Chiffrement en transit (TLS 1.2+)

---

## 🧪 Tests

### Tests unitaires

```typescript
describe('VatCalculationService', () => {
  it('should calculate VAT for TTC price', () => {
    const result = calculateAmounts(BigInt(10000), 0.18, true);
    expect(result.amountNet).toBe(BigInt(8474));
    expect(result.vatAmount).toBe(BigInt(1526));
  });

  it('should handle B2B reverse charge', () => {
    // ...
  });

  it('should be idempotent', () => {
    // ...
  });
});
```

### Tests E2E

```typescript
describe('VAT API', () => {
  it('POST /vat/calculate should return VAT calculation', async () => {
    const response = await request(app)
      .post('/v1/vat/calculate')
      .set('x-api-key', apiKey)
      .send(calculateDto);
    
    expect(response.status).toBe(200);
    expect(response.body.vatAmount).toBeGreaterThan(0);
  });
});
```

---

## 🚀 Déploiement

### Migration

```bash
# 1. Générer la migration
npm run prisma:migrate dev --name add_vat_module

# 2. Vérifier le schéma
npm run prisma:generate

# 3. Appliquer en production
npm run prisma:migrate deploy
```

### Seed des taux

```bash
# Créer un script de seed
npm run seed:vat-rates
```

### Feature Flag

Activer progressivement par marchand :

```typescript
const vatSettings = await prisma.merchantVatSettings.findUnique({
  where: { merchantId },
});

if (vatSettings?.enabled) {
  // Calculer TVA
}
```

---

## 📊 Métriques

### Prometheus

```typescript
// Métriques à exporter
vat_calculations_total{merchant_id, country, status}
vat_calculation_duration_seconds{merchant_id}
vat_amount_total{merchant_id, period}
vat_reports_generated_total{merchant_id}
vat_payments_executed_total{merchant_id}
```

### Alertes

- Spike erreurs calcul > 0.1%
- Queue backlog > threshold
- Reversements échoués > 1%

---

## 📝 Exemples

### Calcul TVA - XAF 10 000 TTC, taux 18%

**Input** :
```json
{
  "amount": 10000,
  "priceIncludesVat": true,
  "rate": 0.18
}
```

**Output** :
```json
{
  "amountGross": 10000,
  "amountNet": 8474,
  "vatAmount": 1526
}
```

**Vérification** :
- HT = 10 000 / 1.18 = 8 474.58 → arrondi à 8 474
- TVA = 10 000 - 8 474 = 1 526 ✅

---

**Version** : 1.0.0  
**Date** : 2025  
**Statut** : ✅ Implémenté (core), ⚠️ Intégrations en cours

