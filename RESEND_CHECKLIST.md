# ✅ Checklist Configuration Resend

## Configuration dans `config/docker.env`

- [x] `EMAIL_ENABLED=true`
- [x] `EMAIL_PROVIDER=resend`
- [x] `EMAIL_FROM=noreply@booh.ga`
- [x] `RESEND_API_KEY=re_j92EZumd_...`

## Points à vérifier

### 1. Domaine vérifié dans Resend ⚠️

**Action requise :**
1. Allez sur https://resend.com/domains
2. Vérifiez que le domaine `booh.ga` est ajouté et vérifié
3. Si non vérifié :
   - Cliquez sur "Add Domain"
   - Ajoutez `booh.ga`
   - Suivez les instructions pour configurer les enregistrements DNS :
     - DKIM (3 enregistrements TXT)
     - SPF (1 enregistrement TXT)
     - Domain verification (1 enregistrement TXT)

**Alternative temporaire (pour tester) :**
- Utilisez le domaine de test Resend : `onboarding@resend.dev`
- Changez `EMAIL_FROM=onboarding@resend.dev` dans `config/docker.env`
- ⚠️ Limité à 50 emails/jour avec le domaine de test

### 2. Redémarrer le serveur ⚠️

**Action requise :**
```bash
# Arrêter le serveur actuel (Ctrl+C)
# Puis redémarrer
npm run start:dev
```

**Vérification :**
- Dans les logs, vous devriez voir :
  ```
  [EmailService] Resend email service initialized successfully
  ```

### 3. Utilisateur avec email pour le marchand ⚠️

**Problème courant :**
- Les notifications nécessitent un email associé au marchand
- Si aucun utilisateur avec email n'existe, l'historique sera créé mais l'email ne sera pas envoyé

**Solution :**
- Créer un utilisateur avec email via l'API interne :
  ```bash
  curl -X POST http://localhost:3000/v1/internal/users \
    -H "x-admin-token: super-admin-secret-2025" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "merchant@example.com",
      "password": "Test1234!@#",
      "role": "MERCHANT",
      "merchantId": "VOTRE_MERCHANT_ID"
    }'
  ```

## Test d'envoi

### Option 1 : Script de test
```bash
./test-resend-email.sh
```

### Option 2 : Créer un payout depuis le dashboard
1. Connectez-vous au dashboard
2. Allez dans "Payouts"
3. Créez un nouveau payout
4. Attendez 3-5 secondes
5. Vérifiez l'historique des notifications

### Option 3 : API directe
```bash
# Créer un payout via API
curl -X POST http://localhost:3000/v1/admin/payouts \
  -H "x-api-key: VOTRE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentSystemName": "airtelmoney",
    "payeeMsisdn": "074398524",
    "amount": 1000,
    "currency": "XAF",
    "payoutType": "WITHDRAWAL",
    "provider": "SHAP"
  }'
```

## Vérification des logs

### Succès ✅
```
[EmailService] Resend email service initialized successfully
[EmailService] Email sent via Resend: ❌ Payout échoué to merchant@example.com (ID: re_xxx)
```

### Erreurs possibles ❌

**1. Domaine non vérifié :**
```
[EmailService] Failed to send email via Resend to ...: 
  error: { message: "Invalid 'from' field..." }
```
→ Solution : Vérifiez le domaine dans Resend ou utilisez `onboarding@resend.dev`

**2. API Key invalide :**
```
[EmailService] Failed to initialize Resend email service: Unauthorized
```
→ Solution : Vérifiez votre `RESEND_API_KEY`

**3. Pas d'email pour le marchand :**
```
[NotificationService] No email found for merchant xxx, using placeholder for tracking
[EmailService] Email not sent (Resend not initialized): ...
```
→ Solution : Créez un utilisateur avec email associé au marchand

## Historique des notifications

Vérifiez l'historique pour voir le statut :
```bash
curl -X GET "http://localhost:3000/v1/admin/notifications/history?limit=5" \
  -H "x-api-key: VOTRE_API_KEY"
```

**Statuts possibles :**
- `SENT` : ✅ Email envoyé avec succès
- `FAILED` : ❌ Échec d'envoi (voir `errorMessage`)
- `PENDING` : ⏳ En attente d'envoi

## Support

- Documentation Resend : https://resend.com/docs
- Dashboard Resend : https://resend.com/emails
- Logs du serveur : Vérifiez les logs NestJS pour les détails d'erreur


