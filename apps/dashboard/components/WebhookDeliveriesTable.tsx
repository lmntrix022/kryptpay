"use client";

import type { WebhookDeliveryItem } from '../lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type WebhookDeliveriesTableProps = {
  items: WebhookDeliveryItem[];
};

const relativeFormatter = new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' });
const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const statusVariant = (status: string): 'success' | 'destructive' | 'warning' | 'default' => {
  switch (status) {
    case 'SUCCEEDED':
      return 'success';
    case 'FAILED':
      return 'destructive';
    case 'PROCESSING':
      return 'warning';
    default:
      return 'default';
  }
};

const statusLabel = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'En attente';
    case 'PROCESSING':
      return 'En cours';
    case 'SUCCEEDED':
      return 'Réussi';
    case 'FAILED':
      return 'Échoué';
    default:
      return status;
  }
};

function formatRelative(isoDate: string) {
  const date = new Date(isoDate);
  const now = Date.now();
  const diffMs = date.getTime() - now;
  const diffMinutes = Math.round(diffMs / 60000);

  if (Math.abs(diffMinutes) > 60 * 24) {
    return dateFormatter.format(date);
  }

  if (Math.abs(diffMinutes) >= 60) {
    const value = Math.round(diffMinutes / 60);
    return relativeFormatter.format(value, 'hour');
  }

  return relativeFormatter.format(diffMinutes, 'minute');
}

export default function WebhookDeliveriesTable({ items }: WebhookDeliveriesTableProps) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <p className="text-muted-foreground">Aucun webhook pour ces filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">ID</TableHead>
            <TableHead>Type d'événement</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Tentatives</TableHead>
            <TableHead>Code HTTP</TableHead>
            <TableHead>Erreur</TableHead>
            <TableHead>Créé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-mono text-xs">
                {item.id.slice(0, 10)}…
              </TableCell>
              <TableCell className="font-medium">
                {item.eventType}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)}>
                  {statusLabel(item.status)}
                </Badge>
              </TableCell>
              <TableCell>
                {item.attempts}
              </TableCell>
              <TableCell>
                {item.httpStatusCode ? (
                  <Badge variant={item.httpStatusCode >= 200 && item.httpStatusCode < 300 ? 'success' : 'destructive'}>
                    {item.httpStatusCode}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {item.errorMessage || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatRelative(item.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


