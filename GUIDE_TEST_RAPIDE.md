# 🧪 Guide de Test Rapide - Refunds & Notifications

## 🚀 Démarrage Rapide

### 1. Vérifier que le serveur tourne

```bash
# Démarrer le serveur si pas déjà fait
npm run start:dev
```

### 2. Tester avec un paiement existant (Recommandé)

Si vous avez déjà un paiement avec statut `SUCCEEDED`:

```bash
export API_KEY="votre-clé-api"
PAYMENT_ID="id-du-paiement-succès"
./test-refund-only.sh $PAYMENT_ID
```

### 3. Test complet (Nouveau paiement + Refund)

```bash
export API_KEY="votre-clé-api"
./test-refunds-quick.sh
```

**Note**: Ce script créera un paiement, mais vous devrez le compléter manuellement pour obtenir le statut SUCCEEDED.

---

## 📋 Étapes Détaillées

### Option A: Utiliser un Paiement Stripe Existant

1. **Trouver un Payment ID avec statut SUCCEEDED:**
   ```bash
   # Via l'API ou la base de données
   curl -X GET "http://localhost:3000/v1/payments/{payment-id}" \
     -H "x-api-key: $API_KEY"
   ```

2. **Tester le refund:**
   ```bash
   ./test-refund-only.sh {payment-id}
   ```

### Option B: Créer un Nouveau Paiement Stripe

1. **Créer un paiement:**
   ```bash
   export API_KEY="votre-clé-api"
   curl -X POST http://localhost:3000/v1/payments \
     -H "x-api-key: $API_KEY" \
     -H "Idempotency-Key: test-$(date +%s)" \
     -H "Content-Type: application/json" \
     -d '{
       "orderId": "ORD-TEST",
       "amount": 5000,
       "currency": "EUR",
       "countryCode": "FR",
       "paymentMethod": "CARD"
     }'
   ```

2. **Compléter le paiement:**
   - Utilisez le `client_secret` retourné
   - Carte test Stripe: `4242 4242 4242 4242`
   - Date: n'importe quelle date future
   - CVC: 123

3. **Vérifier le statut:**
   ```bash
   curl -X GET "http://localhost:3000/v1/payments/{payment-id}" \
     -H "x-api-key: $API_KEY"
   ```

4. **Créer le refund:**
   ```bash
   ./test-refund-only.sh {payment-id}
   ```

---

## ✅ Résultats Attendus

### Refund Réussi

```json
{
  "refundId": "uuid",
  "paymentId": "uuid",
  "amountMinor": 5000,
  "currency": "EUR",
  "status": "SUCCEEDED",
  "providerReference": "re_xxx",
  "reason": "Test refund",
  ...
}
```

### Logs Serveur

```
✅ Email sent: ✅ Remboursement réussi to merchant@example.com
```

---

## 📧 Vérifier les Notifications

### Mode Développement (SMTP non configuré)

Les notifications sont loggées mais pas envoyées:

```
Email not sent (no transporter): ✅ Remboursement réussi
```

### Mode Production (SMTP configuré)

Vérifier les logs:
```bash
# Dans les logs du serveur
grep "Email sent" logs
```

Vérifier la boîte email du marchand.

---

## 🐛 Dépannage

**Erreur: "Payment must be SUCCEEDED or AUTHORIZED"**
→ Le paiement n'est pas encore complété. Complétez-le via Stripe.

**Erreur: "Payment not found"**
→ Vérifiez le Payment ID et que le marchand correspond à l'API key.

**Email non reçu:**
→ Vérifiez la configuration SMTP dans `.env` ou les logs du serveur.

---

*Prêt à tester ! 🚀*


