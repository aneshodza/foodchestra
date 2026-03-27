import express from 'express';
import request from 'supertest';
import productsRouter from '../routers/products.router';
import * as repo from '../repositories/products.repository';

jest.mock('../repositories/products.repository');

const mockGetProductByBarcode = repo.getProductByBarcode as jest.MockedFunction<typeof repo.getProductByBarcode>;
const mockUpsertProduct = repo.upsertProduct as jest.MockedFunction<typeof repo.upsertProduct>;

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
