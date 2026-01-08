'use client';

import { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  CreditCard, 
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  BarChart3,
  PieChart,
  Calendar,
  RefreshCw,
  Zap
} from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge } from '../../../components/premium-ui';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PeriodStats {
  revenue: number;
  orders: number;
  averageOrder: number;
  growth: number;
}

interface SellerStats {
  overview: {
    totalRevenue: number;
    totalCommissions: number;
    netEarnings: number;
    pendingPayouts: number;
    completedPayouts: number;
    currency: string;
  };
  periods: {
    today: PeriodStats;
    thisWeek: PeriodStats;
    thisMonth: PeriodStats;
    lastMonth: PeriodStats;
    allTime: PeriodStats;
  };
  topItems: { id: string; name: string; revenue: number; quantity: number; percentage: number }[];
  revenueChart: { date: string; revenue: number; orders: number; payouts: number }[];
  conversionRates: {
    cartToPayment: number;
    paymentSuccess: number;
    refundRate: number;
  };
  payoutStatus: {
    pending: number;
    processing: number;
    succeeded: number;
    failed: number;
  };
}

interface RealtimeStats {
  activeOrders: number;
  pendingPayments: number;
  todayRevenue: number;
  lastPaymentAt?: string;
  lastPayoutAt?: string;
}

export default function SellerDashboardPage() {
  const { auth } = useAuth();
  const [stats, setStats] = useState<SellerStats | null>(null);
  const [realtime, setRealtime] = useState<RealtimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    if (!auth) return;
    
    try {
      const [statsRes, realtimeRes] = await Promise.all([
        fetch(apiUrl('seller/stats'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
        fetch(apiUrl('seller/realtime'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data);
      }
      
      if (realtimeRes.ok) {
        const data = await realtimeRes.json();
        setRealtime(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Rafraîchissement automatique toutes les 30 secondes
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [auth]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatCurrency = (amount: number, currency = 'EUR') => {
    const value = currency === 'XOF' ? amount : amount / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency === 'XOF' ? 'XOF' : 'EUR',
      minimumFractionDigits: currency === 'XOF' ? 0 : 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return <PremiumLoader message="Chargement du tableau de bord..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Tableau de bord vendeur"
        description="Suivez vos ventes et revenus en temps réel"
        icon={<BarChart3 className="w-7 h-7 text-white" />}
        badge="Statistiques"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", refreshing && "animate-spin")} />
            Actualiser
          </Button>
        }
        stats={[
          { value: formatCurrency(stats?.overview.netEarnings || 0), label: 'Revenus nets' },
          { value: stats?.periods.thisMonth.orders || 0, label: 'Commandes ce mois' },
        ]}
      />

      {/* Realtime Stats Bar */}
      {realtime && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Zap className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{realtime.activeOrders}</p>
              <p className="text-xs text-zinc-500">Commandes actives</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">{realtime.pendingPayments}</p>
              <p className="text-xs text-zinc-500">Paiements en attente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-violet-500/5 border border-violet-500/20">
            <div className="p-2 rounded-lg bg-violet-500/20">
              <DollarSign className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-zinc-900 dark:text-white">
                {formatCurrency(realtime.todayRevenue)}
              </p>
              <p className="text-xs text-zinc-500">Revenus aujourd'hui</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Calendar className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {realtime.lastPaymentAt 
                  ? new Date(realtime.lastPaymentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                  : '-'}
              </p>
              <p className="text-xs text-zinc-500">Dernier paiement</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Stats */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="periods">Par période</TabsTrigger>
          <TabsTrigger value="payouts">Reversements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Overview Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <PremiumCard>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Revenus totaux</CardTitle>
                <DollarSign className="w-4 h-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(stats?.overview.totalRevenue || 0)}</p>
                <div className="flex items-center mt-1">
                  {(stats?.periods.thisMonth.growth || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500 mr-1" />
                  )}
                  <span className={cn(
                    "text-xs",
                    (stats?.periods.thisMonth.growth || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {formatPercentage(stats?.periods.thisMonth.growth || 0)} ce mois
                  </span>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Commissions</CardTitle>
                <PieChart className="w-4 h-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatCurrency(stats?.overview.totalCommissions || 0)}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Frais de plateforme
                </p>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Revenus nets</CardTitle>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-emerald-600">
                  {formatCurrency(stats?.overview.netEarnings || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Après commissions
                </p>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">À recevoir</CardTitle>
                <Wallet className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats?.overview.pendingPayouts || 0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  Reversements en attente
                </p>
              </CardContent>
            </PremiumCard>
          </div>

          {/* Conversion Rates */}
          <div className="grid gap-6 md:grid-cols-3">
            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Taux de succès</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {(stats?.conversionRates.paymentSuccess || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <TrendingUp className="w-8 h-8 text-emerald-500" />
                  </div>
                </div>
                <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                    style={{ width: `${stats?.conversionRates.paymentSuccess || 0}%` }}
                  />
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Taux de remboursement</p>
                    <p className="text-3xl font-bold text-amber-600">
                      {(stats?.conversionRates.refundRate || 0).toFixed(1)}%
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <TrendingDown className="w-8 h-8 text-amber-500" />
                  </div>
                </div>
                <div className="mt-4 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                    style={{ width: `${Math.min(stats?.conversionRates.refundRate || 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-500">Panier moyen</p>
                    <p className="text-3xl font-bold">
                      {formatCurrency(stats?.periods.thisMonth.averageOrder || 0)}
                    </p>
                  </div>
                  <div className="h-16 w-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 text-violet-500" />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
                  Basé sur {stats?.periods.thisMonth.orders || 0} commandes ce mois
                </p>
              </CardContent>
            </PremiumCard>
          </div>

          {/* Top Products */}
          {stats?.topItems && stats.topItems.length > 0 && (
            <PremiumCard>
              <CardHeader>
                <CardTitle>Top produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.topItems.slice(0, 5).map((item, index) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-zinc-500">{item.quantity} ventes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(item.revenue)}</p>
                        <p className="text-xs text-zinc-500">{item.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </PremiumCard>
          )}
        </TabsContent>

        <TabsContent value="periods" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {['today', 'thisWeek', 'thisMonth', 'allTime'].map((period) => {
              const periodData = stats?.periods[period as keyof typeof stats.periods];
              const labels: Record<string, string> = {
                today: "Aujourd'hui",
                thisWeek: 'Cette semaine',
                thisMonth: 'Ce mois',
                allTime: 'Total',
              };
              
              return (
                <PremiumCard key={period}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">
                      {labels[period]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold">{formatCurrency(periodData?.revenue || 0)}</p>
                      {period !== 'allTime' && periodData?.growth !== undefined && (
                        <div className="flex items-center mt-1">
                          {periodData.growth >= 0 ? (
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-red-500" />
                          )}
                          <span className={cn(
                            "text-xs",
                            periodData.growth >= 0 ? "text-emerald-500" : "text-red-500"
                          )}>
                            {formatPercentage(periodData.growth)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Commandes</span>
                      <span className="font-medium">{periodData?.orders || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Panier moyen</span>
                      <span className="font-medium">{formatCurrency(periodData?.averageOrder || 0)}</span>
                    </div>
                  </CardContent>
                </PremiumCard>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="payouts" className="mt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Wallet className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats?.payoutStatus.pending || 0}</p>
                    <p className="text-sm text-zinc-500">En attente</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats?.payoutStatus.processing || 0}</p>
                    <p className="text-sm text-zinc-500">En cours</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                    <TrendingUp className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats?.payoutStatus.succeeded || 0}</p>
                    <p className="text-sm text-zinc-500">Réussis</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>

            <PremiumCard>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold">{stats?.payoutStatus.failed || 0}</p>
                    <p className="text-sm text-zinc-500">Échoués</p>
                  </div>
                </div>
              </CardContent>
            </PremiumCard>
          </div>

          <PremiumCard className="mt-6">
            <CardHeader>
              <CardTitle>Résumé des reversements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="font-medium">Montant total reversé</p>
                    <p className="text-sm text-zinc-500">Depuis le début</p>
                  </div>
                  <p className="text-2xl font-bold text-emerald-600">
                    {formatCurrency(stats?.overview.completedPayouts || 0)}
                  </p>
                </div>
                
                <div className="flex justify-between items-center p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <div>
                    <p className="font-medium">En attente de versement</p>
                    <p className="text-sm text-zinc-500">À venir</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(stats?.overview.pendingPayouts || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

