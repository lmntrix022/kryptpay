"use client";

import type { RefundItem } from '../lib/types';
import { useCurrency } from '../context/CurrencyContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

type RefundsTableProps = {
  items: RefundItem[];
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

export default function RefundsTable({ items }: RefundsTableProps) {
  const { formatAmount } = useCurrency();

  if (!items.length) {
    return (
      <div className="empty-state">
        <p className="text-muted-foreground">Aucun remboursement pour ces filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">ID remboursement</TableHead>
            <TableHead className="w-[120px]">ID paiement</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Raison</TableHead>
            <TableHead>Créé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.refundId}>
              <TableCell className="font-mono text-xs">
                {item.refundId.slice(0, 10)}…
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.paymentId.slice(0, 10)}…
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)}>
                  {statusLabel(item.status)}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(item.amountMinor, item.currency)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                {item.reason || '—'}
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


