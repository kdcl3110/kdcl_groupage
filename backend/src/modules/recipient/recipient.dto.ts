export interface CreateRecipientDto {
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  email?: string;
}

export interface UpdateRecipientDto {
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  email?: string | null;
}
