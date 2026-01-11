'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  CreditCard, 
  Wallet, 
  Settings, 
  ExternalLink, 
  Check, 
  X,
  TrendingUp,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';

import SummaryCards from '../../../components/SummaryCards';
import TransactionsTable from '../../../components/TransactionsTable';
import PayoutsTable from '../../../components/PayoutsTable';
import CreatePayoutForm from '../../../components/CreatePayoutForm';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumTableContainer } from '../../../components/premium-ui';
import type { DashboardResponse, PayoutResponse, CreatePayoutDto } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type Filters = {
  gateway?: string;
  status?: string;
  limit: number;
};

type PayoutFilters = {
  status?: string;
  provider?: string;
  limit: number;
};

type ConnectStatus = {
  connected: boolean;
  accountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  detailsSubmitted?: boolean;
};

type Tab = 'overview' | 'transactions' | 'payouts';

const initialFilters: Filters = {
  gateway: '',
  status: '',
  limit: 20,
};

const initialPayoutFilters: PayoutFilters = {
  status: '',
  provider: '',
  limit: 20,
};

export default function MerchantDashboardPage() {
  const { auth } = useAuth();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [payoutFilters, setPayoutFilters] = useState<PayoutFilters>(initialPayoutFilters);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [payoutsData, setPayoutsData] = useState<PayoutResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [showCreatePayoutForm, setShowCreatePayoutForm] = useState(false);
  const isConnected = connectStatus?.connected ?? false;

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.gateway) search.set('gateway', filters.gateway);
    if (filters.status) search.set('status', filters.status);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  const payoutsParams = useMemo(() => {
    const search = new URLSearchParams();
    if (payoutFilters.status) search.set('status', payoutFilters.status);
    if (payoutFilters.provider) search.set('provider', payoutFilters.provider);
    search.set('limit', String(payoutFilters.limit));
    return search.toString();
  }, [payoutFilters]);

  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'transactions') {
      const fetchData = async () => {
        if (!auth) return;
        setLoading(true);
        setError(null);

        try {
          const response = await fetch(apiUrl(`admin/transactions?${params}`), {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });

          if (!response.ok) throw new Error('Impossible de récupérer les transactions');
          const payload = (await response.json()) as DashboardResponse;
          setData(payload);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur inattendue');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [auth, params, activeTab]);

  useEffect(() => {
    if (activeTab === 'payouts' || activeTab === 'overview') {
      const fetchPayouts = async () => {
        if (!auth) return;
        setPayoutsLoading(true);
        setPayoutsError(null);

        try {
          const response = await fetch(apiUrl(`admin/payouts?${payoutsParams}`), {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });

          if (!response.ok) throw new Error('Impossible de récupérer les paiements sortants');
          const payload = (await response.json()) as PayoutResponse;
          setPayoutsData(payload);
        } catch (err) {
          setPayoutsError(err instanceof Error ? err.message : 'Unexpected error');
        } finally {
          setPayoutsLoading(false);
        }
      };
      fetchPayouts();
    }
  }, [auth, payoutsParams, activeTab]);

  useEffect(() => {
    const fetchStatus = async () => {
      if (!auth) return;
      setConnectLoading(true);
      setConnectError(null);

      try {
        const response = await fetch(apiUrl('providers/stripe/connect/status'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (!response.ok) throw new Error('Impossible de récupérer le statut Stripe Connect');
        const payload = (await response.json()) as ConnectStatus;
        setConnectStatus(payload);
      } catch (err) {
        setConnectError(err instanceof Error ? err.message : 'Unexpected error');
      } finally {
        setConnectLoading(false);
      }
    };
    fetchStatus();
  }, [auth]);

  const handleConnect = async () => {
    if (!auth) return;
    setConnectLoading(true);
    setConnectError(null);

    try {
      const body: { merchantId?: string } = {};
      // Include merchantId if available (for ADMIN users who have a merchantId)
      if (auth.user.merchantId) {
        body.merchantId = auth.user.merchantId;
      }

      const response = await fetch(apiUrl('providers/stripe/connect/link'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || 'Impossible de générer le lien d\'onboarding';
        throw new Error(errorMessage);
      }
      const payload = (await response.json()) as { url: string };
      window.open(payload.url, '_blank');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setConnectLoading(false);
    }
  };

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const result = await response.json();
      setShowCreatePayoutForm(false);
      
      if (activeTab === 'payouts' || activeTab === 'overview') {
        const refreshResponse = await fetch(apiUrl(`admin/payouts?${payoutsParams}`), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (refreshResponse.ok) {
          const refreshData = (await refreshResponse.json()) as PayoutResponse;
          setPayoutsData(refreshData);
        }
      }

      return result;
    } catch (error) {
      throw error instanceof Error ? error : new Error('Échec de la création du paiement sortant');
    }
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'transactions' as Tab, label: 'Transactions', icon: CreditCard },
    { id: 'payouts' as Tab, label: 'Paiements sortants', icon: Wallet },
  ];

  const transactionCount = data?.items?.length || 0;
  const payoutCount = payoutsData?.payouts?.length || 0;

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Tableau de bord"
        highlight="Marchand"
        description="Surveillez vos transactions, paiements et paiements sortants en temps réel"
        badge="Temps réel"
        badgeIcon={<TrendingUp className="w-3.5 h-3.5 text-cyan-400" />}
        stats={[
          { value: transactionCount, label: 'Transactions' },
          { value: payoutCount, label: 'Paiements sortants' },
        ]}
        actions={activeTab === 'payouts' ? (
          <Button 
            onClick={() => setShowCreatePayoutForm(true)}
            className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold backdrop-blur-sm border border-white/10"
          >
            Créer un paiement sortant
          </Button>
        ) : null}
      />

      {/* Premium Tabs */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-1 p-1.5 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative flex items-center gap-2 px-5 py-3 text-sm font-medium rounded-xl transition-all duration-300',
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTabBg"
                  className="absolute inset-0 bg-gradient-to-r from-violet-500 to-violet-600 rounded-xl shadow-lg"
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              <Icon className="relative z-10 w-4 h-4" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Stripe Connect Status */}
            <PremiumCard hoverable={false}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Stripe Connect</CardTitle>
                      <CardDescription>
                        {isConnected
                          ? 'Votre compte est actif : les paiements par carte et les paiements sortants sont opérationnels.'
                          : 'Complétez l\'onboarding Stripe Express pour activer les paiements.'}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    className={cn(
                      "h-11 px-6 rounded-xl font-semibold transition-all",
                      isConnected 
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        : "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
                    )}
                  >
                    {connectLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                        Chargement...
                      </>
                    ) : isConnected ? (
                      <>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Ouvrir Stripe
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4 mr-2" />
                        Commencer
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              {connectError && (
                <CardContent>
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                    {connectError}
                  </div>
                </CardContent>
              )}
              {connectStatus && (
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Compte Express', value: connectStatus.connected, subtitle: connectStatus.accountId },
                      { label: 'Paiements', value: connectStatus.chargesEnabled },
                      { label: 'Paiements sortants', value: connectStatus.payoutsEnabled },
                      { label: 'Détails soumis', value: connectStatus.detailsSubmitted },
                    ].map((item, index) => (
                      <motion.div 
                        key={item.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">{item.label}</p>
                        <div className="flex items-center gap-2">
                          {item.value ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center">
                              <Check className="w-3 h-3 text-emerald-500" />
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                              <X className="w-3 h-3 text-zinc-400" />
                            </div>
                          )}
                          <span className="font-medium text-zinc-900 dark:text-white">
                            {item.value ? 'Oui' : 'Non'}
                          </span>
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-zinc-400 font-mono mt-2">{item.subtitle}</p>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              )}
            </PremiumCard>

            {/* Summary Cards */}
            {data && data.totals && <SummaryCards totals={data.totals} />}

            {/* Recent Payouts */}
            {payoutsData && (
              <PremiumCard hoverable={false}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Paiements sortants récents</CardTitle>
                      <CardDescription>Derniers paiements sortants traités</CardDescription>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('payouts')}
                      className="rounded-xl"
                    >
                      Voir tout <ArrowUpRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {payoutsLoading ? (
                    <PremiumLoader message="Chargement des paiements..." />
                  ) : payoutsError ? (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
                      {payoutsError}
                    </div>
                  ) : payoutsData.payouts && payoutsData.payouts.length === 0 ? (
                    <p className="text-center text-zinc-500 dark:text-zinc-400 py-12">Aucun paiement sortant récent.</p>
                  ) : payoutsData.payouts && payoutsData.payouts.length > 0 ? (
                    <PayoutsTable items={payoutsData.payouts.slice(0, 5)} />
                  ) : null}
                </CardContent>
              </PremiumCard>
            )}
          </motion.div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <motion.div
            key="transactions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Filters */}
            <PremiumCard hoverable={false}>
              <CardHeader>
                <CardTitle>Filtres</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="gateway" className="text-sm font-medium mb-2 block">Passerelle</Label>
                    <Select
                      id="gateway"
                      value={filters.gateway}
                      onChange={(e) => setFilters({ ...filters, gateway: e.target.value })}
                      className="h-11 rounded-xl"
                    >
                      <option value="">Toutes</option>
                      <option value="STRIPE">Stripe</option>
                      <option value="MONEROO">Moneroo</option>
                      <option value="EBILLING">eBilling</option>
                    </Select>
                  </div>
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
                      <option value="AUTHORIZED">Autorisé</option>
                      <option value="SUCCEEDED">Réussi</option>
                      <option value="FAILED">Échoué</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="limit" className="text-sm font-medium mb-2 block">Limite</Label>
                    <Select
                      id="limit"
                      value={filters.limit}
                      onChange={(e) => setFilters({ ...filters, limit: Number(e.target.value) })}
                      className="h-11 rounded-xl"
                    >
                      {[10, 20, 50, 100].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            {/* Summary and Table */}
            {loading ? (
              <PremiumLoader message="Chargement des transactions..." />
            ) : error ? (
              <PremiumCard hoverable={false}>
                <CardContent className="pt-6">
                  <p className="text-red-500">{error}</p>
                </CardContent>
              </PremiumCard>
            ) : data && data.items && data.totals ? (
              <>
                <SummaryCards totals={data.totals} />
                <PremiumTableContainer>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-1">Transactions</h3>
                    <p className="text-sm text-zinc-500 mb-4">
                      {data.items.length} transaction{data.items.length > 1 ? 's' : ''}
                    </p>
                    <TransactionsTable items={data.items} />
                  </div>
                </PremiumTableContainer>
              </>
            ) : null}
          </motion.div>
        )}

        {/* Payouts Tab */}
        {activeTab === 'payouts' && (
          <motion.div
            key="payouts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Filters */}
            <PremiumCard hoverable={false}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Filtres</CardTitle>
                  <Button 
                    onClick={() => setShowCreatePayoutForm(true)}
                    className="h-10 px-5 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold shadow-lg shadow-violet-500/25"
                  >
                    Créer un paiement
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="payout-status" className="text-sm font-medium mb-2 block">Statut</Label>
                    <Select
                      id="payout-status"
                      value={payoutFilters.status}
                      onChange={(e) => setPayoutFilters({ ...payoutFilters, status: e.target.value })}
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
                    <Label htmlFor="payout-provider" className="text-sm font-medium mb-2 block">Fournisseur</Label>
                    <Select
                      id="payout-provider"
                      value={payoutFilters.provider}
                      onChange={(e) => setPayoutFilters({ ...payoutFilters, provider: e.target.value })}
                      className="h-11 rounded-xl"
                    >
                      <option value="">Toutes</option>
                      <option value="SHAP">SHAP</option>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payout-limit" className="text-sm font-medium mb-2 block">Limite</Label>
                    <Select
                      id="payout-limit"
                      value={payoutFilters.limit}
                      onChange={(e) => setPayoutFilters({ ...payoutFilters, limit: Number(e.target.value) })}
                      className="h-11 rounded-xl"
                    >
                      {[10, 20, 50, 100].map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </Select>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            {/* Payouts Table */}
            {payoutsLoading ? (
              <PremiumLoader message="Chargement des paiements sortants..." />
            ) : payoutsError ? (
              <PremiumCard hoverable={false}>
                <CardContent className="pt-6">
                  <p className="text-red-500">{payoutsError}</p>
                </CardContent>
              </PremiumCard>
            ) : payoutsData && payoutsData.payouts && payoutsData.payouts.length > 0 ? (
              <PremiumTableContainer>
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-1">Paiements sortants</h3>
                  <p className="text-sm text-zinc-500 mb-4">
                    {payoutsData.payouts.length} paiement{payoutsData.payouts.length > 1 ? 's' : ''} sortant{payoutsData.payouts.length > 1 ? 's' : ''}
                  </p>
                  <PayoutsTable items={payoutsData.payouts} />
                </div>
              </PremiumTableContainer>
            ) : (
              <PremiumCard hoverable={false}>
                <CardContent className="pt-6">
                  <p className="text-center text-zinc-500 dark:text-zinc-400">Aucun paiement sortant trouvé</p>
                </CardContent>
              </PremiumCard>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Payout Dialog */}
      <Dialog open={showCreatePayoutForm} onOpenChange={setShowCreatePayoutForm}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Créer un paiement sortant</DialogTitle>
          </DialogHeader>
          <CreatePayoutForm
            onSubmit={handleCreatePayout}
            onSuccess={() => setShowCreatePayoutForm(false)}
            onCancel={() => setShowCreatePayoutForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
