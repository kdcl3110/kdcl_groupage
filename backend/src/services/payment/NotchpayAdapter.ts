import crypto from 'crypto';
import { env } from '../../configs/env.config';
import type {
  IPaymentProvider,
  CreatePaymentIntentParams, PaymentIntentResult,
  WebhookEvent,
  CreatePayoutParams, PayoutResult,
} from './IPaymentProvider';

const NOTCHPAY_API_URL = 'https://api.notchpay.co';

// Notchpay fee: 3.5% of transaction amount
const NOTCHPAY_PCT_FEE = 0.035;

interface NotchpayInitResponse {
  status: string;
  message: string;
  transaction: {
    reference: string;
    status: string;
    authorization_url: string;
  };
}

interface NotchpayTransferResponse {
  status: string;
  message: string;
  transfer?: {
    reference: string;
    status: string;
  };
}

interface NotchpayWebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
  };
}

export class NotchpayAdapter implements IPaymentProvider {
  constructor() {
    if (!env.notchpay.publicKey) {
      throw new Error('Notchpay public key is not configured (NOTCHPAY_PUBLIC_KEY)');
    }
  }

  getProviderName(): string {
    return 'notchpay';
  }

  async createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntentResult> {
    const body = {
      currency:    params.currency,
      amount:      Math.round(params.amountInCurrency), // XAF = whole units
      email:       params.clientEmail,
      description: params.description,
      callback:    params.callbackUrl,
      reference:   `kdcl-${params.paymentId}`,
    };

    const response = await fetch(`${NOTCHPAY_API_URL}/payments`, {
      method:  'POST',
      headers: {
        'Authorization': env.notchpay.publicKey,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Notchpay API error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as NotchpayInitResponse;
    if (data.status !== 'OK' || !data.transaction?.authorization_url) {
      throw new Error(`Notchpay response invalid: ${data.message}`);
    }

    return {
      intentId:               data.transaction.reference,
      redirectUrl:            data.transaction.authorization_url,
      estimatedProviderFeeUsd: round2(params.amountUsd * NOTCHPAY_PCT_FEE),
    };
  }

  async parseWebhookEvent(rawBody: Buffer | string, signature: string): Promise<WebhookEvent> {
    if (!env.notchpay.hash) {
      throw new Error('Notchpay hash is not configured (NOTCHPAY_HASH)');
    }

    const body = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
    const expected = crypto.createHmac('sha256', env.notchpay.hash).update(body).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'))) {
      throw new Error('Notchpay webhook signature verification failed');
    }

    const payload = JSON.parse(body) as NotchpayWebhookPayload;

    switch (payload.event) {
      case 'payment.complete':
        return { type: 'payment.success', intentId: payload.data.reference };
      case 'payment.failed':
        return { type: 'payment.failed',  intentId: payload.data.reference };
      default:
        return { type: 'unknown', intentId: payload.data?.reference ?? '' };
    }
  }

  /**
   * Transfer funds to a mobile money account (MTN MoMo / Orange Money).
   * Uses the Notchpay Transfers API.
   */
  async createPayout(params: CreatePayoutParams): Promise<PayoutResult> {
    if (!params.account.mobileNumber || !params.account.mobileOperator) {
      throw new Error('Mobile number and operator are required for Notchpay payouts');
    }

    const body = {
      currency:    params.currency,
      amount:      Math.round(params.amountInCurrency),
      description: params.description,
      beneficiary: {
        phone:    params.account.mobileNumber,
        name:     params.account.accountHolderName,
        operator: params.account.mobileOperator.toUpperCase(), // 'MTN' | 'ORANGE'
      },
    };

    const response = await fetch(`${NOTCHPAY_API_URL}/transfers`, {
      method:  'POST',
      headers: {
        'Authorization': env.notchpay.privateKey || env.notchpay.publicKey,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Notchpay transfer error ${response.status}: ${errText}`);
    }

    const data = (await response.json()) as NotchpayTransferResponse;
    if (data.status !== 'OK' || !data.transfer) {
      throw new Error(`Notchpay transfer response invalid: ${data.message}`);
    }

    const providerFeeUsd = round2(params.amountUsd * NOTCHPAY_PCT_FEE);

    return {
      reference:      data.transfer.reference,
      status:         data.transfer.status === 'complete' ? 'completed' : 'processing',
      providerFeeUsd,
    };
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }
