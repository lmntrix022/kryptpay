'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, Calendar } from 'lucide-react';

import type { CombinedAnalytics, PaymentAnalytics } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { PremiumHero, PremiumCard, PremiumStatCard, PremiumLoader, PremiumBadge } from '../../../components/premium-ui';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function AnalyticsPage() {
  const { auth } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CombinedAnalytics | null>(null);
  const [view, setView] = useState<'combined' | 'payments' | 'payouts'>('combined');
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    isTestMode: '',
  });

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.startDate) search.set('startDate', filters.startDate);
    if (filters.endDate) search.set('endDate', filters.endDate);
    if (filters.isTestMode) search.set('isTestMode', filters.isTestMode);
    return search.toString();
  }, [filters]);

  useEffect(() => {
    if (!auth) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);

      try {
        const endpoint = view === 'combined' 
          ? `/admin/analytics/combined?${params}`
          : `/admin/analytics/${view}?${params}`;

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`,
          {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          },
        );

        if (!response.ok) throw new Error('Erreur lors du chargement des analytics');

        if (view === 'combined') {
          const data = await response.json();
          setAnalytics(data);
        } else {
          const data = await response.json();
          setAnalytics({
            payments: view === 'payments' ? data : analytics?.payments || {} as PaymentAnalytics,
            payouts: view === 'payouts' ? data : analytics?.payouts || {} as any,
            period: {
              start: filters.startDate,
              end: filters.endDate,
            },
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [auth, params, view]);

  const handleExport = async (format: 'csv' | 'pdf') => {
    if (!auth) return;

    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/analytics/payments/export/${format}?${params}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (!response.ok) throw new Error('Erreur lors de l\'export');

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'export');
    }
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-8">
        <PremiumHero
          title="Analytics"
          description="Analysez vos performances de paiements et de versements"
          icon={<BarChart3 className="w-7 h-7 text-white" />}
          badge="Tableau de bord"
        />
        <PremiumLoader message="Chargement des analytics..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PremiumHero
          title="Analytics"
          description="Analysez vos performances de paiements et de versements"
          icon={<BarChart3 className="w-7 h-7 text-white" />}
        />
        <PremiumCard>
        <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
        </CardContent>
        </PremiumCard>
      </div>
    );
  }

  const payments = analytics?.payments;
  const payouts = analytics?.payouts;

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Analytics"
        description="Analysez vos performances de paiements et de versements"
        icon={<BarChart3 className="w-7 h-7 text-white" />}
        badge="Tableau de bord"
        actions={
        <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => handleExport('csv')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            >
            <Download className="w-4 h-4 mr-2" />
              CSV
          </Button>
            <Button 
              variant="outline" 
              onClick={() => handleExport('pdf')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            >
            <Download className="w-4 h-4 mr-2" />
              PDF
          </Button>
        </div>
        }
      />

      {/* Filters */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
              <Calendar className="w-5 h-5" />
            </div>
          <CardTitle>Filtres</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="view" className="font-semibold">Vue</Label>
              <select
                id="view"
                value={view}
                onChange={(e) => setView(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="combined">Combiné</option>
                <option value="payments">Paiements</option>
                <option value="payouts">Versements</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate" className="font-semibold">Date de début</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="font-semibold">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="isTestMode" className="font-semibold">Mode</Label>
              <select
                id="isTestMode"
                value={filters.isTestMode}
                onChange={(e) => setFilters({ ...filters, isTestMode: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">Tous</option>
                <option value="false">Production</option>
                <option value="true">Test</option>
              </select>
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      {/* Payment Analytics */}
      {payments && (
        <motion.div
          key="stats"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        >
          <PremiumStatCard
            title="Volume total"
            value={formatAmount(payments.total.volumeMinor, 'XAF')}
            description={`${new Intl.NumberFormat('fr-FR').format(payments.total.count)} transactions`}
            icon={<DollarSign className="w-5 h-5" />}
          />

          <PremiumStatCard
            title="Taux de conversion"
            value={`${Math.round(payments.conversionRate * 100)}%`}
            description={`${payments.total.succeeded} réussies sur ${payments.total.count}`}
            icon={<TrendingUp className="w-5 h-5" />}
            trend={{ value: payments.conversionRate * 100, positive: payments.conversionRate >= 0.5 }}
          />

          <PremiumStatCard
            title="Montant moyen"
            value={formatAmount(payments.averageAmount, 'XAF')}
            description="Par transaction"
            icon={<CreditCard className="w-5 h-5" />}
          />

          <PremiumStatCard
            title="Échecs"
            value={payments.total.failed.toString()}
            description={`${payments.total.failed > 0 ? Math.round((payments.total.failed / payments.total.count) * 100) : 0}% du total`}
            icon={<TrendingDown className="w-5 h-5" />}
          />
        </motion.div>
      )}

      {/* Gateway Breakdown */}
      {payments && (
        <motion.div
          key="breakdown"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid gap-6 md:grid-cols-2"
        >
          <PremiumCard hoverable={false}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Par passerelle</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(payments.byGateway).map(([gateway, data], index) => (
                  <motion.div 
                    key={`gateway-${gateway}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <div className="flex items-center gap-3">
                      <PremiumBadge variant="violet">{gateway}</PremiumBadge>
                      <span className="text-sm text-zinc-500">
                        {data.count} transactions
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatAmount(data.volumeMinor, 'XAF')}</div>
                      <div className="text-xs text-zinc-500">
                        {data.count > 0 ? Math.round((data.succeeded / data.count) * 100) : 0}% réussies
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </PremiumCard>

          <PremiumCard hoverable={false}>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Par statut</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(payments.byStatus).map(([status, data], index) => (
                  <motion.div 
                    key={`status-${status}-${index}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                  >
                    <PremiumBadge variant={
                      status === 'SUCCEEDED' ? 'success' :
                      status === 'FAILED' ? 'error' :
                      status === 'PENDING' ? 'warning' : 'default'
                    }>
                      {status}
                    </PremiumBadge>
                    <div className="text-right">
                      <div className="font-semibold">{formatAmount(data.volumeMinor, 'XAF')}</div>
                      <div className="text-xs text-zinc-500">
                        {data.count} transactions
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Trends Chart */}
      {payments && payments.trends && payments.trends.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
              <CardTitle className="text-lg font-bold">Tendances quotidiennes</CardTitle>
            <CardDescription>Évolution du volume et des transactions</CardDescription>
          </CardHeader>
          <CardContent>
              <div className="space-y-3">
                {payments.trends.slice(-7).map((trend, index) => {
                const maxVolume = Math.max(...payments.trends.map(t => t.volumeMinor));
                const percentage = maxVolume > 0 ? (trend.volumeMinor / maxVolume) * 100 : 0;
                
                return (
                    <motion.div 
                      key={`trend-${trend.date}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4"
                    >
                      <div className="w-24 text-sm text-zinc-500 font-medium">
                      {new Date(trend.date).toLocaleDateString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex-1">
                        <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-lg relative overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                            className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="w-32 text-right text-sm">
                        <div className="font-semibold">{formatAmount(trend.volumeMinor, 'XAF')}</div>
                        <div className="text-xs text-zinc-500">{trend.count} tx</div>
                    </div>
                    </motion.div>
                );
              })}
            </div>
          </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Payout Analytics */}
      {payouts && view !== 'payments' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white">
                  <Wallet className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg font-bold">Analytics des versements</CardTitle>
              </div>
          </CardHeader>
          <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="text-sm text-zinc-500 font-medium">Volume total</div>
                <div className="text-2xl font-bold mt-1">
                  {formatAmount(payouts.total.volumeMinor, 'XAF')}
                </div>
                  <div className="text-xs text-zinc-500 mt-1">
                  {payouts.total.count} versements
                </div>
              </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="text-sm text-zinc-500 font-medium">Taux de réussite</div>
                <div className="text-2xl font-bold mt-1">
                  {Math.round(payouts.successRate * 100)}%
                </div>
                  <div className="text-xs text-zinc-500 mt-1">
                  {payouts.total.succeeded} réussis
                </div>
              </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div className="text-sm text-zinc-500 font-medium">Montant moyen</div>
                <div className="text-2xl font-bold mt-1">
                  {formatAmount(payouts.averageAmount, 'XAF')}
                </div>
              </div>
            </div>
          </CardContent>
          </PremiumCard>
        </motion.div>
      )}
    </div>
  );
}
