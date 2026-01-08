'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Plus, TrendingUp, CheckCircle2, Clock, XCircle } from 'lucide-react';

import CreatePayoutForm from '../../../components/CreatePayoutForm';
import PayoutsTable from '../../../components/PayoutsTable';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumStatCard, PremiumTableContainer, PremiumEmptyState } from '../../../components/premium-ui';
import type { CreatePayoutDto, PayoutResponse, PayoutTotals } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiUrl } from '../../../lib/api-client';

type Filters = {
  status?: string;
  provider?: string;
  limit: number;
};

const initialFilters: Filters = {
  status: '',
  provider: '',
  limit: 20,
};

export default function PayoutsPage() {
  const { auth } = useAuth();
  const { formatAmount, preferredCurrency, convertAmount } = useCurrency();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [data, setData] = useState<PayoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.status) search.set('status', filters.status);
    if (filters.provider) search.set('provider', filters.provider);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  useEffect(() => {
    const fetchPayouts = async () => {
      if (!auth) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl(`admin/payouts?${params}`), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Session expirée. Veuillez vous reconnecter.');
          }
          throw new Error(`Erreur ${response.status} : Impossible de récupérer les paiements sortants`);
        }

        const payload = (await response.json()) as PayoutResponse;
        setData({
          ...payload,
          payouts: payload.payouts || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setLoading(false);
      }
    };

    fetchPayouts();
  }, [auth, params]);

  const handleCreatePayout = async (dto: CreatePayoutDto) => {
    if (!auth) throw new Error('Non authentifié');

    try {
      const response = await fetch(apiUrl('admin/payouts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(dto),
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setShowCreateForm(false);
      
      const refreshResponse = await fetch(apiUrl(`admin/payouts?${params}`), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (refreshResponse.ok) {
        const refreshData = (await refreshResponse.json()) as PayoutResponse;
        setData({
          ...refreshData,
          payouts: refreshData.payouts || [],
        });
      }

      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Échec de la création du paiement sortant');
    }
  };

  const totals = data?.totals;
  const succeeded = totals?.byStatus['SUCCEEDED']?.count ?? 0;
  const failed = totals?.byStatus['FAILED']?.count ?? 0;
  const processing = totals?.byStatus['PROCESSING']?.count ?? 0;
  const pending = totals?.byStatus['PENDING']?.count ?? 0;
  const successRate = totals?.count ? Math.round((succeeded / totals.count) * 100) : 0;

  const totalVolumeInPreferred = totals ? convertAmount(totals.volumeMinor, 'XAF') : 0;
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
        title="Paiements"
        highlight="sortants"
        description="Gérez et suivez vos transactions de paiements sortants vers Mobile Money"
        badge="Mobile Money"
        badgeIcon={<Wallet className="w-3.5 h-3.5 text-violet-400" />}
        stats={totals ? [
          { value: totals.count, label: 'Total' },
          { value: `${successRate}%`, label: 'Taux de réussite' },
        ] : undefined}
        actions={
          <Button 
            onClick={() => setShowCreateForm(true)}
            className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-sm border border-white/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un paiement
          </Button>
        }
      />

      {/* Stats Cards */}
      {totals && (
        <div className="grid gap-4 md:grid-cols-4">
          <PremiumStatCard
            icon={<Wallet className="w-5 h-5" />}
            title="Volume total"
            value={formattedTotal}
            description={`${totals.count} paiement${totals.count > 1 ? 's' : ''} sortant${totals.count > 1 ? 's' : ''}`}
          />
          <PremiumStatCard
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="Réussis"
            value={succeeded}
            description={`${failed} échoué${failed > 1 ? 's' : ''}`}
          />
          <PremiumStatCard
            icon={<Clock className="w-5 h-5" />}
            title="En cours"
            value={processing + pending}
            description={`${processing} en traitement`}
          />
          <PremiumStatCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Taux de réussite"
            value={`${successRate}%`}
          />
        </div>
      )}

      {/* Filters */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="status" className="text-sm font-medium mb-2 block">Statut</Label>
              <Select
                id="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="h-11 rounded-xl"
              >
                <option value="">Toutes</option>
                <option value="PENDING">En attente</option>
                <option value="PROCESSING">En cours</option>
                <option value="SUCCEEDED">Réussi</option>
                <option value="FAILED">Échoué</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="provider" className="text-sm font-medium mb-2 block">Fournisseur</Label>
              <Select
                id="provider"
                value={filters.provider}
                onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
                className="h-11 rounded-xl"
              >
                <option value="">Tous</option>
                <option value="SHAP">SHAP</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit" className="text-sm font-medium mb-2 block">Limite</Label>
              <Input
                id="limit"
                type="number"
                min={1}
                max={100}
                value={filters.limit}
                onChange={(e) => setFilters({ ...filters, limit: parseInt(e.target.value, 10) || 20 })}
                className="h-11 rounded-xl"
              />
            </div>
          </div>
        </CardContent>
      </PremiumCard>

      {/* Payouts Table */}
      {loading ? (
        <PremiumLoader message="Chargement des paiements sortants..." />
      ) : error ? (
        <PremiumCard hoverable={false}>
          <CardContent className="pt-6">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              {error}
            </div>
          </CardContent>
        </PremiumCard>
      ) : data && data.payouts && data.payouts.length > 0 ? (
        <PremiumTableContainer>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-1">Paiements sortants récents</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
              {data.payouts.length} paiement{data.payouts.length > 1 ? 's' : ''} sortant{data.payouts.length > 1 ? 's' : ''}
            </p>
            <PayoutsTable items={data.payouts} />
          </div>
        </PremiumTableContainer>
      ) : (
        <PremiumEmptyState
          icon={<Wallet className="w-10 h-10" />}
          title="Aucun paiement sortant"
          description="Créez votre premier paiement sortant pour envoyer des fonds via Mobile Money"
          action={
            <Button 
              onClick={() => setShowCreateForm(true)}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Créer un paiement sortant
            </Button>
          }
        />
      )}

      {/* Create Payout Dialog */}
      <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Créer un paiement sortant</DialogTitle>
          </DialogHeader>
          <CreatePayoutForm
            onSubmit={handleCreatePayout}
            onSuccess={() => setShowCreateForm(false)}
            onCancel={() => setShowCreateForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
