# Origin UI Components

Ces composants sont basés sur Origin UI et utilisent Tailwind CSS pour le styling.

## Composants disponibles

- **Button** : Boutons avec variantes (default, destructive, outline, secondary, ghost, link)
- **Card** : Cartes avec header, title, description, content et footer
- **Badge** : Badges avec variantes (default, secondary, destructive, outline, success, warning)
- **Input** : Champs de saisie stylisés
- **Label** : Labels pour les formulaires

## Utilisation

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Exemple
<Card>
  <CardHeader>
    <CardTitle>Titre</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default">Cliquer</Button>
    <Badge variant="success">Actif</Badge>
  </CardContent>
</Card>
```

## Personnalisation

Les couleurs et styles peuvent être personnalisés via les variables CSS dans `globals.css`.


