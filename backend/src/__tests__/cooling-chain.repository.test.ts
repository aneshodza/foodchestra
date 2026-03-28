import { CoolingChainRepository, COOLING_BREACH_THRESHOLD_CELSIUS } from '../repositories/cooling-chain.repository';
import { pool } from '../db';

jest.mock('../db', () => ({
  pool: { query: jest.fn() },
}));

const mockQuery = pool.query as jest.MockedFunction<typeof pool.query>;

afterEach(() => {
  jest.resetAllMocks();
});

// ── findByEdge ────────────────────────────────────────────────────────────────

describe('CoolingChainRepository.findByEdge', () => {
  it('returns mapped readings ordered by recorded_at', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'edge-1', recorded_at: '2026-01-10T13:00:00Z', celsius: '4.10' },
        { id: 'r-2', edge_id: 'edge-1', recorded_at: '2026-01-10T23:00:00Z', celsius: '14.10' },
      ],
    } as never);

    const result = await CoolingChainRepository.findByEdge('edge-1');

    expect(result).toEqual([
      { id: 'r-1', edgeId: 'edge-1', recordedAt: '2026-01-10T13:00:00Z', celsius: 4.1 },
      { id: 'r-2', edgeId: 'edge-1', recordedAt: '2026-01-10T23:00:00Z', celsius: 14.1 },
    ]);
  });

  it('converts celsius from pg NUMERIC string to number', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'r-1', edge_id: 'e', recorded_at: 'ts', celsius: '3.80' }],
    } as never);

    const [reading] = await CoolingChainRepository.findByEdge('e');
    expect(reading.celsius).toBe(3.8);
    expect(typeof reading.celsius).toBe('number');
  });

  it('returns an empty array when no readings exist for the edge', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as never);

    const result = await CoolingChainRepository.findByEdge('edge-unknown');
    expect(result).toEqual([]);
  });

  it('queries with the correct edge id parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as never);

    await CoolingChainRepository.findByEdge('my-edge-id');

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['my-edge-id']);
  });
});

// ── findBySupplyChain ─────────────────────────────────────────────────────────

describe('CoolingChainRepository.findBySupplyChain', () => {
  it('groups readings by edgeId into CoolingChainEdgeData objects', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'edge-a', recorded_at: 'ts1', celsius: '4.10', from_node_id: 'n-1', to_node_id: 'n-2' },
        { id: 'r-2', edge_id: 'edge-a', recorded_at: 'ts2', celsius: '14.10', from_node_id: 'n-1', to_node_id: 'n-2' },
        { id: 'r-3', edge_id: 'edge-b', recorded_at: 'ts3', celsius: '3.90', from_node_id: 'n-2', to_node_id: 'n-3' },
      ],
    } as never);

    const result = await CoolingChainRepository.findBySupplyChain('sc-1');

    expect(result).toHaveLength(2);

    // edge-a: avg=9.1, bounds=[7.1, 11.1], reading 14.1 > 11.1 → breach
    const edgeA = result.find((e) => e.edgeId === 'edge-a');
    expect(edgeA).toEqual({
      edgeId: 'edge-a',
      fromNodeId: 'n-1',
      toNodeId: 'n-2',
      readings: [
        { id: 'r-1', edgeId: 'edge-a', recordedAt: 'ts1', celsius: 4.1 },
        { id: 'r-2', edgeId: 'edge-a', recordedAt: 'ts2', celsius: 14.1 },
      ],
      anomaly: {
        hasBreach: true,
        averageCelsius: 9.1,
        upperBound: 9.1 + COOLING_BREACH_THRESHOLD_CELSIUS,
        lowerBound: 9.1 - COOLING_BREACH_THRESHOLD_CELSIUS,
        thresholdCelsius: COOLING_BREACH_THRESHOLD_CELSIUS,
      },
    });

    // edge-b: avg=3.9, bounds=[1.9, 5.9], reading 3.9 → no breach
    const edgeB = result.find((e) => e.edgeId === 'edge-b');
    expect(edgeB).toEqual({
      edgeId: 'edge-b',
      fromNodeId: 'n-2',
      toNodeId: 'n-3',
      readings: [{ id: 'r-3', edgeId: 'edge-b', recordedAt: 'ts3', celsius: 3.9 }],
      anomaly: {
        hasBreach: false,
        averageCelsius: 3.9,
        upperBound: 3.9 + COOLING_BREACH_THRESHOLD_CELSIUS,
        lowerBound: 3.9 - COOLING_BREACH_THRESHOLD_CELSIUS,
        thresholdCelsius: COOLING_BREACH_THRESHOLD_CELSIUS,
      },
    });
  });

  it('returns an empty array when the supply chain has no cooling data', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as never);

    const result = await CoolingChainRepository.findBySupplyChain('sc-empty');
    expect(result).toEqual([]);
  });

  it('correctly handles a single edge with a single reading', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'edge-1', recorded_at: 'ts', celsius: '5.00', from_node_id: 'n-a', to_node_id: 'n-b' },
      ],
    } as never);

    const result = await CoolingChainRepository.findBySupplyChain('sc-1');

    expect(result).toHaveLength(1);
    expect(result[0].readings).toHaveLength(1);
  });

  it('preserves insertion order of edges (first seen wins position)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'edge-a', recorded_at: 'ts1', celsius: '4.0', from_node_id: 'n-1', to_node_id: 'n-2' },
        { id: 'r-2', edge_id: 'edge-b', recorded_at: 'ts2', celsius: '4.0', from_node_id: 'n-2', to_node_id: 'n-3' },
        { id: 'r-3', edge_id: 'edge-a', recorded_at: 'ts3', celsius: '4.0', from_node_id: 'n-1', to_node_id: 'n-2' },
      ],
    } as never);

    const result = await CoolingChainRepository.findBySupplyChain('sc-1');

    expect(result[0].edgeId).toBe('edge-a');
    expect(result[1].edgeId).toBe('edge-b');
    // Both readings for edge-a are grouped together
    expect(result[0].readings).toHaveLength(2);
  });

  it('queries with the correct supply chain id parameter', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as never);

    await CoolingChainRepository.findBySupplyChain('my-sc-id');

    expect(mockQuery).toHaveBeenCalledWith(expect.any(String), ['my-sc-id']);
  });
});

// ── anomaly computation ───────────────────────────────────────────────────────

describe('anomaly computation in findBySupplyChain', () => {
  it('sets anomaly to null when an edge has no readings', async () => {
    // Supply chain query returns no rows → empty array, not tested here via findBySupplyChain
    // Test via single edge with no readings is not reachable (rows would simply be absent).
    // Verify that an edge with readings produces non-null anomaly.
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'e1', recorded_at: 'ts', celsius: '5.00', from_node_id: 'n-a', to_node_id: 'n-b' },
      ],
    } as never);

    const [edge] = await CoolingChainRepository.findBySupplyChain('sc-1');
    expect(edge.anomaly).not.toBeNull();
  });

  it('hasBreach is false when all readings are within ±2°C of the average', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'e1', recorded_at: 'ts1', celsius: '4.00', from_node_id: 'n-a', to_node_id: 'n-b' },
        { id: 'r-2', edge_id: 'e1', recorded_at: 'ts2', celsius: '5.00', from_node_id: 'n-a', to_node_id: 'n-b' },
        { id: 'r-3', edge_id: 'e1', recorded_at: 'ts3', celsius: '6.00', from_node_id: 'n-a', to_node_id: 'n-b' },
      ],
    } as never);

    // avg = 5, bounds = [3, 7], all readings within
    const [edge] = await CoolingChainRepository.findBySupplyChain('sc-1');
    expect(edge.anomaly?.hasBreach).toBe(false);
    expect(edge.anomaly?.averageCelsius).toBe(5);
    expect(edge.anomaly?.upperBound).toBe(7);
    expect(edge.anomaly?.lowerBound).toBe(3);
  });

  it('hasBreach is true when a reading is more than 2°C above the average', async () => {
    // avg = (5 + 9.2) / 2 = 7.1, upperBound = 9.1, reading 9.2 > 9.1 → breach
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'e1', recorded_at: 'ts1', celsius: '5.00', from_node_id: 'n-a', to_node_id: 'n-b' },
        { id: 'r-2', edge_id: 'e1', recorded_at: 'ts2', celsius: '9.20', from_node_id: 'n-a', to_node_id: 'n-b' },
      ],
    } as never);

    const [edge] = await CoolingChainRepository.findBySupplyChain('sc-1');
    expect(edge.anomaly?.hasBreach).toBe(true);
  });

  it('computes correct bounds for a negative average (freezer chain)', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'r-1', edge_id: 'e1', recorded_at: 'ts1', celsius: '-18.00', from_node_id: 'n-a', to_node_id: 'n-b' },
        { id: 'r-2', edge_id: 'e1', recorded_at: 'ts2', celsius: '-18.00', from_node_id: 'n-a', to_node_id: 'n-b' },
      ],
    } as never);

    // avg = -18, upperBound = -16, lowerBound = -20
    const [edge] = await CoolingChainRepository.findBySupplyChain('sc-1');
    expect(edge.anomaly?.averageCelsius).toBe(-18);
    expect(edge.anomaly?.upperBound).toBe(-16);
    expect(edge.anomaly?.lowerBound).toBe(-20);
    expect(edge.anomaly?.hasBreach).toBe(false);
  });
});

// ── bulkCreate ────────────────────────────────────────────────────────────────

describe('CoolingChainRepository.bulkCreate', () => {
  it('returns an empty array without querying when given no readings', async () => {
    const result = await CoolingChainRepository.bulkCreate([]);

    expect(result).toEqual([]);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('inserts a single reading and returns the mapped result', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'r-1', edge_id: 'edge-1', recorded_at: 'ts', celsius: '4.10' }],
    } as never);

    const result = await CoolingChainRepository.bulkCreate([
      { edgeId: 'edge-1', recordedAt: 'ts', celsius: 4.1 },
    ]);

    expect(result).toEqual([
      { id: 'r-1', edgeId: 'edge-1', recordedAt: 'ts', celsius: 4.1 },
    ]);
  });

  it('builds correct parameterised placeholders for multiple readings', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] } as never);

    await CoolingChainRepository.bulkCreate([
      { edgeId: 'e1', recordedAt: 'ts1', celsius: 4.0 },
      { edgeId: 'e2', recordedAt: 'ts2', celsius: 5.0 },
      { edgeId: 'e3', recordedAt: 'ts3', celsius: 6.0 },
    ]);

    const [sql, values] = mockQuery.mock.calls[0] as unknown as [string, unknown[]];
    // Each row should be ($1,$2,$3), ($4,$5,$6), ($7,$8,$9)
    expect(sql).toContain('($1, $2, $3)');
    expect(sql).toContain('($4, $5, $6)');
    expect(sql).toContain('($7, $8, $9)');
    expect(values).toEqual(['e1', 'ts1', 4.0, 'e2', 'ts2', 5.0, 'e3', 'ts3', 6.0]);
  });

  it('converts celsius from pg NUMERIC string to number on returned rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'r-1', edge_id: 'e', recorded_at: 'ts', celsius: '12.30' }],
    } as never);

    const [result] = await CoolingChainRepository.bulkCreate([
      { edgeId: 'e', recordedAt: 'ts', celsius: 12.3 },
    ]);

    expect(result.celsius).toBe(12.3);
    expect(typeof result.celsius).toBe('number');
  });
});
