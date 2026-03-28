import { pool } from '../db';

const REPORT_WINDOW_DAYS = 30;
const REPORT_RECENT_HOURS = 24;

export type ReportCategory =
  | 'damaged_packaging'
  | 'quality_issue'
  | 'foreign_object'
  | 'mislabeled'
  | 'other';

export interface ReportRow {
  id: string;
  product_id: number;
  category: ReportCategory;
  description: string | null;
  created_at: Date;
}

export interface ReportSummary {
  count30d: number;
  recentCount24h: number;
}

export async function createReport(input: {
  product_id: number;
  category: ReportCategory;
  description?: string | null;
}): Promise<ReportRow> {
  const result = await pool.query<ReportRow>(
    `INSERT INTO reports (product_id, category, description)
     VALUES ($1, $2, $3)
     RETURNING id, product_id, category, description, created_at`,
    [input.product_id, input.category, input.description ?? null],
  );

  return result.rows[0];
}

export async function getReportSummaryByProductId(productId: number): Promise<ReportSummary> {
  const result = await pool.query<{ count_30d: string; count_24h: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day' * ${REPORT_WINDOW_DAYS}) AS count_30d,
       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour' * ${REPORT_RECENT_HOURS}) AS count_24h
     FROM reports
     WHERE product_id = $1`,
    [productId],
  );

  const row = result.rows[0];
  return {
    count30d: parseInt(row?.count_30d ?? '0', 10),
    recentCount24h: parseInt(row?.count_24h ?? '0', 10),
  };
}

export async function getReportsByProductId(productId: number): Promise<ReportRow[]> {
  const result = await pool.query<ReportRow>(
    `SELECT id, product_id, category, description, created_at
     FROM reports
     WHERE product_id = $1
       AND created_at > NOW() - INTERVAL '1 day' * ${REPORT_WINDOW_DAYS}
     ORDER BY created_at DESC`,
    [productId],
  );

  return result.rows;
}
