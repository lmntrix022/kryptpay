'use client';

import { useEffect, useState } from 'react';
import { BoohPayCheckout, BoohPayCheckoutSecure, detectAvailableWallets, type Locale } from '@boohpay/sdk';
import type { PaymentResponse } from '@boohpay/sdk/types';
import { useAuth } from '../../../context/AuthContext';
import { apiUrl } from '../../../lib/api-client';
import { 
  Zap, Key, ClipboardList, Edit3, CheckCircle2, Info, 
  Loader2, AlertCircle, Copy, RefreshCw, ArrowLeft, CreditCard, 
  Smartphone, Shield, AlertTriangle, Globe, Lock, CheckCircle, Gamepad2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { 
  PremiumHero, 
  PremiumCard, 
  PremiumLoader, 
  PremiumBadge,
  PremiumButton
} from '@/components/premium-ui';

type ApiKey = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  status: string;
};

type CheckoutMode = 'secure' | 'classic';

const LOCALES: { code: Locale; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
];

const PAYMENT_PROVIDERS = [
  {
    id: 'stripe' as const,
    name: 'Stripe',
    description: 'Cartes bancaires Visa, Mastercard, etc.',
    logo: '/logo-stripe.png',
    icon: CreditCard,
    supports: ['CARD'],
    testCard: '4242 4242 4242 4242',
  },
  {
    id: 'moneroo' as const,
    name: 'Moneroo',
    description: 'Paiement mobile Money international',
    logo: '/logo-moneroo.png',
    icon: Smartphone,
    supports: ['MOBILE_MONEY'],
    testPhone: '4149518161',
    currency: 'USD',
    amount: 1000,
  },
  {
    id: 'ebilling' as const,
    name: 'eBilling',
    description: 'Airtel Money, Moov Money (détection auto)',
    logo: '/logo-ebilling.png',
    icon: Smartphone,
    supports: ['MOBILE_MONEY'],
    testPhone: '074456389',
    currency: 'XAF',
    amount: 10000,
  },
];

export default function DemoPage() {
  const { auth } = useAuth();
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<(typeof PAYMENT_PROVIDERS)[number] | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [selectedApiKeyId, setSelectedApiKeyId] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newApiKeyId, setNewApiKeyId] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [useManualKey, setUseManualKey] = useState(false);
  
  // Nouvelles fonctionnalités
  const [checkoutMode, setCheckoutMode] = useState<CheckoutMode>('classic');
  const [locale, setLocale] = useState<Locale>('fr');
  const [availableWallets, setAvailableWallets] = useState({ applePay: false, googlePay: false, digitalWallets: false });
  const [stripeKey, setStripeKey] = useState('');

  const [apiKey, setApiKey] = useState('');
  // URL de base : utiliser localhost en développement
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/v1';

  // Détecter les wallets disponibles
  useEffect(() => {
    const wallets = detectAvailableWallets();
    setAvailableWallets(wallets);
  }, []);

  const fetchApiKeys = async () => {
    if (!auth) return;
    setLoadingKeys(true);
    try {
      const response = await fetch(apiUrl('admin/api-keys'), {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      
      if (response.status === 401) {
        setApiKeys([]);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}`);
      }

      const keys = await response.json();
      setApiKeys(keys);
      
      const storedNewKey = sessionStorage.getItem('newApiKey');
      const storedNewKeyId = sessionStorage.getItem('newApiKeyId');
      if (storedNewKey && storedNewKeyId) {
        setNewApiKey(storedNewKey);
        setNewApiKeyId(storedNewKeyId);
        setApiKey(storedNewKey);
        setSelectedApiKeyId(storedNewKeyId);
        sessionStorage.removeItem('newApiKey');
        sessionStorage.removeItem('newApiKeyId');
      }
    } catch (error) {
      console.error('Error fetching API keys', error);
      setApiKeys([]);
    } finally {
      setLoadingKeys(false);
    }
  };

  useEffect(() => {
    if (auth && !useManualKey) {
      fetchApiKeys();
    }
  }, [auth]);

  useEffect(() => {
    if (useManualKey) {
      setApiKey(apiKeyInput);
    } else if (selectedApiKeyId) {
      if (newApiKeyId === selectedApiKeyId && newApiKey) {
        setApiKey(newApiKey);
      }
    }
  }, [selectedApiKeyId, newApiKey, newApiKeyId, useManualKey, apiKeyInput]);
  
  const handleProviderSelect = (provider: typeof PAYMENT_PROVIDERS[number]) => {
    setSelectedProvider(provider);
    setError(null);
    setPaymentResult(null);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  };

  const renderCheckout = () => {
    if (!selectedProvider) return null;

    const provider = selectedProvider;
    // Utiliser Secure seulement si Stripe, mode secure ET clé fournie
    const canUseSecure = checkoutMode === 'secure' && provider.id === 'stripe' && stripeKey;
    const CheckoutComponent = canUseSecure ? BoohPayCheckoutSecure : BoohPayCheckout;

    const commonProps = {
      config: {
        publishableKey: apiKey,
        apiUrl: apiBaseUrl,
        onStatusChange: (status: string, paymentId: string) => {
          console.log(`Payment ${paymentId}: ${status}`);
        },
        onError: (err: Error) => {
          console.error('SDK Error:', err);
          setError(err);
        },
      },
      options: {
        amount: provider.amount || 10000,
        currency: provider.currency || 'XAF',
        countryCode: provider.id === 'moneroo' ? 'US' : 'GA',
        orderId: `demo_${Date.now()}`,
        customer: {
          email: 'demo@example.com',
          phone: provider.testPhone,
        },
        returnUrl: `${window.location.origin}/demo?payment=success`,
        metadata: {
          demo: true,
          provider: provider.id.toUpperCase(),
        },
      },
      locale,
      defaultMethod: provider.supports[0] as any,
      hideMethodTabs: true,
      onSuccess: (response: PaymentResponse) => {
        console.log('Payment success:', response);
        setPaymentResult(response);
        setError(null);
      },
      onError: (err: Error) => {
        console.error('Payment error:', err);
        setError(err);
        setPaymentResult(null);
      },
      theme: {
        primaryColor: 'hsl(var(--foreground))',
        buttonColor: 'hsl(var(--foreground))',
      },
    };

    if (CheckoutComponent === BoohPayCheckoutSecure) {
      return (
        <BoohPayCheckoutSecure
          {...commonProps}
          stripePublishableKey={stripeKey}
          useStripeElements={true}
        />
      );
    }

    return <BoohPayCheckout {...commonProps} />;
  };

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="BoohPay"
        highlight="Checkout"
        description="Testez tous nos méthodes de paiement avec les nouvelles fonctionnalités"
        icon={<Gamepad2 className="h-7 w-7" />}
        badge="Environnement de test"
        badgeIcon={<Zap className="h-3 w-3" />}
      />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* API Key Setup */}
        <PremiumCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-lg shadow-violet-500/25">
              <Key className="w-6 h-6" />
              </div>
              <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Configuration API</h2>
              <p className="text-sm text-zinc-500">Configurez votre clé API BoohPay</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={!useManualKey ? 'default' : 'outline'}
                onClick={() => {
                  setUseManualKey(false);
                  fetchApiKeys();
                }}
                disabled={loadingKeys}
                className={cn(
                  'w-full rounded-xl',
                  !useManualKey && 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                )}
              >
                {loadingKeys ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <ClipboardList className="w-4 h-4 mr-2" />
                    Depuis mes clés
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant={useManualKey ? 'default' : 'outline'}
                onClick={() => setUseManualKey(true)}
                className={cn(
                  'w-full rounded-xl',
                  useManualKey && 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                )}
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Saisie manuelle
              </Button>
            </div>

            {!useManualKey ? (
              loadingKeys ? (
                <PremiumLoader message="Chargement des clés..." />
              ) : newApiKey && newApiKeyId ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50 to-cyan-50 dark:from-cyan-950/30 dark:to-cyan-950/30 border border-cyan-200 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-cyan-600" />
                      <strong className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
                        Nouvelle clé disponible
                      </strong>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newApiKey)}
                      className="rounded-lg"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copier
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-zinc-900 border font-mono text-xs break-all">
                    {newApiKey.slice(0, 30)}...
                  </div>
                </div>
              ) : apiKeys.length > 0 ? (
                <div className="space-y-2">
                  {apiKeys.map((key) => {
                    const isSelected = selectedApiKeyId === key.id;
                    const hasFullKey = newApiKey && newApiKeyId === key.id;
                    
                    return (
                      <button
                        key={key.id}
                        type="button"
                        onClick={() => {
                          setSelectedApiKeyId(key.id);
                          if (hasFullKey) {
                            setApiKey(newApiKey!);
                          } else {
                            setApiKey('');
                            alert(
                              '⚠️ Clé API complète requise\n\n' +
                              'Vous avez sélectionné une clé API, mais la clé complète n\'est pas disponible.\n\n' +
                              'Options :\n' +
                              '1. Utilisez "Saisie manuelle" et entrez votre clé API complète (format: bpk_...)\n' +
                              '2. Créez une nouvelle clé API dans Dashboard > Integrations > API Keys\n' +
                              '3. La clé complète n\'est visible qu\'une seule fois lors de la création\n\n' +
                              'Note: L\'ID de la clé (UUID) ne peut pas être utilisé comme clé API.'
                            );
                          }
                        }}
                        className={cn(
                          'w-full p-4 rounded-xl border-2 text-left transition-all',
                          isSelected 
                            ? 'border-cyan-500 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30' 
                            : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected && <CheckCircle className="w-5 h-5 text-cyan-600" />}
                          <div className="flex-1">
                            <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                              {key.label || 'Clé sans nom'}
                            </div>
                            <div className="font-mono text-xs text-zinc-500">
                              {key.id.slice(0, 12)}...
                            </div>
                          </div>
                          {hasFullKey && <PremiumBadge variant="violet">PRÊTE</PremiumBadge>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 text-center">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                    Aucune clé. <a href="/integrations" className="text-cyan-600 hover:underline font-medium">Créez-en une</a>
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    💡 Après création, copiez la clé complète (format: bpk_...) - elle ne sera visible qu'une seule fois
                  </p>
                </div>
              )
            ) : (
              <div>
                <Label htmlFor="api-key-input" className="text-zinc-700 dark:text-zinc-300 mb-2 block">
                  Clé API Publique <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="api-key-input"
                  type="text"
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    setApiKey(e.target.value);
                  }}
                  placeholder="bpk_..."
                  className="font-mono mt-2 rounded-xl"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                  💡 Format: bpk_... (environ 43 caractères). L'ID UUID ne fonctionne pas.
                </p>
                {apiKeyInput && apiKeyInput.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    ⚠️ Vous avez entré un ID UUID. Utilisez la clé API complète (visible une seule fois après création).
                  </p>
                )}
              </div>
            )}
          </div>
        </PremiumCard>

        {!apiKey && (
          <PremiumCard className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
              <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/30 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
                <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Clé API requise</h3>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/80">
                    Configurez une clé API pour commencer
                  </p>
                </div>
              </div>
          </PremiumCard>
        )}

        {apiKey && !selectedProvider && (
          <PremiumCard>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Sélectionnez un prestataire</h2>
            <p className="text-sm text-zinc-500 mb-6">Choisissez une méthode de paiement pour tester</p>
            
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PAYMENT_PROVIDERS.map((provider) => {
                  const Icon = provider.icon;
                  return (
                    <button
                      key={provider.id}
                      onClick={() => handleProviderSelect(provider)}
                    className="p-6 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-cyan-500 hover:shadow-lg hover:shadow-cyan-500/10 transition-all group"
                    >
                      <div className="flex flex-col items-center gap-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-100 to-cyan-100 dark:from-cyan-900/30 dark:to-cyan-900/30 group-hover:from-cyan-200 group-hover:to-cyan-200 dark:group-hover:from-cyan-800/40 dark:group-hover:to-cyan-800/40 transition-colors">
                          {provider.logo ? (
                            <Image 
                              src={provider.logo} 
                              alt={provider.name} 
                              width={80} 
                              height={32} 
                              className="object-contain"
                              style={{ width: 'auto', height: '32px' }}
                            />
                          ) : (
                          <Icon className="w-8 h-8 text-cyan-600" />
                          )}
                        </div>
                        <div className="text-center">
                        <h3 className="font-bold text-zinc-900 dark:text-white mb-1">{provider.name}</h3>
                        <p className="text-sm text-zinc-500">{provider.description}</p>
                          {provider.testCard && (
                          <div className="mt-3 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-mono">
                              Test: {provider.testCard}
                            </div>
                          )}
                          {provider.testPhone && (
                          <div className="mt-3 text-xs bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 px-3 py-1.5 rounded-lg font-mono">
                              Test: {provider.testPhone}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
          </PremiumCard>
        )}

        {apiKey && selectedProvider && (
          <>
            {/* Options */}
            <PremiumCard>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white mb-4">Options de test</h2>
              
              <div className="space-y-4">
                {selectedProvider.id === 'stripe' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={checkoutMode === 'secure' ? 'default' : 'outline'}
                        onClick={() => setCheckoutMode('secure')}
                        className={cn(
                          'flex items-center gap-2 rounded-xl',
                          checkoutMode === 'secure' && 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                        )}
                      >
                        <Lock className="w-4 h-4" />
                        PCI Secure
                      </Button>
                      <Button
                        variant={checkoutMode === 'classic' ? 'default' : 'outline'}
                        onClick={() => setCheckoutMode('classic')}
                        className={cn(
                          'rounded-xl',
                          checkoutMode === 'classic' && 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                        )}
                      >
                        Classique
                      </Button>
                    </div>

                    {checkoutMode === 'secure' && (
                      <div>
                        <Label className="mb-2 block text-zinc-700 dark:text-zinc-300">
                          Clé Publique Stripe <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          type="text"
                          value={stripeKey}
                          onChange={(e) => setStripeKey(e.target.value)}
                          placeholder="pk_test_..."
                          className="font-mono rounded-xl"
                        />
                        {!stripeKey && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                            ⚠️ La clé Stripe est requise pour le mode PCI Secure
                          </p>
                        )}
                        {stripeKey && (
                          <div className="mt-2 space-y-1 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-2">
                              ℹ️ Avertissements normaux en développement :
                            </p>
                            <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-1 list-disc list-inside">
                              <li>"ERR_BLOCKED_BY_CLIENT" pour Stripe = AdBlock/ublock (normal)</li>
                              <li>"Unable to download payment manifest" = Google Pay en dev (normal)</li>
                              <li>Ces erreurs n'affectent pas le fonctionnement</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <Label className="mb-2 block flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                    <Globe className="w-4 h-4" />
                    Langue
                  </Label>
                  <div className="grid grid-cols-7 gap-2">
                    {LOCALES.map((loc) => (
                      <Button
                        key={loc.code}
                        type="button"
                        variant={locale === loc.code ? 'default' : 'outline'}
                        onClick={() => setLocale(loc.code)}
                        className={cn(
                          'flex flex-col gap-1 h-auto py-2 rounded-xl',
                          locale === loc.code && 'bg-gradient-to-r from-violet-500 to-violet-600 text-white'
                        )}
                      >
                        <span className="text-xl">{loc.flag}</span>
                        <span className="text-xs">{loc.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </PremiumCard>

            {/* Checkout */}
            <PremiumCard>
              <div className="flex items-center justify-between mb-6">
                  <div>
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">{selectedProvider.name}</h2>
                  <p className="text-sm text-zinc-500">
                      {selectedProvider.id === 'stripe' && checkoutMode === 'secure' 
                        ? 'PCI Secure avec Stripe Elements' 
                        : 'Formulaire de paiement'}
                  </p>
                  </div>
                <Button variant="ghost" onClick={() => setSelectedProvider(null)} className="rounded-xl">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour
                  </Button>
                </div>
              
              <div className="p-8 rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                  {renderCheckout()}
                </div>
            </PremiumCard>

            {/* Result */}
            {paymentResult && (
              <PremiumCard className="border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                  <div className="flex items-center gap-4 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                    <div>
                    <h3 className="font-bold text-emerald-800 dark:text-emerald-300">Paiement initié</h3>
                    <p className="text-sm text-emerald-700/80 dark:text-emerald-400/80">Transaction créée</p>
                  </div>
                </div>
                <pre className="text-xs bg-white dark:bg-zinc-900 p-4 rounded-xl overflow-auto border">
                    {JSON.stringify(paymentResult, null, 2)}
                  </pre>
              </PremiumCard>
            )}

            {error && (
              <PremiumCard className="border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20">
                  <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                    <div className="flex-1">
                    <h3 className="font-bold text-red-800 dark:text-red-300 mb-2">Erreur de paiement</h3>
                    <p className="text-sm text-red-700/80 dark:text-red-400/80 mb-4">
                        {error.message || (typeof error === 'object' ? JSON.stringify(error, null, 2) : String(error))}
                      </p>
                      {error.message?.includes('400') || (error as any)?.statusCode === 400 ? (
                      <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border mb-4">
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            💡 <strong>Erreur 400</strong> : Vérifiez que tous les champs sont remplis correctement.
                            Pour Mobile Money, utilisez le format : 07XXXXXX ou 06XXXXXX
                          </p>
                        </div>
                      ) : null}
                      <details>
                      <summary className="text-xs cursor-pointer text-zinc-500 hover:text-zinc-700">
                          Détails techniques
                        </summary>
                      <pre className="text-xs bg-white dark:bg-zinc-900 p-4 rounded-xl mt-2 overflow-auto max-h-48 border">
                          {error.stack || JSON.stringify(error, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
              </PremiumCard>
            )}
          </>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
          {[
            { icon: Lock, title: 'PCI Secure', description: 'Mode sécurisé avec Stripe Elements pour PCI compliance' },
            { icon: Globe, title: 'i18n', description: '7 langues : EN, FR, ES, DE, PT, IT, AR' },
            { icon: CreditCard, title: 'Multi-gateways', description: 'Stripe, Moneroo, eBilling avec routage intelligent' },
            { icon: Shield, title: 'Mode test', description: 'Tous les paiements sont en mode test' },
          ].map((item, idx) => (
            <PremiumCard key={idx}>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 text-cyan-600 mb-4">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">{item.title}</h3>
              <p className="text-sm text-zinc-500">{item.description}</p>
            </PremiumCard>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800 text-center text-sm text-zinc-500">
          © 2025 BoohPay. Tous droits réservés.
        </div>
      </div>
    </div>
  );
}
