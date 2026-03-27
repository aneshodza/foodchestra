export type ReportCategory =
  | 'damaged_packaging'
  | 'quality_issue'
  | 'foreign_object'
  | 'mislabeled'
  | 'other';

export interface Report {
  id: string;
  productId: number;
  category: ReportCategory;
  description: string | null;
  createdAt: string;
}

export interface ReportsResponse {
  count: number;
  recentCount24h: number;
  hasWarning: boolean;
  reports: Report[];
}

export interface CreateReportInput {
  category: ReportCategory;
  description?: string;
}
