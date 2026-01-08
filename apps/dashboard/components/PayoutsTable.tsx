"use client";

import type { PayoutItem } from '../lib/types';
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

type PayoutsTableProps = {
  items: PayoutItem[];
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

const payoutTypeLabel = (type: string) => {
  switch (type) {
    case 'REFUND':
      return 'Remboursement';
    case 'CASHBACK':
      return 'Cashback';
    case 'WITHDRAWAL':
      return 'Retrait';
    default:
      return type;
  }
};

const providerLabel = (provider: string) => {
  switch (provider) {
    case 'SHAP':
      return 'SHAP';
    default:
      return provider;
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

export default function PayoutsTable({ items }: PayoutsTableProps) {
  const { formatAmount } = useCurrency();

  if (!items.length) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Aucun paiement sortant trouvé pour ces filtres.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">ID de paiement sortant</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Système</TableHead>
            <TableHead>Bénéficiaire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Référence</TableHead>
            <TableHead>Modifié</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.payoutId}>
              <TableCell className="font-mono text-xs">
                {item.payoutId.slice(0, 10)}…
              </TableCell>
              <TableCell>{payoutTypeLabel(item.payoutType)}</TableCell>
              <TableCell>
                {providerLabel(item.provider)} - {item.paymentSystem}
              </TableCell>
              <TableCell className="font-mono text-sm">{item.msisdn}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(item.status)}>
                  {item.status === 'PENDING' ? 'En attente' :
                   item.status === 'PROCESSING' ? 'En cours' :
                   item.status === 'SUCCEEDED' ? 'Réussi' :
                   item.status === 'FAILED' ? 'Échoué' :
                   item.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatAmount(item.amount, item.currency)}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono text-xs">
                {item.providerReference ? (
                  <span title={item.providerReference}>{item.providerReference.slice(0, 12)}…</span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatRelative(item.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

