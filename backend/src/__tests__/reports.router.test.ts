import express from 'express';
import request from 'supertest';
import reportsRouter from '../routers/reports.router';
import * as productsRepo from '../repositories/products.repository';
import * as reportsRepo from '../repositories/reports.repository';

jest.mock('../repositories/products.repository');
jest.mock('../repositories/reports.repository');

const mockGetProduct = productsRepo.getProductByBarcode as jest.MockedFunction<
  typeof productsRepo.getProductByBarcode
>;
const mockCreateReport = reportsRepo.createReport as jest.MockedFunction<
  typeof reportsRepo.createReport
>;
const mockGetSummary = reportsRepo.getReportSummaryByProductId as jest.MockedFunction<
  typeof reportsRepo.getReportSummaryByProductId
>;
const mockGetReports = reportsRepo.getReportsByProductId as jest.MockedFunction<
  typeof reportsRepo.getReportsByProductId
>;

const app = express();
app.use(express.json());
app.use('/products', reportsRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const mockProductRow: productsRepo.ProductRow = {
  id: 42,
  barcode: '7610807001024',
  name: 'Jowa Ruchbrot',
  brands: 'Jowa',
  stores: 'Coop',
  countries: 'Switzerland',
  quantity: '500g',
  nutriscore_grade: 'b',
  ingredients_text: 'Flour, Water',
  ingredients: [],
  image_url: null,
  last_validated_at: new Date(),
};

const mockReportRow: reportsRepo.ReportRow = {
  id: 'uuid-aaa-111',
  product_id: 42,
  category: 'quality_issue',
  description: 'Product tasted off',
  created_at: new Date('2026-03-27T10:00:00Z'),
};

describe('GET /products/:barcode/reports', () => {
  it('returns 400 for an invalid barcode', async () => {
    const res = await request(app).get('/products/not-a-barcode/reports');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid barcode format' });
  });

  it('returns 404 when the product is not found', async () => {
    mockGetProduct.mockResolvedValueOnce(null);

    const res = await request(app).get('/products/7610807001024/reports');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  it('returns 200 with empty reports and no warning', async () => {
    mockGetProduct.mockResolvedValueOnce(mockProductRow);
    mockGetSummary.mockResolvedValueOnce({ count30d: 0, recentCount24h: 0 });
    mockGetReports.mockResolvedValueOnce([]);

    const res = await request(app).get('/products/7610807001024/reports');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      count: 0,
      recentCount24h: 0,
      hasWarning: false,
      reports: [],
    });
  });

  it('returns hasWarning: true when recentCount24h > 4', async () => {
    mockGetProduct.mockResolvedValueOnce(mockProductRow);
    mockGetSummary.mockResolvedValueOnce({ count30d: 6, recentCount24h: 5 });
    mockGetReports.mockResolvedValueOnce([mockReportRow]);

    const res = await request(app).get('/products/7610807001024/reports');

    expect(res.status).toBe(200);
    expect(res.body.hasWarning).toBe(true);
    expect(res.body.count).toBe(6);
    expect(res.body.recentCount24h).toBe(5);
    expect(res.body.reports).toHaveLength(1);
    expect(res.body.reports[0]).toMatchObject({
      id: 'uuid-aaa-111',
      productId: 42,
      category: 'quality_issue',
      description: 'Product tasted off',
    });
  });

  it('returns hasWarning: false when recentCount24h equals exactly 4', async () => {
    mockGetProduct.mockResolvedValueOnce(mockProductRow);
    mockGetSummary.mockResolvedValueOnce({ count30d: 4, recentCount24h: 4 });
    mockGetReports.mockResolvedValueOnce([]);

    const res = await request(app).get('/products/7610807001024/reports');

    expect(res.status).toBe(200);
    expect(res.body.hasWarning).toBe(false);
  });

  it('returns 500 when the database throws', async () => {
    mockGetProduct.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).get('/products/7610807001024/reports');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch reports' });
  });
});

describe('POST /products/:barcode/reports', () => {
  it('returns 400 for an invalid barcode', async () => {
    const res = await request(app)
      .post('/products/not-a-barcode/reports')
      .send({ category: 'quality_issue' });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid barcode format' });
  });

  it('returns 400 when category is missing', async () => {
    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ description: 'Something wrong' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid category');
  });

  it('returns 400 when category is not a valid enum value', async () => {
    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'broken_glass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid category');
    expect(res.body.validCategories).toContain('quality_issue');
  });

  it('returns 400 when expired is submitted (no longer a valid category)', async () => {
    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'expired' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid category');
  });

  it('returns 404 when the product is not found', async () => {
    mockGetProduct.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'quality_issue' });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Product not found' });
  });

  it('returns 201 with created report on valid input', async () => {
    mockGetProduct.mockResolvedValueOnce(mockProductRow);
    mockCreateReport.mockResolvedValueOnce(mockReportRow);

    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'quality_issue', description: 'Product tasted off' });

    expect(res.status).toBe(201);
    expect(mockCreateReport).toHaveBeenCalledWith({
      product_id: 42,
      category: 'quality_issue',
      description: 'Product tasted off',
    });
    expect(res.body).toMatchObject({
      id: 'uuid-aaa-111',
      productId: 42,
      category: 'quality_issue',
      description: 'Product tasted off',
    });
  });

  it('creates report with null description when omitted', async () => {
    mockGetProduct.mockResolvedValueOnce(mockProductRow);
    mockCreateReport.mockResolvedValueOnce({ ...mockReportRow, description: null });

    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'quality_issue' });

    expect(res.status).toBe(201);
    expect(mockCreateReport).toHaveBeenCalledWith({
      product_id: 42,
      category: 'quality_issue',
      description: null,
    });
    expect(res.body.description).toBeNull();
  });

  it('returns 500 when the database throws', async () => {
    mockGetProduct.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/products/7610807001024/reports')
      .send({ category: 'quality_issue' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create report' });
  });

  it('accepts all valid category values', async () => {
    const validCategories = [
      'damaged_packaging',
      'quality_issue',
      'foreign_object',
      'mislabeled',
      'other',
    ];

    for (const category of validCategories) {
      mockGetProduct.mockResolvedValueOnce(mockProductRow);
      mockCreateReport.mockResolvedValueOnce({
        ...mockReportRow,
        category: category as reportsRepo.ReportCategory,
      });

      const res = await request(app)
        .post('/products/7610807001024/reports')
        .send({ category });

      expect(res.status).toBe(201);
    }
  });
});
