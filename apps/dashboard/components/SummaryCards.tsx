"use client";

import type { DashboardTotals } from '../lib/types';
import { useCurrency } from '../context/CurrencyContext';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, CreditCard, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

type SummaryCardsProps = {
  totals: DashboardTotals;
};

const numberFormatter = new Intl.NumberFormat('fr-FR');

export default function SummaryCards({ totals }: SummaryCardsProps) {
  const { formatAmount, preferredCurrency, convertAmount } = useCurrency();

  const stripeStats = totals.byGateway['STRIPE'];
  const monerooStats = totals.byGateway['MONEROO'];
  const ebillingStats = totals.byGateway['EBILLING'];

  const succeeded = totals.byStatus['SUCCEEDED']?.count ?? 0;
  const failed = totals.byStatus['FAILED']?.count ?? 0;
  const pending = totals.byStatus['PENDING']?.count ?? 0;
  const successRate = totals.transactions
    ? Math.round((succeeded / totals.transactions) * 100)
    : 0;

  // Calculer le volume total en convertissant chaque gateway vers la devise préférée
  let totalVolumeInPreferred = 0;
  
  if (stripeStats) {
    totalVolumeInPreferred += convertAmount(stripeStats.volumeMinor, 'EUR');
  }
  if (ebillingStats) {
    totalVolumeInPreferred += convertAmount(ebillingStats.volumeMinor, 'XAF');
  }
  if (monerooStats) {
    totalVolumeInPreferred += convertAmount(monerooStats.volumeMinor, 'USD');
  }

  // Formater le volume total dans la devise préférée
  const locale = preferredCurrency === 'USD' ? 'en-US' : 'fr-FR';
  const formattedTotal = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: preferredCurrency,
    minimumFractionDigits: preferredCurrency === 'XAF' ? 0 : 2,
    maximumFractionDigits: preferredCurrency === 'XAF' ? 0 : 2,
  }).format(totalVolumeInPreferred);

  const cards = [
    {
      title: 'TOTAL COLLECTÉ',
      value: formattedTotal,
      description: `${numberFormatter.format(totals.transactions)} transaction${totals.transactions > 1 ? 's' : ''}`,
      icon: TrendingUp,
      gradient: 'from-blue-500 to-violet-500',
      borderColor: 'border-blue-500/20',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'TOTAL TRANSACTIONS',
      value: numberFormatter.format(totals.transactions),
      description: 'Toutes transactions confondues',
      icon: CreditCard,
      gradient: 'from-violet-400 to-violet-600',
      borderColor: 'border-violet-500/20',
      bgColor: 'bg-violet-50 dark:bg-violet-950/20',
      iconColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      title: 'COMPLÉTÉES',
      value: numberFormatter.format(succeeded),
      description: `${successRate}% de taux de succès`,
      icon: CheckCircle2,
      gradient: 'from-emerald-500 to-green-500',
      borderColor: 'border-emerald-500/20',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      title: 'EN ATTENTE',
      value: numberFormatter.format(pending),
      description: 'Transactions en cours',
      icon: Zap,
      gradient: 'from-amber-500 to-orange-500',
      borderColor: 'border-amber-500/20',
      bgColor: 'bg-amber-50 dark:bg-amber-950/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      title: 'SIGNALÉES',
      value: numberFormatter.format(failed),
      description: 'Transactions échouées',
      icon: XCircle,
      gradient: 'from-red-500 to-rose-500',
      borderColor: 'border-red-500/20',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.title}
            className={cn(
              'group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1',
              card.borderColor,
              card.bgColor
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            {/* Gradient overlay on hover */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-10',
                card.gradient
              )}
            />
            
            {/* Left border accent */}
            <div
              className={cn(
                'absolute left-0 top-0 h-full w-1 bg-gradient-to-b transition-all duration-300 group-hover:w-1.5',
                card.gradient
              )}
            />

            <CardContent className="relative p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110',
                        card.bgColor
                      )}
                    >
                      <Icon className={cn('h-5 w-5', card.iconColor)} />
                    </div>
                    <p className="text-xs font-medium uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      {card.title}
                    </p>
                  </div>
                  
                  <div className="mb-1">
                    <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
                      {card.value}
                    </p>
                  </div>
                  
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {card.description}
                  </p>
                </div>
              </div>

              {/* Shine effect */}
              <div className="absolute -inset-x-4 -inset-y-4 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                <div
                  className={cn(
                    'absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent blur-xl',
                    card.gradient
                  )}
                  style={{
                    transform: 'translateX(-100%)',
                    animation: 'shimmer 2s infinite',
                  }}
                />
              </div>
            </CardContent>

            <style jsx>{`
              @keyframes shimmer {
                0% {
                  transform: translateX(-100%);
                }
                100% {
                  transform: translateX(200%);
                }
              }
            `}</style>
          </Card>
        );
      })}
    </div>
  );
}
