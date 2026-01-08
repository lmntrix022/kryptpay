# 🔧 Fix - Erreurs 404 sur les chunks Next.js

## Problème

Les erreurs `GET http://localhost:3001/_next/static/chunks/... 404 (Not Found)` indiquent que Next.js n'a pas pu compiler correctement les pages.

## Causes identifiées

1. **Erreur TypeScript** : `PremiumBadge` avec variant `'primary'` (n'existe pas)
2. **Erreur TypeScript** : `PremiumStatCard` avec props `subtitle` et `index` (n'existent pas)
3. **Import incorrect** : `apiUrl` dans login/page.tsx utilisait `@/lib/api-client` au lieu du chemin relatif

## Corrections appliquées

### 1. Correction de PremiumBadge
```tsx
// Avant
<PremiumBadge variant={user.role === 'ADMIN' ? 'primary' : 'default'}>

// Après
<PremiumBadge variant={user.role === 'ADMIN' ? 'violet' : 'default'}>
```

### 2. Correction de PremiumStatCard
```tsx
// Avant
<PremiumStatCard
  subtitle="..."
  index={0}
/>

// Après
<PremiumStatCard
  description="..."
/>
```

### 3. Correction de l'import apiUrl
```tsx
// Avant
import { apiUrl } from '@/lib/api-client';

// Après
import { apiUrl } from '../../../lib/api-client';
```

## Solution

1. **Nettoyer le cache Next.js** :
   ```bash
   cd apps/dashboard
   rm -rf .next
   ```

2. **Redémarrer le serveur** :
   ```bash
   npm run dev
   ```

3. **Si le problème persiste**, vérifier les erreurs de compilation :
   ```bash
   npm run build
   ```

## Variants PremiumBadge acceptés

- `'default'`
- `'success'`
- `'warning'`
- `'error'`
- `'info'`
- `'violet'`

## Props PremiumStatCard acceptées

- `title: string`
- `value: string | number`
- `description?: string` (pas `subtitle`)
- `icon?: ReactNode`
- `trend?: { value: number; positive: boolean }`
- `gradient?: string`

