import express from 'express';
import request from 'supertest';
import batchesRouter from '../routers/batches.router';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';
import type { Batch, SupplyChain } from '@foodchestra/sdk';

jest.mock('../repositories/supply-chain.repository');

const mockCreateBatch = SupplyChainRepository.createBatch as jest.MockedFunction<
  typeof SupplyChainRepository.createBatch
>;
const mockFindBatchById = SupplyChainRepository.findBatchById as jest.MockedFunction<
  typeof SupplyChainRepository.findBatchById
>;
const mockFindByBatchNumber = SupplyChainRepository.findByBatchNumber as jest.MockedFunction<
  typeof SupplyChainRepository.findByBatchNumber
>;
const mockFindBatchByProductAndNumber =
  SupplyChainRepository.findBatchByProductAndNumber as jest.MockedFunction<
    typeof SupplyChainRepository.findBatchByProductAndNumber
  >;
const mockFindSupplyChainByBatch =
  SupplyChainRepository.findSupplyChainByBatch as jest.MockedFunction<
    typeof SupplyChainRepository.findSupplyChainByBatch
  >;

const app = express();
app.use(express.json());
app.use('/batches', batchesRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const sampleBatch: Batch = {
  id: 'c1000000-0000-0000-0000-000000000001',
  product_barcode: '7610807001024',
  batch_number: 'LOT-2026-JW-042',
  created_at: '2026-01-01T00:00:00Z',
};

const sampleSupplyChain: SupplyChain = {
  id: 'd1000000-0000-0000-0000-000000000001',
  batch_id: sampleBatch.id,
  created_at: '2026-01-01T00:00:00Z',
  nodes: [
    {
      id: 'e1000000-0000-0000-0000-000000000001',
      label: 'Wheat harvest',
      arrived_at: '2026-01-10T05:00:00Z',
      departed_at: '2026-01-10T13:00:00Z',
      location: {
        id: 'b1000000-0000-0000-0000-000000000001',
        party_id: 'a1000000-0000-0000-0000-000000000001',
        label: 'Hof Erlinsbach',
        latitude: 47.4167,
        longitude: 7.9333,
        address: 'Hofstrasse 12, 5018 Erlinsbach',
        created_at: '2026-01-01T00:00:00Z',
        party: {
          id: 'a1000000-0000-0000-0000-000000000001',
          name: 'Bio-Hof Müller',
          type: 'farmer',
          created_at: '2026-01-01T00:00:00Z',
        },
      },
    },
  ],
  edges: [],
};

describe('POST /batches', () => {
  it('returns 201 with the created batch', async () => {
    mockFindBatchByProductAndNumber.mockResolvedValueOnce(null);
    mockCreateBatch.mockResolvedValueOnce(sampleBatch);

    const res = await request(app)
      .post('/batches')
      .send({ productBarcode: '7610807001024', batchNumber: 'LOT-2026-JW-042' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(sampleBatch);
    expect(mockCreateBatch).toHaveBeenCalledWith({
      productBarcode: '7610807001024',
      batchNumber: 'LOT-2026-JW-042',
    });
  });

  it('returns 400 when productBarcode is missing', async () => {
    const res = await request(app).post('/batches').send({ batchNumber: 'LOT-001' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing productBarcode or batchNumber' });
    expect(mockCreateBatch).not.toHaveBeenCalled();
  });

  it('returns 400 when batchNumber is missing', async () => {
    const res = await request(app).post('/batches').send({ productBarcode: '7610807001024' });

    expect(res.status).toBe(400);
    expect(mockCreateBatch).not.toHaveBeenCalled();
  });

  it('returns 400 when the batch already exists', async () => {
    mockFindBatchByProductAndNumber.mockResolvedValueOnce(sampleBatch);

    const res = await request(app)
      .post('/batches')
      .send({ productBarcode: '7610807001024', batchNumber: 'LOT-2026-JW-042' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Batch already exists for this product and batch number' });
    expect(mockCreateBatch).not.toHaveBeenCalled();
  });

  it('returns 500 when the repository throws', async () => {
    mockFindBatchByProductAndNumber.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app)
      .post('/batches')
      .send({ productBarcode: '7610807001024', batchNumber: 'LOT-2026-JW-042' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to create batch' });
  });
});

describe('GET /batches/by-number/:batchNumber', () => {
  it('returns matching batches', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);

    const res = await request(app).get('/batches/by-number/LOT-2026-JW-042');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([sampleBatch]);
    expect(mockFindByBatchNumber).toHaveBeenCalledWith('LOT-2026-JW-042');
  });

  it('returns 404 when no batches match', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([]);

    const res = await request(app).get('/batches/by-number/UNKNOWN-LOT');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No batches found for this batch number' });
  });

  it('returns 500 when the repository throws', async () => {
    mockFindByBatchNumber.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get('/batches/by-number/LOT-001');

    expect(res.status).toBe(500);
  });
});

describe('GET /batches/:id', () => {
  it('returns the batch', async () => {
    mockFindBatchById.mockResolvedValueOnce(sampleBatch);

    const res = await request(app).get(`/batches/${sampleBatch.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleBatch);
  });

  it('returns 404 when the batch does not exist', async () => {
    mockFindBatchById.mockResolvedValueOnce(null);

    const res = await request(app).get('/batches/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Batch not found' });
  });

  it('returns 500 when the repository throws', async () => {
    mockFindBatchById.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get(`/batches/${sampleBatch.id}`);

    expect(res.status).toBe(500);
  });
});

describe('GET /batches/:id/supply-chain', () => {
  it('returns the supply chain for a batch', async () => {
    mockFindBatchById.mockResolvedValueOnce(sampleBatch);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(sampleSupplyChain);

    const res = await request(app).get(`/batches/${sampleBatch.id}/supply-chain`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: sampleSupplyChain.id, batch_id: sampleBatch.id });
    expect(res.body.nodes).toHaveLength(1);
    expect(mockFindSupplyChainByBatch).toHaveBeenCalledWith(sampleBatch.id);
  });

  it('returns 404 when the batch does not exist', async () => {
    mockFindBatchById.mockResolvedValueOnce(null);

    const res = await request(app).get('/batches/00000000-0000-0000-0000-000000000000/supply-chain');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Batch not found' });
    expect(mockFindSupplyChainByBatch).not.toHaveBeenCalled();
  });

  it('returns 404 when the batch has no supply chain', async () => {
    mockFindBatchById.mockResolvedValueOnce(sampleBatch);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(null);

    const res = await request(app).get(`/batches/${sampleBatch.id}/supply-chain`);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No supply chain found for this batch' });
  });

  it('returns 500 when the repository throws', async () => {
    mockFindBatchById.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app).get(`/batches/${sampleBatch.id}/supply-chain`);

    expect(res.status).toBe(500);
  });
});
