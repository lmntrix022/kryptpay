'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, AlertCircle, CheckCircle2, Info, Globe, Zap, Building2 } from 'lucide-react';
import { useAuth } from '../../../../context/AuthContext';
import { apiUrl } from '../../../../lib/api-client';
import { PremiumHero, PremiumCard, PremiumLoader, PremiumButton } from '@/components/premium-ui';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';

interface VatSettings {
  id?: string;
  merchantId: string;
  enabled: boolean;
  sellerCountry: string;
  autoDetectBuyerCountry: boolean;
  defaultTaxBehavior: string;
  autoReversement: boolean;
  reversementAccount?: string;
  defaultRates?: Record<string, number>;
  createdAt?: string;
  updatedAt?: string;
}

interface ReversementValidation {
  canEnableAutoReversement: boolean;
  availableProviders: string[];
  accountType?: 'bank' | 'mobile_money' | 'unknown';
  compatibleProviders: string[];
  warnings: string[];
  suggestions: string[];
}

export default function VatSettingsPage() {
  const { auth, isLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<VatSettings | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reversementValidation, setReversementValidation] = useState<ReversementValidation | null>(null);
  const [validatingReversement, setValidatingReversement] = useState(false);

  const merchantId = auth?.user?.merchantId || auth?.user?.id;

  // Définir validateReversement en premier avec useCallback
  const validateReversement = useCallback(async (autoReversement?: boolean, reversementAccount?: string, sellerCountry?: string) => {
    if (!merchantId || !auth?.accessToken) return;

    setValidatingReversement(true);
    try {
      const params = new URLSearchParams();
      if (reversementAccount) params.append('reversementAccount', reversementAccount);
      if (sellerCountry) params.append('sellerCountry', sellerCountry);

      const url = `${apiUrl(`vat/merchants/${merchantId}/reversement-validation`)}${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (response.ok) {
        const validation = await response.json();
        setReversementValidation(validation);
      } else {
        console.error('Error validating reversement:', response.status, response.statusText);
        // En cas d'erreur, on peut quand même permettre l'activation mais afficher un avertissement
        setReversementValidation({
          canEnableAutoReversement: false,
          warnings: ['Impossible de valider la configuration. Veuillez vérifier votre connexion.'],
          suggestions: [],
        });
      }
    } catch (error) {
      console.error('Error validating reversement:', error);
      // En cas d'erreur réseau, permettre quand même l'activation
      setReversementValidation({
        canEnableAutoReversement: false,
        warnings: ['Erreur lors de la validation. Veuillez réessayer.'],
        suggestions: [],
      });
    } finally {
      setValidatingReversement(false);
    }
  }, [merchantId, auth?.accessToken]);

  // Définir loadSettings
  const loadSettings = useCallback(async () => {
    if (!auth?.accessToken || !merchantId) return;
    
    try {
      const response = await fetch(`${apiUrl(`vat/merchants/${merchantId}/vat-settings`)}`, {
        headers: {
          'Authorization': `Bearer ${auth.accessToken}`,
        },
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        
        let data = null;
        if (contentType?.includes('application/json') && text.trim()) {
          try {
            data = JSON.parse(text);
          } catch (parseError) {
            console.warn('Failed to parse JSON response:', parseError);
          }
        }
        
        setSettings(data || {
          merchantId,
          enabled: false,
          sellerCountry: 'GA',
          autoDetectBuyerCountry: true,
          defaultTaxBehavior: 'destination_based',
          autoReversement: false,
        });
      } else if (response.status === 404) {
        setSettings({
          merchantId,
          enabled: false,
          sellerCountry: 'GA',
          autoDetectBuyerCountry: true,
          defaultTaxBehavior: 'destination_based',
          autoReversement: false,
        });
      } else {
        const errorText = await response.text().catch(() => 'Erreur inconnue');
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('Error loading VAT settings:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des paramètres' });
      if (merchantId) {
        setSettings({
          merchantId,
          enabled: false,
          sellerCountry: 'GA',
          autoDetectBuyerCountry: true,
          defaultTaxBehavior: 'destination_based',
          autoReversement: false,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [merchantId, auth?.accessToken]);

  // Charger les paramètres au montage
  useEffect(() => {
    if (merchantId && auth?.accessToken) {
      loadSettings();
    }
  }, [merchantId, auth?.accessToken, loadSettings]);

  // Valider le reversement quand les paramètres pertinents changent ou après chargement
  useEffect(() => {
    if (!settings || !merchantId || !auth?.accessToken || loading) {
      return;
    }

    // Seulement valider si autoReversement est activé ou si les paramètres pertinents changent
    if (settings.autoReversement || settings.reversementAccount || settings.sellerCountry) {
      const timeoutId = setTimeout(() => {
        validateReversement(
          settings.autoReversement,
          settings.reversementAccount,
          settings.sellerCountry
        );
      }, 500); // Debounce pour éviter trop d'appels

      return () => clearTimeout(timeoutId);
    }
  }, [settings?.reversementAccount, settings?.sellerCountry, settings?.autoReversement, settings?.id, validateReversement, merchantId, auth?.accessToken, loading]);

  const saveSettings = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      if (!auth?.accessToken) return;
      
      const response = await fetch(`${apiUrl(`vat/merchants/${merchantId}/vat-settings`)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setMessage({ type: 'success', text: 'Paramètres TVA enregistrés avec succès' });
        // Re-valider après sauvegarde
        await validateReversement();
      } else {
        const errorText = await response.text();
        let errorMessage = 'Erreur lors de l\'enregistrement';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.message || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        setMessage({ type: 'error', text: errorMessage });
      }
    } catch (error) {
      console.error('Error saving VAT settings:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !auth) {
    return <PremiumLoader message={isLoading ? 'Chargement...' : 'Veuillez vous connecter'} />;
  }

  if (loading) {
    return <PremiumLoader message="Chargement des paramètres..." />;
  }

  return (
    <div className="space-y-8">
      {/* Premium Hero */}
      <PremiumHero
        title="Paramètres"
        highlight="TVA"
        description="Configurez la collecte et le reversement automatique de TVA"
        icon={<Settings className="w-7 h-7 text-white" />}
        badge="Configuration"
        badgeIcon={<Settings className="w-3.5 h-3.5 text-violet-400" />}
      />

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-4 flex items-center gap-3 ${
            message.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings Card */}
        <div className="lg:col-span-2">
          <PremiumCard>
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-white mb-1">Configuration TVA</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Activez la collecte automatique de TVA sur vos transactions
                </p>
              </div>

              {/* Enable VAT */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                <div className="space-y-1">
                  <Label htmlFor="enabled" className="text-base font-medium">Activer la TVA</Label>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Calculez et collectez automatiquement la TVA sur vos transactions
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={settings?.enabled || false}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => prev ? { ...prev, enabled: checked } : null)
                  }
                />
              </div>

              {settings?.enabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-6"
                >
                  {/* Seller Country */}
                  <div className="space-y-2">
                    <Label htmlFor="sellerCountry" className="flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Pays du vendeur
                    </Label>
                    <Select
                      id="sellerCountry"
                      value={settings.sellerCountry}
                      onChange={(e) =>
                        setSettings((prev) => prev ? { ...prev, sellerCountry: e.target.value } : null)
                      }
                    >
                      <option value="GA">Gabon</option>
                      <option value="FR">France</option>
                      <option value="SN">Sénégal</option>
                      <option value="CI">Côte d'Ivoire</option>
                      <option value="CM">Cameroun</option>
                    </Select>
                  </div>

                  {/* Auto Detect Buyer Country */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                    <div className="space-y-1">
                      <Label htmlFor="autoDetect" className="flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Détection automatique du pays acheteur
                      </Label>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Détecte automatiquement le pays de l'acheteur depuis les métadonnées
                      </p>
                    </div>
                    <Switch
                      id="autoDetect"
                      checked={settings.autoDetectBuyerCountry}
                      onCheckedChange={(checked) =>
                        setSettings((prev) => prev ? { ...prev, autoDetectBuyerCountry: checked } : null)
                      }
                    />
                  </div>

                  {/* Tax Behavior */}
                  <div className="space-y-2">
                    <Label htmlFor="taxBehavior" className="flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Comportement fiscal par défaut
                    </Label>
                    <Select
                      id="taxBehavior"
                      value={settings.defaultTaxBehavior}
                      onChange={(e) =>
                        setSettings((prev) => prev ? { ...prev, defaultTaxBehavior: e.target.value } : null)
                      }
                    >
                      <option value="destination_based">Basé sur la destination (pays acheteur)</option>
                      <option value="origin_based">Basé sur l'origine (pays vendeur)</option>
                      <option value="no_vat">Pas de TVA</option>
                    </Select>
                  </div>

                  {/* Auto Reversement */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-start justify-between mb-4">
                      <div className="space-y-1 flex-1">
                        <Label htmlFor="autoReversement" className="text-base font-medium">Reversement automatique</Label>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          BööhPay transfère automatiquement la TVA collectée vers l'administration fiscale
                        </p>
                      </div>
                      <Switch
                        id="autoReversement"
                        checked={settings?.autoReversement || false}
                        disabled={validatingReversement || !settings}
                        onCheckedChange={(checked) => {
                          console.log('[VAT Settings] Toggle autoReversement:', checked);
                          // Mettre à jour l'état immédiatement
                          setSettings((prev) => {
                            if (!prev) return null;
                            const updated = { ...prev, autoReversement: checked };
                            console.log('[VAT Settings] Updated settings:', updated);
                            return updated;
                          });
                          
                          // Si on active le reversement, déclencher la validation
                          if (checked) {
                            console.log('[VAT Settings] Activating auto reversement, triggering validation...');
                            validateReversement(
                              checked,
                              settings?.reversementAccount,
                              settings?.sellerCountry
                            );
                          } else {
                            console.log('[VAT Settings] Deactivating auto reversement, clearing validation...');
                            // Si on désactive, effacer les validations
                            setReversementValidation(null);
                          }
                        }}
                      />
                    </div>

                    {/* Avertissements de validation */}
                    {reversementValidation && reversementValidation.warnings.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-amber-900 dark:text-amber-400 mb-2">Avertissements</p>
                            <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                              {reversementValidation.warnings.map((warning, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="mt-0.5">•</span>
                                  <span>{warning}</span>
                                </li>
                              ))}
                            </ul>
                            {reversementValidation.suggestions.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900">
                                <p className="font-medium text-amber-900 dark:text-amber-400 mb-2">Suggestions</p>
                                <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                                  {reversementValidation.suggestions.map((suggestion, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="mt-0.5">→</span>
                                      <span>{suggestion}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                    
                    {/* Explication détaillée */}
                    <div className="mt-4 space-y-3 text-sm">
                      {settings.autoReversement ? (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900">
                          <p className="font-medium text-emerald-900 dark:text-emerald-400 mb-2">✅ Mode automatique activé</p>
                          <ul className="space-y-1.5 text-emerald-800 dark:text-emerald-300 text-xs">
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span><strong>BööhPay exécute le transfert bancaire</strong> : Utilise notre système de payout (Stripe, Moneroo, etc.) pour transférer la TVA vers le compte de l'administration fiscale</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span><strong>Déclenchement automatique</strong> : Un job scheduler vérifie périodiquement les rapports à reverser et déclenche les transferts (mensuel, trimestriel, ou selon seuil)</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span><strong>Traçabilité complète</strong> : Chaque transfert est enregistré avec un ID externe, les rapports sont marqués "Payé" automatiquement, et vous recevez une notification</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span><strong>Gestion des erreurs</strong> : En cas d'échec, retry automatique avec notification. Les échecs définitifs passent en mode manuel</span>
                            </li>
                          </ul>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                          <p className="font-medium text-amber-900 dark:text-amber-400 mb-2">📋 Mode manuel activé</p>
                          <ul className="space-y-1.5 text-amber-800 dark:text-amber-300 text-xs">
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>Vous devez générer des rapports TVA périodiques dans la section "Rapports"</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>Vous effectuez vous-même le transfert bancaire vers l'administration fiscale</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>Vous marquez manuellement les rapports comme "Payé" après avoir effectué le reversement</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">•</span>
                              <span>Vous gardez le contrôle total sur les dates et montants reversés</span>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {settings.autoReversement && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3 p-4 rounded-xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900"
                    >
                      <div className="space-y-2">
                        <Label htmlFor="reversementAccount" className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Compte de reversement
                        </Label>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          Le compte où la TVA collectée sera automatiquement reversée à l'administration fiscale.
                        </p>
                        <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 text-xs space-y-2">
                          <p className="font-medium text-blue-900 dark:text-blue-400">Types de comptes acceptés :</p>
                          <ul className="space-y-1.5 text-blue-800 dark:text-blue-300">
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">🏦</span>
                              <span><strong>Compte bancaire (IBAN)</strong> : Format international (ex: FR76 1234 5678 9012 3456 7890 123). Utilise Stripe pour le transfert.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">📱</span>
                              <span><strong>Compte Mobile Money (MSISDN)</strong> : Numéro de téléphone (ex: +241 07 43 99 85 24 ou 0743998524). Utilise Shap ou Moneroo pour le transfert.</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="mt-0.5">📄</span>
                              <span><strong>Compte fiscal</strong> : Identifiant de compte fourni par l'administration fiscale (selon le format requis).</span>
                            </li>
                          </ul>
                        </div>
                        <Input
                          id="reversementAccount"
                          type="text"
                          value={settings.reversementAccount || ''}
                          onChange={(e) => {
                            const newAccount = e.target.value;
                            setSettings((prev) => prev ? { ...prev, reversementAccount: newAccount } : null);
                            // Déclencher la validation si autoReversement est activé
                            if (settings?.autoReversement) {
                              validateReversement(
                                settings.autoReversement,
                                newAccount,
                                settings.sellerCountry
                              );
                            }
                          }}
                          placeholder="IBAN (ex: FR76...) ou Mobile Money (ex: +241 07 43 99 85 24)"
                          className="mt-2"
                        />
                        {reversementValidation?.accountType && (
                          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                              {reversementValidation.accountType === 'bank' && '🏦 Compte bancaire détecté'}
                              {reversementValidation.accountType === 'mobile_money' && '📱 Mobile Money détecté'}
                              {reversementValidation.accountType === 'unknown' && '❓ Type de compte non détecté'}
                            </span>
                            {reversementValidation.compatibleProviders.length > 0 && (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ Compatible avec : {reversementValidation.compatibleProviders.join(', ')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <PremiumButton
                  onClick={saveSettings}
                  disabled={saving || !settings}
                  icon={<Save className="w-4 h-4" />}
                >
                  {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </PremiumButton>
              </div>
            </div>
          </PremiumCard>
        </div>

        {/* Info Card */}
        <div>
          <PremiumCard>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h3 className="font-semibold text-zinc-900 dark:text-white">Informations</h3>
              </div>
              <div className="space-y-3 text-sm text-zinc-600 dark:text-zinc-400">
                <p>
                  La TVA est calculée automatiquement à chaque paiement réussi selon les règles fiscales du pays concerné.
                </p>
                <p>
                  Les montants sont stockés en unités mineures (centimes) pour éviter les erreurs de calcul avec les nombres flottants.
                </p>
                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                  <p className="font-medium text-zinc-900 dark:text-white mb-2">Reversement automatique vs manuel</p>
                  
                  <div className="space-y-2 text-xs">
                    <div>
                      <p className="font-medium text-emerald-700 dark:text-emerald-400 mb-1">🔄 Automatique (recommandé)</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        BööhPay exécute le transfert bancaire automatiquement à intervalles réguliers. 
                        Vous n'avez rien à faire, tout est géré pour vous. Un compte de reversement doit être configuré.
                      </p>
                    </div>
                    
                    <div>
                      <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">📋 Manuel</p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Vous générez les rapports TVA et effectuez vous-même le transfert bancaire vers l'administration fiscale. 
                        Vous gardez le contrôle total sur les dates et montants.
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="font-medium text-zinc-900 dark:text-white mb-1">Compte de reversement</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">
                      Le compte bancaire ou fiscal où la TVA sera transférée. 
                      <strong className="text-zinc-900 dark:text-white"> Nécessaire uniquement en mode automatique.</strong>
                    </p>
                  </div>
                </div>
                <p>
                  Vous pouvez générer des rapports périodiques dans la section Rapports pour vos déclarations fiscales.
                </p>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  );
}
