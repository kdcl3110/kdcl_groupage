import { Country } from '../../models/Country.model';
import { AppError } from '../../middlewares/errorHandler';
import type { CreateCountryDto, UpdateCountryDto } from './country.dto';

export class CountryService {

  async getAll(): Promise<Country[]> {
    return Country.findAll({ order: [['name', 'ASC']] });
  }

  async getById(id: number): Promise<Country> {
    const country = await Country.findByPk(id);
    if (!country) throw new AppError(404, 'Country not found');
    return country;
  }

  async create(dto: CreateCountryDto): Promise<Country> {
    if (!dto.name?.trim()) throw new AppError(400, 'Country name is required');
    const exists = await Country.findOne({ where: { name: dto.name.trim() } });
    if (exists) throw new AppError(409, `Country "${dto.name}" already exists`);
    return Country.create({ name: dto.name.trim() });
  }

  async update(id: number, dto: UpdateCountryDto): Promise<Country> {
    const country = await this.getById(id);
    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new AppError(400, 'Country name cannot be empty');
      const exists = await Country.findOne({ where: { name: dto.name.trim() } });
      if (exists && exists.country_id !== id) {
        throw new AppError(409, `Country "${dto.name}" already exists`);
      }
    }
    await country.update({
      ...(dto.name     !== undefined && { name:      dto.name.trim() }),
      ...(dto.is_active !== undefined && { is_active: dto.is_active }),
    });
    return country.reload();
  }

  async remove(id: number): Promise<{ message: string }> {
    const country = await this.getById(id);
    await country.destroy();
    return { message: 'Country deleted successfully' };
  }
}
