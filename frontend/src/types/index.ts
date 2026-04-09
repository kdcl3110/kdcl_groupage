export interface Country {
  country_id: number
  name: string
  is_active: boolean
}

export interface User {
  user_id: number
  first_name: string
  last_name: string
  email: string
  role: 'admin' | 'freight_forwarder' | 'client'
  phone: string
  street: string
  city: string
  country: string
  postal_code: string | null
  profile_picture: string | null
  email_verified: boolean
  phone_verified: boolean
}

export interface TravelCreator {
  user_id: number
  first_name: string
  last_name: string
  phone: string
  city: string
  country: string
}

export interface GroupeurProfile {
  user_id: number
  first_name: string
  last_name: string
  phone: string
  email: string
  city: string
  country: string
  registration_date: string
  phone_verified: boolean
  email_verified: boolean
  travel_count: number
}

export interface Travel {
  travel_id: number
  created_by: number
  transport_type: 'ship' | 'plane'
  origin_country_id: number
  destination_country_id: number
  origin: { country_id: number; name: string }
  destination: { country_id: number; name: string }
  itinerary: string | null
  status: 'open' | 'full' | 'in_transit' | 'delivered' | 'cancelled'
  container: string | null
  max_weight: number
  max_volume: number
  min_load_percentage: number
  max_load_percentage: number
  price_per_unit: number | null
  creation_date: string
  departure_date: string | null
  estimated_arrival_date: string | null
  packages_count: number
  current_weight: number
  current_volume: number
  weight_fill_pct: number
  volume_fill_pct: number
  remaining_weight: number
  remaining_volume: number
  last_message_at: string | null
  creator?: TravelCreator
}

export interface PackageClient {
  user_id: number
  first_name: string
  last_name: string
  email: string
  phone: string
  city: string
  country: string
}

export type PackageStatus =
  | 'pending'
  | 'submitted'
  | 'awaiting_payment'
  | 'paid'
  | 'in_travel'
  | 'in_transit'
  | 'delivered'
  | 'returned'
  | 'cancelled'

export interface Package {
  package_id: number
  client_id: number
  travel_id: number | null
  client?: PackageClient
  recipient_id: number
  tracking_number: string
  description: string
  weight: number
  volume: number
  declared_value: number  // stored in USD
  status: PackageStatus
  fragility: 'normal' | 'fragile' | 'tres_fragile'
  price: number | null    // computed price in USD (set when groupeur accepts)
  special_instructions: string | null
  image1: string
  image2: string | null
  image3: string | null
  image4: string | null
  creation_date: string
  payment?: Payment | null
}

export interface Recipient {
  recipient_id: number
  client_id: number
  first_name: string
  last_name: string
  phone: string
  email: string | null
  address: string
  city: string
  country: string
}

export interface ForumParticipant {
  user_id: number
  first_name: string
  last_name: string
}

export interface ForumMessage {
  message_id: number
  travel_id: number
  author_id: number | null
  message_type: 'system' | 'user'
  parent_message_id: number | null
  content: string
  creation_date: string
  author?: { user_id: number; first_name: string; last_name: string } | null
  is_read: boolean
  readers?: { user_id: number; first_name: string; last_name: string }[]
}

export interface Notification {
  notification_id: number
  user_id: number
  title: string
  content: string
  is_read: boolean
  creation_date: string
}

// ─── Payment & Currency ──────────────────────────────────────────────────────

export interface Currency {
  currency_id: number
  code: string    // 'USD', 'EUR', 'XAF'
  name: string
  symbol: string  // '$', '€', 'FCFA'
  rate_to_usd: number
  last_updated: string
}

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'expired'
export type PaymentProvider = 'stripe' | 'notchpay'

export interface Payment {
  payment_id: number
  package_id: number
  client_id: number
  groupeur_id: number
  travel_id: number
  amount_usd: number
  platform_commission_rate: number
  platform_commission_usd: number
  provider_fee_usd: number
  net_to_groupeur_usd: number
  provider: PaymentProvider | null
  provider_intent_id: string | null
  receipt_url: string | null
  status: PaymentStatus
  deadline_at: string
  paid_at: string | null
}

export type PayoutAccountType = 'iban' | 'mobile_money'
export type MobileOperator = 'mtn' | 'orange'
export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface PayoutAccount {
  account_id: number
  user_id: number
  type: PayoutAccountType
  account_holder_name: string
  iban: string | null
  mobile_number: string | null
  mobile_operator: MobileOperator | null
  country_code: string
  is_default: boolean
  is_verified: boolean
}

export interface Payout {
  payout_id: number
  travel_id: number
  groupeur_id: number
  payout_account_id: number | null
  gross_amount_usd: number
  provider_fee_usd: number
  net_amount_usd: number
  provider: string | null
  provider_reference: string | null
  status: PayoutStatus
  completed_at: string | null
}
