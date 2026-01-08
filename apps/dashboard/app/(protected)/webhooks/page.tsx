'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Webhook, Settings, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';

import WebhookDeliveriesTable from '../../../components/WebhookDeliveriesTable';
import WebhookConfigForm from '../../../components/WebhookConfigForm';
import type { WebhookDeliveriesResponse, WebhookConfig } from '../../../lib/types';
import { useAuth } from '../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumStatCard, PremiumLoader, PremiumBadge } from '../../../components/premium-ui';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { apiUrl } from '@/lib/api-client';

type Filters = {
  status?: string;
  limit: number;
};

const initialFilters: Filters = {
  status: '',
  limit: 20,
};

export default function WebhooksPage() {
  const { auth, logout } = useAuth();
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [data, setData] = useState<WebhookDeliveriesResponse | null>(null);
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfigForm, setShowConfigForm] = useState(false);

  const params = useMemo(() => {
    const search = new URLSearchParams();
    if (filters.status) search.set('status', filters.status);
    search.set('limit', String(filters.limit));
    return search.toString();
  }, [filters]);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth) return;
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(apiUrl(`admin/webhooks?${params}`), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (response.status === 401) {
          logout();
          return;
        }

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erreur ${response.status}: ${errorText || 'Impossible de récupérer les webhooks'}`);
        }
        const payload = (await response.json()) as WebhookDeliveriesResponse;
        setData(payload);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur inattendue');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [auth, params]);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!auth) return;
      setConfigLoading(true);

      try {
        const response = await fetch(apiUrl('admin/webhooks/config'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        });

        if (response.status === 401) {
          return;
        }

        if (response.ok) {
          const payload = (await response.json()) as WebhookConfig;
          setConfig(payload);
        }
      } catch (err) {
        // Ignore errors for config fetch
      } finally {
        setConfigLoading(false);
      }
    };
    fetchConfig();
  }, [auth]);

  const handleSaveConfig = async (webhookUrl: string | undefined, webhookSecret: string | undefined) => {
    if (!auth) throw new Error('Non authentifié');

    const response = await fetch(apiUrl('admin/webhooks/config'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.accessToken}`,
      },
      body: JSON.stringify({
        webhookUrl,
        webhookSecret: webhookSecret || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Erreur ${response.status}`);
    }

    const updated = (await response.json()) as WebhookConfig;
    setConfig(updated);
    setShowConfigForm(false);
  };

  const stats = data
    ? data.items.reduce(
        (acc, item) => {
          acc.total++;
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        },
        { total: 0, PENDING: 0, PROCESSING: 0, SUCCEEDED: 0, FAILED: 0 } as Record<string, number>,
      )
    : { total: 0, PENDING: 0, PROCESSING: 0, SUCCEEDED: 0, FAILED: 0 };

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Webhooks"
        description="Configurez et surveillez les webhooks envoyés à votre serveur"
        icon={<Webhook className="w-7 h-7 text-white" />}
        badge="Intégration"
        actions={
          <Button 
            onClick={() => setShowConfigForm(!showConfigForm)}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-xl"
            variant="outline"
          >
            <Settings className="w-4 h-4 mr-2" />
          {showConfigForm ? 'Masquer' : 'Configurer'}
        </Button>
        }
      />

      {/* Configuration Form */}
      {showConfigForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
        <WebhookConfigForm
          initialConfig={config || undefined}
          onSave={handleSaveConfig}
          onCancel={() => setShowConfigForm(false)}
        />
        </motion.div>
      )}

      {/* Current Config */}
      {config && !showConfigForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <PremiumCard hoverable={false}>
          <CardHeader>
              <CardTitle className="text-lg font-bold">Configuration actuelle</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-sm text-zinc-500 mb-1">URL du webhook</p>
                  <p className="font-mono text-sm break-all">
                    {config.webhookUrl || <span className="text-zinc-400">Non configuré</span>}
                </p>
              </div>
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-sm text-zinc-500 mb-1">Secret</p>
                  <p className="text-sm flex items-center gap-2">
                  {config.hasSecret ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Configuré</span>
                      </>
                  ) : (
                      <span className="text-zinc-400">Non configuré</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
          </PremiumCard>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid gap-4 md:grid-cols-5"
      >
        <PremiumStatCard
          title="Total"
          value={stats.total.toString()}
          description="webhooks"
          icon={<Webhook className="w-5 h-5" />}
        />
        <PremiumStatCard
          title="En attente"
          value={stats.PENDING.toString()}
          icon={<Clock className="w-5 h-5" />}
        />
        <PremiumStatCard
          title="En cours"
          value={stats.PROCESSING.toString()}
          icon={<Loader2 className="w-5 h-5" />}
        />
        <PremiumStatCard
          title="Réussis"
          value={stats.SUCCEEDED.toString()}
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <PremiumStatCard
          title="Échoués"
          value={stats.FAILED.toString()}
          icon={<XCircle className="w-5 h-5" />}
        />
      </motion.div>

      {/* Filters */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <CardTitle className="text-lg font-bold">Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <PremiumLoader message="Chargement des webhooks..." />
      ) : error ? (
        <PremiumCard hoverable={false}>
          <CardContent className="pt-6">
            <p className="text-red-500">{error}</p>
          </CardContent>
        </PremiumCard>
      ) : data ? (
        <PremiumCard hoverable={false} className="p-0 overflow-hidden">
          <CardHeader className="border-b border-zinc-200 dark:border-zinc-800">
            <CardTitle className="text-lg font-bold">Livraisons de webhooks</CardTitle>
            <CardDescription>
              {data.items.length} webhook{data.items.length > 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <WebhookDeliveriesTable items={data.items} />
          </CardContent>
        </PremiumCard>
      ) : null}
    </div>
  );
}
