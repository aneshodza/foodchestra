import { lookupProduct } from '../services/products.service';
import * as repo from '../repositories/products.repository';

jest.mock('../repositories/products.repository');

const mockGetProduct = repo.getProductByBarcode as jest.MockedFunction<
  typeof repo.getProductByBarcode
>;
const mockUpsertProduct = repo.upsertProduct as jest.MockedFunction<
  typeof repo.upsertProduct
>;

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => {
  jest.resetAllMocks();
});

const freshCachedRow: repo.ProductRow = {
  id: 7,
  barcode: '5901234123457',
  name: 'Cached Bread',
  brands: 'Baker',
  stores: null,
  countries: null,
  quantity: '500g',
  nutriscore_grade: 'b',
  ingredients_text: 'flour, water',
  ingredients: [],
  image_url: null,
  last_validated_at: new Date(),
};

describe('lookupProduct', () => {
  describe('cache hit', () => {
    it('returns cached product without calling fetch when cache is fresh', async () => {
      mockGetProduct.mockResolvedValueOnce(freshCachedRow);

      const result = await lookupProduct('5901234123457');

      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockUpsertProduct).not.toHaveBeenCalled();
      expect(result).toMatchObject({
        found: true,
        productId: 7,
        product: { barcode: '5901234123457', name: 'Cached Bread' },
      });
    });

    it('falls through to OFF when cache is stale (> 24h)', async () => {
      const staleRow: repo.ProductRow = {
        ...freshCachedRow,
        last_validated_at: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };
      mockGetProduct.mockResolvedValueOnce(staleRow);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, product: { product_name: 'Fresh Bread' } }),
      });
      mockUpsertProduct.mockResolvedValueOnce(7);

      const result = await lookupProduct('5901234123457');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result).toMatchObject({ found: true, product: { name: 'Fresh Bread' } });
    });
  });

  describe('OpenFoodFacts fetch', () => {
    beforeEach(() => {
      mockGetProduct.mockResolvedValueOnce(null);
    });

    it('returns found: false when OFF reports status 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 0 }),
      });

      const result = await lookupProduct('5901234123457');

      expect(result).toEqual({ found: false, product: null });
    });

    it('returns upstream_failed when OFF returns a non-OK HTTP status', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const result = await lookupProduct('5901234123457');

      expect(result).toEqual({ error: 'upstream_failed' });
    });

    it('returns upstream_unreachable when fetch throws a network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await lookupProduct('5901234123457');

      expect(result).toEqual({ error: 'upstream_unreachable' });
    });

    it('returns found product and upserts cache on successful OFF response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'Test Bread',
            brands: 'Baker',
            nutriscore_grade: 'a',
          },
        }),
      });
      mockUpsertProduct.mockResolvedValueOnce(42);

      const result = await lookupProduct('5901234123457');

      expect(result).toMatchObject({ found: true, productId: 42, product: { name: 'Test Bread' } });
      expect(mockUpsertProduct).toHaveBeenCalledWith(
        expect.objectContaining({ barcode: '5901234123457', name: 'Test Bread' }),
      );
    });

    it('still returns product when cache write fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, product: { product_name: 'Bread' } }),
      });
      mockUpsertProduct.mockRejectedValueOnce(new Error('DB error'));

      const result = await lookupProduct('5901234123457');

      expect(result).toMatchObject({ found: true, productId: undefined, product: { name: 'Bread' } });
    });
  });

  describe('cache read failure', () => {
    it('falls through to OFF when cache read throws', async () => {
      mockGetProduct.mockRejectedValueOnce(new Error('DB timeout'));
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 1, product: { product_name: 'Bread' } }),
      });
      mockUpsertProduct.mockResolvedValueOnce(1);

      const result = await lookupProduct('5901234123457');

      expect(result).toMatchObject({ found: true, product: { name: 'Bread' } });
    });
  });
});
