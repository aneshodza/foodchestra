export interface CoolingChainReading {
  id: string;
  edgeId: string;
  recordedAt: string;
  celsius: number;
}

export interface CoolingChainAnomaly {
  hasBreach: boolean;
  averageCelsius: number;
  upperBound: number;
  lowerBound: number;
  thresholdCelsius: number;
}

export interface CoolingChainEdgeData {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  readings: CoolingChainReading[];
  anomaly: CoolingChainAnomaly | null;
}

export interface CreateReadingInput {
  edgeId: string;
  recordedAt: string;
  celsius: number;
}
