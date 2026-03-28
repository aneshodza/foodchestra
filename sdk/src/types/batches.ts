import type { Party, PartyLocation } from './parties.js';

export interface Batch {
  id: string;
  productBarcode: string;
  batchNumber: string;
  createdAt: string;
}

export interface CreateBatchInput {
  productBarcode: string;
  batchNumber: string;
}

export interface SupplyChainEdge {
  fromNodeId: string;
  toNodeId: string;
}

export interface SupplyChainNode {
  id: string;
  label: string | null;
  arrivedAt: string | null;
  departedAt: string | null;
  location: PartyLocation & { party: Party };
}

export interface SupplyChain {
  id: string;
  batchId: string;
  createdAt: string;
  nodes: SupplyChainNode[];
  edges: SupplyChainEdge[];
}
