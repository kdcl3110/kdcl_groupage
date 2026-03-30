import { TransportType } from '../../models/Travel.model';

export interface CreateTravelDto {
  transport_type: TransportType;
  origin_country: string;
  destination_country: string;
  itinerary?: string;
  max_weight: number;
  max_volume: number;
  min_load_percentage: number;
  max_load_percentage: number;
  container?: string;
  departure_date?: string;          // ISO 8601
  estimated_arrival_date?: string;  // ISO 8601
}

export interface UpdateTravelDto {
  transport_type?: TransportType;
  origin_country?: string;
  destination_country?: string;
  itinerary?: string | null;
  container?: string | null;
  max_weight?: number;
  max_volume?: number;
  min_load_percentage?: number;
  max_load_percentage?: number;
  departure_date?: string | null;
  estimated_arrival_date?: string | null;
}

export interface UpdateTravelStatusDto {
  status: string;
}
