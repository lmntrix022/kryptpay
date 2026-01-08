# 🔄 Mécanisme de Reversement Automatique de TVA

## 📋 Vue d'ensemble

Le reversement automatique de TVA permet à BööhPay de transférer automatiquement la TVA collectée vers le compte de l'administration fiscale, sans intervention manuelle du marchand.

---

## 🏗️ Architecture du Reversement

### Flux complet

```
┌─────────────────────────────────────────────────────────┐
│  1. Job Scheduler (Cron / Queue)                        │
│     - Vérifie les rapports TVA à reverser               │
│     - Déclenche le processus de reversement            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. VatReportsService                                    │
│     - Identifie les rapports avec status = SUBMITTED    │
│     - Calcule le montant total à reverser               │
│     - Crée un VatPayment (status = PENDING)             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. VatPaymentsService                                   │
│     - Récupère le compte de reversement                 │
│     - Valide les informations du compte                  │
│     - Prépare le transfert                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. PayoutsService (via Provider)                       │
│     - Utilise Stripe / Moneroo / Shap selon le pays     │
│     - Exécute le transfert bancaire                     │
│     - Retourne l'ID de transaction externe              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  5. Mise à jour                                         │
│     - VatPayment.status = EXECUTED                       │
│     - VatReport.status = PAID                           │
│     - Notification au marchand                         │
│     - Log d'audit                                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Implémentation Technique

### 1. Job Scheduler (À implémenter)

**Option A : NestJS Schedule Module**

```typescript
// src/modules/vat/vat-scheduler.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VatReportsService } from './vat-reports.service';
import { VatPaymentsService } from './vat-payments.service';

@Injectable()
export class VatSchedulerService {
  constructor(
    private readonly reportsService: VatReportsService,
    private readonly paymentsService: VatPaymentsService,
  ) {}

  // Exécuté tous les jours à 2h du matin
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processAutomaticReversements() {
    // 1. Trouver tous les marchands avec reversement automatique activé
    const merchants = await this.getMerchantsWithAutoReversement();
    
    for (const merchant of merchants) {
      // 2. Trouver les rapports à reverser
      const reportsToPay = await this.reportsService.findReportsToPay(merchant.id);
      
      for (const report of reportsToPay) {
        try {
          // 3. Créer le paiement TVA
          await this.processReversement(merchant, report);
        } catch (error) {
          // Log l'erreur et continue avec les autres rapports
          this.logger.error(`Failed to process reversement for report ${report.id}`, error);
        }
      }
    }
  }

  private async processReversement(merchant: Merchant, report: VatReport) {
    // Récupérer les paramètres TVA du marchand
    const settings = await this.getVatSettings(merchant.id);
    
    if (!settings?.reversementAccount) {
      throw new Error('Reversement account not configured');
    }

    // Créer le paiement TVA
    const payment = await this.paymentsService.createVatPayment({
      reportId: report.id,
      merchantId: merchant.id,
      amount: report.totalVat,
      currency: report.currency || 'XAF',
      recipientAccount: settings.reversementAccount,
      recipientName: 'Administration Fiscale',
    });

    // Exécuter le transfert via PayoutsService
    await this.executeBankTransfer(payment, settings);
  }
}
```

**Option B : Queue System (Bull / BullMQ)**

```typescript
// Utiliser une queue pour gérer les reversements de manière asynchrone
// Plus robuste pour gérer les retries et les échecs
```

### 2. Intégration avec PayoutsService

Le reversement utilise le système de payout existant de BööhPay :

```typescript
// src/modules/vat/vat-payments.service.ts
import { PayoutsService } from '../payouts/payouts.service';

async executeBankTransfer(
  vatPayment: VatPayment,
  settings: VatSettings
): Promise<void> {
  // Déterminer le provider selon le pays
  const provider = this.determineProvider(settings.sellerCountry);
  
  // Créer un DTO de payout
  const payoutDto: CreatePayoutDto = {
    amount: Number(vatPayment.amount),
    currency: vatPayment.currency,
    payeeMsisdn: null, // Pour un compte bancaire, utiliser IBAN
    paymentSystemName: null,
    externalReference: `VAT-${vatPayment.id}`,
    metadata: {
      vatPaymentId: vatPayment.id,
      reportId: vatPayment.reportId,
      recipientAccount: settings.reversementAccount,
      recipientName: 'Administration Fiscale',
      payoutType: 'VAT_REVERSEMENT',
    },
    provider: provider, // STRIPE, MONEROO, etc.
  };

  // Utiliser PayoutsService pour exécuter le transfert
  const payout = await this.payoutsService.createPayout(
    vatPayment.merchantId,
    payoutDto,
    provider
  );

  // Mettre à jour le VatPayment avec l'ID externe
  await this.executePayment(
    vatPayment.id,
    payout.providerReference
  );
}
```

### 3. Providers de Transfert

**Stripe (pour comptes bancaires internationaux)**
- Utilise l'API Stripe Transfers ou Payouts
- Supporte les IBAN européens
- Frais de transaction

**Moneroo / Shap (pour Mobile Money)**
- Si l'administration fiscale accepte Mobile Money
- Transfert vers un numéro de téléphone

**Bank Transfer direct (à implémenter)**
- Intégration avec une banque partenaire
- Virement SEPA pour l'Europe
- Virement local selon le pays

---

## 📅 Fréquence de Reversement

### Options configurables

1. **Mensuel** : Reversement le 1er de chaque mois pour le mois précédent
2. **Trimestriel** : Reversement tous les 3 mois
3. **Sur seuil** : Reversement quand le montant atteint un seuil (ex: 100 000 XAF)
4. **Sur rapport** : Reversement automatique après soumission d'un rapport

### Configuration dans les paramètres

```typescript
interface VatSettings {
  autoReversement: boolean;
  reversementAccount: string;
  reversementFrequency: 'MONTHLY' | 'QUARTERLY' | 'ON_THRESHOLD' | 'ON_REPORT';
  reversementThreshold?: number; // Si ON_THRESHOLD
  reversementDay?: number; // Jour du mois (1-28)
}
```

---

## 🔒 Sécurité et Conformité

### Validations

1. **Vérification du compte** : Valider le format du compte (IBAN, etc.)
2. **Limites de montant** : Vérifier les limites de transfert
3. **KYC/AML** : Vérifier que le marchand est conforme
4. **Double vérification** : Confirmation avant reversement pour montants élevés

### Audit

- Tous les reversements sont loggés dans `vat_audit_logs`
- Traçabilité complète : rapport → paiement → transfert externe
- Receipts : Stockage des reçus de transfert

---

## 💰 Frais de Service

Si BööhPay gère le reversement, des frais peuvent s'appliquer :

```typescript
interface VatPayment {
  amount: bigint; // Montant TVA à reverser
  fee: bigint; // Frais BööhPay (ex: 1% ou minimum fixe)
  netAmount: bigint; // amount - fee
}
```

---

## 🚨 Gestion des Erreurs

### Scénarios d'échec

1. **Compte invalide** : Notifier le marchand, marquer comme FAILED
2. **Fonds insuffisants** : Retry automatique après 24h
3. **Erreur provider** : Retry avec backoff exponentiel
4. **Échec définitif** : Notifier le marchand, passer en mode manuel

### Retry Strategy

```typescript
const retryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 seconde
  maxDelay: 3600000, // 1 heure
  backoff: 'exponential',
};
```

---

## 📊 État Actuel vs À Implémenter

### ✅ Déjà implémenté

- `VatPaymentsService` : Création et exécution de paiements TVA
- `VatReportsService` : Génération de rapports
- Structure de données : Tables `vat_payments`, `vat_reports`
- Interface utilisateur : Paramètres de reversement

### ❌ À implémenter

1. **Job Scheduler** : Cron job pour déclencher les reversements
2. **Intégration PayoutsService** : Lier VatPaymentsService avec PayoutsService
3. **Validation de compte** : Vérifier le format IBAN/compte fiscal
4. **Notifications** : Notifier le marchand après reversement
5. **Gestion des erreurs** : Retry logic et gestion d'échecs
6. **Frais de service** : Calcul et application des frais
7. **Receipts** : Stockage des reçus de transfert

---

## 🔄 Exemple de Flow Complet

### Scénario : Reversement mensuel automatique

1. **1er du mois, 2h du matin** : Job scheduler s'exécute
2. **VatSchedulerService** : Trouve tous les marchands avec auto-reversement
3. **Pour chaque marchand** :
   - Trouve les rapports du mois précédent avec status = SUBMITTED
   - Calcule le total TVA à reverser
   - Crée un `VatPayment` avec status = PENDING
4. **VatPaymentsService** :
   - Récupère le compte de reversement du marchand
   - Crée un payout via `PayoutsService` (Stripe/Moneroo)
5. **Provider** : Exécute le transfert bancaire
6. **Callback** : Provider notifie BööhPay du succès
7. **Mise à jour** :
   - `VatPayment.status = EXECUTED`
   - `VatReport.status = PAID`
   - Notification email au marchand
   - Log d'audit

---

## 📝 Notes Importantes

1. **Partenariats bancaires** : Le reversement automatique nécessite des partenariats avec des banques ou des providers de paiement
2. **Compliance** : Chaque pays a ses propres règles pour le reversement de TVA
3. **Frais** : Les frais de transfert peuvent varier selon le provider et le pays
4. **Délais** : Les transferts peuvent prendre 1-5 jours ouvrés selon le provider

---

**Version** : 1.0.0  
**Dernière mise à jour** : Novembre 2025

