import express from 'express';
import request from 'supertest';
import productsRouter from '../routers/products.router';

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

  it('returns 400 for a barcode that is too short', async () => {
    const res = await request(app).get('/products/123');
    expect(res.status).toBe(400);
  });

  it('returns 502 when fetch throws a network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Failed to reach OpenFoodFacts' });
  });

  it('returns 502 when OpenFoodFacts responds with a non-OK status', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false } as Response);
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'OpenFoodFacts request failed' });
  });

  it('returns found: false when OpenFoodFacts reports status 0', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 0, product: null }),
    } as unknown as Response);
    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ found: false, product: null });
  });

  it('returns a normalised product for a valid barcode', async () => {
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

    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      found: true,
      product: {
        barcode: '5901234123457',
        name: 'Test Chocolate',
        brands: 'Testbrand',
        stores: 'Migros',
        countries: 'Switzerland',
        quantity: '100g',
        nutriscoreGrade: 'c',
        ingredientsText: 'cocoa, sugar',
        ingredients: [{ id: 'en:cocoa', text: 'cocoa', percent_estimate: 60 }],
        imageUrl: 'https://example.com/img.jpg',
      },
    });
  });

  it('fills nulls for missing optional fields', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 1, product: {} }),
    } as unknown as Response);

    const res = await request(app).get('/products/5901234123457');
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.product).toMatchObject({
      name: null,
      brands: null,
      nutriscoreGrade: null,
      ingredients: [],
    });
  });
});
