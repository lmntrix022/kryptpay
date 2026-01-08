import React, { useState, useCallback, useEffect } from 'react';
import type { PaymentMethod, PaymentOptions, PaymentResponse, BoohPaySDKConfig } from '../types';
import type { Locale } from '../lib/i18n';
import { useTranslation, detectLocale } from '../lib/i18n';
import { createPayment } from '../utils/api';
import {
  validatePhoneNumber,
  validateEmail,
  validateCardNumber,
  validateCardCVC,
  validateCardExpiry,
} from '../utils/validation';
import { BoohPayAPIError } from '../utils/api';

export interface BoohPayCheckoutProps {
  config: BoohPaySDKConfig;
  options: PaymentOptions;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: Error) => void;
  className?: string;
  locale?: Locale;
  theme?: {
    primaryColor?: string;
    buttonColor?: string;
    fontFamily?: string;
  };
  defaultMethod?: PaymentMethod;
  hideMethodTabs?: boolean;
}

const DEFAULT_API_URL = 'https://api.boohpay.com/api/v1';

export function BoohPayCheckout({
  config,
  options,
  onSuccess,
  onError,
  className = '',
  locale,
  theme = {},
  defaultMethod,
  hideMethodTabs = false,
}: BoohPayCheckoutProps) {
  const currentLocale = locale || detectLocale();
  const { t } = useTranslation(currentLocale);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultMethod || 'CARD');
  
  // Update selected method when defaultMethod changes
  useEffect(() => {
    if (defaultMethod) {
      setSelectedMethod(defaultMethod);
    }
  }, [defaultMethod]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState(options.customer?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  // Card states
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const apiUrl = config.apiUrl || DEFAULT_API_URL;

  useEffect(() => {
    if (options.customer?.email) {
      setEmail(options.customer.email);
    }
  }, [options.customer?.email]);

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
    setPhoneError(null);
    setCardErrors({});
  };

  const validateForm = useCallback((): boolean => {
    if (selectedMethod === 'CARD') {
      const errors: Record<string, string> = {};

      if (!cardNumber.trim()) {
        errors.cardNumber = 'Le numéro de carte est requis';
      } else {
        const cardValidation = validateCardNumber(cardNumber);
        if (!cardValidation.valid) {
          errors.cardNumber = cardValidation.error || 'Numéro de carte invalide';
        }
      }

      if (!cardExpiry.trim()) {
        errors.cardExpiry = 'La date d\'expiration est requise';
      } else {
        const expiryValidation = validateCardExpiry(cardExpiry);
        if (!expiryValidation.valid) {
          errors.cardExpiry = expiryValidation.error || 'Date d\'expiration invalide';
        }
      }

      if (!cardCVC.trim()) {
        errors.cardCVC = 'Le CVC est requis';
      } else {
        const cvcValidation = validateCardCVC(cardCVC);
        if (!cvcValidation.valid) {
          errors.cardCVC = cvcValidation.error || 'CVC invalide';
        }
      }

      if (!cardholderName.trim()) {
        errors.cardholderName = 'Le nom du titulaire est requis';
      }

      setCardErrors(errors);
      return Object.keys(errors).length === 0;
    } else {
      // Mobile Money validation
      if (!phoneNumber.trim()) {
        setPhoneError('Le numéro de téléphone est requis');
        return false;
      }

      const phoneValidation = validatePhoneNumber(phoneNumber, options.countryCode);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || 'Numéro de téléphone invalide');
        return false;
      }
      setPhoneError(null);

      if (email) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          setEmailError(emailValidation.error || 'Email invalide');
          return false;
        }
      }
      setEmailError(null);

      return true;
    }
  }, [selectedMethod, cardNumber, cardExpiry, cardCVC, cardholderName, phoneNumber, email, options.countryCode]);

  // Auto-detect operator for Mobile Money based on phone number
  const detectMobileMoneyOperator = (phone: string): 'AIRTEL_MONEY' | 'MOOV_MONEY' | null => {
    const digits = phone.replace(/\D/g, '');
    
    // Gabon: 07 -> Airtel, 06 -> Moov
    if (digits.startsWith('24107') || (digits.startsWith('07') && digits.length >= 8)) {
      return 'AIRTEL_MONEY';
    }
    if (digits.startsWith('24106') || (digits.startsWith('06') && digits.length >= 8)) {
      return 'MOOV_MONEY';
    }
    
    // Try to detect from normalized number
    if (digits.length >= 8) {
      if (digits.includes('07') && digits.indexOf('07') < 3) {
        return 'AIRTEL_MONEY';
      }
      if (digits.includes('06') && digits.indexOf('06') < 3) {
        return 'MOOV_MONEY';
      }
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // For MOBILE_MONEY, detect operator from phone number
      let finalMethod = selectedMethod;
      if (selectedMethod === 'MOBILE_MONEY' || selectedMethod === 'AIRTEL_MONEY' || selectedMethod === 'MOOV_MONEY') {
        if (phoneNumber) {
          const detectedOperator = detectMobileMoneyOperator(phoneNumber);
          if (detectedOperator) {
            finalMethod = detectedOperator;
          } else if (selectedMethod === 'MOBILE_MONEY') {
            // Default to AIRTEL_MONEY if cannot detect
            finalMethod = 'AIRTEL_MONEY';
          }
        }
      }
      
      // Map UI payment method to backend payment method
      const backendPaymentMethod = finalMethod === 'CARD' ? 'CARD' : 'MOBILE_MONEY';
      
      const paymentOptions: PaymentOptions = {
        ...options,
        customer: {
          ...options.customer,
          email: email || options.customer?.email,
          phone:
            finalMethod !== 'CARD'
              ? validatePhoneNumber(phoneNumber, options.countryCode).normalized || phoneNumber
              : options.customer?.phone,
        },
        paymentMethod: backendPaymentMethod as any,
        metadata: {
          ...options.metadata,
          ...(finalMethod !== 'CARD' && {
            mobileMoneyProvider: finalMethod, // AIRTEL_MONEY, MOOV_MONEY, etc.
            preferredProvider: finalMethod,
          }),
        },
      };

      const response = await createPayment(paymentOptions, apiUrl, config.publishableKey);

      // Handle 3DS redirect for Stripe
      if (response.checkoutPayload?.stripeClientSecret) {
        // In a real implementation, you would integrate Stripe Elements here
        // For now, we'll redirect to the checkout URL if available
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
          return;
        }
      }

      // Handle redirect for Mobile Money
      if (response.checkoutUrl && selectedMethod !== 'CARD') {
        window.location.href = response.checkoutUrl;
        return;
      }

      setSuccess(true);
      config.onStatusChange?.(response.status, response.paymentId);
      onSuccess?.(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Erreur inconnue');
      setError(error.message);
      config.onError?.(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19); // Max 19 chars (16 digits + 3 spaces)
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const themeStyles = {
    '--boohpay-primary': theme.primaryColor || theme.buttonColor || '#8b5cf6',
    '--boohpay-font': theme.fontFamily || 'inherit',
  } as React.CSSProperties;

  return (
    <div className={`boohpay-checkout ${className}`} style={themeStyles}>
      <style>{`
        .boohpay-checkout {
          font-family: var(--boohpay-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
          max-width: 500px;
          margin: 0 auto;
        }
        .boohpay-checkout .method-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 2px solid rgba(148, 163, 184, 0.2);
        }
        .boohpay-checkout .method-tab {
          padding: 0.75rem 1.25rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #94a3b8;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.9rem;
          transition: all 0.2s ease;
        }
        .boohpay-checkout .method-tab:hover {
          color: #e2e8f0;
        }
        .boohpay-checkout .method-tab.active {
          color: var(--boohpay-primary);
          border-bottom-color: var(--boohpay-primary);
        }
        .boohpay-checkout .form-group {
          margin-bottom: 1.25rem;
        }
        .boohpay-checkout .form-label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 600;
          font-size: 0.9rem;
          color: #cbd5e1;
        }
        .boohpay-checkout .form-input {
          width: 100%;
          padding: 0.875rem 1rem;
          background: #ffffff;
          color: #000000;
          border: 1.5px solid rgba(148, 163, 184, 0.25);
          border-radius: 8px;
          font-size: 1rem;
          transition: all 0.2s ease;
        }
        .boohpay-checkout .form-input:focus {
          outline: none;
          border-color: var(--boohpay-primary);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.15);
        }
        .boohpay-checkout .form-input.error {
          border-color: #ef4444;
        }
        .boohpay-checkout .form-error-text {
          margin-top: 0.5rem;
          font-size: 0.85rem;
          color: #ef4444;
        }
        .boohpay-checkout .submit-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, var(--boohpay-primary) 0%, #7c3aed 100%);
          border: none;
          border-radius: 8px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
        }
        .boohpay-checkout .submit-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(139, 92, 246, 0.4);
        }
        .boohpay-checkout .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .boohpay-checkout .error-message {
          padding: 1rem;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.4);
          border-radius: 8px;
          color: #fecaca;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .boohpay-checkout .success-message {
          padding: 1rem;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          color: #a7f3d0;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .boohpay-checkout .loading-spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin-right: 0.5rem;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .boohpay-checkout .method-tabs {
            flex-wrap: wrap;
          }
          .boohpay-checkout .method-tab {
            font-size: 0.85rem;
            padding: 0.625rem 1rem;
          }
        }
      `}</style>

      <form onSubmit={handleSubmit}>
        {/* Method Selection Tabs */}
        {!hideMethodTabs && (
          <div className="method-tabs">
            <button
              type="button"
              className={`method-tab ${selectedMethod === 'CARD' ? 'active' : ''}`}
              onClick={() => handleMethodChange('CARD')}
            >
              {t('method.card')}
            </button>
            <button
              type="button"
              className={`method-tab ${selectedMethod === 'AIRTEL_MONEY' ? 'active' : ''}`}
              onClick={() => handleMethodChange('AIRTEL_MONEY')}
            >
              {t('method.airtel')}
            </button>
            <button
              type="button"
              className={`method-tab ${selectedMethod === 'MOOV_MONEY' ? 'active' : ''}`}
              onClick={() => handleMethodChange('MOOV_MONEY')}
            >
              {t('method.moov')}
            </button>
          </div>
        )}

        {/* Error/Success Messages */}
        {error && <div className="error-message">⚠️ {error}</div>}
        {success && (
          <div className="success-message">✅ Paiement initié avec succès !</div>
        )}

        {/* Card Payment Form */}
        {selectedMethod === 'CARD' && (
          <>
            <div className="form-group">
              <label className="form-label">{t('card.number')}</label>
              <input
                type="text"
                className={`form-input ${cardErrors.cardNumber ? 'error' : ''}`}
                placeholder={t('format.card')}
                value={cardNumber}
                onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                maxLength={19}
                disabled={loading}
              />
              {cardErrors.cardNumber && (
                <div className="form-error-text">{cardErrors.cardNumber}</div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('card.name')}</label>
              <input
                type="text"
                className={`form-input ${cardErrors.cardholderName ? 'error' : ''}`}
                placeholder="Jean DUPONT"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                disabled={loading}
              />
              {cardErrors.cardholderName && (
                <div className="form-error-text">{cardErrors.cardholderName}</div>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">{t('card.expiry')}</label>
                <input
                  type="text"
                  className={`form-input ${cardErrors.cardExpiry ? 'error' : ''}`}
                  placeholder={t('format.expiry')}
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                  maxLength={5}
                  disabled={loading}
                />
                {cardErrors.cardExpiry && (
                  <div className="form-error-text">{cardErrors.cardExpiry}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('card.cvc')}</label>
                <input
                  type="text"
                  className={`form-input ${cardErrors.cardCVC ? 'error' : ''}`}
                  placeholder="123"
                  value={cardCVC}
                  onChange={(e) => setCardCVC(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  disabled={loading}
                />
                {cardErrors.cardCVC && (
                  <div className="form-error-text">{cardErrors.cardCVC}</div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Mobile Money Form */}
        {selectedMethod !== 'CARD' && (
          <>
            <div className="form-group">
              <label className="form-label">
                {t('mobile.phone')}
                {phoneNumber && (() => {
                  const detected = detectMobileMoneyOperator(phoneNumber);
                  return detected ? (
                    <span style={{ 
                      marginLeft: '0.5rem', 
                      fontSize: '0.75rem', 
                      color: '#86efac',
                      fontWeight: 'normal'
                    }}>
                      ({detected === 'AIRTEL_MONEY' ? t('detected.airtel') : t('detected.moov')})
                    </span>
                  ) : null;
                })()}
              </label>
              <input
                type="tel"
                className={`form-input ${phoneError ? 'error' : ''}`}
                placeholder={t('format.phone')}
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  setPhoneError(null);
                }}
                disabled={loading}
              />
              {phoneError && <div className="form-error-text">{phoneError}</div>}
              {phoneNumber && !phoneError && detectMobileMoneyOperator(phoneNumber) && (
                <div style={{
                  marginTop: '0.5rem',
                  fontSize: '0.8125rem',
                  color: '#86efac',
                }}>
                  ✓ {t('detected.airtel')}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">{t('mobile.email')}</label>
              <input
                type="email"
                className={`form-input ${emailError ? 'error' : ''}`}
                placeholder="client@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                disabled={loading}
              />
              {emailError && <div className="form-error-text">{emailError}</div>}
            </div>
          </>
        )}

        {/* Submit Button */}
        <button type="submit" className="submit-button" disabled={loading}>
          {loading ? (
            <>
              <span className="loading-spinner"></span>
              {t('button.processing')}
            </>
          ) : (
            `${t('button.pay')} ${new Intl.NumberFormat(currentLocale === 'ar' ? 'ar-SA' : currentLocale === 'en' ? 'en-US' : currentLocale === 'fr' ? 'fr-FR' : currentLocale, {
              style: 'currency',
              currency: options.currency,
            }).format(options.amount)}`
          )}
        </button>
      </form>
    </div>
  );
}

