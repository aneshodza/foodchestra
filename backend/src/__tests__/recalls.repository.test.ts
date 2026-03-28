import { searchRecallsByText } from '../repositories/recalls.repository';

jest.mock('../db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

const { pool } = jest.requireMock('../db') as { pool: { query: jest.Mock } };

afterEach(() => {
  jest.resetAllMocks();
});

describe('searchRecallsByText', () => {
  const recallRow = {
    id: 6,
    header_de: 'Coop ruft die Austern zurück',
    header_fr: null,
    header_it: null,
    description_de: 'Aufgrund von Noroviren.',
    description_fr: null,
    description_it: null,
    meta_de: 'Bern, 8.1.2020',
    image_url_de: 'https://example.com/recall.jpg',
    authority_code_de: 'BLV',
    authority_name_de: 'Bundesamt für Lebensmittelsicherheit und Veterinärwesen',
  };

  it('returns empty array without hitting DB when query is empty', async () => {
    const result = await searchRecallsByText('');
    expect(pool.query).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('returns empty array without hitting DB when query is whitespace only', async () => {
    const result = await searchRecallsByText('   ');
    expect(pool.query).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it('passes trimmed query and default limit to pool.query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await searchRecallsByText('  Austern  ');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('plainto_tsquery'),
      ['Austern', 5],
    );
  });

  it('passes custom limit to pool.query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    await searchRecallsByText('Lachs', 10);

    expect(pool.query).toHaveBeenCalledWith(expect.any(String), ['Lachs', 10]);
  });

  it('returns mapped rows from the DB', async () => {
    pool.query.mockResolvedValueOnce({ rows: [recallRow] });

    const result = await searchRecallsByText('Austern');

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 6,
      header_de: 'Coop ruft die Austern zurück',
      authority_code_de: 'BLV',
    });
  });

  it('returns empty array when DB returns no rows', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await searchRecallsByText('Nonexistent product XYZ');

    expect(result).toEqual([]);
  });
});
