export interface CreateCountryDto {
  name: string;
}

export interface UpdateCountryDto {
  name?: string;
  is_active?: boolean;
}
