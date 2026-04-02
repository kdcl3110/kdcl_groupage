import { Country } from '../models/Country.model';

const INITIAL_COUNTRIES = ['Belgique', 'Cameroun'];

export async function seedCountries(): Promise<void> {
  for (const name of INITIAL_COUNTRIES) {
    await Country.findOrCreate({ where: { name }, defaults: { name } });
  }
  console.log('Countries seeded.');
}
