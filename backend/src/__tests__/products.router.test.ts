import express from 'express';
import request from 'supertest';
import productsRouter from '../routers/products.router';
import * as repo from '../repositories/products.repository';
import * as recallsRepo from '../repositories/recalls.repository';
import { CoolingChainRepository } from '../repositories/cooling-chain.repository';

jest.mock('../repositories/products.repository');
jest.mock('../repositories/recalls.repository');
jest.mock('../repositories/cooling-chain.repository');

const mockHasCoolingBreachForProduct = CoolingChainRepository.hasCoolingBreachForProduct as jest.MockedFunction<
  typeof CoolingChainRepository.hasCoolingBreachForProduct
>;

const mockGetProductByBarcode = repo.getProductByBarcode as jest.MockedFunction<typeof repo.getProductByBarcode>;
const mockUpsertProduct = repo.upsertProduct as jest.MockedFunction<typeof repo.upsertProduct>;
const mockSearchRecallsByText = recallsRepo.searchRecallsByText as jest.MockedFunction<typeof recallsRepo.searchRecallsByText>;

const app = express();
app.use(express.json());
app.use('/products', productsRouter);

const mockFetch = jest.fn();
global.fetch = mockFetch;

afterEach(() => {
  jest.resetAllMocks();
});

describe('GET /products/:barcode', () => {
  it('returns 400 for an invalid barcode', async () => {
    const res = await request(app).get('/products/not-a-barcode');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid barcode format' });
  });

  it('VERIFY CACHE HIT: returns cached product without calling OpenFoodFacts if fresh (within 24h)', async () => {
    const cachedProduct: repo.ProductRow = {
      id: 1,
      barcode: '5901234123457',
      name: 'Cached Chocolate',
      brands: 'Cachebrand',
      stores: 'Cachestore',
      countries: 'Cacheland',
      quantity: '100g',
      nutriscore_grade: 'a',
      ingredients_text: 'cache, sugar',
      ingredients: [{ id: 'en:cache', text: 'cache' }],
      image_url: 'https://example.com/cache.jpg',
      last_validated_at: new Date(), // Fresh
    };
    mockGetProductByBarcode.mockResolvedValueOnce(cachedProduct);

    const res = await request(app).get('/products/5901234123457');

    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockUpsertProduct).not.toHaveBeenCalled();
    expect(res.body).toMatchObject({
      found: true,
      product: {
        id: 1,
        barcode: '5901234123457',
        name: 'Cached Chocolate',
      },
    });
  });

  it('VERIFY CACHE INVALIDATION: re-fetches from OpenFoodFacts and updates DB if cache is stale (> 24h)', async () => {
    const staleProduct: repo.ProductRow = {
      id: 1,
      barcode: '5901234123457',
      name: 'Old Name',
      brands: 'Old Brand',
      stores: 'Old Store',
      countries: 'Old Country',
      quantity: '100g',
      nutriscore_grade: 'e',
      ingredients_text: 'old ingredients',
      ingredients: [],
      image_url: null,
      last_validated_at: new Date(Date.now() - 30 * 60 * 60 * 1000), // 30h old
    };
    mockGetProductByBarcode.mockResolvedValueOnce(staleProduct);
    
    const freshOFFData = {
      product_name: 'Fresh New Name',
      brands: 'Fresh Brand',
      nutriscore_grade: 'a',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 1,
        product: freshOFFData,
      }),
    } as unknown as Response);
    
    mockUpsertProduct.mockResolvedValueOnce(1); // Returns same ID

    const res = await request(app).get('/products/5901234123457');

    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockUpsertProduct).toHaveBeenCalledWith(expect.objectContaining({
      barcode: '5901234123457',
      name: 'Fresh New Name',
      nutriscore_grade: 'a',
    }));
    expect(res.body.product.name).toBe('Fresh New Name');
    expect(res.body.product.id).toBe(1);
  });

  it('returns 502 when fetch throws a network error', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Failed to reach OpenFoodFacts' });
  });

  it('returns 502 when OpenFoodFacts responds with a non-OK status', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'OpenFoodFacts request failed' });
  });

  it('returns found: false when OpenFoodFacts reports status 0', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 0, product: null }),
    } as unknown as Response);
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ found: false, product: null });
  });

  it('returns a normalised product for a valid barcode', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    const rawProduct = {
      product_name: 'Test Chocolate',
      brands: 'Testbrand',
      stores: 'Migros',
      countries: 'Switzerland',
      quantity: '100g',
      nutriscore_grade: 'c',
      ingredients_text: 'cocoa, sugar',
      ingredients: [{ id: 'en:cocoa', text: 'cocoa', percent_estimate: 60 }],
      image_url: 'https://example.com/img.jpg',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 1, product: rawProduct }),
    } as unknown as Response);
    mockUpsertProduct.mockResolvedValueOnce(123);

    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(mockUpsertProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Test Chocolate',
    }));
    expect(res.body).toMatchObject({
      found: true,
      product: {
        id: 123,
        barcode: '5901234123457',
        name: 'Test Chocolate',
      },
    });
  });

  it('fills nulls for missing optional fields', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 1, product: {} }),
    } as unknown as Response);
    mockUpsertProduct.mockResolvedValueOnce(999);

    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.product).toMatchObject({
      id: 999,
      name: null,
      brands: null,
      nutriscoreGrade: null,
      ingredients: [],
    });
  });
});

describe('GET /products/:barcode/recalls', () => {
  const cachedProduct: repo.ProductRow = {
    id: 1,
    barcode: '5901234123457',
    name: 'Bretagne Oysters',
    brands: 'Coop',
    stores: null,
    countries: null,
    quantity: null,
    nutriscore_grade: null,
    ingredients_text: null,
    ingredients: null,
    image_url: null,
    last_validated_at: new Date(),
  };

  const recallRow: recallsRepo.RecallRow = {
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

  it('returns 400 for an invalid barcode', async () => {
    const res = await request(app).get('/products/not-a-barcode/recalls');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid barcode format' });
  });

  it('returns empty recalls when product is not found anywhere', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(null);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 0, product: null }),
    } as unknown as Response);

    const res = await request(app).get('/products/5901234123457/recalls');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recalls: [] });
    expect(mockSearchRecallsByText).not.toHaveBeenCalled();
  });

  it('returns matched recalls when product is cached', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(cachedProduct);
    mockSearchRecallsByText.mockResolvedValueOnce([recallRow]);

    const res = await request(app).get('/products/5901234123457/recalls');

    expect(res.status).toBe(200);
    expect(mockSearchRecallsByText).toHaveBeenCalledWith('Bretagne Oysters Coop');
    expect(res.body).toMatchObject({
      recalls: [
        {
          id: 6,
          headerDe: 'Coop ruft die Austern zurück',
          descriptionDe: 'Aufgrund von Noroviren.',
          metaDe: 'Bern, 8.1.2020',
          authorityCodeDe: 'BLV',
          authorityNameDe: 'Bundesamt für Lebensmittelsicherheit und Veterinärwesen',
        },
      ],
    });
  });

  it('returns empty recalls when search finds no matches', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce(cachedProduct);
    mockSearchRecallsByText.mockResolvedValueOnce([]);

    const res = await request(app).get('/products/5901234123457/recalls');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recalls: [] });
  });

  it('returns empty recalls when product has no name and no brands', async () => {
    mockGetProductByBarcode.mockResolvedValueOnce({
      ...cachedProduct,
      name: null,
      brands: null,
      last_validated_at: new Date(), // fresh cache — won't hit OFF
    });

    const res = await request(app).get('/products/5901234123457/recalls');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ recalls: [] });
    expect(mockSearchRecallsByText).not.toHaveBeenCalled();
  });

  it('returns 500 when repository throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockGetProductByBarcode.mockResolvedValueOnce(cachedProduct);
    mockSearchRecallsByText.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/products/5901234123457/recalls');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch recalls' });
    consoleSpy.mockRestore();
  });
});

describe('GET /products/:barcode/cooling-status', () => {
  it('returns 400 for an invalid barcode', async () => {
    const res = await request(app).get('/products/not-a-barcode/cooling-status');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid barcode format' });
  });

  it('returns potentialBreach: true when a breach is detected', async () => {
    mockHasCoolingBreachForProduct.mockResolvedValueOnce(true);

    const res = await request(app).get('/products/5901234123457/cooling-status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ potentialBreach: true });
    expect(mockHasCoolingBreachForProduct).toHaveBeenCalledWith('5901234123457');
  });

  it('returns potentialBreach: false when no breach exists', async () => {
    mockHasCoolingBreachForProduct.mockResolvedValueOnce(false);

    const res = await request(app).get('/products/5901234123457/cooling-status');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ potentialBreach: false });
  });

  it('returns 500 when the repository throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockHasCoolingBreachForProduct.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app).get('/products/5901234123457/cooling-status');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch cooling status' });
    consoleSpy.mockRestore();
  });
});
