'use client';

import { useEffect, useState } from 'react';
import { Plug, Settings, CheckCircle2, Circle, ExternalLink, Info, Key, X, Loader2, TestTube, Zap, Copy, Eye, EyeOff, Plus, Trash2, Shield, Code, AlertCircle, AlertTriangle } from 'lucide-react';
import Image from 'next/image';

import { useAuth } from '../../../context/AuthContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumSectionHeader, PremiumButton } from '../../../components/premium-ui';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiUrl } from '@/lib/api-client';
import { cn } from '@/lib/utils';

type ApiKey = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  status: string;
};

type ProviderStatus = {
  connected: boolean;
  hasCredentials: boolean;
  provider: 'STRIPE' | 'EBILLING' | 'SHAP' | 'MONEROO';
};

type IntegrationItem = {
  id: 'stripe' | 'ebilling' | 'shap' | 'moneroo';
  name: string;
  description: string;
  logo: string;
  status?: ProviderStatus;
  gradient: string;
};

export default function IntegrationsPage() {
  const { auth } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState<'ebilling' | 'shap' | 'moneroo' | null>(null);
  
  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Revoke confirmation dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  
  // Error dialog
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchApiKeys = async () => {
    if (!auth) return;
    setLoadingKeys(true);
    try {
      const response = await fetch(apiUrl('admin/api-keys'), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (response.ok) {
        const keys = await response.json();
        setApiKeys(keys);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur lors de la récupération des clés API:', errorData);
        if (response.status === 401 || response.status === 403) {
          setErrorMessage('Vous n\'avez pas les permissions nécessaires pour accéder aux clés API. Veuillez vous connecter en tant que marchand.');
          setErrorDialogOpen(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des clés API:', error);
    } finally {
      setLoadingKeys(false);
    }
  };

  const createApiKey = async () => {
    if (!auth) return;
    setCreatingKey(true);
    try {
      const response = await fetch(apiUrl('admin/api-keys'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({ label: newKeyLabel || undefined }),
      });
      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.apiKey);
        setNewKeyLabel('');
        fetchApiKeys();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur lors de la création de la clé API:', errorData);
        if (response.status === 401 || response.status === 403) {
          setErrorMessage(errorData.message || 'Vous n\'avez pas les permissions nécessaires pour créer une clé API. Veuillez vous connecter en tant que marchand.');
          setErrorDialogOpen(true);
        } else {
          setErrorMessage(errorData.message || 'Erreur lors de la création de la clé API');
          setErrorDialogOpen(true);
        }
      }
    } catch (error) {
      console.error('Erreur lors de la création de la clé API:', error);
      setErrorMessage('Erreur lors de la création de la clé API. Veuillez réessayer.');
      setErrorDialogOpen(true);
    } finally {
      setCreatingKey(false);
    }
  };

  const openRevokeDialog = (keyId: string) => {
    setKeyToRevoke(keyId);
    setRevokeDialogOpen(true);
  };

  const revokeApiKey = async () => {
    if (!auth || !keyToRevoke) return;
    setRevoking(true);
    try {
      const response = await fetch(apiUrl(`admin/api-keys/${keyToRevoke}/revoke`), {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (response.ok) {
        setRevokeDialogOpen(false);
        setKeyToRevoke(null);
        fetchApiKeys();
      } else {
        const error = await response.json().catch(() => ({}));
        setErrorMessage(error.message || 'Erreur lors de la révocation');
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors de la révocation de la clé API:', error);
      setErrorMessage('Erreur lors de la révocation. Veuillez réessayer.');
      setErrorDialogOpen(true);
    } finally {
      setRevoking(false);
    }
  };

  const openDeleteDialog = (keyId: string) => {
    setKeyToDelete(keyId);
    setDeleteDialogOpen(true);
  };

  const deleteApiKey = async () => {
    if (!auth || !keyToDelete) return;
    setDeleting(true);
    try {
      const response = await fetch(apiUrl(`admin/api-keys/${keyToDelete}`), {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      if (response.ok) {
        setDeleteDialogOpen(false);
        setKeyToDelete(null);
        fetchApiKeys();
      } else {
        const error = await response.json().catch(() => ({}));
        setErrorMessage(error.message || 'Erreur lors de la suppression');
        setErrorDialogOpen(true);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression de la clé API:', error);
      setErrorMessage('Erreur lors de la suppression. Veuillez réessayer.');
      setErrorDialogOpen(true);
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = async (text: string, keyId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const fetchStatuses = async () => {
    if (!auth) return;

    try {
      const [stripeStatus, ebillingStatus, shapStatus, monerooStatus] = await Promise.all([
        fetch(apiUrl('providers/stripe/connect/status'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }).then((r) => r.json().catch(() => ({ connected: false }))),
        fetch(apiUrl('providers/ebilling/onboarding/status'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }).then((r) => r.json().catch(() => ({ connected: false }))),
        fetch(apiUrl('providers/shap/onboarding/status'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }).then((r) => r.json().catch(() => ({ connected: false }))),
        fetch(apiUrl('providers/moneroo/onboarding/status'), {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        }).then((r) => r.json().catch(() => ({ connected: false }))),
      ]);

      setIntegrations([
        {
          id: 'stripe',
          name: 'Stripe',
          description: 'Paiements par carte via Stripe Connect',
          logo: '/logo-stripe.png',
          gradient: 'from-cyan-500 to-cyan-600',
          status: {
            connected: stripeStatus.connected || false,
            hasCredentials: stripeStatus.connected || false,
            provider: 'STRIPE',
          } as ProviderStatus,
        },
        {
          id: 'ebilling',
          name: 'eBilling',
          description: 'Mobile Money (MTN, Orange, Moov)',
          logo: '/logo-ebilling.png',
          gradient: 'from-cyan-500 to-cyan-600',
          status: ebillingStatus as ProviderStatus,
        },
        {
          id: 'moneroo',
          name: 'Moneroo',
          description: 'Paiements Mobile Money et cartes (multi-pays)',
          logo: '/logo-moneroo.png',
          gradient: 'from-cyan-500 to-cyan-600',
          status: monerooStatus as ProviderStatus,
        },
        {
          id: 'shap',
          name: 'SHAP (eBilling Payouts)',
          description: 'Paiements sortants Mobile Money',
          logo: '/logo-shap.png',
          gradient: 'from-cyan-500 to-cyan-600',
          status: shapStatus as ProviderStatus,
        },
      ]);
    } catch (error) {
      console.error('Erreur lors de la récupération des statuts d\'intégration', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
    fetchApiKeys();
  }, [auth]);

  const handleConfigure = (provider: 'ebilling' | 'shap' | 'moneroo') => {
    console.log('handleConfigure called with provider:', provider);
    setSelectedProvider(provider);
  };

  const handleModalClose = () => {
    setSelectedProvider(null);
    fetchStatuses();
  };

  const connectedCount = integrations.filter(i => i.status?.connected).length;

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Intégrations"
        description="Gérez vos connexions aux prestataires de paiement"
        icon={<Plug className="w-7 h-7 text-white" />}
        badge="Passerelles de paiement"
        stats={[
          { value: connectedCount, label: 'Connectées' },
          { value: integrations.length, label: 'Disponibles' },
        ]}
      />

      {/* Loading State */}
      {loading ? (
        <PremiumLoader message="Chargement des intégrations..." />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {integrations.map((integration, index) => (
            <div
              key={integration.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${index * 100}ms`, animationFillMode: 'backwards' }}
            >
              <IntegrationCard
              integration={integration}
              onConfigure={handleConfigure}
            />
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          API KEYS SECTION
      ═══════════════════════════════════════════════════════════════ */}
      <div className="mt-12">
        <PremiumSectionHeader
          title="Clés API"
          description="Gérez vos clés d'accès à l'API BoohPay"
          actions={
            <PremiumButton onClick={() => setShowCreateDialog(true)} icon={<Plus className="w-4 h-4" />}>
              Nouvelle clé
            </PremiumButton>
          }
        />

        <PremiumCard>
          {loadingKeys ? (
            <PremiumLoader message="Chargement des clés API..." size="sm" />
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 flex items-center justify-center mb-4">
                <Key className="w-8 h-8 text-[#08c2db]" />
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Aucune clé API</h3>
              <p className="text-sm text-zinc-500 mb-6">Créez votre première clé API pour intégrer BoohPay</p>
              <PremiumButton onClick={() => setShowCreateDialog(true)} icon={<Plus className="w-4 h-4" />}>
                Créer une clé API
              </PremiumButton>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {apiKeys.map((key) => (
                <div key={key.id} className="flex items-center justify-between py-4 px-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 flex items-center justify-center">
                      <Key className="w-5 h-5 text-cyan-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-white">
                          {key.label || 'Clé sans nom'}
                        </span>
                        <PremiumBadge variant={key.status === 'ACTIVE' ? 'success' : 'error'}>
                          {key.status === 'ACTIVE' ? 'Active' : 'Révoquée'}
                        </PremiumBadge>
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <code className="text-xs text-zinc-500 font-mono">
                          {visibleKeys.has(key.id) ? key.id : `${key.id.slice(0, 12)}...`}
                        </code>
                        <span className="text-xs text-zinc-400">
                          Créée le {new Date(key.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        {key.lastUsedAt && (
                          <span className="text-xs text-zinc-400">
                            Dernière utilisation: {new Date(key.lastUsedAt).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleKeyVisibility(key.id)}
                      className="rounded-lg"
                      title="Afficher/Masquer"
                    >
                      {visibleKeys.has(key.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(key.id, key.id)}
                      className="rounded-lg"
                      title="Copier"
                    >
                      {copiedKey === key.id ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    {key.status === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openRevokeDialog(key.id)}
                        className="rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                        title="Révoquer"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteDialog(key.id)}
                      className="rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PremiumCard>

        {/* Info Card */}
        <div className="mt-6 rounded-xl bg-gradient-to-r from-cyan-50 via-cyan-50 to-cyan-50 dark:from-cyan-950/20 dark:via-cyan-950/20 dark:to-cyan-950/20 border border-cyan-100 dark:border-cyan-800 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/30">
              <Shield className="w-5 h-5 text-cyan-600" />
            </div>
            <div>
              <h4 className="font-semibold text-cyan-900 dark:text-cyan-100 mb-1">Sécurité des clés API</h4>
              <p className="text-sm text-cyan-700/80 dark:text-cyan-300/80">
                Vos clés API permettent d'accéder à l'API BoohPay. Gardez-les secrètes et ne les partagez jamais. 
                Utilisez les variables d'environnement pour les stocker dans vos applications.
              </p>
              <div className="mt-3 p-3 rounded-lg bg-zinc-900 dark:bg-zinc-800">
                <code className="text-xs text-emerald-400">
                  BOOHPAY_API_KEY=bpk_live_xxxxxxxxxxxx
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-600" />
              Créer une clé API
            </DialogTitle>
            <DialogDescription>
              Créez une nouvelle clé API pour intégrer BoohPay dans vos applications
            </DialogDescription>
          </DialogHeader>

          {newApiKey ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-800 dark:text-emerald-200">Clé créée avec succès !</span>
                </div>
                <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-3">
                  Copiez cette clé maintenant. Elle ne sera plus visible après fermeture.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 rounded-lg bg-white dark:bg-zinc-900 border text-sm font-mono break-all">
                    {newApiKey}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newApiKey, 'new')}
                    className="rounded-lg shrink-0"
                  >
                    {copiedKey === 'new' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <Button
                onClick={() => {
                  setNewApiKey(null);
                  setShowCreateDialog(false);
                }}
                className="w-full rounded-xl bg-gradient-to-r from-violet-500 to-purple-600"
              >
                Fermer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyLabel" className="font-semibold">Nom de la clé (optionnel)</Label>
                <Input
                  id="keyLabel"
                  type="text"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  placeholder="Ex: Production, Développement, App mobile..."
                  className="mt-2 rounded-xl"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Un nom pour identifier facilement cette clé
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  className="flex-1 rounded-xl"
                >
                  Annuler
                </Button>
                <Button
                  onClick={createApiKey}
                  disabled={creatingKey}
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600"
                >
                  {creatingKey ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Provider Config Modals */}
      {selectedProvider === 'ebilling' && (
        <EbillingConfigModal onClose={handleModalClose} onSuccess={handleModalClose} />
      )}

      {selectedProvider === 'shap' && (
        <ShapConfigModal onClose={handleModalClose} onSuccess={handleModalClose} />
      )}

      {selectedProvider === 'moneroo' && (
        <MonerooConfigModal onClose={handleModalClose} onSuccess={handleModalClose} />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                <Trash2 className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                Supprimer la clé API
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-zinc-600 dark:text-zinc-400">
              Êtes-vous sûr de vouloir supprimer définitivement cette clé API ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <strong>Cette action est irréversible.</strong> Une fois supprimée, cette clé API ne pourra plus être utilisée pour accéder à l'API BoohPay. Toutes les applications utilisant cette clé cesseront de fonctionner.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setKeyToDelete(null);
              }}
              disabled={deleting}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={deleteApiKey}
              disabled={deleting}
              className="flex-1 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                <X className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                Révoquer la clé API
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-zinc-600 dark:text-zinc-400">
              Êtes-vous sûr de vouloir révoquer cette clé API ?
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                La clé API sera désactivée et ne pourra plus être utilisée. Vous pourrez toujours la supprimer définitivement plus tard si nécessaire.
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setRevokeDialogOpen(false);
                setKeyToRevoke(null);
              }}
              disabled={revoking}
              className="flex-1 rounded-xl"
            >
              Annuler
            </Button>
            <Button
              onClick={revokeApiKey}
              disabled={revoking}
              className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700"
            >
              {revoking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Révocation...
                </>
              ) : (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Révoquer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error Dialog */}
      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <DialogTitle className="text-xl font-bold text-zinc-900 dark:text-white">
                Erreur
              </DialogTitle>
            </div>
            <DialogDescription className="text-base text-zinc-600 dark:text-zinc-400">
              {errorMessage || 'Une erreur est survenue. Veuillez réessayer.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button
              onClick={() => setErrorDialogOpen(false)}
              className="rounded-xl bg-gradient-to-r from-violet-500 to-purple-600"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type IntegrationCardProps = {
  integration: IntegrationItem;
  onConfigure: (provider: 'ebilling' | 'shap' | 'moneroo') => void;
};

function IntegrationCard({ integration, onConfigure }: IntegrationCardProps) {
  const { auth } = useAuth();
  const isConnected = integration.status?.connected ?? false;
  const canConfigure = integration.id === 'ebilling' || integration.id === 'shap' || integration.id === 'moneroo';

  const handleStripeConnect = async () => {
    if (!auth) return;
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
    } catch (error) {
      console.error('Erreur lors de la création du lien Stripe Connect', error);
      alert(error instanceof Error ? error.message : 'Erreur lors de la création du lien');
    }
  };

  return (
    <PremiumCard className="relative overflow-hidden group" hoverable>
      {/* Background gradient effect */}
      <div className={cn(
        "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
        `bg-gradient-to-br ${integration.gradient}`
      )} style={{ opacity: 0.03 }} />
      
      <CardHeader className="relative z-10 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className={cn(
                "absolute inset-0 rounded-xl blur-lg opacity-50 pointer-events-none",
                `bg-gradient-to-br ${integration.gradient}`
              )} />
              <div className="relative p-3 rounded-xl bg-white dark:bg-zinc-800 shadow-lg border border-zinc-200 dark:border-zinc-700">
              <Image
                src={integration.logo}
                alt={integration.name}
                  width={32}
                height={32}
                className="object-contain"
                  style={{ width: 'auto', height: 'auto' }}
              />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{integration.name}</CardTitle>
              <CardDescription className="text-sm mt-1">
                {integration.description}
              </CardDescription>
            </div>
          </div>
          <PremiumBadge variant={isConnected ? 'success' : 'default'}>
            {isConnected ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connecté
              </>
            ) : (
              <>
                <Circle className="w-3 h-3 mr-1" />
                Non connecté
              </>
            )}
          </PremiumBadge>
        </div>
      </CardHeader>
      <CardContent className="relative z-10 pt-2">
        {canConfigure && (
          <Button
            type="button"
            variant={isConnected ? 'outline' : 'default'}
            className={cn(
              "w-full rounded-xl transition-all relative z-10",
              !isConnected && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('Configure button clicked for:', integration.id);
              onConfigure(integration.id as 'ebilling' | 'shap' | 'moneroo');
            }}
          >
            {isConnected ? (
              <>
                <Settings className="w-4 h-4 mr-2" />
                Reconfigurer
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Connecter
              </>
            )}
          </Button>
        )}

        {integration.id === 'stripe' && (
          <Button
            type="button"
            variant={isConnected ? 'outline' : 'default'}
            className={cn(
              "w-full rounded-xl mt-2 transition-all relative z-10",
              !isConnected && "bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25"
            )}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleStripeConnect();
            }}
          >
            {isConnected ? (
              <>
                <ExternalLink className="w-4 h-4 mr-2" />
                Ouvrir Stripe Express
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Connecter Stripe Connect
              </>
            )}
          </Button>
        )}
      </CardContent>
    </PremiumCard>
  );
}

// Modal pour configurer eBilling
function EbillingConfigModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    sharedKey: '',
    baseUrl: 'https://stg.billing-easy.com/api/v1/merchant',
  });

  const handleTest = async () => {
    if (!auth || !formData.username || !formData.sharedKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(apiUrl('providers/ebilling/onboarding/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          username: formData.username,
          sharedKey: formData.sharedKey,
          baseUrl: formData.baseUrl || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setTestResult({
            success: false,
            message: 'Session expirée. Veuillez vous reconnecter.',
          });
          return;
        }

        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!auth || !formData.username || !formData.sharedKey || !testResult?.success) return;

    setLoading(true);

    try {
      const response = await fetch(apiUrl('providers/ebilling/onboarding/connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          username: formData.username,
          sharedKey: formData.sharedKey,
          baseUrl: formData.baseUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erreur de connexion');
      }

      onSuccess();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Configurer eBilling</DialogTitle>
          <DialogDescription>
            Connectez votre compte eBilling pour activer les paiements Mobile Money
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-sm">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
              <div className="text-cyan-800 dark:text-cyan-200">
                <strong>Note :</strong> eBilling utilise <strong>username + sharedKey</strong> (pas une clé API). Ces identifiants sont fournis par eBilling lors de l'inscription.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="font-semibold">
                Nom d'utilisateur eBilling <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Votre nom d'utilisateur eBilling"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sharedKey" className="font-semibold">
                Clé partagée eBilling <span className="text-red-500">*</span>
              </Label>
              <Input
                id="sharedKey"
                type="password"
                value={formData.sharedKey}
                onChange={(e) => setFormData({ ...formData, sharedKey: e.target.value })}
                placeholder="Votre clé partagée"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseUrl" className="font-semibold">URL de base (optionnel)</Label>
              <Input
                id="baseUrl"
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://stg.billing-easy.com/api/v1/merchant"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            {testResult && (
              <div 
                className={cn(
                  'p-4 rounded-xl text-sm border flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
                testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                )}
              >
                  {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !formData.username || !formData.sharedKey}
                className="flex-1 rounded-xl"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Tester
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleConnect}
                disabled={loading || !testResult?.success}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Connecter
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal pour configurer SHAP
function ShapConfigModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    apiId: '',
    apiSecret: '',
    baseUrl: 'https://staging.billing-easy.net/shap/api/v1/merchant',
  });

  const handleTest = async () => {
    if (!auth || !formData.apiId || !formData.apiSecret) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(apiUrl('providers/shap/onboarding/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          apiId: formData.apiId,
          apiSecret: formData.apiSecret,
          baseUrl: formData.baseUrl || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setTestResult({
            success: false,
            message: 'Session expirée. Veuillez vous reconnecter.',
          });
          return;
        }

        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!auth || !formData.apiId || !formData.apiSecret || !testResult?.success) return;

    setLoading(true);

    try {
      const response = await fetch(apiUrl('providers/shap/onboarding/connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          apiId: formData.apiId,
          apiSecret: formData.apiSecret,
          baseUrl: formData.baseUrl || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erreur de connexion');
      }

      onSuccess();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Configurer SHAP</DialogTitle>
          <DialogDescription>
            Connectez votre compte SHAP pour activer les paiements sortants Mobile Money
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-sm">
            <div className="flex items-start gap-2">
              <Key className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
              <div className="text-cyan-800 dark:text-cyan-200">
                <strong>Note :</strong> SHAP utilise <strong>API ID + API Secret</strong> (clé API). Ces identifiants sont fournis par eBilling/SHAP lors de l'inscription pour les paiements sortants.
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiId" className="font-semibold">
                ID API SHAP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apiId"
                type="text"
                value={formData.apiId}
                onChange={(e) => setFormData({ ...formData, apiId: e.target.value })}
                placeholder="Votre ID API SHAP"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiSecret" className="font-semibold">
                Secret API SHAP <span className="text-red-500">*</span>
              </Label>
              <Input
                id="apiSecret"
                type="password"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
                placeholder="Votre secret API SHAP"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shapBaseUrl" className="font-semibold">URL de base (optionnel)</Label>
              <Input
                id="shapBaseUrl"
                type="text"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://staging.billing-easy.net/shap/api/v1/merchant"
                disabled={loading || testing}
                className="rounded-xl"
              />
            </div>

            {testResult && (
              <div 
                className={cn(
                  'p-4 rounded-xl text-sm border flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
                testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                )}
              >
                  {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !formData.apiId || !formData.apiSecret}
                className="flex-1 rounded-xl"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Tester
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleConnect}
                disabled={loading || !testResult?.success}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Connecter
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Modal pour configurer Moneroo
function MonerooConfigModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { auth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [formData, setFormData] = useState({
    secretKey: '',
    publicKey: '',
  });

  const handleTest = async () => {
    if (!auth || !formData.secretKey) return;

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(apiUrl('providers/moneroo/onboarding/test'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          secretKey: formData.secretKey,
          publicKey: formData.publicKey || undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setTestResult({
            success: false,
            message: 'Session expirée. Veuillez vous reconnecter.',
          });
          return;
        }

        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Erreur ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur lors du test',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    if (!auth || !formData.secretKey || !testResult?.success) return;

    setLoading(true);

    try {
      const response = await fetch(apiUrl('providers/moneroo/onboarding/connect'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify({
          secretKey: formData.secretKey,
          publicKey: formData.publicKey || undefined,
          environment: 'production',
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erreur de connexion');
      }

      onSuccess();
    } catch (error) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Erreur de connexion',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Configurer Moneroo</DialogTitle>
          <DialogDescription>
            Connectez votre compte Moneroo pour activer les paiements Mobile Money et cartes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800 text-sm">
            <div className="flex items-start gap-2">
              <Key className="w-4 h-4 mt-0.5 flex-shrink-0 text-cyan-600" />
              <div className="text-cyan-800 dark:text-cyan-200">
                <strong>Note :</strong> Moneroo utilise une <strong>clé API secrète</strong> pour l'authentification. Vous pouvez obtenir vos clés depuis le tableau de bord Moneroo (section Développeurs).
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monerooSecretKey" className="font-semibold">
                Clé API secrète Moneroo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="monerooSecretKey"
                type="password"
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
                placeholder="Votre clé API secrète Moneroo"
                disabled={loading || testing}
                className="rounded-xl"
              />
              <p className="text-xs text-zinc-500">
                Cette clé est utilisée pour authentifier les requêtes API côté serveur
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="monerooPublicKey" className="font-semibold">
                Clé API publique Moneroo (optionnel)
              </Label>
              <Input
                id="monerooPublicKey"
                type="text"
                value={formData.publicKey}
                onChange={(e) => setFormData({ ...formData, publicKey: e.target.value })}
                placeholder="Votre clé API publique (pour usage frontend)"
                disabled={loading || testing}
                className="rounded-xl"
              />
              <p className="text-xs text-zinc-500">
                Optionnel : pour les intégrations frontend via SDK JavaScript
              </p>
            </div>

            {testResult && (
              <div 
                className={cn(
                  'p-4 rounded-xl text-sm border flex items-center gap-2 animate-in fade-in slide-in-from-top-2',
                testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                )}
              >
                  {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <X className="w-4 h-4" />
                  )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTest}
                disabled={testing || !formData.secretKey}
                className="flex-1 rounded-xl"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Test en cours...
                  </>
                ) : (
                  <>
                    <TestTube className="w-4 h-4 mr-2" />
                    Tester
                  </>
                )}
              </Button>

              <Button
                type="button"
                onClick={handleConnect}
                disabled={loading || !testResult?.success}
                className="flex-1 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Connexion...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Connecter
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
