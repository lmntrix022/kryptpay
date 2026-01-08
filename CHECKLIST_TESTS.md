# ✅ Checklist des Tests à Effectuer

## 🎯 Tests Critiques (À faire AVANT de continuer)

### 1. 🔴 **Idempotency** - PRIORITÉ HAUTE
**Script**: `test-idempotency-integration.sh`

**À tester**:
- [ ] Créer un paiement avec `Idempotency-Key` header
- [ ] Répéter la même requête → doit retourner la même réponse
- [ ] Même clé + body différent → doit retourner 400

**Commande**:
```bash
export API_KEY="votre-clé-api"
./test-idempotency-integration.sh
```

**Prérequis**: Redis doit être démarré ✅ (déjà dans docker-compose.yml)

---

### 2. 🔴 **Rate Limiting** - PRIORITÉ HAUTE
**Script**: `test-rate-limiting.sh`

**À tester**:
- [ ] 100 requêtes normales → doivent passer
- [ ] 101ème requête → doit retourner 429
- [ ] Vérifier que le rate limiting fonctionne

**Commande**:
```bash
export API_KEY="votre-clé-api"
./test-rate-limiting.sh
```

---

### 3. 🟡 **Error Handling** - PRIORITÉ MOYENNE
**Script**: `test-error-handling.sh`

**À tester**:
- [ ] Format de réponse standardisé sur les erreurs
- [ ] Vérifier que toutes les erreurs ont le même format

**Commande**:
```bash
export API_KEY="votre-clé-api"
./test-error-handling.sh
```

---

## 🟢 Tests Optionnels (Peuvent attendre)

### 4. **Retry Logic** 
- Nécessite des mocks/simulation d'erreurs
- Peut être testé plus tard

### 5. **Transactions Database**
- Peut être vérifié manuellement en créant des erreurs
- Les tests unitaires couvrent déjà la logique

---

## ⚡ Tests Rapides Immédiats

### Test 0: Vérifier que l'app démarre
```bash
npm run start:dev
# Vérifier qu'il n'y a pas d'erreurs
# Vérifier que Redis se connecte correctement
```

### Test 1: Test Idempotency (5 minutes)
```bash
export API_KEY="3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0"
./test-idempotency-integration.sh
```

### Test 2: Test Rate Limiting (2 minutes)
```bash
export API_KEY="3-RT7iBdvFqcHukLusRcNKqm8pUQLa_zxUo3-ShOHk0"
./test-rate-limiting.sh
```

---

## 📊 Résumé

**Tests à faire maintenant** (≈10 minutes):
1. ✅ Vérifier que l'app démarre
2. 🔴 Tester Idempotency
3. 🔴 Tester Rate Limiting

**Tests optionnels** (peuvent attendre):
4. 🟡 Error Handling (vérification visuelle)
5. 🟢 Retry Logic (nécessite mocks)
6. 🟢 Transactions (vérification manuelle)

---

## 🚨 Points d'Attention

1. **Redis doit être démarré** pour Idempotency et Rate Limiting
   - Vérifier: `docker ps | grep redis`
   - Ou: `redis-cli ping` (doit retourner "PONG")

2. **Variables d'environnement**
   - `REDIS_URL` ou `REDIS_HOST`/`REDIS_PORT` doivent être configurées
   - Dans Docker: déjà configuré dans `docker-compose.yml`

3. **API Key valide**
   - Utiliser une clé API existante
   - Ou créer un nouveau merchant et utiliser sa clé

