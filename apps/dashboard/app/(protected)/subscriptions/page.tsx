'use client';

import { useEffect, useState } from 'react';
import { Repeat, Calendar, Mail, Phone, Pause, Play, X, Plus, Filter, Sparkles } from 'lucide-react';

import type { SubscriptionItem } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import CreateSubscriptionDialog from './CreateSubscriptionDialog';
import {
  PremiumHero,
  PremiumCard,
  PremiumLoader,
  PremiumBadge,
  PremiumTableContainer,
  PremiumEmptyState,
  PremiumButton,
} from '@/components/premium-ui';

const billingCycleLabels: Record<string, string> = {
  DAILY: 'Quotidien',
  WEEKLY: 'Hebdomadaire',
  MONTHLY: 'Mensuel',
  QUARTERLY: 'Trimestriel',
  YEARLY: 'Annuel',
};

const statusLabels: Record<string, string> = {
  ACTIVE: 'Active',
  PAUSED: 'En pause',
  CANCELLED: 'Annulée',
  EXPIRED: 'Expirée',
  TRIALING: 'En période d\'essai',
};

const statusVariant = (status: string): 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'CANCELLED':
    case 'EXPIRED':
      return 'error';
    case 'PAUSED':
    case 'TRIALING':
      return 'warning';
    default:
      return 'default';
  }
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/v1';

export default function SubscriptionsPage() {
  const { auth } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [total, setTotal] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    customerEmail: '',
    limit: 50,
    offset: 0,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    if (!auth || !auth.accessToken) {
      setError('Authentification requise. Veuillez vous reconnecter.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
      };

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customerEmail) params.append('customerEmail', filters.customerEmail);
      if (filters.limit) params.append('limit', String(filters.limit));
      if (filters.offset) params.append('offset', String(filters.offset));

      const url = `${API_BASE_URL}/admin/subscriptions${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors du chargement' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      const data = await res.json();
      setSubscriptions(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement des abonnements');
      console.error('Error fetching subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, [auth, filters.status, filters.customerEmail, filters.limit, filters.offset]);

  const handlePause = async (subscriptionId: string) => {
    if (!auth || !auth.accessToken || actionLoading) return;

    setActionLoading(subscriptionId);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
      };

      const res = await fetch(`${API_BASE_URL}/admin/subscriptions/${subscriptionId}/pause`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de la mise en pause' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la mise en pause');
      console.error('Error pausing subscription:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (subscriptionId: string) => {
    if (!auth || !auth.accessToken || actionLoading) return;

    setActionLoading(subscriptionId);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
      };

      const res = await fetch(`${API_BASE_URL}/admin/subscriptions/${subscriptionId}/resume`, {
        method: 'POST',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de la reprise' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la reprise');
      console.error('Error resuming subscription:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!auth || !auth.accessToken || actionLoading) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler cet abonnement ?')) {
      return;
    }

    setActionLoading(subscriptionId);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
      };

      const res = await fetch(`${API_BASE_URL}/admin/subscriptions/${subscriptionId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de l\'annulation' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de l\'annulation');
      console.error('Error cancelling subscription:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreate = async (formData: {
    customerEmail: string;
    customerPhone?: string;
    amountMinor: number;
    currency: string;
    billingCycle: string;
    isTestMode?: boolean;
  }) => {
    if (!auth || !auth.accessToken || actionLoading) return;

    setActionLoading('create');
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${auth.accessToken}`,
      };

      const res = await fetch(`${API_BASE_URL}/admin/subscriptions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de la création' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      setShowCreateDialog(false);
      await fetchSubscriptions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur lors de la création');
      console.error('Error creating subscription:', err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PremiumHero
          title="Abonnements"
          description="Gérez les paiements récurrents de vos clients"
          icon={<Repeat className="h-7 w-7" />}
          badge="Récurrence"
          badgeIcon={<Sparkles className="h-3 w-3" />}
        />
        <PremiumLoader message="Chargement des abonnements..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Abonnements"
        description="Gérez les paiements récurrents de vos clients"
        icon={<Repeat className="h-7 w-7" />}
        badge="Récurrence"
        badgeIcon={<Sparkles className="h-3 w-3" />}
        stats={[
          { value: total, label: 'Total' },
          { value: subscriptions.filter(s => s.status === 'ACTIVE').length, label: 'Actifs' },
        ]}
        actions={
          <PremiumButton onClick={() => setShowCreateDialog(true)} icon={<Plus className="w-4 h-4" />}>
          Créer un abonnement
          </PremiumButton>
        }
      />

      {/* Filters */}
      <PremiumCard>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
            <Label htmlFor="status-filter" className="text-zinc-700 dark:text-zinc-300 mb-2 block">Statut</Label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value, offset: 0 })}
              className="flex h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
              >
                <option value="">Tous les statuts</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">En pause</option>
                <option value="CANCELLED">Annulée</option>
                <option value="EXPIRED">Expirée</option>
              </select>
            </div>
            <div>
            <Label htmlFor="email-filter" className="text-zinc-700 dark:text-zinc-300 mb-2 block">Email client</Label>
                <Input
                  id="email-filter"
                  type="email"
                  placeholder="Rechercher par email..."
                  value={filters.customerEmail}
                  onChange={(e) => setFilters({ ...filters, customerEmail: e.target.value, offset: 0 })}
              className="rounded-xl"
                />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ status: '', customerEmail: '', limit: 50, offset: 0 })}
              className="rounded-xl"
              >
                <Filter className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </div>
      </PremiumCard>

      {/* Error Message */}
      {error && (
        <PremiumCard className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </PremiumCard>
      )}

      {/* Subscriptions Table */}
      {subscriptions.length === 0 && !error ? (
        <PremiumCard>
          <PremiumEmptyState
            icon={<Repeat className="w-8 h-8" />}
            title="Aucun abonnement"
            description="Créez votre premier abonnement pour commencer à gérer les paiements récurrents"
            action={
              <PremiumButton onClick={() => setShowCreateDialog(true)} icon={<Plus className="w-4 h-4" />}>
                Créer votre premier abonnement
              </PremiumButton>
            }
          />
        </PremiumCard>
      ) : subscriptions.length > 0 ? (
        <PremiumTableContainer
          title="Abonnements"
          description={`${total} abonnement${total > 1 ? 's' : ''} au total`}
        >
              <Table>
                <TableHeader>
              <TableRow className="border-zinc-200 dark:border-zinc-700">
                <TableHead className="text-zinc-600 dark:text-zinc-400">Client</TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">Montant</TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">Cycle</TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">Statut</TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">Prochaine facturation</TableHead>
                <TableHead className="text-zinc-600 dark:text-zinc-400">Dernière facturation</TableHead>
                <TableHead className="text-right text-zinc-600 dark:text-zinc-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                <TableRow key={sub.subscriptionId} className="border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-violet-600">
                          <Mail className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-white">{sub.customerEmail}</span>
                            {sub.isTestMode && (
                          <PremiumBadge variant="warning">TEST</PremiumBadge>
                            )}
                          </div>
                          {sub.customerPhone && (
                        <div className="flex items-center gap-2 text-sm text-zinc-500 mt-1 ml-10">
                              <Phone className="w-3 h-3" />
                              {sub.customerPhone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                  <TableCell className="font-semibold text-zinc-900 dark:text-white">
                        {formatAmount(sub.amountMinor, sub.currency)}
                      </TableCell>
                  <TableCell>
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {billingCycleLabels[sub.billingCycle] || sub.billingCycle}
                    </span>
                  </TableCell>
                      <TableCell>
                    <PremiumBadge variant={statusVariant(sub.status)}>
                          {statusLabels[sub.status] || sub.status}
                    </PremiumBadge>
                      </TableCell>
                      <TableCell>
                    <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                      <Calendar className="w-4 h-4" />
                          <span className="text-sm">
                            {new Date(sub.nextBillingDate).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.lastBillingDate ? (
                      <span className="text-sm text-zinc-500">
                            {new Date(sub.lastBillingDate).toLocaleDateString('fr-FR')}
                          </span>
                        ) : (
                      <span className="text-sm text-zinc-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {sub.status === 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePause(sub.subscriptionId)}
                              disabled={actionLoading === sub.subscriptionId}
                          className="rounded-lg hover:bg-amber-50 hover:border-amber-200 hover:text-amber-600"
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          {sub.status === 'PAUSED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResume(sub.subscriptionId)}
                              disabled={actionLoading === sub.subscriptionId}
                          className="rounded-lg hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          {sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancel(sub.subscriptionId)}
                              disabled={actionLoading === sub.subscriptionId}
                          className="rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
        </PremiumTableContainer>
      ) : null}

      {/* Create Subscription Dialog */}
      <CreateSubscriptionDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreate}
        loading={actionLoading === 'create'}
      />
    </div>
  );
}
