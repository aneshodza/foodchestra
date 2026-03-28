export interface CoolingChainReading {
  id: string;
  edgeId: string;
  recordedAt: string;
  celsius: number;
}

export interface CoolingChainEdgeData {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  readings: CoolingChainReading[];
}

export interface CreateReadingInput {
  edgeId: string;
  recordedAt: string;
  celsius: number;
}
