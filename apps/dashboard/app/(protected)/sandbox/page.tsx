'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Send, History, Copy, Check, AlertCircle, Eye, Filter, X, AlignLeft, Code, Zap } from 'lucide-react';

import { useAuth } from '../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumTableContainer, PremiumEmptyState } from '../../../components/premium-ui';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/v1';

interface ExamplePayload {
  [key: string]: Record<string, unknown>;
}

interface SimulationResult {
  id: string;
  endpoint: string;
  payload: Record<string, unknown>;
  headers?: Record<string, string>;
  response?: {
    status: number;
    statusText: string;
    body?: unknown;
  };
  simulatedAt: string;
}

export default function SandboxPage() {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [endpoint, setEndpoint] = useState('https://example.com/webhook');
  const [eventType, setEventType] = useState('payment_succeeded');
  const [payload, setPayload] = useState('{}');
  const [examplePayloads, setExamplePayloads] = useState<ExamplePayload>({});
  const [history, setHistory] = useState<SimulationResult[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationResult | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [filters, setFilters] = useState({
    eventType: '',
    status: '',
  });

  useEffect(() => {
    if (!auth || !auth.accessToken) return;

    fetchExamplePayloads();
    fetchHistory();
  }, [auth]);

  const fetchExamplePayloads = async () => {
    if (!auth || !auth.accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/sandbox/webhooks/examples`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setExamplePayloads(data);
        if (data[eventType]) {
          setPayload(JSON.stringify(data[eventType], null, 2));
        }
      }
    } catch (err) {
      console.error('Error fetching examples:', err);
    }
  };

  const fetchHistory = async () => {
    if (!auth || !auth.accessToken) return;

    try {
      const res = await fetch(`${API_BASE_URL}/admin/sandbox/webhooks/history?limit=20`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const handleEventTypeChange = (newEventType: string) => {
    setEventType(newEventType);
    if (examplePayloads[newEventType]) {
      setPayload(JSON.stringify(examplePayloads[newEventType], null, 2));
      setJsonError(null);
    }
  };

  const validateJSON = (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      setJsonError(null);
      return true;
    } catch (err) {
      setJsonError('JSON invalide');
      return false;
    }
  };

  const handlePayloadChange = (value: string) => {
    setPayload(value);
    validateJSON(value);
  };

  const formatJSON = () => {
    if (!validateJSON(payload)) {
      setError('Impossible de formater : JSON invalide');
      return;
    }

    try {
      const parsed = JSON.parse(payload);
      setPayload(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err) {
      setError('Erreur lors du formatage du JSON');
    }
  };

  const getEventType = (item: SimulationResult): string => {
    return (item.headers?.['X-Webhook-Event'] as string) || 
           (item.payload as any)?.type || 
           'N/A';
  };

  const getStatusCategory = (item: SimulationResult): string => {
    if (!item.response) return 'N/A';
    const status = item.response.status;
    if (status >= 200 && status < 300) return 'success';
    if (status >= 400 && status < 500) return 'error';
    if (status >= 500) return 'server-error';
    return 'other';
  };

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      if (filters.eventType && getEventType(item) !== filters.eventType) {
        return false;
      }
      if (filters.status && getStatusCategory(item) !== filters.status) {
        return false;
      }
      return true;
    });
  }, [history, filters]);

  const uniqueEventTypes = useMemo(() => {
    const types = new Set<string>();
    history.forEach((item) => {
      const type = getEventType(item);
      if (type !== 'N/A') {
        types.add(type);
      }
    });
    return Array.from(types).sort();
  }, [history]);

  const handleViewDetails = (item: SimulationResult) => {
    setSelectedSimulation(item);
    setShowDetailsDialog(true);
  };

  const handleSimulate = async () => {
    if (!auth || !auth.accessToken) return;

    if (!validateJSON(payload)) {
      setError('Veuillez corriger le JSON avant de simuler');
      return;
    }

    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      setError('L\'URL de l\'endpoint doit commencer par http:// ou https://');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const parsedPayload = JSON.parse(payload);

      const res = await fetch(`${API_BASE_URL}/admin/sandbox/webhooks/simulate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          endpoint,
          eventType,
          payload: parsedPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Erreur lors de la simulation' }));
        throw new Error(errorData.message || `Erreur ${res.status}`);
      }

      const result = await res.json();
      setSuccess(`Webhook simulé avec succès ! Status: ${result.response?.status || 'N/A'}`);
      
      await fetchHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la simulation');
      console.error('Error simulating webhook:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getStatusBadgeClass = (status?: number): string => {
    if (!status) return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';
    if (status >= 200 && status < 300) return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    if (status >= 400) return 'bg-red-500/10 text-red-600 dark:text-red-400';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  };

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Sandbox"
        highlight="Webhooks"
        description="Testez vos webhooks sans impact sur vos données réelles"
        badge="Environnement de test"
        badgeIcon={<FlaskConical className="w-3.5 h-3.5 text-violet-400" />}
        stats={[
          { value: history.length, label: 'Simulations' },
          { value: Object.keys(examplePayloads).length, label: 'Types' },
        ]}
      />

      {/* Messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-red-500/10 to-rose-500/10 border border-red-500/20 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-red-500/20">
            <AlertCircle className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center gap-3"
        >
          <div className="p-2 rounded-lg bg-emerald-500/20">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-emerald-600 dark:text-emerald-400 font-medium">{success}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccess(null)}
            className="ml-auto"
          >
            <X className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {/* Simulation Form */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-xl">Simuler un Webhook</CardTitle>
              <CardDescription>
                Choisissez un type d'événement et configurez votre webhook
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Endpoint */}
          <div className="space-y-2">
            <Label htmlFor="endpoint" className="font-semibold">URL de l'endpoint *</Label>
            <Input
              id="endpoint"
              type="url"
              placeholder="https://example.com/webhook"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="h-12 rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-zinc-500">
              L'URL où le webhook sera envoyé (simulation uniquement)
            </p>
          </div>

          {/* Event Type */}
          <div className="space-y-2">
            <Label htmlFor="eventType" className="font-semibold">Type d'événement *</Label>
            <select
              id="eventType"
              value={eventType}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="flex h-12 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
            >
              {Object.keys(examplePayloads).map((type) => (
                <option key={type} value={type}>
                  {type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500">
              Sélectionnez un type d'événement pour charger un exemple de payload
            </p>
          </div>

          {/* Payload Editor */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="payload" className="font-semibold flex items-center gap-2">
                <Code className="w-4 h-4 text-violet-500" />
                Payload JSON *
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={formatJSON}
                  disabled={!!jsonError}
                  className="rounded-lg"
                >
                  <AlignLeft className="w-4 h-4 mr-1" />
                  Formater
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(payload, 'payload')}
                  className="rounded-lg"
                >
                  {copied === 'payload' ? (
                    <Check className="w-4 h-4 mr-1 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 mr-1" />
                  )}
                  Copier
                </Button>
              </div>
            </div>
            <div className="relative">
              <textarea
                id="payload"
                value={payload}
                onChange={(e) => handlePayloadChange(e.target.value)}
                className={cn(
                  "w-full min-h-[300px] p-4 border rounded-xl bg-zinc-50 dark:bg-zinc-900 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 resize-y",
                  jsonError 
                    ? "border-red-500 focus:ring-red-500" 
                    : "border-zinc-200 dark:border-zinc-800"
                )}
              />
              {jsonError && (
                <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-red-500/10 text-red-600 text-xs font-medium">
                  {jsonError}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSimulate}
            disabled={loading || !!jsonError}
            className="w-full h-14 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold text-base shadow-lg shadow-violet-500/25"
          >
            {loading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-5 h-5 mr-2 border-2 border-white/30 border-t-white rounded-full"
                />
                Simulation en cours...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 mr-2" />
                Simuler le Webhook
              </>
            )}
          </Button>
        </CardContent>
      </PremiumCard>

      {/* History */}
      <PremiumCard hoverable={false}>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
              <History className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">Historique des Simulations</CardTitle>
              <CardDescription>
                {filteredHistory.length} simulation{filteredHistory.length > 1 ? 's' : ''} sur {history.length}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-semibold">Filtres</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-event-type" className="text-xs font-medium">Type d'événement</Label>
                  <select
                    id="filter-event-type"
                    value={filters.eventType}
                    onChange={(e) => setFilters({ ...filters, eventType: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-sm"
                  >
                    <option value="">Tous les types</option>
                    {uniqueEventTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="filter-status" className="text-xs font-medium">Statut</Label>
                  <select
                    id="filter-status"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="flex h-10 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-1 text-sm"
                  >
                    <option value="">Tous les statuts</option>
                    <option value="success">Succès (2xx)</option>
                    <option value="error">Erreur client (4xx)</option>
                    <option value="server-error">Erreur serveur (5xx)</option>
                  </select>
                </div>
              </div>
              {(filters.eventType || filters.status) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ eventType: '', status: '' })}
                  className="mt-3 rounded-lg"
                >
                  <X className="w-3 h-3 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </motion.div>
          )}

          {filteredHistory.length === 0 ? (
            <PremiumEmptyState
              icon={<FlaskConical className="w-8 h-8" />}
              title="Aucune simulation"
              description="Lancez votre première simulation de webhook"
            />
          ) : (
            <PremiumTableContainer>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-zinc-200 dark:border-zinc-800">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Endpoint</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-zinc-200 dark:border-zinc-800"
                    >
                      <TableCell className="text-sm">
                        {new Date(item.simulatedAt).toLocaleString('fr-FR')}
                      </TableCell>
                      <TableCell className="font-mono text-xs max-w-[200px] truncate text-zinc-500">
                        {item.endpoint}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                          {getEventType(item)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {item.response ? (
                          <span className={cn(
                            "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold",
                            getStatusBadgeClass(item.response.status)
                          )}>
                            {item.response.status} {item.response.statusText}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-500/10 text-zinc-500">
                            N/A
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(item)}
                            className="rounded-lg hover:bg-violet-500/10 hover:text-violet-600"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(JSON.stringify(item.payload, null, 2), item.id)}
                            className="rounded-lg hover:bg-violet-500/10 hover:text-violet-600"
                          >
                            {copied === item.id ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </PremiumTableContainer>
          )}
        </CardContent>
      </PremiumCard>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                <Eye className="w-5 h-5" />
              </div>
              Détails de la Simulation
            </DialogTitle>
            <DialogDescription>
              {selectedSimulation && new Date(selectedSimulation.simulatedAt).toLocaleString('fr-FR')}
            </DialogDescription>
          </DialogHeader>
          
          {selectedSimulation && (
            <div className="space-y-6 mt-4">
              {/* Endpoint */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Endpoint</Label>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl font-mono text-sm break-all border border-zinc-200 dark:border-zinc-700">
                  {selectedSimulation.endpoint}
                </div>
              </div>

              {/* Event Type */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Type d'événement</Label>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg text-sm font-medium bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    {getEventType(selectedSimulation)}
                  </span>
                </div>
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Headers</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(selectedSimulation.headers || {}, null, 2), 'dialog-headers')}
                    className="rounded-lg"
                  >
                    {copied === 'dialog-headers' ? (
                      <Check className="w-4 h-4 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    Copier
                  </Button>
                </div>
                <pre className="p-4 bg-zinc-900 dark:bg-zinc-950 rounded-xl text-xs overflow-x-auto text-zinc-300 border border-zinc-800">
                  {JSON.stringify(selectedSimulation.headers || {}, null, 2)}
                </pre>
              </div>

              {/* Payload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Payload</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(selectedSimulation.payload, null, 2), 'dialog-payload')}
                    className="rounded-lg"
                  >
                    {copied === 'dialog-payload' ? (
                      <Check className="w-4 h-4 mr-1 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4 mr-1" />
                    )}
                    Copier
                  </Button>
                </div>
                <pre className="p-4 bg-zinc-900 dark:bg-zinc-950 rounded-xl text-xs overflow-x-auto max-h-[300px] overflow-y-auto text-zinc-300 border border-zinc-800">
                  {JSON.stringify(selectedSimulation.payload, null, 2)}
                </pre>
              </div>

              {/* Response */}
              {selectedSimulation.response && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">Réponse</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(JSON.stringify(selectedSimulation.response, null, 2), 'dialog-response')}
                      className="rounded-lg"
                    >
                      {copied === 'dialog-response' ? (
                        <Check className="w-4 h-4 mr-1 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4 mr-1" />
                      )}
                      Copier
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-700">
                      <span className="text-sm font-medium">Status:</span>
                      <span className={cn(
                        "inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold",
                        getStatusBadgeClass(selectedSimulation.response.status)
                      )}>
                        {selectedSimulation.response.status} {selectedSimulation.response.statusText}
                      </span>
                    </div>
                    {selectedSimulation.response.body !== undefined && selectedSimulation.response.body !== null ? (
                      <div>
                        <span className="text-xs font-medium block mb-2 text-zinc-500">Body:</span>
                        <pre className="p-4 bg-zinc-900 dark:bg-zinc-950 rounded-xl text-xs overflow-x-auto max-h-[200px] overflow-y-auto text-zinc-300 border border-zinc-800">
                          {typeof selectedSimulation.response.body === 'string' 
                            ? selectedSimulation.response.body 
                            : JSON.stringify(selectedSimulation.response.body, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
