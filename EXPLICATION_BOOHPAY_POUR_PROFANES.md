# 💳 BoohPay : Explication Simple et Complète

## 📖 Introduction : Qu'est-ce que BoohPay ?

Imaginez que vous êtes un commerçant qui veut vendre des produits en ligne. Vos clients habitent partout dans le monde : certains en France, d'autres au Gabon, au Sénégal, au Cameroun... 

**Le problème** : Chaque pays a ses propres méthodes de paiement :
- En France, les clients paient avec leur carte bancaire
- Au Gabon, beaucoup de clients utilisent **Mobile Money** (comme Airtel Money ou Moov Money) - une méthode de paiement où l'argent est sur le téléphone portable
- En Afrique de l'Ouest, c'est pareil - Mobile Money est très populaire

**BoohPay est la solution** : C'est comme un **traducteur universel pour les paiements**. 

Au lieu de devoir vous intégrer avec 5 ou 6 systèmes de paiement différents (ce qui est compliqué et cher), vous vous intégrez **une seule fois** avec BoohPay, et nous gérons tous les autres systèmes pour vous.

---

## 🎯 À quoi sert BoohPay concrètement ?

### Exemple concret de la vie quotidienne

**Scénario** : Vous êtes propriétaire d'une boutique en ligne qui vend des vêtements.

1. **Sans BoohPay** :
   - Vous devez vous inscrire chez Stripe (pour les cartes bancaires)
   - Vous devez vous inscrire chez Moneroo (pour Mobile Money en Afrique)
   - Vous devez vous inscrire chez eBilling (pour Mobile Money au Gabon)
   - Vous devez coder l'intégration avec chacun
   - Vous devez gérer les paiements de chaque système séparément
   - **Résultat** : Beaucoup de travail, beaucoup de code, beaucoup de temps

2. **Avec BoohPay** :
   - Vous vous inscrivez UNE SEULE FOIS chez BoohPay
   - Vous recevez une clé API (comme un mot de passe)
   - Vous faites UN SEUL appel à notre système
   - Nous déterminons automatiquement quel système de paiement utiliser
   - Nous gérons tout le reste pour vous
   - **Résultat** : Simple, rapide, efficace

---

## 🔧 Comment ça fonctionne techniquement ?

### 1. Le Routage Intelligent (le "cerveau" de BoohPay)

Quand un client veut payer, voici ce qui se passe :

```
Client veut payer 10 000 FCFA avec Mobile Money
    ↓
Votre site envoie une demande à BoohPay
    ↓
BoohPay analyse :
    - Le pays du client : Gabon
    - La méthode : Mobile Money
    ↓
BoohPay décide automatiquement :
    "Ce client est au Gabon et veut payer avec Mobile Money
     → Je vais utiliser eBilling"
    ↓
BoohPay contacte eBilling et crée le paiement
    ↓
BoohPay vous renvoie un lien de paiement
    ↓
Vous montrez ce lien au client
    ↓
Le client paie avec son téléphone
    ↓
eBilling nous informe que le paiement est réussi
    ↓
BoohPay met à jour votre système automatiquement
```

**C'est comme un GPS pour les paiements** : Vous dites où vous voulez aller (accepter un paiement), et BoohPay trouve le meilleur chemin.

### 2. Les "Providers" (les partenaires de paiement)

BoohPay travaille avec plusieurs **providers** (systèmes de paiement). Pensez à eux comme des **langues différentes** :

| Provider | Langue | Utilisé pour |
|----------|--------|--------------|
| **Stripe** | Anglais | Cartes bancaires (Visa, Mastercard) partout dans le monde |
| **Moneroo** | Swahili | Mobile Money en Afrique (Airtel Money, Moov Money) |
| **eBilling** | Français | Mobile Money spécifiquement au Gabon |
| **SHAP** | Français | Versements (envoyer de l'argent) vers Mobile Money au Gabon |

**BoohPay parle toutes ces langues** et traduit automatiquement.

---

## 🎁 Que peut faire BoohPay exactement ?

### ✨ Fonctionnalité 1 : Accepter des Paiements

**Ce que vous faites** :
```javascript
// Vous appelez notre API avec ces informations :
{
  "amount": 10000,           // Montant : 10 000 FCFA
  "currency": "XAF",         // Devise : Franc CFA
  "countryCode": "GA",       // Pays : Gabon
  "paymentMethod": "MOBILE_MONEY",  // Méthode : Mobile Money
  "orderId": "COMMANDE-123"  // Numéro de votre commande
}
```

**Ce que BoohPay fait** :
1. Reçoit votre demande
2. Vérifie que vous êtes bien autorisé (avec votre clé API)
3. Détermine quel provider utiliser (ici : eBilling pour Mobile Money au Gabon)
4. Contacte eBilling et crée le paiement
5. Vous renvoie un lien de paiement ou un code que le client peut utiliser

**Ce que votre client voit** :
- Un lien de paiement ou un code QR
- Il clique dessus ou scanne le code
- Il entre son numéro de téléphone Mobile Money
- Il confirme le paiement
- ✅ **Paiement accepté !**

### ✨ Fonctionnalité 2 : Suivre les Paiements

Vous pouvez toujours savoir où en est un paiement :

**Statuts possibles** :
- 🟡 **PENDING** (En attente) : Le paiement a été créé mais pas encore payé
- 🟢 **AUTHORIZED** (Autorisé) : Le paiement est autorisé mais pas encore finalisé
- ✅ **SUCCEEDED** (Réussi) : L'argent est bien arrivé sur votre compte
- ❌ **FAILED** (Échoué) : Le paiement n'a pas fonctionné (client a annulé, pas assez d'argent, etc.)

**Exemple** :
```
Matin 10h00 : Client veut payer → Statut : PENDING
Matin 10h05 : Client paie → Statut : SUCCEEDED
```

Vous pouvez vérifier le statut à tout moment en demandant à BoohPay.

### ✨ Fonctionnalité 3 : Recevoir des Notifications Automatiques (Webhooks)

**Webhook** = Un message automatique que BoohPay vous envoie quand quelque chose change.

**C'est comme recevoir un SMS** :
- Quand un paiement est réussi → BoohPay vous envoie un message
- Quand un paiement échoue → BoohPay vous envoie un message
- Quand un versement est terminé → BoohPay vous envoie un message

**Avantage** : Vous n'avez pas besoin de vérifier constamment. BoohPay vous prévient automatiquement.

**Exemple concret** :
```
1. Client paie sur votre site
2. BoohPay reçoit la confirmation du provider
3. BoohPay met à jour le statut dans sa base de données
4. BoohPay vous envoie un webhook : 
   "Le paiement COMMANDE-123 est maintenant SUCCEEDED"
5. Votre système reçoit ce message et met à jour votre base de données
6. Vous pouvez maintenant envoyer le produit au client
```

### ✨ Fonctionnalité 4 : Faire des Versements (Payouts)

**Payout** = Envoyer de l'argent à quelqu'un.

**Cas d'usage** :
- Vous voulez rembourser un client
- Vous voulez payer un vendeur ou un partenaire
- Vous voulez envoyer de l'argent à un prestataire

**Exemple** :
```
Vous voulez rembourser 5000 FCFA à un client
    ↓
Vous appelez l'API BoohPay avec le numéro de téléphone du client
    ↓
BoohPay contacte SHAP (le système de versements)
    ↓
SHAP envoie l'argent au numéro de téléphone du client
    ↓
Le client reçoit l'argent sur son Mobile Money
    ↓
BoohPay vous informe que le versement est terminé
```

### ✨ Fonctionnalité 5 : Faire des Remboursements (Refunds)

**Refund** = Rembourser un paiement qui a déjà été fait.

**Exemple** :
```
Client a acheté un produit 10 000 FCFA
Le client n'est pas satisfait et demande un remboursement
    ↓
Vous appelez l'API BoohPay pour rembourser
    ↓
BoohPay contacte le provider qui a géré le paiement original
    ↓
Le provider rembourse le client
    ↓
L'argent revient sur le compte Mobile Money ou la carte du client
    ↓
BoohPay vous informe que le remboursement est terminé
```

### ✨ Fonctionnalité 6 : Gérer Plusieurs Commerces (Multi-tenant)

**Multi-tenant** = Gérer plusieurs commerces en même temps.

**Exemple** :
- Vous avez une boutique de vêtements
- Vous avez aussi une boutique de chaussures
- Vous voulez gérer les deux séparément

**Avec BoohPay** :
- Chaque boutique a sa propre clé API
- Les paiements de chaque boutique sont séparés
- Vous pouvez voir les statistiques de chaque boutique indépendamment

**C'est comme avoir plusieurs comptes bancaires** : Chaque compte est séparé, mais vous pouvez tous les gérer depuis le même endroit.

### ✨ Fonctionnalité 7 : Dashboard (Tableau de Bord)

**Dashboard** = Une interface web où vous pouvez voir toutes vos transactions.

**C'est comme un relevé bancaire en ligne** mais en mieux :

**Vous pouvez voir** :
- 📊 Toutes vos transactions (paiements, remboursements, versements)
- 📈 Statistiques : Combien d'argent vous avez reçu aujourd'hui, cette semaine, ce mois
- 💰 Répartition : Combien par méthode de paiement (cartes vs Mobile Money)
- 🔍 Rechercher : Trouver une transaction spécifique
- 📥 Exporter : Télécharger vos données en CSV ou PDF
- ⚙️ Configurer : Gérer vos clés API, vos paramètres, etc.

**C'est visuel et facile à comprendre** : Pas besoin d'être un expert en informatique.

---

## 🏗️ Architecture : Comment BoohPay est construit

### Les Composants Principaux

#### 1. L'API (Le Serveur)

**C'est le "cerveau"** de BoohPay. C'est un serveur qui :
- Écoute vos demandes
- Traite les paiements
- Parle avec les providers
- Stocke les informations

**Technologie** : NestJS (un framework moderne pour Node.js)

#### 2. La Base de Données (PostgreSQL)

**C'est la "mémoire"** de BoohPay. Tout est stocké ici :
- Toutes les transactions
- Tous les commerces
- Toutes les clés API
- Tous les événements

**C'est comme un grand classeur numérique** où tout est organisé et rangé.

#### 3. Le Cache (Redis)

**C'est la "mémoire rapide"** de BoohPay. C'est utilisé pour :
- Éviter les doublons (idempotency)
- Stocker temporairement des informations
- Accélérer les réponses

**C'est comme un bloc-notes** : Rapide d'accès mais temporaire.

#### 4. Le Dashboard (Next.js)

**C'est l'interface web** que vous voyez et utilisez.

**C'est comme un site web** mais dédié à la gestion de vos paiements.

---

## 🔐 Sécurité : Comment BoohPay protège vos données

### 1. Authentification par Clé API

**Clé API** = Un mot de passe très long et sécurisé qui identifie votre compte.

**Comment ça marche** :
- Quand vous créez un compte, BoohPay vous donne une clé API
- Chaque fois que vous appelez l'API, vous devez donner cette clé
- BoohPay vérifie que la clé est valide
- Si la clé est valide → Vous pouvez faire des actions
- Si la clé n'est pas valide → Accès refusé

**C'est comme une clé de maison** : Seulement ceux qui ont la clé peuvent entrer.

### 2. Chiffrement des Credentials

**Credential** = Informations sensibles comme les mots de passe, les clés secrètes.

**Ce que BoohPay fait** :
- Quand vous donnez des credentials (par exemple, votre clé Stripe), BoohPay les chiffre
- Ils sont stockés de manière chiffrée dans la base de données
- Même si quelqu'un accède à la base de données, il ne peut pas lire les credentials

**C'est comme mettre de l'argent dans un coffre-fort** : Même si quelqu'un entre dans votre maison, il ne peut pas ouvrir le coffre-fort.

### 3. Vérification des Webhooks

**Webhook** = Message automatique que les providers envoient à BoohPay.

**Le problème** : N'importe qui pourrait envoyer un faux message et dire "Le paiement est réussi" alors que ce n'est pas vrai.

**La solution** : BoohPay vérifie la signature de chaque webhook.
- Chaque provider signe ses messages avec une clé secrète
- BoohPay vérifie la signature
- Si la signature est valide → Le message est authentique
- Si la signature n'est pas valide → Le message est rejeté

**C'est comme vérifier une signature sur un chèque** : On vérifie que c'est bien la bonne personne qui a signé.

### 4. Idempotency (Éviter les Doublons)

**Idempotency** = S'assurer qu'une même action ne se fait pas deux fois.

**Exemple du problème** :
```
Vous créez un paiement
Votre connexion internet coupe
Vous ne savez pas si le paiement a été créé
Vous réessayez
→ Risque de créer le paiement deux fois
```

**La solution BoohPay** :
- Vous donnez un **idempotency key** (un identifiant unique) avec chaque demande
- Si vous refaites la même demande avec la même clé, BoohPay vous renvoie le même résultat
- Pas de doublon possible

**C'est comme un numéro de ticket** : Si vous avez déjà un ticket, vous ne pouvez pas en prendre un autre.

---

## 🌍 Les Pays et Méthodes Supportés

### Méthodes de Paiement

#### 💳 Cartes Bancaires (CARD)
- **Provider** : Stripe
- **Où** : Partout dans le monde
- **Types de cartes** : Visa, Mastercard, American Express
- **Sécurité** : 3D Secure (vérification par SMS)

#### 📱 Mobile Money (MOBILE_MONEY / MOMO)
- **Provider** : Moneroo ou eBilling
- **Où** : Principalement en Afrique
- **Types** :
  - **Airtel Money** : Disponible dans plusieurs pays africains
  - **Moov Money** : Disponible en Afrique de l'Ouest et Centrale
- **Comment ça marche** : L'argent est sur le téléphone portable, comme un porte-monnaie électronique

### Pays Supportés

#### Gabon (GA)
- **Mobile Money** : eBilling (Airtel Money, Moov Money)
- **Versements** : SHAP

#### Autres Pays Africains
- **Mobile Money** : Moneroo (selon les pays)

#### Tous les Pays
- **Cartes Bancaires** : Stripe (partout où Stripe est disponible)

---

## 📱 Le SDK : Intégrer BoohPay dans votre Application

**SDK** = Software Development Kit = Une boîte à outils pour les développeurs.

**Le SDK BoohPay** = Du code pré-écrit que vous pouvez utiliser dans votre application pour faciliter l'intégration.

### Pourquoi utiliser le SDK ?

**Sans SDK** :
- Vous devez écrire tout le code pour appeler l'API
- Vous devez gérer les erreurs
- Vous devez gérer les retries (réessayer si ça échoue)
- C'est long et compliqué

**Avec SDK** :
- Vous utilisez du code pré-écrit
- Tout est déjà géré pour vous
- C'est simple et rapide

### Exemple d'utilisation (React)

```javascript
import { BoohPayCheckout } from '@boohpay/sdk';

function CheckoutPage() {
  return (
    <BoohPayCheckout
      config={{
        publishableKey: 'VOTRE_CLE_API',
        apiUrl: 'https://api.boohpay.com/v1',
      }}
      options={{
        amount: 10000,        // 100.00 FCFA
        currency: 'XAF',
        countryCode: 'GA',    // Gabon
        orderId: 'COMMANDE-123',
      }}
      onSuccess={(response) => {
        console.log('Paiement réussi !', response);
      }}
      onError={(error) => {
        console.error('Erreur :', error);
      }}
    />
  );
}
```

**C'est tout !** Le SDK s'occupe du reste.

---

## 💼 Cas d'Usage Concrets

### Cas d'Usage 1 : Boutique en Ligne

**Vous** : Propriétaire d'une boutique en ligne qui vend des vêtements

**Vos clients** : 
- En France : Paient avec carte bancaire
- Au Gabon : Paient avec Mobile Money

**Avec BoohPay** :
1. Vous intégrez BoohPay une seule fois
2. Quand un client français veut payer → BoohPay utilise Stripe (cartes)
3. Quand un client gabonais veut payer → BoohPay utilise eBilling (Mobile Money)
4. Vous recevez tous les paiements sur votre compte
5. Vous pouvez voir toutes les transactions dans le dashboard

**Résultat** : Vous acceptez les paiements de partout sans avoir à gérer plusieurs systèmes.

### Cas d'Usage 2 : Service de Streaming

**Vous** : Propriétaire d'un service de streaming (comme Netflix)

**Vos clients** :
- Veulent payer un abonnement mensuel
- Certains avec carte bancaire
- D'autres avec Mobile Money

**Avec BoohPay** :
1. Vous créez un abonnement mensuel
2. Chaque mois, BoohPay débite automatiquement le client
3. Si le client a une carte → Stripe gère
4. Si le client a Mobile Money → Moneroo/eBilling gère
5. Si le paiement échoue → BoohPay vous informe
6. Vous pouvez suspendre l'accès si le paiement échoue plusieurs fois

**Résultat** : Vous gérez facilement des abonnements avec plusieurs méthodes de paiement.

### Cas d'Usage 3 : Marketplace (Place de Marché)

**Vous** : Propriétaire d'une marketplace où des vendeurs vendent leurs produits

**Votre besoin** :
- Vous recevez les paiements des clients
- Vous devez ensuite verser l'argent aux vendeurs (moins votre commission)

**Avec BoohPay** :
1. Les clients paient avec BoohPay
2. L'argent arrive sur votre compte
3. Vous utilisez la fonctionnalité "Payout" pour verser aux vendeurs
4. BoohPay envoie l'argent directement sur le Mobile Money des vendeurs
5. Tout est automatique

**Résultat** : Vous gérez facilement les paiements et les versements aux vendeurs.

---

## 🎓 Vocabulaire : Les Mots à Connaître

### Paiement (Payment)
= Transaction où quelqu'un vous donne de l'argent

### Versement (Payout)
= Transaction où vous donnez de l'argent à quelqu'un

### Remboursement (Refund)
= Rendre l'argent d'un paiement qui a déjà été fait

### Provider
= Système de paiement externe (Stripe, Moneroo, eBilling, SHAP)

### Gateway
= Passerelle de paiement = Provider (même chose)

### API
= Application Programming Interface = La façon dont votre code communique avec BoohPay

### Clé API (API Key)
= Un mot de passe très long qui identifie votre compte

### Webhook
= Message automatique que BoohPay vous envoie quand quelque chose change

### Dashboard
= Interface web où vous pouvez voir et gérer vos transactions

### SDK
= Boîte à outils de code pour faciliter l'intégration

### Mobile Money
= Système de paiement où l'argent est sur le téléphone portable

### Idempotency
= S'assurer qu'une même action ne se fait pas deux fois

### Multi-tenant
= Gérer plusieurs commerces en même temps

---

## 📊 Statistiques et Analytics

BoohPay vous permet de voir des statistiques détaillées :

### Ce que vous pouvez voir :

1. **Volume total** : Combien d'argent vous avez reçu
2. **Nombre de transactions** : Combien de paiements ont été faits
3. **Répartition par méthode** : 
   - Combien par carte bancaire
   - Combien par Mobile Money
4. **Répartition par statut** :
   - Combien de paiements réussis
   - Combien de paiements échoués
5. **Tendances** : 
   - Évolution jour par jour
   - Comparaison avec la semaine dernière
   - Comparaison avec le mois dernier

### Exporter les données :

Vous pouvez télécharger vos données :
- **CSV** : Pour les tableurs (Excel, Google Sheets)
- **PDF** : Pour les rapports imprimables

---

## 🚀 Comment Commencer

### Étape 1 : Créer un Compte

1. Contactez l'équipe BoohPay
2. Ils créent un compte marchand pour vous
3. Vous recevez une clé API

### Étape 2 : Configurer les Providers

Vous devez donner vos credentials pour chaque provider que vous voulez utiliser :

- **Pour Stripe** : Vos clés Stripe (si vous avez un compte Stripe)
- **Pour Moneroo** : Votre clé Moneroo
- **Pour eBilling** : Vos credentials eBilling
- **Pour SHAP** : Vos credentials SHAP

**Note** : BoohPay peut aussi gérer les credentials pour vous si vous n'avez pas encore de compte.

### Étape 3 : Intégrer dans votre Application

**Option A : Utiliser le SDK (Recommandé)**
```bash
npm install @boohpay/sdk
```

**Option B : Appeler l'API directement**
```bash
curl -X POST https://api.boohpay.com/v1/payments \
  -H "x-api-key: VOTRE_CLE_API" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "XAF",
    "countryCode": "GA",
    "paymentMethod": "MOBILE_MONEY",
    "orderId": "COMMANDE-123"
  }'
```

### Étape 4 : Tester

1. Créez un paiement de test
2. Vérifiez que tout fonctionne
3. Regardez les transactions dans le dashboard

### Étape 5 : Mettre en Production

1. Configurez les webhooks pour recevoir les notifications
2. Testez avec de vrais paiements
3. Surveillez les transactions dans le dashboard

---

## ❓ Questions Fréquentes

### Q : BoohPay prend-il une commission ?

**R** : Oui, BoohPay prend une petite commission sur chaque transaction. Cette commission couvre :
- Les frais des providers (Stripe, Moneroo, etc.)
- Les frais de BoohPay
- Le support technique

### Q : Où va l'argent ?

**R** : L'argent va directement sur votre compte chez le provider (Stripe, Moneroo, etc.). BoohPay ne touche jamais à votre argent, nous orchestrons seulement les paiements.

### Q : Combien de temps ça prend pour recevoir l'argent ?

**R** : Cela dépend du provider :
- **Stripe (cartes)** : 2-7 jours ouvrables (selon votre pays)
- **Mobile Money** : Généralement instantané ou quelques heures

### Q : Que se passe-t-il si un paiement échoue ?

**R** : BoohPay vous informe via webhook. Vous pouvez :
- Réessayer le paiement
- Proposer une autre méthode de paiement
- Contacter le client

### Q : Puis-je accepter plusieurs devises ?

**R** : Oui ! BoohPay supporte plusieurs devises (XAF, XOF, EUR, USD, etc.). Vous spécifiez la devise lors de la création du paiement.

### Q : Puis-je personnaliser l'interface de paiement ?

**R** : Oui, avec le SDK vous pouvez personnaliser les couleurs, le style, etc.

### Q : BoohPay fonctionne-t-il sur mobile ?

**R** : Oui ! Le SDK fonctionne sur les sites web mobiles et les applications mobiles (React Native).

### Q : Que faire si j'ai un problème ?

**R** : Vous pouvez :
- Consulter la documentation
- Contacter le support BoohPay
- Vérifier les logs dans le dashboard

---

## 🎯 Résumé en 30 Secondes

**BoohPay** = Une seule API pour accepter tous les types de paiements (cartes bancaires + Mobile Money) partout dans le monde.

**Avantages** :
- ✅ Simple : Une seule intégration
- ✅ Rapide : Mise en place en quelques heures
- ✅ Flexible : Supporte plusieurs méthodes de paiement
- ✅ Sécurisé : Vos données sont protégées
- ✅ Fiable : Gestion automatique des erreurs et retries

**Pour qui** :
- Boutiques en ligne
- Services de streaming
- Marketplaces
- Toute entreprise qui veut accepter des paiements

---

## 📞 Support et Contact

Pour toute question ou assistance :
- 📧 Email : support@boohpay.com
- 📚 Documentation : https://docs.boohpay.com
- 💬 Chat : Disponible dans le dashboard

---

**Document créé le** : Janvier 2025  
**Version** : 1.0  
**Dernière mise à jour** : Janvier 2025







