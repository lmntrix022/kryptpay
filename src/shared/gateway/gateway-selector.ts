import { Injectable } from '@nestjs/common';

import { PaymentMethod } from '../../modules/payments/dto/create-payment.dto';

const AFRICAN_COUNTRIES = ['SN', 'CI', 'CM', 'GA', 'CD', 'KE', 'NG', 'GH', 'UG', 'TZ', 'RW', 'ZA'];

export type Gateway = 'STRIPE' | 'MONEROO' | 'EBILLING';

@Injectable()
export class GatewaySelector {
  selectGateway(countryCode: string, paymentMethod: string): Gateway {
    const normalizedMethod = paymentMethod.toUpperCase();
    const normalizedCountry = countryCode.toUpperCase();

    if (
      normalizedCountry === 'GA' &&
      (normalizedMethod === PaymentMethod.MobileMoney || normalizedMethod === PaymentMethod.Momo)
    ) {
      return 'EBILLING';
    }

    if (normalizedMethod === PaymentMethod.MobileMoney || normalizedMethod === PaymentMethod.Momo) {
      return 'MONEROO';
    }

    if (AFRICAN_COUNTRIES.includes(normalizedCountry) && normalizedMethod !== PaymentMethod.Card) {
      return 'MONEROO';
    }

    return 'STRIPE';
  }
}
