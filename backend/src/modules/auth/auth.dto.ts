export interface RegisterDto {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  street: string;
  city: string;
  country: string;
  postal_code?: string;
  role?: 'client' | 'admin' | 'freight_forwarder';
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  new_password: string;
}

export interface UpdateProfileDto {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  street?: string;
  city?: string;
  country?: string;
  postal_code?: string;
}

export interface ChangePasswordDto {
  current_password: string;
  new_password: string;
}
