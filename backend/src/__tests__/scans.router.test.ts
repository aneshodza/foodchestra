import express from 'express';
import request from 'supertest';
import scansRouter from '../routers/scans.router';
import * as repo from '../repositories/scans.repository';

jest.mock('../repositories/scans.repository');

const mockCreate = repo.ScansRepository.create as jest.MockedFunction<
  typeof repo.ScansRepository.create
>;

const app = express();
app.use(express.json());
app.use('/scans', scansRouter);

afterEach(() => {
  jest.resetAllMocks();
});

const sampleScan: repo.Scan = {
  id: 'uuid-abc-123',
  scan_result: '1234567890123',
  scan_type: 'barcode',
  scanned_at: '2026-03-27T10:00:00Z',
  metadata: {},
};

describe('POST /scans', () => {
  it('returns 201 with created scan on valid input', async () => {
    mockCreate.mockResolvedValueOnce(sampleScan);

    const res = await request(app)
      .post('/scans')
      .send({ scanResult: '1234567890123', scanType: 'barcode' });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      scanResult: '1234567890123',
      scanType: 'barcode',
      metadata: undefined,
    });
    expect(res.body).toMatchObject({
      id: 'uuid-abc-123',
      scan_result: '1234567890123',
      scan_type: 'barcode',
    });
  });

  it('returns 400 when scanResult is missing', async () => {
    const res = await request(app).post('/scans').send({ scanType: 'qr' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing scanResult or scanType' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when scanType is missing', async () => {
    const res = await request(app)
      .post('/scans')
      .send({ scanResult: '1234567890123' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Missing scanResult or scanType' });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('returns 400 when body is empty', async () => {
    const res = await request(app).post('/scans').send({});

    expect(res.status).toBe(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('passes metadata to the repository', async () => {
    const meta = { source: 'mobile', version: '1.0' };
    mockCreate.mockResolvedValueOnce({ ...sampleScan, metadata: meta });

    const res = await request(app)
      .post('/scans')
      .send({ scanResult: 'qr-data', scanType: 'qr', metadata: meta });

    expect(res.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith({
      scanResult: 'qr-data',
      scanType: 'qr',
      metadata: meta,
    });
  });

  it('returns 500 when the repository throws', async () => {
    mockCreate.mockRejectedValueOnce(new Error('DB error'));
    jest.spyOn(console, 'error').mockImplementationOnce(() => {});

    const res = await request(app)
      .post('/scans')
      .send({ scanResult: '1234567890123', scanType: 'barcode' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to log scan' });
  });
});
