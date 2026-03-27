export type PartyType = 'farmer' | 'processor' | 'distributor' | 'warehouse' | 'retailer';

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  created_at: string;
}

export interface PartyLocation {
  id: string;
  party_id: string;
  label: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
}
