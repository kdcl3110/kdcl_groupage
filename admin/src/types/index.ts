export type UserRole = 'client' | 'admin' | 'freight_forwarder'
export type UserStatus = 'active' | 'inactive' | 'suspended'

export interface User {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  street?: string
  city?: string
  country?: string
  postal_code?: string
  role: UserRole
  status: UserStatus
  registration_date: string
  profile_picture?: string
  email_verified: boolean
  phone_verified: boolean
  createdAt: string
  updatedAt: string
}

export type TravelStatus = 'open' | 'full' | 'in_transit' | 'at_warehouse' | 'delivered' | 'cancelled'
export type TransportType = 'ship' | 'plane'

export interface Country {
  country_id: number
  name: string
}

export interface Travel {
  travel_id: number
  created_by: number
  transport_type: TransportType
  origin_country_id: number
  destination_country_id: number
  itinerary?: string
  status: TravelStatus
  container?: string
  max_weight: number
  max_volume: number
  min_load_percentage: number
  max_load_percentage: number
  price_per_unit?: number
  creation_date: string
  departure_date?: string
  estimated_arrival_date?: string
  origin?: Country
  destination?: Country
  creator?: Pick<User, 'user_id' | 'first_name' | 'last_name' | 'phone' | 'city' | 'country'>
  packages_count?: number
  current_weight?: number
  current_volume?: number
  weight_fill_pct?: number
  volume_fill_pct?: number
  remaining_weight?: number
  remaining_volume?: number
}

export type PackageStatus =
  | 'pending' | 'submitted' | 'awaiting_payment' | 'paid'
  | 'in_travel' | 'in_transit' | 'at_warehouse' | 'delivered'
  | 'returned' | 'cancelled'

export type FragilityLevel = 'normal' | 'fragile' | 'tres_fragile'

export interface Recipient {
  recipient_id: number
  first_name: string
  last_name: string
  phone: string
  address?: string
  city: string
  country: string
  email?: string
}

export interface Package {
  package_id: number
  client_id: number
  travel_id?: number
  recipient_id: number
  tracking_number: string
  description: string
  weight: number
  volume: number
  declared_value: number
  status: PackageStatus
  fragility: FragilityLevel
  price?: number
  special_instructions?: string
  image1?: string
  image2?: string
  image3?: string
  image4?: string
  creation_date: string
  estimated_delivery_date?: string
  delivery_date?: string
  client?: Pick<User, 'user_id' | 'first_name' | 'last_name' | 'email' | 'phone'>
  travel?: Pick<Travel, 'travel_id' | 'status' | 'itinerary' | 'transport_type' | 'departure_date'>
  recipient?: Recipient
  createdAt: string
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'

export interface Payment {
  payment_id: number
  package_id: number
  amount_usd: number
  platform_commission_usd: number
  provider_fee_usd: number
  net_to_groupeur_usd: number
  provider?: 'stripe' | 'notchpay'
  provider_intent_id?: string
  receipt_url?: string
  status: PaymentStatus
  deadline_at?: string
  paid_at?: string
  createdAt: string
}

export interface AdminStats {
  users_count: number
  travels_count: number
  packages_count: number
  total_revenue_usd: number
  users_by_role: Record<string, number>
  packages_by_status: Record<string, number>
}

export interface PaginatedResult<T> {
  total: number
  data: T[]
}
