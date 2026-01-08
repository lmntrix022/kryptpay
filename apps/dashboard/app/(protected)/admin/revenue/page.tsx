'use client';

import { useEffect, useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Building2,
  PieChart,
  BarChart3,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Calendar
} from 'lucide-react';

import { useAuth } from '../../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumTableContainer } from '../../../../components/premium-ui';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { apiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface PlatformRevenueStats {
  totalRevenue: number;
  totalCommissions: number;
  totalTransactions: number;
  pendingCommissions?: number;
  pendingTransactions?: number;
  today: PeriodRevenue;
  thisWeek: PeriodRevenue;
  thisMonth: PeriodRevenue;
  lastMonth: PeriodRevenue;
  byGateway: GatewayRevenue[];
  topMerchants: MerchantRevenue[];
  dailyRevenue: DailyRevenue[];
  growthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

interface PeriodRevenue {
  revenue: number;
  commissions: number;
  transactions: number;
  volume: number;
  averageCommission: number;
  pendingCommissions?: number;
  pendingTransactions?: number;
}

interface GatewayRevenue {
  gateway: string;
  revenue: number;
  commissions: number;
  transactions: number;
  percentage: number;
}

interface MerchantRevenue {
  merchantId: string;
  merchantName: string;
  revenue: number;
  commissions: number;
  transactions: number;
  percentage: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  commissions: number;
  transactions: number;
}

export default function PlatformRevenuePage() {
  const { auth } = useAuth();
  const [stats, setStats] = useState<PlatformRevenueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Check if user has ADMIN role
    if (auth.user.role !== 'ADMIN') {
      setError('Accès refusé: Cette page nécessite les droits administrateur.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    try {
      const response = await fetch(apiUrl('admin/revenue'), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (response.ok) {
        try {
          const data = await response.json();
          setStats(data);
          setError(null);
        } catch (parseError) {
          console.error('Erreur lors du parsing de la réponse:', parseError);
          setError('Erreur: Réponse invalide du serveur');
        }
      } else if (response.status === 401) {
        try {
          const errorData = await response.json();
          setError(errorData.message || 'Non autorisé: Vérifiez que vous êtes connecté avec un compte administrateur.');
        } catch {
          setError('Non autorisé: Vérifiez que vous êtes connecté avec un compte administrateur.');
        }
      } else {
        try {
          const errorData = await response.json();
          setError(errorData.message || errorData.error?.message || `Erreur ${response.status}: Impossible de charger les revenus`);
        } catch {
          setError(`Erreur ${response.status}: Impossible de charger les revenus`);
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des revenus:', error);
      setError('Erreur de connexion: Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [auth]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const formatCurrency = (amount: number, currency = 'XAF') => {
    const value = currency === 'XOF' || currency === 'XAF' ? amount : amount / 100;
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return <PremiumLoader message="Chargement des revenus de la plateforme..." />;
  }

  if (error) {
    return (
      <div className="space-y-8">
        <PremiumHero
          title="Revenus de la plateforme"
          description="Suivez les commissions et revenus générés par BoohPay"
          icon={<DollarSign className="w-7 h-7 text-white" />}
          badge="Finance"
        />
        <PremiumCard>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <DollarSign className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Erreur de chargement</h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Réessayer
              </Button>
            </div>
          </CardContent>
        </PremiumCard>
      </div>
    );
  }

  if (!stats) {
    return <PremiumLoader message="Chargement des revenus de la plateforme..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Revenus de la plateforme"
        description="Suivez les commissions et revenus générés par BoohPay"
        icon={<DollarSign className="w-7 h-7 text-white" />}
        badge="Finance"
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
          { value: formatCurrency(stats?.totalCommissions || 0), label: 'Commissions totales' },
          { value: stats?.totalTransactions?.toLocaleString('fr-FR') || '0', label: 'Transactions' },
          ...(stats?.pendingCommissions && stats.pendingCommissions > 0 ? [
            { value: formatCurrency(stats.pendingCommissions), label: 'Commissions en attente' }
          ] : []),
        ]}
      />

      {/* Quick Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Today */}
        <PremiumCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Aujourd'hui</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.today.commissions || 0)}</p>
                <div className="flex items-center mt-2">
                  {(stats?.growthRate.daily || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    (stats?.growthRate.daily || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {formatPercentage(stats?.growthRate.daily || 0)} vs hier
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        {/* This Week */}
        <PremiumCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Cette semaine</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.thisWeek.commissions || 0)}</p>
                <div className="flex items-center mt-2">
                  {(stats?.growthRate.weekly || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    (stats?.growthRate.weekly || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {formatPercentage(stats?.growthRate.weekly || 0)} vs semaine dernière
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        {/* This Month */}
        <PremiumCard className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/20 to-transparent rounded-bl-full" />
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">Ce mois</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.thisMonth.commissions || 0)}</p>
                <div className="flex items-center mt-2">
                  {(stats?.growthRate.monthly || 0) >= 0 ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                  )}
                  <span className={cn(
                    "text-xs font-medium",
                    (stats?.growthRate.monthly || 0) >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {formatPercentage(stats?.growthRate.monthly || 0)} vs mois dernier
                  </span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                <DollarSign className="w-6 h-6 text-violet-600" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        {/* Total */}
        <PremiumCard className="relative overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-violet-200">Total des commissions</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.totalCommissions || 0)}</p>
                <p className="text-xs text-violet-200 mt-2">
                  {stats?.totalTransactions?.toLocaleString('fr-FR')} transactions
                </p>
              </div>
              <div className="p-3 rounded-xl bg-white/20">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>

      {/* Detailed Stats */}
      <Tabs defaultValue="gateways" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="gateways">Par Gateway</TabsTrigger>
          <TabsTrigger value="merchants">Top Marchands</TabsTrigger>
          <TabsTrigger value="daily">Historique</TabsTrigger>
        </TabsList>

        {/* By Gateway */}
        <TabsContent value="gateways" className="mt-6">
          <div className="grid gap-6 md:grid-cols-3">
            {stats?.byGateway.map((gateway) => (
              <PremiumCard key={gateway.gateway}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center gap-2">
                      <div className={cn(
                        "w-3 h-3 rounded-full",
                        gateway.gateway === 'STRIPE' ? "bg-violet-500" :
                        gateway.gateway === 'MONEROO' ? "bg-blue-500" :
                        "bg-emerald-500"
                      )} />
                      {gateway.gateway}
                    </span>
                    <PremiumBadge variant="default">{gateway.percentage.toFixed(1)}%</PremiumBadge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Commissions</span>
                      <span className="font-semibold">{formatCurrency(gateway.commissions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Volume</span>
                      <span className="font-medium text-zinc-600">{formatCurrency(gateway.revenue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-zinc-500">Transactions</span>
                      <span className="font-medium text-zinc-600">{gateway.transactions.toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden mt-4">
                      <div 
                        className={cn(
                          "h-full rounded-full",
                          gateway.gateway === 'STRIPE' ? "bg-violet-500" :
                          gateway.gateway === 'MONEROO' ? "bg-blue-500" :
                          "bg-emerald-500"
                        )}
                        style={{ width: `${gateway.percentage}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </PremiumCard>
            ))}
          </div>
        </TabsContent>

        {/* Top Merchants */}
        <TabsContent value="merchants" className="mt-6">
          <PremiumTableContainer title="Top 10 Marchands" description="Par commissions générées">
            <div className="space-y-3">
              {stats?.topMerchants.map((merchant, index) => (
                <div 
                  key={merchant.merchantId}
                  className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white",
                      index === 0 ? "bg-gradient-to-br from-amber-400 to-amber-600" :
                      index === 1 ? "bg-gradient-to-br from-zinc-300 to-zinc-500" :
                      index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800" :
                      "bg-gradient-to-br from-violet-500 to-purple-600"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{merchant.merchantName}</p>
                      <p className="text-xs text-zinc-500">{merchant.transactions.toLocaleString('fr-FR')} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-600">{formatCurrency(merchant.commissions)}</p>
                    <p className="text-xs text-zinc-500">{merchant.percentage.toFixed(1)}% du total</p>
                  </div>
                </div>
              ))}
            </div>
          </PremiumTableContainer>
        </TabsContent>

        {/* Daily History */}
        <TabsContent value="daily" className="mt-6">
          <PremiumCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Historique des 30 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats?.dailyRevenue.slice().reverse().slice(0, 14).map((day) => (
                  <div 
                    key={day.date}
                    className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-zinc-500 w-24">
                        {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-xs">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full"
                          style={{ 
                            width: `${Math.min(100, (day.commissions / (stats?.today.commissions || 1)) * 100)}%` 
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatCurrency(day.commissions)}</span>
                      <span className="text-xs text-zinc-500 ml-2">({day.transactions} tx)</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </PremiumCard>
        </TabsContent>
      </Tabs>

      {/* Period Comparison */}
      <div className="grid gap-6 md:grid-cols-2">
        <PremiumCard>
          <CardHeader>
            <CardTitle>Ce mois vs Mois dernier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Commissions</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">{formatCurrency(stats?.lastMonth.commissions || 0)}</span>
                  <span className="font-bold">{formatCurrency(stats?.thisMonth.commissions || 0)}</span>
                  <PremiumBadge variant={(stats?.growthRate.monthly || 0) >= 0 ? 'success' : 'error'}>
                    {formatPercentage(stats?.growthRate.monthly || 0)}
                  </PremiumBadge>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Transactions</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">{stats?.lastMonth.transactions}</span>
                  <span className="font-bold">{stats?.thisMonth.transactions}</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Commission moyenne</span>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">{formatCurrency(stats?.lastMonth.averageCommission || 0)}</span>
                  <span className="font-bold">{formatCurrency(stats?.thisMonth.averageCommission || 0)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </PremiumCard>

        <PremiumCard>
          <CardHeader>
            <CardTitle>Résumé financier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20">
                <div className="flex justify-between items-center">
                  <span className="text-violet-700 dark:text-violet-300">Volume total traité</span>
                  <span className="text-xl font-bold text-violet-900 dark:text-violet-100">
                    {formatCurrency(stats?.totalRevenue || 0)}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20">
                <div className="flex justify-between items-center">
                  <span className="text-emerald-700 dark:text-emerald-300">Commissions perçues</span>
                  <span className="text-xl font-bold text-emerald-900 dark:text-emerald-100">
                    {formatCurrency(stats?.totalCommissions || 0)}
                  </span>
                </div>
              </div>
              {stats?.pendingCommissions && stats.pendingCommissions > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-amber-700 dark:text-amber-300">Commissions en attente</span>
                    <span className="text-lg font-bold text-amber-900 dark:text-amber-100">
                      {formatCurrency(stats.pendingCommissions)}
                    </span>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {stats.pendingTransactions || 0} transaction{stats.pendingTransactions !== 1 ? 's' : ''} en attente de finalisation
                  </p>
                </div>
              )}
              <div className="text-center text-sm text-zinc-500 mt-4">
                Taux de commission moyen: {stats?.totalRevenue && stats.totalCommissions 
                  ? ((stats.totalCommissions / stats.totalRevenue) * 100).toFixed(2)
                  : 0}%
              </div>
            </div>
          </CardContent>
        </PremiumCard>
      </div>
    </div>
  );
}

