DO $$ BEGIN
  CREATE TYPE party_type AS ENUM ('farmer', 'processor', 'distributor', 'warehouse', 'retailer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS parties (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       party_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS party_locations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id   UUID NOT NULL REFERENCES parties(id),
  label      TEXT,
  latitude   DOUBLE PRECISION NOT NULL,
  longitude  DOUBLE PRECISION NOT NULL,
  address    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_barcode TEXT NOT NULL,
  batch_number    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_barcode, batch_number)
);

CREATE TABLE IF NOT EXISTS supply_chains (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id   UUID NOT NULL REFERENCES batches(id) UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_chain_nodes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supply_chain_id UUID NOT NULL REFERENCES supply_chains(id),
  location_id     UUID NOT NULL REFERENCES party_locations(id),
  label           TEXT,
  arrived_at      TIMESTAMPTZ,
  departed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS supply_chain_edges (
  from_node_id UUID NOT NULL REFERENCES supply_chain_nodes(id),
  to_node_id   UUID NOT NULL REFERENCES supply_chain_nodes(id),
  PRIMARY KEY (from_node_id, to_node_id),
  CHECK (from_node_id != to_node_id)
);
