export interface CreatePaymentIntentParams {
  amountUsd: number;      // gross amount in USD
  currency: string;       // target currency code (EUR, XAF, …)
  amountInCurrency: number; // pre-converted amount for the provider
  packageId: number;
  paymentId: number;      // internal payment record ID (used as reference)
  clientEmail: string;
  description: string;
  callbackUrl: string;    // redirect after Notchpay payment
}

export interface PaymentIntentResult {
  intentId: string;          // provider's payment intent / reference ID
  clientSecret?: string;     // Stripe: passed to frontend for Elements
  redirectUrl?: string;      // Notchpay: redirect the client here
  estimatedProviderFeeUsd: number;
}

export interface WebhookEvent {
  type: 'payment.success' | 'payment.failed' | 'unknown';
  intentId: string;
  receiptUrl?: string;
}

// Payout (disbursement to groupeur)

export interface PayoutAccountInfo {
  type: 'iban' | 'mobile_money';
  accountHolderName: string;
  iban?: string;
  mobileNumber?: string;
  mobileOperator?: string; // 'mtn' | 'orange'
  countryCode: string;
}

export interface CreatePayoutParams {
  amountUsd: number;
  currency: string;          // target payout currency
  amountInCurrency: number;
  description: string;
  account: PayoutAccountInfo;
}

export interface PayoutResult {
  reference: string;
  status: 'pending' | 'processing' | 'completed';
  providerFeeUsd: number;
  note?: string;
}

// Provider interface

export interface IPaymentProvider {
  getProviderName(): string;
  createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult>;
  parseWebhookEvent(rawBody: Buffer | string, signature: string): Promise<WebhookEvent>;
  createPayout(params: CreatePayoutParams): Promise<PayoutResult>;
}
