import { Country } from '../models/Country.model';
import { Currency } from '../models/Currency.model';
import { PlatformConfig } from '../models/PlatformConfig.model';

const INITIAL_COUNTRIES = ['Belgique', 'Cameroun'];

export async function seedCountries(): Promise<void> {
  for (const name of INITIAL_COUNTRIES) {
    await Country.findOrCreate({ where: { name }, defaults: { name } });
  }
  console.log('Countries seeded.');
}

const INITIAL_CURRENCIES = [
  { code: 'USD', name: 'US Dollar',       symbol: '$',    rate_to_usd: 1 },
  { code: 'EUR', name: 'Euro',            symbol: '€',    rate_to_usd: 0.92 },
  { code: 'XAF', name: 'Franc CFA',       symbol: 'FCFA', rate_to_usd: 605.96 },
  { code: 'GBP', name: 'Livre sterling',  symbol: '£',    rate_to_usd: 0.79 },
  { code: 'CAD', name: 'Dollar canadien', symbol: 'CA$',  rate_to_usd: 1.36 },
  { code: 'CHF', name: 'Franc suisse',    symbol: 'CHF',  rate_to_usd: 0.90 },
];

export async function seedCurrencies(): Promise<void> {
  for (const c of INITIAL_CURRENCIES) {
    await Currency.findOrCreate({
      where: { code: c.code },
      defaults: { ...c, last_updated: new Date() },
    });
  }
  console.log('Currencies seeded.');
}

const INITIAL_PLATFORM_CONFIG = [
  {
    key:         'commission_rate',
    value:       '0.05',
    description: 'Platform commission rate on each payment (e.g. 0.05 = 5%). Configurable via admin panel.',
  },
  {
    key:         'payment_deadline_hours',
    value:       '48',
    description: 'Hours the client has to complete payment after the groupeur accepts their package.',
  },
];

export async function seedPlatformConfig(): Promise<void> {
  for (const cfg of INITIAL_PLATFORM_CONFIG) {
    await PlatformConfig.findOrCreate({ where: { key: cfg.key }, defaults: cfg });
  }
  console.log('Platform config seeded.');
}
