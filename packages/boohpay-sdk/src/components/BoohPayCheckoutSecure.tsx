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

// Stripe Elements imports (with fallback)
let Elements: any, CardElement: any, useStripe: any, useElements: any, loadStripe: any;
try {
  const stripeReact = require('@stripe/react-stripe-js');
  const stripeJs = require('@stripe/stripe-js');
  Elements = stripeReact.Elements;
  CardElement = stripeReact.CardElement;
  useStripe = stripeReact.useStripe;
  useElements = stripeReact.useElements;
  loadStripe = stripeJs.loadStripe;
} catch (e) {
  // Stripe Elements not available, will use fallback
}

export interface BoohPayCheckoutSecureProps {
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
  stripePublishableKey?: string;
  useStripeElements?: boolean;
}

const DEFAULT_API_URL = 'https://api.boohpay.com/api/v1';

// Internal component with Stripe Elements
function CheckoutFormWithElements({
  config,
  options,
  onSuccess,
  onError,
  locale,
}: {
  config: BoohPaySDKConfig;
  options: PaymentOptions;
  onSuccess?: (response: PaymentResponse) => void;
  onError?: (error: Error) => void;
  locale: Locale;
}) {
  const stripe = useStripe?.();
  const elements = useElements?.();
  const { t } = useTranslation(locale);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!stripe || !elements) {
      setError('Stripe Elements non initialisé');
      return;
    }

    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      if (!paymentMethod) {
        throw new Error('Échec de la création du payment method');
      }

      const paymentOptions: PaymentOptions = {
        ...options,
        paymentMethod: 'CARD' as any,
        metadata: {
          ...options.metadata,
          stripePaymentMethodId: paymentMethod.id,
        },
      };

      const apiUrl = config.apiUrl || DEFAULT_API_URL;
      const response = await createPayment(paymentOptions, apiUrl, config.publishableKey);

      if (response.checkoutPayload?.stripeClientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(response.checkoutPayload.stripeClientSecret);

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      if (response.checkoutUrl) {
        window.location.href = response.checkoutUrl;
        return;
      }

      config.onStatusChange?.(response.status, response.paymentId);
      onSuccess?.(response);
    } catch (err) {
      let error: Error;
      if (err instanceof Error) {
        error = err;
      } else if (typeof err === 'object' && err !== null) {
        // Essayer d'extraire un message de l'objet
        const message = (err as any).message || (err as any).error || JSON.stringify(err);
        error = new Error(typeof message === 'string' ? message : 'Erreur inconnue');
      } else {
        error = new Error(String(err) || 'Erreur inconnue');
      }
      
      setError(error.message);
      config.onError?.(error);
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const theme = config as any;
  const cardElementOptions = {
    hidePostalCode: true,
    style: {
      base: {
        fontSize: '16px',
        color: '#000000',
        '::placeholder': { color: '#aab7c4' },
        fontFamily: theme?.fontFamily || 'inherit',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#000000' }}>
          {t('card.number')}
        </label>
        <div style={{
          padding: '0.875rem 1rem',
          background: '#ffffff',
          border: '1.5px solid rgba(148, 163, 184, 0.25)',
          borderRadius: '8px',
        }}>
          <CardElement options={cardElementOptions} />
        </div>
      </div>

      {error && <div style={{
        padding: '1rem',
        background: 'rgba(239, 68, 68, 0.15)',
        border: '1px solid rgba(239, 68, 68, 0.4)',
        borderRadius: '8px',
        color: '#dc2626',
        marginBottom: '1rem',
        fontSize: '0.9rem',
      }}>⚠️ {error}</div>}

      <button
        type="submit"
        disabled={loading || !stripe}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
          border: 'none',
          borderRadius: '8px',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: 600,
          cursor: loading || !stripe ? 'not-allowed' : 'pointer',
          opacity: loading || !stripe ? 0.6 : 1,
          transition: 'all 0.2s ease',
          marginTop: '1rem',
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-block',
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTopColor: '#ffffff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginRight: '0.5rem',
              verticalAlign: 'middle',
            }}></span>
            {t('button.processing')}
          </>
        ) : (
          `${t('button.pay')} ${new Intl.NumberFormat(locale === 'ar' ? 'ar-SA' : locale === 'en' ? 'en-US' : locale === 'fr' ? 'fr-FR' : locale, {
            style: 'currency',
            currency: options.currency,
          }).format(options.amount)}`
        )}
      </button>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </form>
  );
}

// Main component with fallback
export function BoohPayCheckoutSecure({
  config,
  options,
  onSuccess,
  onError,
  className = '',
  locale,
  theme = {},
  defaultMethod,
  hideMethodTabs = false,
  stripePublishableKey,
  useStripeElements = false,
}: BoohPayCheckoutSecureProps) {
  const currentLocale = locale || detectLocale();
  const { t } = useTranslation(currentLocale);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(defaultMethod || 'CARD');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [stripePromise, setStripePromise] = useState<any>(null);

  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [email, setEmail] = useState(options.customer?.email || '');
  const [emailError, setEmailError] = useState<string | null>(null);

  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const apiUrl = config.apiUrl || DEFAULT_API_URL;
  const canUseStripeElements = Elements && CardElement && useStripeElements && stripePublishableKey;

  useEffect(() => {
    if (options.customer?.email) {
      setEmail(options.customer.email);
    }
  }, [options.customer?.email]);

  useEffect(() => {
    if (canUseStripeElements && loadStripe && stripePublishableKey) {
      setStripePromise(loadStripe(stripePublishableKey));
    }
  }, [canUseStripeElements, stripePublishableKey]);

  useEffect(() => {
    if (defaultMethod) {
      setSelectedMethod(defaultMethod);
    }
  }, [defaultMethod]);

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
    setPhoneError(null);
    setCardErrors({});
  };

  const detectMobileMoneyOperator = (phone: string): 'AIRTEL_MONEY' | 'MOOV_MONEY' | null => {
    const digits = phone.replace(/\D/g, '');
    
    if (digits.startsWith('24107') || (digits.startsWith('07') && digits.length >= 8)) {
      return 'AIRTEL_MONEY';
    }
    if (digits.startsWith('24106') || (digits.startsWith('06') && digits.length >= 8)) {
      return 'MOOV_MONEY';
    }
    
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

  const validateForm = useCallback((): boolean => {
    if (selectedMethod === 'CARD') {
      const errors: Record<string, string> = {};

      if (!cardNumber.trim()) {
        errors.cardNumber = t('error.required');
      } else {
        const cardValidation = validateCardNumber(cardNumber);
        if (!cardValidation.valid) {
          errors.cardNumber = cardValidation.error || t('error.card.number');
        }
      }

      if (!cardExpiry.trim()) {
        errors.cardExpiry = t('error.required');
      } else {
        const expiryValidation = validateCardExpiry(cardExpiry);
        if (!expiryValidation.valid) {
          errors.cardExpiry = expiryValidation.error || t('error.card.expiry');
        }
      }

      if (!cardCVC.trim()) {
        errors.cardCVC = t('error.required');
      } else {
        const cvcValidation = validateCardCVC(cardCVC);
        if (!cvcValidation.valid) {
          errors.cardCVC = cvcValidation.error || t('error.card.cvc');
        }
      }

      if (!cardholderName.trim()) {
        errors.cardholderName = t('error.required');
      }

      setCardErrors(errors);
      return Object.keys(errors).length === 0;
    } else {
      if (!phoneNumber.trim()) {
        setPhoneError(t('error.required'));
        return false;
      }

      const phoneValidation = validatePhoneNumber(phoneNumber, options.countryCode);
      if (!phoneValidation.valid) {
        setPhoneError(phoneValidation.error || t('error.phone'));
        return false;
      }
      setPhoneError(null);

      if (email) {
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          setEmailError(emailValidation.error || t('error.email'));
          return false;
        }
      }
      setEmailError(null);

      return true;
    }
  }, [selectedMethod, cardNumber, cardExpiry, cardCVC, cardholderName, phoneNumber, email, options.countryCode, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let finalMethod = selectedMethod;
      if (selectedMethod === 'MOBILE_MONEY' || selectedMethod === 'AIRTEL_MONEY' || selectedMethod === 'MOOV_MONEY') {
        if (phoneNumber) {
          const detectedOperator = detectMobileMoneyOperator(phoneNumber);
          if (detectedOperator) {
            finalMethod = detectedOperator;
          } else if (selectedMethod === 'MOBILE_MONEY') {
            finalMethod = 'AIRTEL_MONEY';
          }
        }
      }
      
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
            mobileMoneyProvider: finalMethod,
            preferredProvider: finalMethod,
          }),
        },
      };

      const response = await createPayment(paymentOptions, apiUrl, config.publishableKey);

      if (response.checkoutPayload?.stripeClientSecret) {
        if (response.checkoutUrl) {
          window.location.href = response.checkoutUrl;
          return;
        }
      }

      if (response.checkoutUrl && selectedMethod !== 'CARD') {
        window.location.href = response.checkoutUrl;
        return;
      }

      setSuccess(true);
      config.onStatusChange?.(response.status, response.paymentId);
      onSuccess?.(response);
    } catch (err) {
      let error: Error;
      if (err instanceof Error) {
        error = err;
      } else if (typeof err === 'object' && err !== null) {
        // Essayer d'extraire un message de l'objet
        const message = (err as any).message || (err as any).error || JSON.stringify(err);
        error = new Error(typeof message === 'string' ? message : 'Erreur inconnue');
      } else {
        error = new Error(String(err) || 'Erreur inconnue');
      }
      
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
    return formatted.slice(0, 19);
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

  // Use Stripe Elements if available and requested
  if (selectedMethod === 'CARD' && canUseStripeElements && stripePromise) {
    return (
      <div className={`boohpay-checkout ${className}`} style={themeStyles}>
        <Elements stripe={stripePromise}>
          <CheckoutFormWithElements
            config={config}
            options={options}
            onSuccess={onSuccess}
            onError={onError}
            locale={currentLocale}
          />
        </Elements>
      </div>
    );
  }

  // Fallback: basic form
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
          color: #000000;
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
          box-sizing: border-box;
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
          color: #dc2626;
          margin-bottom: 1rem;
          font-size: 0.9rem;
        }
        .boohpay-checkout .success-message {
          padding: 1rem;
          background: rgba(34, 197, 94, 0.15);
          border: 1px solid rgba(34, 197, 94, 0.4);
          border-radius: 8px;
          color: #16a34a;
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

        {error && <div className="error-message">⚠️ {error}</div>}
        {success && (
          <div className="success-message">✅ {t('success.message')}</div>
        )}

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
