import { pool } from '../db';
import type {
  Party,
  PartyLocation,
  Batch,
  CreateBatchInput,
  SupplyChain,
  SupplyChainNode,
  SupplyChainEdge,
} from '@foodchestra/sdk';

export type {
  Party,
  PartyLocation,
  Batch,
  CreateBatchInput,
  SupplyChain,
  SupplyChainNode,
  SupplyChainEdge,
};

export const SupplyChainRepository = {
  async findAllParties(): Promise<Party[]> {
    const res = await pool.query(
      'SELECT id, name, type, created_at FROM parties ORDER BY name',
    );
    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      createdAt: r.created_at,
    }));
  },

  async findPartyById(id: string): Promise<Party | null> {
    const res = await pool.query(
      'SELECT id, name, type, created_at FROM parties WHERE id = $1',
      [id],
    );
    const r = res.rows[0];
    if (!r) return null;
    return { id: r.id, name: r.name, type: r.type, createdAt: r.created_at };
  },

  async findLocationsByParty(partyId: string): Promise<PartyLocation[]> {
    const res = await pool.query(
      `SELECT id, party_id, label, latitude, longitude, address, created_at
       FROM party_locations
       WHERE party_id = $1
       ORDER BY label`,
      [partyId],
    );
    return res.rows.map((r) => ({
      id: r.id,
      partyId: r.party_id,
      label: r.label,
      latitude: r.latitude,
      longitude: r.longitude,
      address: r.address,
      createdAt: r.created_at,
    }));
  },

  async findBatchById(id: string): Promise<Batch | null> {
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE id = $1',
      [id],
    );
    const r = res.rows[0];
    if (!r) return null;
    return { id: r.id, productBarcode: r.product_barcode, batchNumber: r.batch_number, createdAt: r.created_at };
  },

  async findByBatchNumber(batchNumber: string, barcode?: string): Promise<Batch[]> {
    const mapBatch = (r: Record<string, unknown>) => ({
      id: r['id'] as string,
      productBarcode: r['product_barcode'] as string,
      batchNumber: r['batch_number'] as string,
      createdAt: r['created_at'] as string,
    });

    if (barcode) {
      const res = await pool.query(
        'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE batch_number = $1 AND product_barcode = $2',
        [batchNumber, barcode],
      );
      return res.rows.map(mapBatch);
    }
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE batch_number = $1',
      [batchNumber],
    );
    return res.rows.map(mapBatch);
  },

  async findBatchByProductAndNumber(
    productBarcode: string,
    batchNumber: string,
  ): Promise<Batch | null> {
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE product_barcode = $1 AND batch_number = $2',
      [productBarcode, batchNumber],
    );
    const r = res.rows[0];
    if (!r) return null;
    return { id: r.id, productBarcode: r.product_barcode, batchNumber: r.batch_number, createdAt: r.created_at };
  },

  async createBatch(input: CreateBatchInput): Promise<Batch> {
    const res = await pool.query(
      `INSERT INTO batches (product_barcode, batch_number)
       VALUES ($1, $2)
       RETURNING id, product_barcode, batch_number, created_at`,
      [input.productBarcode, input.batchNumber],
    );
    const r = res.rows[0];
    return { id: r.id, productBarcode: r.product_barcode, batchNumber: r.batch_number, createdAt: r.created_at };
  },

  async findSupplyChainByBatch(batchId: string): Promise<SupplyChain | null> {
    const chainRes = await pool.query(
      'SELECT id, batch_id, created_at FROM supply_chains WHERE batch_id = $1',
      [batchId],
    );
    if (!chainRes.rows[0]) return null;
    const chain = chainRes.rows[0];

    const nodesRes = await pool.query(
      `SELECT
         n.id,
         n.label,
         n.arrived_at,
         n.departed_at,
         l.id           AS loc_id,
         l.label        AS loc_label,
         l.latitude,
         l.longitude,
         l.address,
         l.created_at   AS loc_created_at,
         p.id           AS party_id,
         p.name         AS party_name,
         p.type         AS party_type,
         p.created_at   AS party_created_at
       FROM supply_chain_nodes n
       JOIN party_locations l ON l.id = n.location_id
       JOIN parties p         ON p.id = l.party_id
       WHERE n.supply_chain_id = $1`,
      [chain.id],
    );

    const nodes: SupplyChainNode[] = nodesRes.rows.map((r) => ({
      id: r.id,
      label: r.label,
      arrivedAt: r.arrived_at,
      departedAt: r.departed_at,
      location: {
        id: r.loc_id,
        partyId: r.party_id,
        label: r.loc_label,
        latitude: r.latitude,
        longitude: r.longitude,
        address: r.address,
        createdAt: r.loc_created_at,
        party: {
          id: r.party_id,
          name: r.party_name,
          type: r.party_type,
          createdAt: r.party_created_at,
        },
      },
    }));

    const edgesRes = await pool.query(
      `SELECT e.from_node_id, e.to_node_id
       FROM supply_chain_edges e
       JOIN supply_chain_nodes n ON n.id = e.from_node_id
       WHERE n.supply_chain_id = $1`,
      [chain.id],
    );

    const edges: SupplyChainEdge[] = edgesRes.rows.map((r) => ({
      fromNodeId: r.from_node_id,
      toNodeId: r.to_node_id,
    }));

    return {
      id: chain.id,
      batchId: chain.batch_id,
      createdAt: chain.created_at,
      nodes,
      edges,
    };
  },
};
