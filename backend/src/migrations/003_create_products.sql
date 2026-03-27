CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT,
  brands TEXT,
  stores TEXT,
  countries TEXT,
  quantity TEXT,
  nutriscore_grade TEXT,
  ingredients_text TEXT,
  ingredients JSONB,
  image_url TEXT,
  last_validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
