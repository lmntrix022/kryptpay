"use client";

import type { DashboardItem } from '../lib/types';
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
import { cn } from '@/lib/utils';
import { Eye, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';

type TransactionsTableProps = {
  items: DashboardItem[];
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
    case 'AUTHORIZED':
      return 'warning';
    default:
      return 'default';
  }
};

const statusConfig = {
  PENDING: { label: 'En attente', icon: '⏳', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  SUCCEEDED: { label: 'Réussi', icon: '✅', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  FAILED: { label: 'Échoué', icon: '❌', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800' },
  AUTHORIZED: { label: 'Autorisé', icon: '🔒', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
};

const gatewayLabel = (gateway: string) => {
  switch (gateway) {
    case 'STRIPE':
      return 'Stripe';
    case 'MONEROO':
      return 'Moneroo';
    case 'EBILLING':
      return 'eBilling';
    default:
      return gateway;
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

export default function TransactionsTable({ items }: TransactionsTableProps) {
  const { formatAmount } = useCurrency();

  if (!items.length) {
    return (
      <div className="empty-state p-8 text-center">
        <p className="text-muted-foreground">Aucune transaction pour ces filtres.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Desktop Table */}
      <div className="hidden lg:block rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-zinc-50 dark:bg-zinc-800/50">
              <TableHead className="w-[140px] font-semibold">Transaction</TableHead>
              <TableHead className="font-semibold">Réservation</TableHead>
              <TableHead className="font-semibold">Méthode</TableHead>
              <TableHead className="font-semibold">Statut</TableHead>
              <TableHead className="text-right font-semibold">Montant</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="w-[120px] font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => {
              const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.PENDING;
              return (
                <TableRow 
                  key={item.paymentId}
                  className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  <TableCell className="font-mono text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-zinc-900 dark:text-white">
                        {item.paymentId.slice(0, 12)}...
                      </span>
                      {item.subscriptionId && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          Abo: {item.subscriptionId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-900 dark:text-white">{item.orderId}</span>
                      {item.isTestMode && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                          TEST
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                      {gatewayLabel(item.gatewayUsed)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                      status.color
                    )}>
                      <span>{status.icon}</span>
                      {status.label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-zinc-900 dark:text-white">
                    {formatAmount(item.amount, item.currency)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatRelative(item.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                        title="Détails"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                        title="Signaler"
                      >
                        <Flag className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Cards */}
      <div className="lg:hidden space-y-4">
        {items.map((item, index) => {
          const status = statusConfig[item.status as keyof typeof statusConfig] || statusConfig.PENDING;
          return (
            <div
              key={item.paymentId}
              className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm hover:shadow-md transition-all"
              style={{ animationDelay: `${index * 20}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-medium text-zinc-900 dark:text-white truncate">
                      {item.paymentId.slice(0, 16)}...
                    </span>
                    {item.isTestMode && (
                      <Badge variant="outline" className="text-xs shrink-0 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
                        TEST
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate">
                    {item.orderId}
                  </p>
                </div>
                <span className={cn(
                  'inline-flex items-center gap-1 shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ml-2',
                  status.color
                )}>
                  <span>{status.icon}</span>
                  {status.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Méthode</p>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 dark:bg-violet-900/30 px-2.5 py-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                    {gatewayLabel(item.gatewayUsed)}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Date</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">
                    {formatRelative(item.updatedAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Montant</p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-white">
                    {formatAmount(item.amount, item.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 hover:bg-violet-100 dark:hover:bg-violet-900/30"
                  >
                    <Eye className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">Détails</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                  >
                    <Flag className="h-4 w-4 mr-1.5" />
                    <span className="text-xs">Signaler</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
