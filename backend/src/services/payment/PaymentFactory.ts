import type { IPaymentProvider } from './IPaymentProvider';
import { StripeAdapter } from './StripeAdapter';
import { NotchpayAdapter } from './NotchpayAdapter';

// Currencies routed to Notchpay (West/Central African CFA franc zone + other African currencies)
const NOTCHPAY_CURRENCIES = new Set(['XAF', 'XOF']);

export class PaymentFactory {
  /**
   * Returns the appropriate payment provider adapter based on the target currency.
   *
   * - XAF / XOF → Notchpay (MTN MoMo, Orange Money — Cameroon, Senegal, …)
   * - EUR / USD / GBP / CAD / CHF -> Stripe (Belgium and other Western countries)
   */
  static getProvider(currency: string): IPaymentProvider {
    if (NOTCHPAY_CURRENCIES.has(currency.toUpperCase())) {
      return new NotchpayAdapter();
    }
    return new StripeAdapter();
  }
}
