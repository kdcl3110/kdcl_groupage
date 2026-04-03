export interface CreatePackageDto {
  recipient_id: number;

  description: string;
  weight: number;
  volume: number;
  declared_value: number;
  fragility?: 'normal' | 'fragile' | 'tres_fragile';
  special_instructions?: string;
  tracking_number?: string;

  image1: string;
  image2?: string;
  image3?: string;
  image4?: string;

  // Optionnel : soumettre directement à un voyage à la création
  travel_id?: number;
}

export interface UpdatePackageDto {
  description?: string;
  weight?: number;
  volume?: number;
  declared_value?: number;
  fragility?: 'normal' | 'fragile' | 'tres_fragile';
  special_instructions?: string | null;
  recipient_id?: number;
  image1?: string;
  image2?: string | null;
  image3?: string | null;
  image4?: string | null;
}

export interface SubmitToTravelDto {
  travel_id: number;
}

export interface AdminReassignDto {
  travel_id: number | null; // null = retirer du voyage (repasse en pending)
}
