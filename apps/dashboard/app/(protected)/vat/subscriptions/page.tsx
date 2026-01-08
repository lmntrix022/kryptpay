'use client';

import { useEffect, useState } from 'react';
import { CreditCard, Check, X, Sparkles, Crown, Zap } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumBadge, PremiumButton } from '@/components/premium-ui';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

interface PlanPricing {
  TAX_PRO: {
    monthlyPrice: number;
    currency: string;
    features: string[];
  };
  BUSINESS_SUITE: {
    monthlyPrice: number;
    currency: string;
    features: string[];
  };
}

interface ActiveSubscription {
  id: string;
  planType: 'TAX_PRO' | 'BUSINESS_SUITE' | null;
  status: string;
  amountMinor: number;
  currency: string;
  nextBillingDate: string;
  createdAt: string;
}

export default function VatSubscriptionsPage() {
  const { auth } = useAuth();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [planPricing, setPlanPricing] = useState<PlanPricing | null>(null);
  const [activeSubscription, setActiveSubscription] = useState<ActiveSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);

  const merchantId = auth?.user?.merchantId || auth?.user?.id;

  const loadData = async () => {
    if (!merchantId) return;

    setLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = auth?.accessToken;

      // Charger les plans et l'abonnement actif en parallèle
      const [pricingResponse, subscriptionResponse] = await Promise.all([
        fetch(`${apiUrl}/v1/vat/subscriptions/plans`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${apiUrl}/v1/vat/merchants/${merchantId}/subscriptions/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }),
      ]);

      if (!pricingResponse.ok) {
        throw new Error('Erreur lors du chargement des plans');
      }

      const pricing = await pricingResponse.json();
      setPlanPricing(pricing);

      if (subscriptionResponse.ok) {
        const subscription = await subscriptionResponse.json();
        if (subscription) {
          setActiveSubscription(subscription);
        }
      } else if (subscriptionResponse.status !== 404) {
        throw new Error('Erreur lors du chargement de l\'abonnement');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Error loading VAT subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [merchantId, auth?.accessToken]);

  const handleSubscribe = async (planType: 'TAX_PRO' | 'BUSINESS_SUITE') => {
    if (!merchantId || !auth?.user?.email) return;

    setLoadingAction(`subscribe-${planType}`);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = auth?.accessToken;

      const response = await fetch(`${apiUrl}/v1/vat/merchants/${merchantId}/subscriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType,
          customerEmail: auth.user.email,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la création de l\'abonnement');
      }

      // Recharger les données
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Error subscribing:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = async () => {
    if (!merchantId) return;

    if (!confirm('Êtes-vous sûr de vouloir annuler votre abonnement TVA ?')) {
      return;
    }

    setLoadingAction('cancel');
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = auth?.accessToken;

      const response = await fetch(`${apiUrl}/v1/vat/merchants/${merchantId}/subscriptions/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de l\'annulation de l\'abonnement');
      }

      // Recharger les données
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Error canceling subscription:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleUpgrade = async (newPlanType: 'TAX_PRO' | 'BUSINESS_SUITE') => {
    if (!merchantId) return;

    setLoadingAction(`upgrade-${newPlanType}`);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const token = auth?.accessToken;

      const response = await fetch(`${apiUrl}/v1/vat/merchants/${merchantId}/subscriptions/upgrade`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planType: newPlanType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Erreur lors de la mise à jour de l\'abonnement');
      }

      // Recharger les données
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
      console.error('Error upgrading subscription:', err);
    } finally {
      setLoadingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <PremiumHero
          title="Abonnements TVA"
          description="Choisissez le plan qui correspond à vos besoins"
          icon={<CreditCard className="h-7 w-7" />}
          badge="BööhTax"
        />
        <PremiumLoader message="Chargement des plans..." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PremiumHero
        title="Abonnements TVA"
        description="Choisissez le plan qui correspond à vos besoins pour optimiser votre gestion de TVA"
        icon={<CreditCard className="h-7 w-7" />}
        badge="BööhTax"
        badgeIcon={<Sparkles className="h-3 w-3" />}
      />

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-900 dark:text-red-400">
          {error}
        </div>
      )}

      {activeSubscription && (
        <PremiumCard className="border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-zinc-900">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <PremiumBadge variant="success">Abonnement actif</PremiumBadge>
                <PremiumBadge variant="violet">{activeSubscription.planType}</PremiumBadge>
              </div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                Plan {activeSubscription.planType === 'TAX_PRO' ? 'BööhTax Pro' : 'Business Suite'}
              </h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Prochain paiement : {new Date(activeSubscription.nextBillingDate).toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                {formatAmount(activeSubscription.amountMinor, activeSubscription.currency)} / mois
              </p>
            </div>
            <div className="flex gap-2">
              {activeSubscription.planType === 'TAX_PRO' && (
                <PremiumButton
                  onClick={() => handleUpgrade('BUSINESS_SUITE')}
                  disabled={loadingAction !== null}
                  icon={<Crown className="w-4 h-4" />}
                >
                  {loadingAction === 'upgrade-BUSINESS_SUITE' ? 'Mise à jour...' : 'Upgrade'}
                </PremiumButton>
              )}
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={loadingAction !== null}
              >
                {loadingAction === 'cancel' ? 'Annulation...' : 'Annuler'}
              </Button>
            </div>
          </div>
        </PremiumCard>
      )}

      {planPricing && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Plan TAX_PRO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <PremiumCard
              className={`h-full flex flex-col ${
                activeSubscription?.planType === 'TAX_PRO'
                  ? 'border-cyan-500 dark:border-cyan-500'
                  : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">KryptTax Pro</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {formatAmount(planPricing.TAX_PRO.monthlyPrice, planPricing.TAX_PRO.currency)}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">/ mois</span>
                  </div>
                </div>
                {activeSubscription?.planType === 'TAX_PRO' && (
                  <PremiumBadge variant="success">Actif</PremiumBadge>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {planPricing.TAX_PRO.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {activeSubscription?.planType === 'TAX_PRO' ? (
                <Button variant="outline" disabled className="w-full">
                  Plan actif
                </Button>
              ) : activeSubscription ? (
                <Button
                  variant="outline"
                  onClick={() => handleUpgrade('TAX_PRO')}
                  disabled={loadingAction !== null}
                  className="w-full"
                >
                  {loadingAction === 'upgrade-TAX_PRO' ? 'Mise à jour...' : 'Changer pour ce plan'}
                </Button>
              ) : (
                <PremiumButton
                  onClick={() => handleSubscribe('TAX_PRO')}
                  disabled={loadingAction !== null}
                  className="w-full"
                  icon={<CreditCard className="w-4 h-4" />}
                >
                  {loadingAction === 'subscribe-TAX_PRO' ? 'Abonnement...' : 'S\'abonner'}
                </PremiumButton>
              )}
            </PremiumCard>
          </motion.div>

          {/* Plan BUSINESS_SUITE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <PremiumCard
              className={`h-full flex flex-col border-2 ${
                activeSubscription?.planType === 'BUSINESS_SUITE'
                  ? 'border-cyan-500 dark:border-cyan-500'
                  : 'border-cyan-200 dark:border-cyan-900'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white">Business Suite</h3>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                      {formatAmount(planPricing.BUSINESS_SUITE.monthlyPrice, planPricing.BUSINESS_SUITE.currency)}
                    </span>
                    <span className="text-sm text-zinc-500 dark:text-zinc-500">/ mois</span>
                  </div>
                </div>
                {activeSubscription?.planType === 'BUSINESS_SUITE' && (
                  <PremiumBadge variant="success">Actif</PremiumBadge>
                )}
              </div>

              <ul className="space-y-3 flex-1 mb-6">
                {planPricing.BUSINESS_SUITE.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{feature}</span>
                  </li>
                ))}
              </ul>

              {activeSubscription?.planType === 'BUSINESS_SUITE' ? (
                <Button variant="outline" disabled className="w-full">
                  Plan actif
                </Button>
              ) : activeSubscription ? (
                <PremiumButton
                  onClick={() => handleUpgrade('BUSINESS_SUITE')}
                  disabled={loadingAction !== null}
                  className="w-full"
                  icon={<Crown className="w-4 h-4" />}
                >
                  {loadingAction === 'upgrade-BUSINESS_SUITE' ? 'Mise à jour...' : 'Upgrade'}
                </PremiumButton>
              ) : (
                <PremiumButton
                  onClick={() => handleSubscribe('BUSINESS_SUITE')}
                  disabled={loadingAction !== null}
                  className="w-full"
                  icon={<Crown className="w-4 h-4" />}
                >
                  {loadingAction === 'subscribe-BUSINESS_SUITE' ? 'Abonnement...' : 'S\'abonner'}
                </PremiumButton>
              )}
            </PremiumCard>
          </motion.div>
        </div>
      )}
    </div>
  );
}











