CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_result TEXT NOT NULL,
  scan_type TEXT NOT NULL, -- 'qr', 'barcode', 'ocr', 'manual'
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_scans_result ON scans(scan_result);
CREATE INDEX IF NOT EXISTS idx_scans_type ON scans(scan_type);
