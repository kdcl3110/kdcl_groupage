import type { UserRole, UserStatus, TravelStatus, TransportType, PackageStatus, FragilityLevel, PaymentStatus } from '@/types'

// User
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  client: 'Client',
  admin: 'Admin',
  freight_forwarder: 'Groupeur',
}
export const USER_ROLE_COLORS: Record<UserRole, string> = {
  client: 'blue',
  admin: 'red',
  freight_forwarder: 'green',
}

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  suspended: 'Suspendu',
}
export const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active: 'green',
  inactive: 'default',
  suspended: 'red',
}

// Travel
export const TRAVEL_STATUS_LABELS: Record<TravelStatus, string> = {
  open: 'Ouvert',
  full: 'Complet',
  in_transit: 'En transit',
  at_warehouse: 'En entrepôt',
  delivered: 'Livré',
  cancelled: 'Annulé',
}
export const TRAVEL_STATUS_COLORS: Record<TravelStatus, string> = {
  open: 'green',
  full: 'orange',
  in_transit: 'blue',
  at_warehouse: 'purple',
  delivered: 'cyan',
  cancelled: 'red',
}

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  ship: 'Maritime',
  plane: 'Aérien',
}

export const TRAVEL_STATUS_TRANSITIONS: Record<TravelStatus, TravelStatus[]> = {
  open:         ['full', 'in_transit', 'cancelled'],
  full:         ['open', 'in_transit', 'cancelled'],
  in_transit:   ['at_warehouse'],
  at_warehouse: ['delivered'],
  delivered:    [],
  cancelled:    [],
}

// Package
export const PACKAGE_STATUS_LABELS: Record<PackageStatus, string> = {
  pending:          'En attente',
  submitted:        'Soumis',
  awaiting_payment: 'Paiement requis',
  paid:             'Payé',
  in_travel:        'En voyage',
  in_transit:       'En transit',
  at_warehouse:     'En entrepôt',
  delivered:        'Livré',
  returned:         'Retourné',
  cancelled:        'Annulé',
}
export const PACKAGE_STATUS_COLORS: Record<PackageStatus, string> = {
  pending:          'default',
  submitted:        'blue',
  awaiting_payment: 'orange',
  paid:             'cyan',
  in_travel:        'geekblue',
  in_transit:       'purple',
  at_warehouse:     'volcano',
  delivered:        'green',
  returned:         'magenta',
  cancelled:        'red',
}

export const PACKAGE_STATUS_TRANSITIONS: Record<PackageStatus, PackageStatus[]> = {
  pending:          ['submitted', 'cancelled'],
  submitted:        ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['paid', 'cancelled'],
  paid:             ['in_travel', 'cancelled'],
  in_travel:        ['in_transit'],
  in_transit:       ['at_warehouse'],
  at_warehouse:     ['delivered', 'returned'],
  delivered:        [],
  returned:         ['cancelled'],
  cancelled:        [],
}

export const FRAGILITY_LABELS: Record<FragilityLevel, string> = {
  normal:       'Normal',
  fragile:      'Fragile',
  tres_fragile: 'Très fragile',
}
export const FRAGILITY_COLORS: Record<FragilityLevel, string> = {
  normal:       'default',
  fragile:      'orange',
  tres_fragile: 'red',
}

// Payment
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending:  'En attente',
  paid:     'Payé',
  failed:   'Échoué',
  refunded: 'Remboursé',
  expired:  'Expiré',
}
export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  pending:  'orange',
  paid:     'green',
  failed:   'red',
  refunded: 'blue',
  expired:  'default',
}
