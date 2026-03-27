import type { Party, PartyLocation } from './parties.js';

export interface Batch {
  id: string;
  product_barcode: string;
  batch_number: string;
  created_at: string;
}

export interface CreateBatchInput {
  productBarcode: string;
  batchNumber: string;
}

export interface SupplyChainEdge {
  from_node_id: string;
  to_node_id: string;
}

export interface SupplyChainNode {
  id: string;
  label: string | null;
  arrived_at: string | null;
  departed_at: string | null;
  location: PartyLocation & { party: Party };
}

export interface SupplyChain {
  id: string;
  batch_id: string;
  created_at: string;
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
}
