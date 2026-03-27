import express from 'express';
import request from 'supertest';
import recallsRouter from '../routers/recalls.router';
import * as repo from '../repositories/recalls.repository';

jest.mock('../repositories/recalls.repository');

const mockGetRecalls = repo.getRecalls as jest.MockedFunction<typeof repo.getRecalls>;

const app = express();
app.use(express.json());
app.use('/recalls', recallsRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const sampleRow: repo.RecallRow = {
  id: 42,
  header_de: 'Rückruf Test',
  header_fr: 'Rappel Test',
  header_it: 'Richiamo Test',
  description_de: 'Beschreibung',
  description_fr: 'Description',
  description_it: 'Descrizione',
  meta_de: 'Bern, 27.3.2026',
  image_url_de: 'https://example.com/img.jpg',
  authority_code_de: 'BLV',
  authority_name_de: 'Bundesamt für Lebensmittelsicherheit',
};

describe('GET /recalls', () => {
  it('returns paginated recalls with defaults (page=1, pageSize=20)', async () => {
    mockGetRecalls.mockResolvedValueOnce({ rows: [sampleRow], total: 1 });

    const res = await request(app).get('/recalls');

    expect(res.status).toBe(200);
    expect(mockGetRecalls).toHaveBeenCalledWith(1, 20);
    expect(res.body).toMatchObject({
      recalls: [
        {
          id: 42,
          headerDe: 'Rückruf Test',
          headerFr: 'Rappel Test',
          imageUrlDe: 'https://example.com/img.jpg',
          authorityCodeDe: 'BLV',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    });
  });

  it('respects custom page and pageSize query params', async () => {
    mockGetRecalls.mockResolvedValueOnce({ rows: [], total: 100 });

    const res = await request(app).get('/recalls?page=3&pageSize=5');

    expect(res.status).toBe(200);
    expect(mockGetRecalls).toHaveBeenCalledWith(3, 5);
    expect(res.body).toMatchObject({ page: 3, pageSize: 5, total: 100 });
  });

  it('clamps pageSize to maximum of 100', async () => {
    mockGetRecalls.mockResolvedValueOnce({ rows: [], total: 0 });

    await request(app).get('/recalls?pageSize=999');

    expect(mockGetRecalls).toHaveBeenCalledWith(1, 100);
  });

  it('falls back to page=1 for invalid page param', async () => {
    mockGetRecalls.mockResolvedValueOnce({ rows: [], total: 0 });

    await request(app).get('/recalls?page=abc');

    expect(mockGetRecalls).toHaveBeenCalledWith(1, 20);
  });

  it('returns 500 when the repository throws', async () => {
    mockGetRecalls.mockRejectedValueOnce(new Error('DB connection failed'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get('/recalls');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch recalls' });
  });

  it('returns an empty recalls array when the DB is empty', async () => {
    mockGetRecalls.mockResolvedValueOnce({ rows: [], total: 0 });

    const res = await request(app).get('/recalls');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ recalls: [], total: 0 });
  });
});
