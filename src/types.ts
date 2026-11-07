export type Zone = 'green' | 'yellow' | 'red';
export type Species = 'dog' | 'cat';
export const zoneRank: Record<Zone, number> = { green: 0, yellow: 1, red: 2 };
export interface Location { lat: number; lng: number }
export interface Clinic {
  id: string; name: string; address: string; phone?: string; openNow?: boolean; distanceKm: number;
  rating?: number; ratingCount?: number; reason?: string;
}
export interface Proposal { id: string; kind: string; preview: string }
export interface PetRow {
  id: string; owner_id: string; name: string; species: Species; breed: string | null;
  birth_date: string | null; sex: string | null; neutered: boolean | null;
  weight_kg: string | null; conditions: string[]; allergies: string[];
}
