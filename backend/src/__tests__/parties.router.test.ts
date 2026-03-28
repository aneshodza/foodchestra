import express from 'express';
import request from 'supertest';
import partiesRouter from '../routers/parties.router';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';
import type { Party, PartyLocation } from '@foodchestra/sdk';

jest.mock('../repositories/supply-chain.repository');

const mockFindAllParties = SupplyChainRepository.findAllParties as jest.MockedFunction<
  typeof SupplyChainRepository.findAllParties
>;
const mockFindPartyById = SupplyChainRepository.findPartyById as jest.MockedFunction<
  typeof SupplyChainRepository.findPartyById
>;
const mockFindLocationsByParty = SupplyChainRepository.findLocationsByParty as jest.MockedFunction<
  typeof SupplyChainRepository.findLocationsByParty
>;

const app = express();
app.use(express.json());
app.use('/parties', partiesRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const sampleParty: Party = {
  id: 'a1000000-0000-0000-0000-000000000001',
  name: 'Bio-Hof Müller',
  type: 'farmer',
  createdAt: '2026-01-01T00:00:00Z',
};

const sampleLocation: PartyLocation = {
  id: 'b1000000-0000-0000-0000-000000000001',
  partyId: sampleParty.id,
  label: 'Hof Erlinsbach',
  latitude: 47.4167,
  longitude: 7.9333,
  address: 'Hofstrasse 12, 5018 Erlinsbach',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('GET /parties', () => {
  it('returns all parties', async () => {
    mockFindAllParties.mockResolvedValueOnce([sampleParty]);

    const res = await request(app).get('/parties');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([sampleParty]);
  });

  it('returns empty array when no parties exist', async () => {
    mockFindAllParties.mockResolvedValueOnce([]);

    const res = await request(app).get('/parties');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when the repository throws', async () => {
    mockFindAllParties.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get('/parties');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch parties' });
  });
});

describe('GET /parties/:id/locations', () => {
  it('returns locations for an existing party', async () => {
    mockFindPartyById.mockResolvedValueOnce(sampleParty);
    mockFindLocationsByParty.mockResolvedValueOnce([sampleLocation]);

    const res = await request(app).get(`/parties/${sampleParty.id}/locations`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([sampleLocation]);
    expect(mockFindLocationsByParty).toHaveBeenCalledWith(sampleParty.id);
  });

  it('returns 404 when the party does not exist', async () => {
    mockFindPartyById.mockResolvedValueOnce(null);

    const res = await request(app).get('/parties/00000000-0000-0000-0000-000000000000/locations');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Party not found' });
    expect(mockFindLocationsByParty).not.toHaveBeenCalled();
  });

  it('returns empty array when party has no locations', async () => {
    mockFindPartyById.mockResolvedValueOnce(sampleParty);
    mockFindLocationsByParty.mockResolvedValueOnce([]);

    const res = await request(app).get(`/parties/${sampleParty.id}/locations`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when the repository throws', async () => {
    mockFindPartyById.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get(`/parties/${sampleParty.id}/locations`);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch locations' });
  });
});
