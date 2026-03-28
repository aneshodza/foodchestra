export type PartyType = 'farmer' | 'processor' | 'distributor' | 'warehouse' | 'retailer';

export interface Party {
  id: string;
  name: string;
  type: PartyType;
  createdAt: string;
}

export interface PartyLocation {
  id: string;
  partyId: string;
  label: string | null;
  latitude: number;
  longitude: number;
  address: string | null;
  createdAt: string;
}
