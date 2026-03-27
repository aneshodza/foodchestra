import type { Party, PartyLocation } from '../types/parties.js';

type GetFn = <T>(path: string, options?: { cache?: RequestCache }) => Promise<T>;

export function partyRoutes(get: GetFn) {
  return {
    getAll: () =>
      get<Party[]>('/parties'),
    getLocations: (partyId: string) =>
      get<PartyLocation[]>(`/parties/${partyId}/locations`),
  };
}
