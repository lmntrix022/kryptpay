'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

// Gestion silencieuse de l'erreur Stripe (bloquée par AdBlock)
if (typeof window !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Ignorer silencieusement les erreurs Stripe bloquées par le client
    if (args[0]?.includes?.('stripe.network') || args[0]?.includes?.('ERR_BLOCKED_BY_CLIENT')) {
      return;
    }
    originalError.apply(console, args);
  };
}
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wallet, 
  CreditCard,
  TrendingUp,
  TrendingDown,
  Plus,
  Filter,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Calendar
} from 'lucide-react';

import SummaryCards from '../../../components/SummaryCards';
import TransactionsTable from '../../../components/TransactionsTable';
import PayoutsTable from '../../../components/PayoutsTable';
import type {
  DashboardResponse,
  PayoutResponse,
  MerchantItem,
  UserItem,
} from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { useCurrency } from '../../../context/CurrencyContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumTableContainer, PremiumEmptyState } from '../../../components/premium-ui';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type MerchantFormState = {
  name: string;
  email: string;
  password: string;
};

type Tab = 'overview' | 'transactions' | 'merchants' | 'users' | 'payouts';

const initialFilters = {
  gateway: '',
  status: '',
  limit: 20,
  merchantId: '',
  startDate: '',
  endDate: '',
  isTestMode: '',
};

export default function AdminDashboardPage() {
  const { auth } = useAuth();
  const { formatAmount } = useCurrency();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState(initialFilters);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [payoutsData, setPayoutsData] = useState<PayoutResponse | null>(null);
  const [merchantsData, setMerchantsData] = useState<MerchantItem[] | null>(null);
  const [usersData, setUsersData] = useState<UserItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [merchantsLoading, setMerchantsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payoutsError, setPayoutsError] = useState<string | null>(null);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [creationResult, setCreationResult] = useState<string | null>(null);
  const [form, setForm] = useState<MerchantFormState>({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);
  const [showMerchantForm, setShowMerchantForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.gateway) search.set('gateway', filters.gateway);
    if (filters.status) search.set('status', filters.status);
    if (filters.merchantId) search.set('merchantId', filters.merchantId);
    if (filters.startDate) search.set('startDate', filters.startDate);
    if (filters.endDate) search.set('endDate', filters.endDate);
    if (filters.isTestMode) search.set('isTestMode', filters.isTestMode);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  const payoutsParams = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.status) search.set('status', filters.status);
    if (filters.merchantId) search.set('merchantId', filters.merchantId);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  // Fetch transactions
  useEffect(() => {
    if (activeTab === 'overview' || activeTab === 'transactions') {
      const fetchData = async () => {
        if (!auth) return;
        setLoading(true);
        setError(null);

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/transactions?${params}`,
            {
              headers: { Authorization: `Bearer ${auth.accessToken}` },
            },
          );

          if (!response.ok) throw new Error('Impossible de récupérer les transactions');
          const payload = (await response.json()) as DashboardResponse | { data?: any[]; items?: any[]; totals?: any; pagination?: any };
          
          const normalizedPayload: DashboardResponse = 'data' in payload && payload.data !== undefined
            ? { 
                items: payload.data || [], 
                totals: payload.totals, 
                metadata: payload.pagination ? {
                  limit: payload.pagination.limit,
                  returned: payload.data?.length || 0,
                } : undefined
              }
            : payload as DashboardResponse;
          
          setData(normalizedPayload);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erreur inattendue');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [auth, params, activeTab]);

  // Fetch payouts
  useEffect(() => {
    if (activeTab === 'payouts') {
      const fetchPayouts = async () => {
        if (!auth) return;
        setPayoutsLoading(true);
        setPayoutsError(null);

        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/payouts?${payoutsParams}`,
            {
              headers: { Authorization: `Bearer ${auth.accessToken}` },
            },
          );

          if (!response.ok) throw new Error('Impossible de récupérer les payouts');
          const payload = (await response.json()) as PayoutResponse;
          setPayoutsData(payload);
        } catch (err) {
          setPayoutsError(err instanceof Error ? err.message : 'Erreur inattendue');
        } finally {
          setPayoutsLoading(false);
        }
      };
      fetchPayouts();
    }
  }, [auth, payoutsParams, activeTab]);

  // Fetch merchants
  useEffect(() => {
    if (activeTab === 'merchants') {
      const fetchMerchants = async () => {
        if (!auth) return;
        setMerchantsLoading(true);
        setMerchantsError(null);

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/merchants`, {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });

          if (!response.ok) throw new Error('Impossible de récupérer les marchands');
          const payload = (await response.json()) as MerchantItem[];
          setMerchantsData(payload);
        } catch (err) {
          setMerchantsError(err instanceof Error ? err.message : 'Erreur inattendue');
        } finally {
          setMerchantsLoading(false);
        }
      };
      fetchMerchants();
    }
  }, [auth, activeTab]);

  // Fetch users
  useEffect(() => {
    if (activeTab === 'users') {
      const fetchUsers = async () => {
        if (!auth) return;
        setUsersLoading(true);
        setUsersError(null);

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/users`, {
            headers: { Authorization: `Bearer ${auth.accessToken}` },
          });

          if (!response.ok) throw new Error('Impossible de récupérer les utilisateurs');
          const payload = (await response.json()) as UserItem[];
          setUsersData(payload);
        } catch (err) {
          setUsersError(err instanceof Error ? err.message : 'Erreur inattendue');
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    }
  }, [auth, activeTab]);

  const handleCreateMerchant = async (e: FormEvent) => {
    e.preventDefault();
    if (!auth || creating) return;

    setCreating(true);
    setCreationResult(null);

    try {
      const merchantResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/merchants`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({ name: form.name }),
        },
      );

      if (!merchantResponse.ok) {
        const errorData = await merchantResponse.json().catch(() => ({}));
        throw new Error(errorData.message || 'Création du marchand impossible');
      }

      const merchantData = await merchantResponse.json();

      const userResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.accessToken}`,
          },
          body: JSON.stringify({
            email: form.email,
            password: form.password,
            role: 'MERCHANT',
            merchantId: merchantData.merchantId,
          }),
        },
      );

      if (!userResponse.ok) {
        const errorData = await userResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Création de l'utilisateur impossible");
      }

      setCreationResult(
        `Marchand créé avec succès. ID: ${merchantData.merchantId}`,
      );
      setForm({ name: '', email: '', password: '' });
      setShowMerchantForm(false);
      
      if (activeTab === 'merchants') {
        const refreshResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/merchants`, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });
        if (refreshResponse.ok) {
          const refreshData = (await refreshResponse.json()) as MerchantItem[];
          setMerchantsData(refreshData);
        }
      }
    } catch (err) {
      setCreationResult(err instanceof Error ? err.message : 'Erreur durant la création');
    } finally {
      setCreating(false);
    }
  };

  const setDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    setFilters((prev) => ({
      ...prev,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    }));
  };

  const tabs = [
    { id: 'overview' as Tab, label: 'Vue d\'ensemble', icon: LayoutDashboard },
    { id: 'transactions' as Tab, label: 'Transactions', icon: CreditCard },
    { id: 'merchants' as Tab, label: 'Marchands', icon: Building2 },
    { id: 'users' as Tab, label: 'Utilisateurs', icon: Users },
    { id: 'payouts' as Tab, label: 'Reversements', icon: Wallet },
  ];

  // Stats for hero
  const totalTransactions = data?.items?.length || 0;
  const totalVolume = data?.totals?.volumeMinor || 0;
  const totalMerchants = merchantsData?.length || 0;

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Administration"
        description="Gérez les marchands, surveillez les transactions et les reversements"
        icon={<LayoutDashboard className="w-7 h-7 text-white" />}
        badge="Tableau de bord Admin"
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            {activeTab === 'merchants' && (
              <Button
                onClick={() => setShowMerchantForm(true)}
                className="bg-white text-cyan-600 hover:bg-white/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouveau marchand
              </Button>
            )}
          </div>
        }
        stats={[
          { value: totalTransactions, label: 'Transactions' },
          { value: formatAmount(totalVolume, 'XAF'), label: 'Volume' },
        ]}
      />

      {/* Filters Panel */}
      {showFilters && (
        <PremiumCard className="animate-in fade-in slide-in-from-top-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="gateway">Gateway</Label>
                <Select
                  id="gateway"
                  value={filters.gateway}
                  onChange={(e) => setFilters({ ...filters, gateway: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="">Tous</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="MONEROO">Moneroo</option>
                  <option value="EBILLING">eBilling</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Statut</Label>
                <Select
                  id="status"
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="">Tous</option>
                  <option value="PENDING">En attente</option>
                  <option value="SUCCEEDED">Réussi</option>
                  <option value="FAILED">Échoué</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="isTestMode">Mode</Label>
                <Select
                  id="isTestMode"
                  value={filters.isTestMode}
                  onChange={(e) => setFilters({ ...filters, isTestMode: e.target.value })}
                  className="mt-1.5"
                >
                  <option value="">Tous</option>
                  <option value="false">Production</option>
                  <option value="true">Test</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="startDate">Date de début</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setDateRange(7)}>
                7 jours
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(30)}>
                30 jours
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDateRange(90)}>
                90 jours
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFilters(initialFilters)}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </PremiumCard>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex w-full min-w-max sm:w-auto sm:max-w-2xl grid grid-cols-5 mb-6 h-auto p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id} 
                  className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 text-xs sm:text-sm font-medium rounded-lg data-[state=active]:bg-white data-[state=active]:text-cyan-600 data-[state=active]:shadow-sm dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-cyan-400 transition-all"
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Cards */}
          {data && data.totals && <SummaryCards totals={data.totals} />}

          {/* Transactions Table */}
          {loading ? (
            <PremiumLoader message="Chargement des transactions..." />
          ) : error ? (
            <PremiumCard className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-red-500">{error}</p>
              </CardContent>
            </PremiumCard>
          ) : data && data.items && data.items.length > 0 ? (
            <PremiumTableContainer 
              title="Transactions récentes"
              description={`${data.items.length} transaction${data.items.length > 1 ? 's' : ''}`}
            >
              <TransactionsTable items={data.items} />
            </PremiumTableContainer>
          ) : (
            <PremiumEmptyState
              icon={<CreditCard className="w-12 h-12" />}
              title="Aucune transaction"
              description="Les transactions apparaîtront ici"
            />
          )}
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {data && data.totals && <SummaryCards totals={data.totals} />}

          {loading ? (
            <PremiumLoader message="Chargement des transactions..." />
          ) : error ? (
            <PremiumCard className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-red-500">{error}</p>
              </CardContent>
            </PremiumCard>
          ) : data && data.items && data.items.length > 0 ? (
            <PremiumTableContainer 
              title="Toutes les transactions"
              description={`${data.items.length} transaction${data.items.length > 1 ? 's' : ''}`}
            >
              <TransactionsTable items={data.items} />
            </PremiumTableContainer>
          ) : (
            <PremiumEmptyState
              icon={<CreditCard className="w-12 h-12" />}
              title="Aucune transaction"
              description="Les transactions apparaîtront ici"
            />
          )}
        </TabsContent>

        {/* Merchants Tab */}
        <TabsContent value="merchants" className="space-y-6">
          {merchantsLoading ? (
            <PremiumLoader message="Chargement des marchands..." />
          ) : merchantsError ? (
            <PremiumCard className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-red-500">{merchantsError}</p>
              </CardContent>
            </PremiumCard>
          ) : merchantsData && merchantsData.length > 0 ? (
            <PremiumTableContainer 
              title="Marchands"
              description={`${merchantsData.length} marchand${merchantsData.length > 1 ? 's' : ''}`}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Taux de réussite</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchantsData.map((merchant) => {
                    const succeeded = merchant.stats.byStatus['SUCCEEDED']?.count ?? 0;
                    const total = merchant.stats.paymentsCount;
                    const successRate = total > 0 ? Math.round((succeeded / total) * 100) : 0;

                    return (
                      <TableRow key={merchant.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-cyan-600" />
                            </div>
                            <span className="font-medium">{merchant.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                            {merchant.id.slice(0, 12)}…
                          </code>
                        </TableCell>
                        <TableCell className="text-zinc-500">
                          {new Intl.DateTimeFormat('fr-FR', {
                            dateStyle: 'short',
                          }).format(new Date(merchant.createdAt))}
                        </TableCell>
                        <TableCell className="text-right">
                          {new Intl.NumberFormat('fr-FR').format(merchant.stats.paymentsCount)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(merchant.stats.paymentsVolumeMinor, 'XAF')}
                        </TableCell>
                        <TableCell className="text-right">
                          <PremiumBadge variant={successRate >= 80 ? 'success' : successRate >= 50 ? 'warning' : 'error'}>
                            {successRate}%
                          </PremiumBadge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </PremiumTableContainer>
          ) : (
            <PremiumEmptyState
              icon={<Building2 className="w-12 h-12" />}
              title="Aucun marchand"
              description="Créez votre premier marchand"
              action={
                <Button onClick={() => setShowMerchantForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un marchand
                </Button>
              }
            />
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          {usersLoading ? (
            <PremiumLoader message="Chargement des utilisateurs..." />
          ) : usersError ? (
            <PremiumCard className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-red-500">{usersError}</p>
              </CardContent>
            </PremiumCard>
          ) : usersData && usersData.length > 0 ? (
            <PremiumTableContainer 
              title="Utilisateurs"
              description={`${usersData.length} utilisateur${usersData.length > 1 ? 's' : ''}`}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Marchand</TableHead>
                    <TableHead>Créé le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usersData.map((user) => (
                    <TableRow key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-cyan-600" />
                          </div>
                          <span className="font-medium">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <PremiumBadge variant={user.role === 'ADMIN' ? 'violet' : 'default'}>
                          {user.role}
                        </PremiumBadge>
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {user.merchantName || '—'}
                      </TableCell>
                      <TableCell className="text-zinc-500">
                        {new Intl.DateTimeFormat('fr-FR', {
                          dateStyle: 'short',
                        }).format(new Date(user.createdAt))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </PremiumTableContainer>
          ) : (
            <PremiumEmptyState
              icon={<Users className="w-12 h-12" />}
              title="Aucun utilisateur"
              description="Les utilisateurs apparaîtront ici"
            />
          )}
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          {payoutsLoading ? (
            <PremiumLoader message="Chargement des reversements..." />
          ) : payoutsError ? (
            <PremiumCard className="border-l-4 border-l-red-500">
              <CardContent className="pt-6">
                <p className="text-red-500">{payoutsError}</p>
              </CardContent>
            </PremiumCard>
          ) : payoutsData && payoutsData.payouts && payoutsData.payouts.length > 0 ? (
            <>
              {/* Payout Stats */}
              <div className="grid gap-4 md:grid-cols-4">
                <PremiumCard>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
                        <Wallet className="w-6 h-6 text-cyan-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{formatAmount(payoutsData.totals.volumeMinor, 'XAF')}</p>
                        <p className="text-sm text-zinc-500">Volume total</p>
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>

                <PremiumCard>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">
                          {payoutsData.totals.count > 0
                            ? Math.round(
                                ((payoutsData.totals.byStatus['SUCCEEDED']?.count ?? 0) /
                                  payoutsData.totals.count) *
                                  100,
                              )
                            : 0}%
                        </p>
                        <p className="text-sm text-zinc-500">Taux de réussite</p>
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>

                <PremiumCard>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <Clock className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{payoutsData.totals.byStatus['PENDING']?.count ?? 0}</p>
                        <p className="text-sm text-zinc-500">En attente</p>
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>

                <PremiumCard>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                        <XCircle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{payoutsData.totals.byStatus['FAILED']?.count ?? 0}</p>
                        <p className="text-sm text-zinc-500">Échoués</p>
                      </div>
                    </div>
                  </CardContent>
                </PremiumCard>
              </div>

              <PremiumTableContainer 
                title="Reversements"
                description={`${payoutsData.payouts.length} reversement${payoutsData.payouts.length > 1 ? 's' : ''}`}
              >
                <PayoutsTable items={payoutsData.payouts} />
              </PremiumTableContainer>
            </>
          ) : (
            <PremiumEmptyState
              icon={<Wallet className="w-12 h-12" />}
              title="Aucun reversement"
              description="Les reversements apparaîtront ici"
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Create Merchant Dialog */}
      <Dialog open={showMerchantForm} onOpenChange={setShowMerchantForm}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-600" />
              Créer un marchand
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateMerchant} className="space-y-4">
            <div>
              <Label htmlFor="merchant-name">Nom du marchand</Label>
              <Input
                id="merchant-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                placeholder="Ex: Ma Boutique"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="merchant-email">Email administrateur</Label>
              <Input
                id="merchant-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                placeholder="admin@boutique.com"
                className="mt-1.5 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="merchant-password">Mot de passe</Label>
              <Input
                id="merchant-password"
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                placeholder="Min. 12 caractères"
                minLength={12}
                className="mt-1.5 rounded-xl"
              />
            </div>
            {creationResult && (
              <div className={cn(
                'p-3 rounded-xl text-sm',
                creationResult.includes('succès') || creationResult.includes('success')
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200'
                  : 'bg-red-500/10 text-red-600 border border-red-200'
              )}>
                {creationResult}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowMerchantForm(false);
                  setForm({ name: '', email: '', password: '' });
                  setCreationResult(null);
                }}
                className="rounded-xl"
              >
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={creating}
                className="rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Créer
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
