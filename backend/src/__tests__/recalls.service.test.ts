import { fetchAndStoreRecalls } from '../services/recalls.service';
import * as repo from '../repositories/recalls.repository';
import * as sdk from '@foodchestra/sdk';

jest.mock('../repositories/recalls.repository');
jest.mock('@foodchestra/sdk');

const mockUpsert = repo.upsertRecalls as jest.MockedFunction<typeof repo.upsertRecalls>;
const mockFetchAll = sdk.fetchAllRecalls as jest.MockedFunction<typeof sdk.fetchAllRecalls>;

afterEach(() => {
  jest.resetAllMocks();
});

function makeEntry(id: number): sdk.RecallSwissEntry {
  return {
    id,
    headerDe: `Header DE ${id}`,
    headerFr: `Header FR ${id}`,
    headerIt: `Header IT ${id}`,
    descriptionDe: `Desc DE ${id}`,
    descriptionFr: `Desc FR ${id}`,
    descriptionIt: `Desc IT ${id}`,
    metaDe: 'Bern, 27.3.2026',
    image: { urlDe: `https://example.com/${id}.jpg` },
    marktaufsichtsbehoerde: { kuerzelDe: 'BLV', nameDe: 'Bundesamt für Lebensmittelsicherheit' },
  };
}

describe('fetchAndStoreRecalls', () => {
  it('calls fetchAllRecalls and upserts the results', async () => {
    const entries = [makeEntry(1), makeEntry(2)];
    mockFetchAll.mockResolvedValueOnce(entries);
    mockUpsert.mockResolvedValueOnce(undefined);

    const result = await fetchAndStoreRecalls();

    expect(mockFetchAll).toHaveBeenCalledTimes(1);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    expect(result.stored).toBe(2);
  });

  it('maps entries to DB rows correctly', async () => {
    mockFetchAll.mockResolvedValueOnce([makeEntry(42)]);
    mockUpsert.mockResolvedValueOnce(undefined);

    await fetchAndStoreRecalls();

    const [rows] = mockUpsert.mock.calls[0] as [repo.RecallRow[]];
    expect(rows[0]).toMatchObject({
      id: 42,
      header_de: 'Header DE 42',
      image_url_de: 'https://example.com/42.jpg',
      authority_code_de: 'BLV',
      authority_name_de: 'Bundesamt für Lebensmittelsicherheit',
    });
  });

  it('maps missing optional fields to null', async () => {
    mockFetchAll.mockResolvedValueOnce([{ id: 1 }]);
    mockUpsert.mockResolvedValueOnce(undefined);

    await fetchAndStoreRecalls();

    const [rows] = mockUpsert.mock.calls[0] as [repo.RecallRow[]];
    expect(rows[0]).toMatchObject({
      id: 1,
      header_de: null,
      image_url_de: null,
      authority_code_de: null,
    });
  });

  it('returns stored count of 0 when fetchAllRecalls returns empty array', async () => {
    mockFetchAll.mockResolvedValueOnce([]);
    mockUpsert.mockResolvedValueOnce(undefined);

    const result = await fetchAndStoreRecalls();

    expect(result.stored).toBe(0);
  });

  it('propagates errors thrown by fetchAllRecalls', async () => {
    mockFetchAll.mockRejectedValueOnce(new Error('RecallSwiss API error: 503 on page 0'));

    await expect(fetchAndStoreRecalls()).rejects.toThrow('RecallSwiss API error: 503 on page 0');
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
