export type ScanType = 'qr' | 'barcode' | 'ocr' | 'manual';

export interface Scan {
  id: string;
  scanResult: string;
  scanType: ScanType;
  scannedAt: string;
  metadata: Record<string, unknown>;
}

export interface CreateScanInput {
  scanResult: string;
  scanType: ScanType;
  metadata?: Record<string, unknown>;
}
