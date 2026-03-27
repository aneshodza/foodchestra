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
    return res.rows;
  },

  async findPartyById(id: string): Promise<Party | null> {
    const res = await pool.query(
      'SELECT id, name, type, created_at FROM parties WHERE id = $1',
      [id],
    );
    return res.rows[0] || null;
  },

  async findLocationsByParty(partyId: string): Promise<PartyLocation[]> {
    const res = await pool.query(
      `SELECT id, party_id, label, latitude, longitude, address, created_at
       FROM party_locations
       WHERE party_id = $1
       ORDER BY label`,
      [partyId],
    );
    return res.rows;
  },

  async findBatchById(id: string): Promise<Batch | null> {
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE id = $1',
      [id],
    );
    return res.rows[0] || null;
  },

  async findByBatchNumber(batchNumber: string): Promise<Batch[]> {
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE batch_number = $1',
      [batchNumber],
    );
    return res.rows;
  },

  async findBatchByProductAndNumber(
    productBarcode: string,
    batchNumber: string,
  ): Promise<Batch | null> {
    const res = await pool.query(
      'SELECT id, product_barcode, batch_number, created_at FROM batches WHERE product_barcode = $1 AND batch_number = $2',
      [productBarcode, batchNumber],
    );
    return res.rows[0] || null;
  },

  async createBatch(input: CreateBatchInput): Promise<Batch> {
    const res = await pool.query(
      `INSERT INTO batches (product_barcode, batch_number)
       VALUES ($1, $2)
       RETURNING id, product_barcode, batch_number, created_at`,
      [input.productBarcode, input.batchNumber],
    );
    return res.rows[0];
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
      arrived_at: r.arrived_at,
      departed_at: r.departed_at,
      location: {
        id: r.loc_id,
        party_id: r.party_id,
        label: r.loc_label,
        latitude: r.latitude,
        longitude: r.longitude,
        address: r.address,
        created_at: r.loc_created_at,
        party: {
          id: r.party_id,
          name: r.party_name,
          type: r.party_type,
          created_at: r.party_created_at,
        },
      },
    }));

    const edgesRes = await pool.query<SupplyChainEdge>(
      `SELECT e.from_node_id, e.to_node_id
       FROM supply_chain_edges e
       JOIN supply_chain_nodes n ON n.id = e.from_node_id
       WHERE n.supply_chain_id = $1`,
      [chain.id],
    );

    return {
      id: chain.id,
      batch_id: chain.batch_id,
      created_at: chain.created_at,
      nodes,
      edges: edgesRes.rows,
    };
  },
};
