'use client';

import { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw,
  Play,
  FileText,
  TrendingUp,
  Calendar,
  Shield
} from 'lucide-react';

import { useAuth } from '../../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumTableContainer } from '../../../../components/premium-ui';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

interface ReconciliationSummary {
  date: string;
  merchantsProcessed: number;
  totalPayments: number;
  totalPayouts: number;
  totalVolume: number;
  issues: number;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
}

interface ReconciliationLog {
  run_id: string;
  merchant_id: string;
  started_at: string;
  completed_at: string;
  issues_count: number;
  result: any;
}

export default function ReconciliationPage() {
  const { auth } = useAuth();
  const [history, setHistory] = useState<ReconciliationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchHistory = async () => {
    if (!auth) return;
    
    try {
      const response = await fetch(apiUrl('admin/reconciliation/history?limit=20'), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'historique:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [auth]);

  const runReconciliation = async (merchantId?: string) => {
    if (!auth) return;
    setRunning(true);
    
    try {
      const url = merchantId 
        ? apiUrl(`admin/reconciliation/run?merchantId=${merchantId}`)
        : apiUrl('admin/reconciliation/run');
        
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (response.ok) {
        const result = await response.json();
        setLastResult(result);
        fetchHistory();
      }
    } catch (error) {
      console.error('Erreur lors de la réconciliation:', error);
    } finally {
      setRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESS':
        return <PremiumBadge variant="success">Succès</PremiumBadge>;
      case 'PARTIAL':
        return <PremiumBadge variant="warning">Partiel</PremiumBadge>;
      case 'FAILED':
        return <PremiumBadge variant="error">Échec</PremiumBadge>;
      default:
        return <PremiumBadge>{status}</PremiumBadge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'HIGH':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'MEDIUM':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  if (loading) {
    return <PremiumLoader message="Chargement des réconciliations..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Réconciliation"
        description="Vérification automatique des paiements et reversements"
        icon={<Shield className="w-7 h-7 text-white" />}
        badge="Administration"
        actions={
          <Button
            onClick={() => runReconciliation()}
            disabled={running}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            {running ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Lancer la réconciliation
              </>
            )}
          </Button>
        }
      />

      {/* Last Result */}
      {lastResult && (
        <PremiumCard className="border-l-4 border-l-violet-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Dernière réconciliation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500">Paiements vérifiés</p>
                <p className="text-2xl font-bold">{lastResult.payments?.total || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500">Payouts vérifiés</p>
                <p className="text-2xl font-bold">{lastResult.payouts?.total || 0}</p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500">Problèmes détectés</p>
                <p className={cn(
                  "text-2xl font-bold",
                  lastResult.issues?.length > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
                  {lastResult.issues?.length || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800">
                <p className="text-sm text-zinc-500">Durée</p>
                <p className="text-2xl font-bold">
                  {lastResult.completedAt && lastResult.startedAt
                    ? `${Math.round((new Date(lastResult.completedAt).getTime() - new Date(lastResult.startedAt).getTime()) / 1000)}s`
                    : '-'}
                </p>
              </div>
            </div>

            {/* Issues List */}
            {lastResult.issues?.length > 0 && (
              <div className="mt-6">
                <h4 className="font-semibold mb-3">Problèmes détectés</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {lastResult.issues.map((issue: any, index: number) => (
                    <div 
                      key={index}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg",
                        issue.severity === 'CRITICAL' ? "bg-red-50 dark:bg-red-900/20" :
                        issue.severity === 'HIGH' ? "bg-orange-50 dark:bg-orange-900/20" :
                        issue.severity === 'MEDIUM' ? "bg-amber-50 dark:bg-amber-900/20" :
                        "bg-blue-50 dark:bg-blue-900/20"
                      )}
                    >
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{issue.type}</span>
                          <span className={cn(
                            "text-xs px-2 py-0.5 rounded-full",
                            issue.severity === 'CRITICAL' ? "bg-red-100 text-red-700" :
                            issue.severity === 'HIGH' ? "bg-orange-100 text-orange-700" :
                            issue.severity === 'MEDIUM' ? "bg-amber-100 text-amber-700" :
                            "bg-blue-100 text-blue-700"
                          )}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {issue.entityType}: {issue.entityId}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </PremiumCard>
      )}

      {/* History Table */}
      <PremiumTableContainer title="Historique des réconciliations">
        {history.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
            <p className="text-zinc-500">Aucune réconciliation effectuée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-700">
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Marchand</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Durée</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Problèmes</th>
                  <th className="text-left py-3 px-4 font-medium text-zinc-500">Statut</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr 
                    key={log.run_id}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">
                          {new Date(log.started_at).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {new Date(log.started_at).toLocaleTimeString('fr-FR')}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                        {log.merchant_id || 'Tous'}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      {Math.round(
                        (new Date(log.completed_at).getTime() - new Date(log.started_at).getTime()) / 1000
                      )}s
                    </td>
                    <td className="py-3 px-4">
                      <span className={cn(
                        "font-medium",
                        log.issues_count > 0 ? "text-amber-600" : "text-emerald-600"
                      )}>
                        {log.issues_count}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {log.issues_count === 0 ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle2 className="w-4 h-4" />
                          OK
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-600">
                          <AlertTriangle className="w-4 h-4" />
                          Problèmes
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PremiumTableContainer>

      {/* Info Card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-50 via-purple-50 to-violet-50 dark:from-violet-950/20 dark:via-purple-950/20 dark:to-violet-950/20 border border-violet-100 dark:border-violet-800 p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/30">
            <TrendingUp className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <h4 className="font-semibold text-violet-900 dark:text-violet-100 mb-1">
              Réconciliation automatique
            </h4>
            <p className="text-sm text-violet-700/80 dark:text-violet-300/80">
              La réconciliation s'exécute automatiquement tous les jours à 2h du matin. 
              Elle vérifie la cohérence des paiements, payouts et balances pour chaque marchand.
            </p>
            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Paiements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Reversements</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Balances</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Doublons</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

