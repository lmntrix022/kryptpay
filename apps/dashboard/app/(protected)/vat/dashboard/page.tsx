'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, FileText, Calendar, Receipt, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { useCurrency } from '../../../../context/CurrencyContext';
import { apiUrl } from '../../../../lib/api-client';
import { PremiumHero, PremiumStatCard, PremiumCard, PremiumTableContainer, PremiumLoader } from '@/components/premium-ui';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface VatStats {
  totalVatCollected: number;
  totalVatToReverse: number;
  totalVatReversed: number;
  transactionCount: number;
}

interface VatTransaction {
  id: string;
  paymentId: string;
  amountGross: number;
  amountNet: number;
  vatAmount: number;
  currency: string;
  buyerCountry?: string;
  sellerCountry?: string;
  createdAt: string;
  payment?: {
    orderId: string;
    status: string;
  };
  vatRate?: {
    rate: number;
  };
}

export default function VatDashboardPage() {
  const { auth, isLoading } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<VatStats>({
    totalVatCollected: 0,
    totalVatToReverse: 0,
    totalVatReversed: 0,
    transactionCount: 0,
  });
  const [transactions, setTransactions] = useState<VatTransaction[]>([]);

  const merchantId = auth?.user?.merchantId || auth?.user?.id;

  useEffect(() => {
    if (merchantId && auth?.accessToken) {
      loadData();
    }
  }, [merchantId, auth?.accessToken]);

  const loadData = async () => {
    if (!auth?.accessToken) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const transactionsResponse = await fetch(`${apiUrl('vat/transactions')}`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        
        const transactionsList = Array.isArray(transactionsData) ? transactionsData : [];
        setTransactions(transactionsList.slice(0, 10));

        const totalVat = transactionsList.reduce((sum: number, t: VatTransaction) => {
          const vatAmount = typeof t.vatAmount === 'bigint' ? Number(t.vatAmount) : t.vatAmount;
          return sum + vatAmount;
        }, 0);
        
        setStats({
          totalVatCollected: totalVat,
          totalVatToReverse: totalVat,
          totalVatReversed: 0,
          transactionCount: transactionsList.length,
        });
      } else {
        if (transactionsResponse.status !== 404) {
          const errorText = await transactionsResponse.text();
          setError('Erreur lors du chargement des données TVA');
        }
      }
    } catch (error) {
      console.error('Error loading VAT data:', error);
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !auth) {
    return <PremiumLoader message={isLoading ? 'Chargement...' : 'Veuillez vous connecter'} />;
  }

  if (loading) {
    return <PremiumLoader message="Chargement des données TVA..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Dashboard"
        highlight="TVA"
        description="Vue d'ensemble de la TVA collectée, à reverser et reversée"
        icon={<Receipt className="w-7 h-7 text-white" />}
        badge="Gestion TVA"
        badgeIcon={<FileText className="w-3.5 h-3.5 text-violet-400" />}
        stats={[
          { value: stats.transactionCount, label: 'Transactions' },
          { value: formatAmount(stats.totalVatCollected, 'XAF'), label: 'TVA collectée' },
        ]}
      />

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4 text-red-800 dark:text-red-400"
        >
          <p>{error}</p>
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PremiumStatCard
          icon={<DollarSign className="w-5 h-5" />}
          title="TVA Collectée"
          value={formatAmount(stats.totalVatCollected, 'XAF')}
          description="Ce mois"
          gradient="from-emerald-500 to-teal-600"
        />
        <PremiumStatCard
          icon={<TrendingUp className="w-5 h-5" />}
          title="TVA à Reverser"
          value={formatAmount(stats.totalVatToReverse, 'XAF')}
          description="En attente"
          gradient="from-amber-500 to-orange-600"
        />
        <PremiumStatCard
          icon={<FileText className="w-5 h-5" />}
          title="TVA Reversée"
          value={formatAmount(stats.totalVatReversed, 'XAF')}
          description="Année en cours"
          gradient="from-blue-500 to-indigo-600"
        />
        <PremiumStatCard
          icon={<Calendar className="w-5 h-5" />}
          title="Transactions"
          value={stats.transactionCount}
          description="Avec TVA calculée"
        />
      </div>

      {/* Transactions récentes */}
      <PremiumTableContainer
        title="Transactions récentes avec TVA"
        description="Dernières transactions avec calcul TVA automatique"
        actions={
          <Button variant="outline" size="sm">
            Voir tout
          </Button>
        }
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
              <th className="text-left p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Date</th>
              <th className="text-left p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Order ID</th>
              <th className="text-left p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Pays</th>
              <th className="text-right p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">HT</th>
              <th className="text-right p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">TVA</th>
              <th className="text-right p-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">TTC</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <FileText className="h-8 w-8 text-zinc-400" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">Aucune transaction avec TVA</p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                        Les transactions avec TVA calculée apparaîtront ici après activation de la TVA dans les paramètres.
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx, idx) => {
                const amountNet = typeof tx.amountNet === 'bigint' ? Number(tx.amountNet) : tx.amountNet;
                const vatAmount = typeof tx.vatAmount === 'bigint' ? Number(tx.vatAmount) : tx.vatAmount;
                const amountGross = typeof tx.amountGross === 'bigint' ? Number(tx.amountGross) : tx.amountGross;
                const rate = tx.vatRate ? (typeof tx.vatRate.rate === 'number' ? tx.vatRate.rate : Number(tx.vatRate.rate)) : 0;
                
                return (
                  <motion.tr
                    key={tx.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="p-4">
                      <code className="text-xs font-mono bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {tx.payment?.orderId || tx.paymentId?.slice(0, 8) || tx.id.slice(0, 8)}
                      </code>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {tx.buyerCountry || tx.sellerCountry || '-'}
                        </Badge>
                        {rate > 0 && (
                          <span className="text-xs text-zinc-500">({(rate * 100).toFixed(0)}%)</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm font-medium text-zinc-900 dark:text-white">
                      {formatAmount(amountNet, tx.currency || 'XAF')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-sm font-semibold text-violet-600 dark:text-violet-400">
                          {formatAmount(vatAmount, tx.currency || 'XAF')}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-zinc-900 dark:text-white">
                      {formatAmount(amountGross, tx.currency || 'XAF')}
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </PremiumTableContainer>
    </div>
  );
}
