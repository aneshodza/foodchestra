import { pool } from '../db';
import type {
  CoolingChainReading,
  CoolingChainEdgeData,
  CoolingChainAnomaly,
  CreateReadingInput,
} from '@foodchestra/sdk';

export type { CoolingChainReading, CoolingChainEdgeData, CreateReadingInput };

export const COOLING_BREACH_THRESHOLD_CELSIUS = 2;

function computeAnomaly(
  readings: CoolingChainReading[],
  thresholdCelsius: number,
): CoolingChainAnomaly | null {
  if (readings.length === 0) return null;
  const avg = readings.reduce((sum, r) => sum + r.celsius, 0) / readings.length;
  const upperBound = avg + thresholdCelsius;
  const lowerBound = avg - thresholdCelsius;
  const hasBreach = readings.some((r) => r.celsius > upperBound || r.celsius < lowerBound);
  return { hasBreach, averageCelsius: avg, upperBound, lowerBound, thresholdCelsius };
}

export const CoolingChainRepository = {
  async findByEdge(edgeId: string): Promise<CoolingChainReading[]> {
    const res = await pool.query(
      `SELECT id, edge_id, recorded_at, celsius
       FROM cooling_chain_readings
       WHERE edge_id = $1
       ORDER BY recorded_at ASC`,
      [edgeId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      edgeId: r.edge_id,
      recordedAt: r.recorded_at,
      celsius: Number(r.celsius),
    }));
  },

  async findBySupplyChain(supplyChainId: string): Promise<CoolingChainEdgeData[]> {
    const res = await pool.query(
      `SELECT
         ccr.id,
         ccr.edge_id,
         ccr.recorded_at,
         ccr.celsius,
         e.from_node_id,
         e.to_node_id
       FROM cooling_chain_readings ccr
       JOIN supply_chain_edges e ON e.id = ccr.edge_id
       JOIN supply_chain_nodes n ON n.id = e.from_node_id
       WHERE n.supply_chain_id = $1
       ORDER BY ccr.edge_id, ccr.recorded_at ASC`,
      [supplyChainId],
    );

    const map = new Map<string, CoolingChainEdgeData>();
    for (const r of res.rows) {
      const edgeId: string = r.edge_id;
      if (!map.has(edgeId)) {
        map.set(edgeId, {
          edgeId,
          fromNodeId: r.from_node_id,
          toNodeId: r.to_node_id,
          readings: [],
          anomaly: null,
        });
      }
      map.get(edgeId)!.readings.push({
        id: r.id,
        edgeId,
        recordedAt: r.recorded_at,
        celsius: Number(r.celsius),
      });
    }

    for (const edge of map.values()) {
      edge.anomaly = computeAnomaly(edge.readings, COOLING_BREACH_THRESHOLD_CELSIUS);
    }

    return Array.from(map.values());
  },

  async hasCoolingBreachForProduct(barcode: string): Promise<boolean> {
    const res = await pool.query(
      `WITH edge_avgs AS (
         SELECT e.id AS edge_id, AVG(ccr.celsius) AS avg_temp
         FROM cooling_chain_readings ccr
         JOIN supply_chain_edges e ON e.id = ccr.edge_id
         JOIN supply_chain_nodes n ON n.id = e.from_node_id
         JOIN supply_chains sc ON sc.id = n.supply_chain_id
         JOIN batches b ON b.id = sc.batch_id
         WHERE b.product_barcode = $1
         GROUP BY e.id
       )
       SELECT EXISTS(
         SELECT 1 FROM cooling_chain_readings ccr
         JOIN edge_avgs ea ON ea.edge_id = ccr.edge_id
         WHERE ABS(ccr.celsius - ea.avg_temp) > $2
       ) AS has_breach`,
      [barcode, COOLING_BREACH_THRESHOLD_CELSIUS],
    );
    return res.rows[0].has_breach as boolean;
  },

  async bulkCreate(readings: CreateReadingInput[]): Promise<CoolingChainReading[]> {
    if (readings.length === 0) return [];

    const placeholders = readings
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(', ');
    const values = readings.flatMap((r) => [r.edgeId, r.recordedAt, r.celsius]);

    const res = await pool.query(
      `INSERT INTO cooling_chain_readings (edge_id, recorded_at, celsius)
       VALUES ${placeholders}
       RETURNING id, edge_id, recorded_at, celsius`,
      values,
    );

    return res.rows.map((r) => ({
      id: r.id,
      edgeId: r.edge_id,
      recordedAt: r.recorded_at,
      celsius: Number(r.celsius),
    }));
  },
};
