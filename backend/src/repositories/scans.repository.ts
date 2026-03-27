import { pool } from '../db';

export type ScanType = 'qr' | 'barcode' | 'ocr' | 'manual';

export interface Scan {
  id: string;
  scan_result: string;
  scan_type: ScanType;
  scanned_at: Date;
  metadata: Record<string, unknown>;
}

export interface CreateScanInput {
  scanResult: string;
  scanType: ScanType;
  metadata?: Record<string, unknown>;
}

export const ScansRepository = {
  /**
   * Persists a new scan record.
   */
  async create(input: CreateScanInput): Promise<Scan> {
    const sql = `
      INSERT INTO scans (scan_result, scan_type, metadata)
      VALUES ($1, $2, $3)
      RETURNING id, scan_result, scan_type, scanned_at, metadata
    `;
    const params = [input.scanResult, input.scanType, input.metadata || {}];
    const res = await pool.query(sql, params);
    return res.rows[0];
  },

  /**
   * Retrieves the most recent scans.
   */
  async findRecent(limit = 10): Promise<Scan[]> {
    const sql = `
      SELECT id, scan_result, scan_type, scanned_at, metadata
      FROM scans
      ORDER BY scanned_at DESC
      LIMIT $1
    `;
    const res = await pool.query(sql, [limit]);
    return res.rows;
  }
};
