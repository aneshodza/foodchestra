export type ScanType = 'qr' | 'barcode' | 'ocr' | 'manual';

export interface Scan {
  id: string;
  scan_result: string;
  scan_type: ScanType;
  scanned_at: string;
  metadata: Record<string, unknown>;
}

export interface CreateScanInput {
  scanResult: string;
  scanType: ScanType;
  metadata?: Record<string, unknown>;
}
