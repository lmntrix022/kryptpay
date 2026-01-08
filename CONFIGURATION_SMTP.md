# 📧 Configuration Email pour les Notifications

## 🚀 Resend (Recommandé)

Resend est le provider d'email recommandé pour BoohPay. C'est plus simple, plus rapide et plus fiable que SMTP.

### Configuration Resend

```bash
# Activation des notifications email
EMAIL_ENABLED=true

# Utiliser Resend comme provider
EMAIL_PROVIDER=resend

# Email expéditeur (doit être un domaine vérifié dans Resend)
EMAIL_FROM=noreply@booh.ga

# Clé API Resend (obtenez-la sur https://resend.com/api-keys)
RESEND_API_KEY=re_your_api_key_here

# Activation des notifications marchands
MERCHANT_NOTIFICATIONS_ENABLED=true

# URL de l'application (pour les liens dans les emails)
APP_URL=http://localhost:3001
```

### Étapes pour configurer Resend

1. **Créer un compte** : https://resend.com
2. **Vérifier votre domaine** : Ajoutez et vérifiez votre domaine dans le dashboard Resend
3. **Obtenir votre API Key** : https://resend.com/api-keys
4. **Configurer EMAIL_FROM** : Utilisez un email avec votre domaine vérifié (ex: `noreply@votredomaine.com`)

### Avantages de Resend

- ✅ Configuration simple (juste une API key)
- ✅ Pas de configuration SMTP complexe
- ✅ Meilleure délivrabilité
- ✅ Analytics intégrés
- ✅ Templates d'email supportés
- ✅ Plan gratuit généreux (3000 emails/mois)

---

## 📧 SMTP (Alternative)

Si vous préférez utiliser SMTP traditionnel, voici les paramètres à configurer dans `config/docker.env` ou `.env` :

```bash
# Activation des notifications email
EMAIL_ENABLED=true

# Email expéditeur (visible dans les emails envoyés)
EMAIL_FROM=noreply@booh.ga

# Configuration SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-application

# Activation des notifications marchands
MERCHANT_NOTIFICATIONS_ENABLED=true

# URL de l'application (pour les liens dans les emails)
APP_URL=http://localhost:3001
```

## 🔧 Configuration pour différents providers

### Gmail

```bash
EMAIL_ENABLED=true
EMAIL_FROM=noreply@booh.ga
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
EMAIL_USER=votre-email@gmail.com
EMAIL_PASSWORD=votre-mot-de-passe-application  # Mot de passe d'application (pas le mot de passe Gmail)
```

**⚠️ Important pour Gmail :**
- Utilisez un **mot de passe d'application**, pas votre mot de passe Gmail
- Activez l'authentification à 2 facteurs sur votre compte Gmail
- Générez un mot de passe d'application : https://myaccount.google.com/apppasswords

### SendGrid

```bash
EMAIL_ENABLED=true
EMAIL_FROM=noreply@booh.ga
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=votre-clé-api-sendgrid
```

### Mailgun

```bash
EMAIL_ENABLED=true
EMAIL_FROM=noreply@booh.ga
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
EMAIL_USER=postmaster@votre-domaine.mailgun.org
EMAIL_PASSWORD=votre-mot-de-passe-mailgun
```

### Amazon SES

```bash
EMAIL_ENABLED=true
EMAIL_FROM=noreply@booh.ga
SMTP_HOST=email-smtp.region.amazonaws.com  # Ex: email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
EMAIL_USER=votre-clé-accès-aws
EMAIL_PASSWORD=votre-clé-secrète-aws
```

### SMTP personnalisé (Postfix, etc.)

```bash
EMAIL_ENABLED=true
EMAIL_PROVIDER=smtp
EMAIL_FROM=noreply@booh.ga
SMTP_HOST=votre-serveur-smtp.com
SMTP_PORT=587  # Ou 465 pour SSL
EMAIL_USER=votre-utilisateur
EMAIL_PASSWORD=votre-mot-de-passe
```

**Note :** Si `SMTP_PORT=465`, le service utilisera automatiquement une connexion sécurisée (SSL/TLS).

## ✅ Vérification de la Configuration

Une fois configuré, redémarrez le serveur et vérifiez les logs :

```bash
npm run start:dev
```

Vous devriez voir :
```
[EmailService] Email service initialized successfully
```

Si vous voyez :
```
[EmailService] Email notifications are disabled. Set EMAIL_ENABLED=true to enable.
```
→ Vérifiez que `EMAIL_ENABLED=true`

Si vous voyez :
```
[EmailService] Email credentials not configured. Email notifications will be logged but not sent.
```
→ Vérifiez que `EMAIL_USER` et `EMAIL_PASSWORD` sont définis

Si vous voyez :
```
[EmailService] Failed to initialize email service
```
→ Vérifiez vos identifiants SMTP et que le serveur SMTP est accessible

## 🧪 Test d'envoi

Pour tester l'envoi d'emails, créez un payout et vérifiez :
1. Les logs du serveur
2. L'historique des notifications : `GET /v1/admin/notifications/history`
3. Votre boîte email (si configuré correctement)

## 📊 Variables d'environnement

### Variables communes

| Variable | Description | Requis | Défaut |
|----------|-------------|--------|--------|
| `EMAIL_ENABLED` | Active/désactive l'envoi d'emails | Oui | `false` |
| `EMAIL_PROVIDER` | Provider à utiliser (`resend` ou `smtp`) | Non | `smtp` |
| `EMAIL_FROM` | Email expéditeur | Oui | `noreply@boohpay.io` |
| `MERCHANT_NOTIFICATIONS_ENABLED` | Active les notifications marchands | Non | `true` |
| `APP_URL` | URL de l'application (pour liens) | Non | `http://localhost:3001` |

### Variables Resend (si `EMAIL_PROVIDER=resend`)

| Variable | Description | Requis | Défaut |
|----------|-------------|--------|--------|
| `RESEND_API_KEY` | Clé API Resend | Oui | - |

### Variables SMTP (si `EMAIL_PROVIDER=smtp`)

| Variable | Description | Requis | Défaut |
|----------|-------------|--------|--------|
| `SMTP_HOST` | Serveur SMTP | Oui | `smtp.gmail.com` |
| `SMTP_PORT` | Port SMTP (587 ou 465) | Oui | `587` |
| `EMAIL_USER` | Nom d'utilisateur SMTP | Oui | - |
| `EMAIL_PASSWORD` | Mot de passe SMTP | Oui | - |

## 🔒 Sécurité

- ⚠️ **Ne jamais commit les identifiants SMTP** dans Git
- ✅ Utilisez des variables d'environnement ou un gestionnaire de secrets (AWS Secrets Manager, etc.)
- ✅ En production, utilisez des services dédiés (SendGrid, Mailgun, Amazon SES)
- ✅ Pour Gmail, utilisez toujours des mots de passe d'application

