import express from 'express';
import request from 'supertest';
import coolingChainRouter from '../routers/cooling-chain.router';
import { SupplyChainRepository } from '../repositories/supply-chain.repository';
import { CoolingChainRepository } from '../repositories/cooling-chain.repository';
import type { Batch, SupplyChain, CoolingChainEdgeData } from '@foodchestra/sdk';

jest.mock('../repositories/supply-chain.repository');
jest.mock('../repositories/cooling-chain.repository');

const mockFindByBatchNumber = SupplyChainRepository.findByBatchNumber as jest.MockedFunction<
  typeof SupplyChainRepository.findByBatchNumber
>;
const mockFindSupplyChainByBatch =
  SupplyChainRepository.findSupplyChainByBatch as jest.MockedFunction<
    typeof SupplyChainRepository.findSupplyChainByBatch
  >;
const mockFindBySupplyChain = CoolingChainRepository.findBySupplyChain as jest.MockedFunction<
  typeof CoolingChainRepository.findBySupplyChain
>;

const app = express();
app.use(express.json());
app.use('/batches', coolingChainRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const sampleBatch: Batch = {
  id: 'c1000000-0000-0000-0000-000000000001',
  productBarcode: '7610800749004',
  batchNumber: 'LOT-2026-JW-042',
  createdAt: '2026-01-01T00:00:00Z',
};

const anotherBatch: Batch = {
  id: 'c2000000-0000-0000-0000-000000000002',
  productBarcode: '1234567890123',
  batchNumber: 'LOT-2026-JW-042',
  createdAt: '2026-01-01T00:00:00Z',
};

const sampleSupplyChain: SupplyChain = {
  id: 'd1000000-0000-0000-0000-000000000001',
  batchId: sampleBatch.id,
  createdAt: '2026-01-01T00:00:00Z',
  nodes: [],
  edges: [],
};

const sampleCoolingData: CoolingChainEdgeData[] = [
  {
    edgeId: 'f0000000-0000-0000-0000-000000000001',
    fromNodeId: 'e1000000-0000-0000-0000-000000000001',
    toNodeId: 'e1000000-0000-0000-0000-000000000003',
    readings: [
      {
        id: 'aa000000-0000-0000-0000-000000000001',
        edgeId: 'f0000000-0000-0000-0000-000000000001',
        recordedAt: '2026-01-10T13:00:00Z',
        celsius: 4.1,
      },
      {
        id: 'aa000000-0000-0000-0000-000000000002',
        edgeId: 'f0000000-0000-0000-0000-000000000001',
        recordedAt: '2026-01-10T22:00:00Z',
        celsius: 14.1,
      },
    ],
    anomaly: {
      hasBreach: true,
      averageCelsius: 9.1,
      upperBound: 11.1,
      lowerBound: 7.1,
      thresholdCelsius: 2,
    },
  },
];

const BASE = `/batches/by-number/${encodeURIComponent(sampleBatch.batchNumber)}/supply-chain/cooling`;

describe('GET /batches/by-number/:batchNumber/supply-chain/cooling', () => {
  it('returns 200 with cooling data for a valid batch number', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(sampleSupplyChain);
    mockFindBySupplyChain.mockResolvedValueOnce(sampleCoolingData);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(sampleCoolingData);
    expect(mockFindByBatchNumber).toHaveBeenCalledWith(sampleBatch.batchNumber, undefined);
    expect(mockFindBySupplyChain).toHaveBeenCalledWith(sampleSupplyChain.id);
  });

  it('passes the barcode query param to findByBatchNumber', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(sampleSupplyChain);
    mockFindBySupplyChain.mockResolvedValueOnce([]);

    await request(app).get(`${BASE}?barcode=${sampleBatch.productBarcode}`);

    expect(mockFindByBatchNumber).toHaveBeenCalledWith(
      sampleBatch.batchNumber,
      sampleBatch.productBarcode,
    );
  });

  it('returns 200 with an empty array when there are no readings', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(sampleSupplyChain);
    mockFindBySupplyChain.mockResolvedValueOnce([]);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 404 when no batch matches the batch number', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([]);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Batch not found' });
    expect(mockFindSupplyChainByBatch).not.toHaveBeenCalled();
  });

  it('returns 400 when multiple batches share the batch number and no barcode is given', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch, anotherBatch]);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/multiple batches/i);
    expect(mockFindSupplyChainByBatch).not.toHaveBeenCalled();
  });

  it('returns 404 when the batch has no supply chain', async () => {
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(null);

    const res = await request(app).get(BASE);

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'No supply chain found for this batch' });
    expect(mockFindBySupplyChain).not.toHaveBeenCalled();
  });

  it('returns 500 when findSupplyChainByBatch throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockRejectedValueOnce(new Error('Query timeout'));

    const res = await request(app).get(BASE);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch cooling chain' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 500 when findByBatchNumber throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindByBatchNumber.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app).get(BASE);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch cooling chain' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 500 when findBySupplyChain throws', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockFindByBatchNumber.mockResolvedValueOnce([sampleBatch]);
    mockFindSupplyChainByBatch.mockResolvedValueOnce(sampleSupplyChain);
    mockFindBySupplyChain.mockRejectedValueOnce(new Error('Query timeout'));

    const res = await request(app).get(BASE);

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to fetch cooling chain' });
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
