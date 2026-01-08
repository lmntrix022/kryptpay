// Main SDK entry point
export * from './types';
export * from './lib/i18n';
export * from './lib/apple-google-pay';
export * from './components/BoohPayCheckout';
export * from './components/BoohPayCheckoutSecure';
export * from './utils/api';
export * from './utils/validation';

// SDK instance for non-React usage
import type { BoohPaySDKConfig, PaymentOptions, PaymentResponse, BoohPayInstance } from './types';
import { createPayment } from './utils/api';

const DEFAULT_API_URL = 'https://api.boohpay.com/api/v1';

export class BoohPaySDK implements BoohPayInstance {
  private config: BoohPaySDKConfig;
  private apiUrl: string;

  constructor(config: BoohPaySDKConfig) {
    if (!config.publishableKey) {
      throw new Error('KryptPay SDK: publishableKey is required');
    }

    this.config = config;
    this.apiUrl = config.apiUrl || DEFAULT_API_URL;
  }

  async checkout(options: PaymentOptions): Promise<PaymentResponse> {
    try {
      const response = await createPayment(options, this.apiUrl, this.config.publishableKey);
      
      this.config.onStatusChange?.(response.status, response.paymentId);

      // Handle redirects
      if (response.checkoutUrl) {
        if (typeof window !== 'undefined') {
          window.location.href = response.checkoutUrl;
        }
      }

      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      this.config.onError?.(err);
      throw err;
    }
  }
}

// Default export
export default BoohPaySDK;

// Named exports for React components
export { BoohPayCheckout } from './components/BoohPayCheckout';
export { BoohPayCheckoutSecure } from './components/BoohPayCheckoutSecure';


