import { Currency } from '../models/Currency.model';
import { env } from '../configs/env.config';

interface ExchangeRateApiResponse {
  result: string;
  rates: Record<string, number>;
}

// Currencies supported by the platform
const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',      symbol: '$'    },
  { code: 'EUR', name: 'Euro',           symbol: '€'    },
  { code: 'XAF', name: 'Franc CFA',      symbol: 'FCFA' },
  { code: 'GBP', name: 'Livre sterling', symbol: '£'    },
  { code: 'CAD', name: 'Dollar canadien',symbol: 'CA$'  },
  { code: 'CHF', name: 'Franc suisse',   symbol: 'CHF'  },
];

export class CurrencyService {

  /** Fetch latest USD-based rates and upsert into the database */
  async updateExchangeRates(): Promise<void> {
    console.log('[CurrencyService] Fetching exchange rates...');
    try {
      const response = await fetch(env.exchangeRate.apiUrl, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`Exchange rate API responded with ${response.status}`);
      }

      const data = (await response.json()) as ExchangeRateApiResponse;

      if (data.result !== 'success' || !data.rates) {
        throw new Error('Invalid response from exchange rate API');
      }

      const now = new Date();

      for (const meta of SUPPORTED_CURRENCIES) {
        const rateToUsd = meta.code === 'USD' ? 1 : (data.rates[meta.code] ?? null);
        if (rateToUsd === null) {
          console.warn(`[CurrencyService] Rate not found for ${meta.code}, skipping`);
          continue;
        }

        await Currency.upsert({
          code:         meta.code,
          name:         meta.name,
          symbol:       meta.symbol,
          rate_to_usd:  rateToUsd,
          last_updated: now,
        });
      }

      console.log(`[CurrencyService] Exchange rates updated for ${SUPPORTED_CURRENCIES.length} currencies`);
    } catch (err) {
      console.error('[CurrencyService] Failed to update exchange rates:', err);
      // Don't rethrow — a failed rate update should not crash the server
    }
  }

  /** Convert an amount in USD to the given currency */
  async convertFromUsd(amountUsd: number, targetCode: string): Promise<number> {
    if (targetCode === 'USD') return amountUsd;
    const currency = await Currency.findOne({ where: { code: targetCode } });
    if (!currency) throw new Error(`Currency ${targetCode} not found`);
    return Math.round(amountUsd * Number(currency.rate_to_usd) * 100) / 100;
  }

  /** Convert an amount in the given currency to USD */
  async convertToUsd(amount: number, fromCode: string): Promise<number> {
    if (fromCode === 'USD') return amount;
    const currency = await Currency.findOne({ where: { code: fromCode } });
    if (!currency) throw new Error(`Currency ${fromCode} not found`);
    return Math.round((amount / Number(currency.rate_to_usd)) * 100) / 100;
  }

  /** List all supported currencies */
  async getAll(): Promise<Currency[]> {
    return Currency.findAll({ order: [['code', 'ASC']] });
  }
}

export const currencyService = new CurrencyService();
