"use client";

import { useState, useMemo, useEffect } from 'react';
import { User, DollarSign, Clipboard, AlertTriangle, Loader2, Zap, CheckCircle2, Sparkles } from 'lucide-react';
import type { CreatePayoutDto } from '../lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { detectPaymentSystem, detectPaymentSystemWithConfidence, detectPaymentSystemWithCountry, getPaymentSystemsForCountry, getPaymentSystemLabel, type PaymentSystem } from '../lib/payment-system-detector';
import { SUPPORTED_COUNTRIES, formatCountryCode, type CountryCode } from '../lib/country-codes';

type CreatePayoutFormProps = {
  onSubmit: (dto: CreatePayoutDto) => Promise<void>;
  onSuccess?: () => void;
  onCancel?: () => void;
};

// PAYMENT_SYSTEMS sera généré dynamiquement selon le pays sélectionné

const ZERO_DECIMAL_CURRENCIES = new Set(['XAF', 'XOF']);

function formatPhoneNumber(value: string): string {
  const numbers = value.replace(/\D/g, '');
  // Limiter à 10 chiffres (format local sans le 0 initial)
  return numbers.slice(0, 10);
}

function combineMsisdn(countryCode: string, phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  // Si le numéro commence par 0, on le garde
  if (cleaned.startsWith('0')) {
    return cleaned;
  }
  // Sinon, on ajoute le 0 pour le format local
  return cleaned ? `0${cleaned}` : cleaned;
}

function getFullMsisdn(countryCode: string, phoneNumber: string): string {
  const local = combineMsisdn(countryCode, phoneNumber);
  const digits = local.replace(/\D/g, '');
  // Retourner au format international si nécessaire
  if (digits.startsWith('0') && countryCode) {
    return countryCode + digits.substring(1);
  }
  return local;
}

function formatAmount(value: number, currency: string): string {
  if (value === 0) return '';
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency);
  const displayAmount = isZeroDecimal ? value : value / 100;
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(displayAmount);
}

function validateMsisdn(msisdn: string): string | null {
  if (!msisdn) return 'Le numéro est requis';
  const cleaned = msisdn.replace(/\D/g, '');
  if (cleaned.length < 8) return 'Le numéro doit contenir au moins 8 chiffres';
  if (cleaned.length > 12) return 'Le numéro ne peut pas dépasser 12 chiffres';
  return null;
}

export default function CreatePayoutForm({ onSubmit, onSuccess, onCancel }: CreatePayoutFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [countryCode, setCountryCode] = useState<string>('229'); // Bénin par défaut
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  
  const [formData, setFormData] = useState<CreatePayoutDto>({
    paymentSystemName: '',
    payeeMsisdn: '',
    amount: 0,
    currency: 'XAF',
    payoutType: 'WITHDRAWAL',
    externalReference: '',
    metadata: undefined,
    provider: undefined,
  });

  // Combiner countryCode + phoneNumber pour créer le MSISDN complet
  const fullMsisdn = useMemo(() => {
    if (!phoneNumber) return '';
    return getFullMsisdn(countryCode, phoneNumber);
  }, [countryCode, phoneNumber]);

  // Mettre à jour formData.payeeMsisdn quand countryCode ou phoneNumber change
  useEffect(() => {
    setFormData((prev) => ({ ...prev, payeeMsisdn: fullMsisdn }));
  }, [fullMsisdn]);

  const msisdnError = useMemo(() => {
    if (!touched.payeeMsisdn && !touched.phoneNumber) return null;
    const msisdn = fullMsisdn || formData.payeeMsisdn;
    return validateMsisdn(msisdn);
  }, [fullMsisdn, formData.payeeMsisdn, touched.payeeMsisdn, touched.phoneNumber]);

  const amountError = useMemo(() => {
    if (!touched.amount) return null;
    if (formData.amount === 0) return 'Le montant est requis';
    if (formData.amount < 100) return 'Le montant minimum est de 100 XAF';
    return null;
  }, [formData.amount, touched.amount]);

  const formattedAmount = useMemo(() => {
    if (!formData.amount) return '';
    return formatAmount(formData.amount, formData.currency);
  }, [formData.amount, formData.currency]);

  // Détection automatique du système de paiement avec le code pays
  const detectedPaymentSystem = useMemo(() => {
    if (!phoneNumber || phoneNumber.length < 6) {
      return null;
    }
    
    // Utiliser la détection avec code pays pour plus de précision
    const system = detectPaymentSystemWithCountry(phoneNumber, countryCode);
    
    if (system) {
      return {
        system,
        confidence: 'high' as const,
        countryCode,
        prefix: phoneNumber.replace(/\D/g, '').substring(0, 2),
      };
    }
    
    // Fallback sur la détection générale si celle avec pays échoue
    const fullMsisdnValue = getFullMsisdn(countryCode, phoneNumber);
    return detectPaymentSystemWithConfidence(fullMsisdnValue);
  }, [phoneNumber, countryCode]);

  // Auto-remplir le système de paiement et le provider si détecté avec haute confiance
  useEffect(() => {
    if (detectedPaymentSystem?.system && detectedPaymentSystem.confidence === 'high') {
      // Auto-remplir seulement si le champ est vide ou si c'est différent (pour mettre à jour)
      if (!formData.paymentSystemName || formData.paymentSystemName !== detectedPaymentSystem.system) {
        const system = detectedPaymentSystem.system;
        const country = countryCode;
        
        // Déterminer le provider par défaut selon le système et le pays
        // Pour le Gabon : SHAP pour Airtel Money et Moov Money 4
        let defaultProvider: 'SHAP' | 'MONEROO' | undefined = undefined;
        
        if (country === '241') { // Gabon
          if (system === 'airtelmoney' || system === 'moovmoney4') {
            defaultProvider = 'SHAP';
          } else {
            defaultProvider = 'MONEROO';
          }
        } else {
          // Pour les autres pays, utiliser SHAP par défaut pour les systèmes génériques
          if (system === 'airtelmoney' || system === 'moovmoney4') {
            defaultProvider = 'SHAP';
          }
          // Pour les systèmes spécifiques Moneroo (mtn_*, orange_*, etc.), utiliser MONEROO
          if (system.startsWith('mtn_') || system.startsWith('orange_') || system.startsWith('airtel_') || system === 'mpesa_ke' || system.startsWith('wave_')) {
            defaultProvider = 'MONEROO';
          }
        }
        
        setFormData((prev) => ({ 
          ...prev, 
          paymentSystemName: system,
          provider: defaultProvider,
          metadata: {
            ...prev.metadata,
            provider: defaultProvider,
          },
        }));
      }
    }
  }, [detectedPaymentSystem?.system, detectedPaymentSystem?.confidence, countryCode]);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
    setTouched((prev) => ({ ...prev, phoneNumber: true }));
  };

  const handleCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCountryCode = e.target.value;
    setCountryCode(newCountryCode);
    setTouched((prev) => ({ ...prev, countryCode: true }));
    // Reset detection when country changes
    setFormData((prev) => ({ ...prev, paymentSystemName: '' }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numValue = value === '' ? 0 : Number.parseInt(value, 10) || 0;
    setFormData((prev) => ({ ...prev, amount: numValue }));
  };

  const generateExternalReference = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `PAYOUT-${timestamp}-${random}`;
  };

  const handleGenerateReference = () => {
    setFormData((prev) => ({ ...prev, externalReference: generateExternalReference() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    setTouched({
      paymentSystemName: true,
      payeeMsisdn: true,
      phoneNumber: true,
      countryCode: true,
      amount: true,
      currency: true,
    });

    if (!phoneNumber || phoneNumber.length < 6) {
      setError('Le numéro de téléphone est requis (minimum 6 chiffres)');
      return;
    }

    if (!formData.paymentSystemName.trim()) {
      setError('Le système de paiement est requis');
      return;
    }

    const msisdnToValidate = fullMsisdn || formData.payeeMsisdn;
    const msisdnErr = validateMsisdn(msisdnToValidate);
    if (msisdnErr) {
      setError(msisdnErr);
      return;
    }

    if (formData.amount < 100) {
      setError('Le montant minimum est de 100 XAF');
      return;
    }

    setLoading(true);

    try {
      // S'assurer que le provider est bien dans metadata si défini
      const submitData: CreatePayoutDto = {
        ...formData,
        metadata: {
          ...formData.metadata,
          ...(formData.provider && { provider: formData.provider }),
        },
      };

      await onSubmit(submitData);
      setCountryCode('229');
      setPhoneNumber('');
      setFormData({
        paymentSystemName: '',
        payeeMsisdn: '',
        amount: 0,
        currency: 'XAF',
        payoutType: 'WITHDRAWAL',
        externalReference: '',
        metadata: undefined,
        provider: undefined,
      });
      setTouched({});
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création du payout');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.paymentSystemName.trim() && 
    phoneNumber.length >= 6 &&
    !msisdnError && 
    !amountError && 
    formData.amount >= 100;

  // Obtenir tous les systèmes de paiement disponibles pour le pays sélectionné
  const availablePaymentSystems = useMemo(() => {
    return getPaymentSystemsForCountry(countryCode);
  }, [countryCode]);

  // Créer la liste des options de système de paiement
  // Si détection haute confiance : afficher uniquement le système détecté
  // Sinon : afficher tous les systèmes disponibles pour le pays
  const paymentSystemOptions = useMemo(() => {
    const options = [];
    
    // Si détection haute confiance : afficher uniquement le système détecté
    if (detectedPaymentSystem?.system && detectedPaymentSystem.confidence === 'high') {
      options.push({
        value: detectedPaymentSystem.system,
        label: getPaymentSystemLabel(detectedPaymentSystem.system),
        isDetected: true,
      });
      return options; // Retourner uniquement le système détecté
    }
    
    // Si détection moyenne ou faible, ou pas de détection : afficher tous les systèmes du pays
    if (detectedPaymentSystem?.system && detectedPaymentSystem.confidence !== 'high') {
      // Ajouter l'option détectée en premier
      options.push({
        value: detectedPaymentSystem.system,
        label: getPaymentSystemLabel(detectedPaymentSystem.system) + ' (Suggéré)',
        isDetected: true,
      });
    }
    
    // Ajouter les autres systèmes disponibles pour ce pays
    availablePaymentSystems.forEach((system) => {
      if (system !== detectedPaymentSystem?.system) {
        options.push({
          value: system,
          label: getPaymentSystemLabel(system),
          isDetected: false,
        });
      }
    });
    
    // Si aucun système détecté et qu'aucun système disponible, ajouter les systèmes génériques
    if (options.length === 0) {
      options.push(
        { value: 'airtelmoney', label: 'Airtel Money', isDetected: false },
        { value: 'moovmoney4', label: 'Moov Money 4', isDetected: false }
      );
    }
    
    return options;
  }, [detectedPaymentSystem, availablePaymentSystems]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
      {/* Layout optimisé pour visibilité complète - 2 colonnes principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colonne gauche - Bénéficiaire */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Bénéficiaire <span className="text-destructive">*</span>
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Système détecté automatiquement
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="paymentSystemName" className="text-sm font-medium">
                  Système de paiement <span className="text-destructive">*</span>
                </Label>
                {detectedPaymentSystem?.system && (
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border",
                    detectedPaymentSystem.confidence === 'high' 
                      ? "bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400"
                      : detectedPaymentSystem.confidence === 'medium'
                      ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                      : "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                  )}>
                    <Sparkles className="w-3 h-3" />
                    <span>
                      {detectedPaymentSystem.confidence === 'high' && 'Détecté'}
                      {detectedPaymentSystem.confidence === 'medium' && 'Suggestion'}
                      {detectedPaymentSystem.confidence === 'low' && 'Suggestion faible'}
                    </span>
                  </div>
                )}
              </div>
              <Select
                id="paymentSystemName"
                required
                value={formData.paymentSystemName}
                onChange={(e) => setFormData((prev) => ({ ...prev, paymentSystemName: e.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, paymentSystemName: true }))}
                disabled={loading || (detectedPaymentSystem?.confidence === 'high' && !!detectedPaymentSystem?.system)}
                className={cn(
                  'h-10',
                  touched.paymentSystemName && !formData.paymentSystemName.trim() && 'border-destructive',
                  detectedPaymentSystem?.confidence === 'high' && detectedPaymentSystem?.system && 'bg-muted/30'
                )}
              >
                {paymentSystemOptions.length === 1 && detectedPaymentSystem?.confidence === 'high' ? (
                  // Si un seul système détecté avec haute confiance, l'afficher comme unique option
                  <option value={paymentSystemOptions[0].value}>
                    {paymentSystemOptions[0].label} ✨ (Détecté automatiquement)
                  </option>
                ) : (
                  <>
                    <option value="">Sélectionner un système...</option>
                    {paymentSystemOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                        {option.isDetected && detectedPaymentSystem?.confidence === 'high' && ' ✨ (Détecté)'}
                      </option>
                    ))}
                  </>
                )}
              </Select>
              {detectedPaymentSystem?.system && detectedPaymentSystem.confidence !== 'high' && (
                <p className="text-xs text-muted-foreground">
                  Système suggéré: {getPaymentSystemLabel(detectedPaymentSystem.system)}
                  {detectedPaymentSystem.prefix && ` (préfixe ${detectedPaymentSystem.prefix})`}
                </p>
              )}
              {availablePaymentSystems.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {availablePaymentSystems.length} système{availablePaymentSystems.length > 1 ? 's' : ''} disponible{availablePaymentSystems.length > 1 ? 's' : ''} pour ce pays
                </p>
              )}
              {touched.paymentSystemName && !formData.paymentSystemName.trim() && (
                <p className="text-xs text-destructive">Le système de paiement est requis</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="countryCode" className="text-sm font-medium">
                Indicatif pays <span className="text-destructive">*</span>
              </Label>
              <Select
                id="countryCode"
                required
                value={countryCode}
                onChange={handleCountryCodeChange}
                disabled={loading}
                className="h-10"
              >
                {SUPPORTED_COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {formatCountryCode(country)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="text-sm font-medium">
                Numéro de téléphone <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                <div className="flex items-center px-3 bg-muted/30 border border-border rounded-md text-sm text-muted-foreground whitespace-nowrap">
                  +{countryCode}
                </div>
                <Input
                  id="phoneNumber"
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, phoneNumber: true }))}
                  placeholder="074398524 ou 74398524"
                  disabled={loading}
                  className={cn('flex-1 h-10', msisdnError && 'border-destructive')}
                  maxLength={10}
                />
              </div>
              {msisdnError ? (
                <p className="text-xs text-destructive">{msisdnError}</p>
              ) : phoneNumber && (
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground">
                    Format local: {combineMsisdn(countryCode, phoneNumber)}
                  </p>
                  {fullMsisdn && fullMsisdn.length > 8 && (
                    <p className="text-xs text-muted-foreground">
                      Format international: +{fullMsisdn.replace(/\D/g, '')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Colonne droite - Montant */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">
                  Montant <span className="text-destructive">*</span>
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">
                Montant
              </Label>
              <Input
                id="amount"
                type="number"
                required
                min={100}
                step={formData.currency === 'XAF' || formData.currency === 'XOF' ? 1 : 100}
                value={formData.amount || ''}
                onChange={handleAmountChange}
                onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
                disabled={loading}
                className={cn(
                  'h-10 text-center text-lg font-semibold',
                  amountError && 'border-destructive'
                )}
                placeholder="1000"
              />
              {formData.amount > 0 && (
                <div className="p-2 bg-muted/30 border border-border rounded-md text-center">
                  <p className="text-base font-bold text-foreground">{formattedAmount}</p>
                </div>
              )}
              {amountError && (
                <p className="text-xs text-destructive">{amountError}</p>
              )}
              {!amountError && formData.amount >= 100 && (
                <div className="flex items-center justify-center gap-2 text-xs text-foreground/70">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Montant valide</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium">
                Devise
              </Label>
              <Select
                id="currency"
                required
                value={formData.currency}
                onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                onBlur={() => setTouched((prev) => ({ ...prev, currency: true }))}
                disabled={loading}
                className="h-10"
              >
                <option value="XAF">XAF (Franc CFA)</option>
                <option value="XOF">XOF (Franc CFA Ouest)</option>
                <option value="EUR">EUR (Euro)</option>
                <option value="USD">USD (Dollar US)</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                {ZERO_DECIMAL_CURRENCIES.has(formData.currency)
                  ? 'Pas de décimales'
                  : 'Format: centimes'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ligne inférieure - Options complémentaires en 3 colonnes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Provider */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                <Zap className="w-3 h-3 text-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold">Provider</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select
                id="provider"
                value={formData.provider || ''}
                onChange={(e) => {
                  const providerValue = e.target.value ? (e.target.value as CreatePayoutDto['provider']) : undefined;
                  setFormData((prev) => ({ 
                    ...prev, 
                    provider: providerValue,
                    metadata: {
                      ...prev.metadata,
                      provider: providerValue || undefined,
                    },
                  }));
                }}
                disabled={loading}
                className="h-9 text-sm"
              >
                <option value="">Par défaut (SHAP)</option>
                <option value="SHAP">SHAP</option>
                <option value="MONEROO">Moneroo</option>
                <option value="STRIPE">Stripe</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Provider de payout
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Type */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                <Clipboard className="w-3 h-3 text-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold">Type</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Select
                id="payoutType"
                value={formData.payoutType}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, payoutType: e.target.value as CreatePayoutDto['payoutType'] }))
                }
                disabled={loading}
                className="h-9 text-sm"
              >
                <option value="WITHDRAWAL">Retrait</option>
                <option value="REFUND">Remboursement</option>
                <option value="CASHBACK">Cashback</option>
              </Select>
              <p className="text-xs text-muted-foreground">
                Pour comptabilité
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Référence */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-foreground/5 border border-border flex items-center justify-center">
                <Zap className="w-3 h-3 text-foreground" />
              </div>
              <CardTitle className="text-sm font-semibold">Référence</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Input
                id="externalReference"
                type="text"
                value={formData.externalReference || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, externalReference: e.target.value || undefined }))}
                placeholder="Réf. système"
                disabled={loading}
                className="h-9 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateReference}
                disabled={loading}
                className="w-full h-8 text-xs"
              >
                <Zap className="w-3 h-3 mr-1" />
                Générer
              </Button>
              <p className="text-xs text-muted-foreground">
                Optionnel
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Erreur */}
      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm text-destructive mb-0.5">Erreur</p>
            <p className="text-xs text-destructive/90">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-3 border-t border-border sticky bottom-0 bg-background pb-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
            className="h-9 px-4"
          >
            Annuler
          </Button>
        )}
        <Button
          type="submit"
          disabled={loading || !isFormValid}
          className={cn(
            "h-9 px-5 font-semibold text-sm",
            loading || !isFormValid 
              ? "bg-foreground/10 text-foreground/50 cursor-not-allowed" 
              : "bg-foreground text-background hover:bg-foreground/90"
          )}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création...
            </>
          ) : (
            "Créer le payout"
          )}
        </Button>
      </div>
    </form>
  );
}
