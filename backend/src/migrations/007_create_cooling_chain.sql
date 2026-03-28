-- Add a surrogate UUID id to supply_chain_edges so cooling_chain_readings
-- can reference a single column instead of a composite key.
ALTER TABLE supply_chain_edges ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
UPDATE supply_chain_edges SET id = gen_random_uuid() WHERE id IS NULL;
ALTER TABLE supply_chain_edges ALTER COLUMN id SET NOT NULL;
DO $$ BEGIN
  ALTER TABLE supply_chain_edges ADD CONSTRAINT supply_chain_edges_id_key UNIQUE (id);
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- Cooling chain readings: one row per temperature measurement per transport leg.
CREATE TABLE IF NOT EXISTS cooling_chain_readings (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  edge_id     UUID         NOT NULL REFERENCES supply_chain_edges(id),
  recorded_at TIMESTAMPTZ  NOT NULL,
  celsius     NUMERIC(5,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cooling_chain_edge_time
  ON cooling_chain_readings (edge_id, recorded_at);
