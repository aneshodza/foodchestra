CREATE TABLE IF NOT EXISTS recalls (
  id INTEGER PRIMARY KEY,
  header_de TEXT,
  header_fr TEXT,
  header_it TEXT,
  description_de TEXT,
  description_fr TEXT,
  description_it TEXT,
  meta_de TEXT,
  image_url_de TEXT,
  authority_code_de TEXT,
  authority_name_de TEXT,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
