# 🔧 Fix - Erreurs 500 Internal Server Error

## Problème

Les erreurs `500 (Internal Server Error)` sur les chunks Next.js indiquaient des erreurs de compilation TypeScript qui empêchaient Next.js de servir les pages.

## Erreurs corrigées

### 1. Erreur TypeScript dans `sandbox/page.tsx`
**Problème** : `selectedSimulation.response.body` est de type `unknown` et ne peut pas être utilisé directement dans JSX.

**Solution** : Utilisation d'une condition ternaire explicite avec vérification de type :
```tsx
// Avant
{selectedSimulation.response.body && (...)}

// Après
{selectedSimulation.response.body !== undefined && selectedSimulation.response.body !== null ? (...) : null}
```

### 2. Erreur TypeScript dans `vat/dashboard/page.tsx`
**Problème** : `formatAmount()` nécessite 2 arguments mais n'en recevait qu'un.

**Solution** : Ajout du deuxième argument (devise) :
```tsx
// Avant
{formatAmount(stats.totalVatCollected)}

// Après
{formatAmount(stats.totalVatCollected, 'XAF')}
```

### 3. Erreur TypeScript dans `vat/reports/page.tsx`
**Problème** : Même problème avec `formatAmount()`.

**Solution** : Ajout du deuxième argument (devise) :
```tsx
// Avant
{formatAmount(report.totalVat)}
{formatAmount(report.totalSales)}

// Après
{formatAmount(report.totalVat, 'XAF')}
{formatAmount(report.totalSales, 'XAF')}
```

## Signature de `formatAmount`

```typescript
formatAmount(amountMinor: number, fromCurrency: string): string
```

- `amountMinor` : Montant en unités mineures (centimes)
- `fromCurrency` : Code devise source (ex: 'XAF', 'EUR', 'USD')

## Solution

1. **Redémarrer le serveur Next.js** :
   ```bash
   cd apps/dashboard
   # Arrêter le serveur (Ctrl+C)
   npm run dev
   ```

2. **Les erreurs 500 devraient disparaître** car toutes les erreurs TypeScript ont été corrigées.

## Note

Il reste des erreurs de formatage Prettier, mais elles ne sont **pas bloquantes** en mode développement. Elles peuvent être corrigées avec :
```bash
npm run lint -- --fix
```

