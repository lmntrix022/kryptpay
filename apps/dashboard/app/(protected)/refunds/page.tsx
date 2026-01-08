'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, DollarSign } from 'lucide-react';

import RefundsTable from '../../../components/RefundsTable';
import type { RefundResponse } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { PremiumHero, PremiumCard, PremiumStatCard, PremiumLoader } from '../../../components/premium-ui';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { apiUrl } from '@/lib/api-client';

type Filters = {
  status?: string;
  paymentId?: string;
  limit: number;
};

const initialFilters: Filters = {
  status: '',
  paymentId: '',
  limit: 20,
};

export default function RefundsPage() {
  const { auth } = useAuth();
  const { formatAmount, preferredCurrency, convertAmount } = useCurrency();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [data, setData] = useState<RefundResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.status) search.set('status', filters.status);
    if (filters.paymentId) search.set('paymentId', filters.paymentId);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl(`admin/refunds?${params}`), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (!response.ok) throw new Error('Impossible de récupérer les remboursements');
        const payload = (await response.json()) as RefundResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auth, params]);

  const totalVolumeInPreferred = data
    ? convertAmount(data.totals.volumeMinor, data.items[0]?.currency || 'EUR')
    : 0;

  const formattedTotal = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: preferredCurrency,
    minimumFractionDigits: preferredCurrency === 'XAF' ? 0 : 2,
    maximumFractionDigits: preferredCurrency === 'XAF' ? 0 : 2,
  }).format(totalVolumeInPreferred);

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Remboursements"
        description="Gérez et suivez tous vos remboursements"
        icon={<RotateCcw className="w-7 h-7 text-white" />}
        badge="Gestion financière"
        stats={data ? [
          { value: data.totals.transactions, label: 'Total' },
          { value: Object.keys(data.totals.byStatus).length, label: 'Statuts' },
        ] : undefined}
      />

      {/* Summary Cards */}
      {data && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:grid-cols-5"
        >
          <PremiumStatCard
            title="Volume total"
            value={data.totals.volumeMinor > 0 ? formattedTotal : '—'}
            description={`${new Intl.NumberFormat('fr-FR').format(data.totals.transactions)} remboursement${data.totals.transactions > 1 ? 's' : ''}`}
            icon={<DollarSign className="w-5 h-5" />}
          />
          {Object.entries(data.totals.byStatus).map(([status, stats], index) => (
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (index + 1) * 0.1 }}
            >
              <PremiumStatCard
                title={
                  status === 'PENDING' ? 'En attente' :
                   status === 'PROCESSING' ? 'En cours' :
                   status === 'SUCCEEDED' ? 'Réussis' :
                  status === 'FAILED' ? 'Échoués' : status
                }
                value={formatAmount(stats.volumeMinor, data.items[0]?.currency || 'EUR')}
                description={`${new Intl.NumberFormat('fr-FR').format(stats.count)} remboursement${stats.count > 1 ? 's' : ''}`}
              />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Filters */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="font-semibold">Statut</Label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                <option value="">Tous</option>
                <option value="PENDING">En attente</option>
                <option value="PROCESSING">En cours</option>
                <option value="SUCCEEDED">Réussi</option>
                <option value="FAILED">Échoué</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentId" className="font-semibold">ID Paiement</Label>
              <Input
                id="paymentId"
                type="text"
                className="rounded-xl"
                placeholder="Filtrer par ID paiement"
                value={filters.paymentId}
                onChange={(e) => setFilters({ ...filters, paymentId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="limit" className="font-semibold">Limite</Label>
              <select
                id="limit"
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {[10, 20, 50, 100].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      {/* Table */}
      {loading ? (
        <PremiumLoader message="Chargement des remboursements..." />
      ) : error ? (
        <PremiumCard hoverable={false}>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </PremiumCard>
      ) : data ? (
        <PremiumCard hoverable={false} className="p-0 overflow-hidden">
          <CardHeader className="border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold">Remboursements</CardTitle>
            <p className="text-sm text-zinc-500">
              {data.items.length} remboursement{data.items.length > 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <RefundsTable items={data.items} />
          </CardContent>
        </PremiumCard>
      ) : null}
    </div>
  );
}
