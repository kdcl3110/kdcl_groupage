export interface CreatePackageDto {
  recipient_id: number;

  description: string;
  weight: number;
  volume: number;
  declared_value: number;
  special_instructions?: string;

  // Optionnel : soumettre directement à un voyage à la création
  travel_id?: number;
}

export interface UpdatePackageDto {
  description?: string;
  weight?: number;
  volume?: number;
  declared_value?: number;
  special_instructions?: string | null;
  recipient_id?: number;
}

export interface SubmitToTravelDto {
  travel_id: number;
}

export interface AdminReassignDto {
  travel_id: number | null; // null = retirer du voyage (repasse en pending)
}
