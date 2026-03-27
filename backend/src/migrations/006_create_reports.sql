DO $$ BEGIN
  CREATE TYPE report_category AS ENUM (
    'damaged_packaging',
    'quality_issue',
    'foreign_object',
    'mislabeled',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS reports (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id  INTEGER         NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category    report_category NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_product_created
  ON reports(product_id, created_at DESC);
