-- Parties
INSERT INTO parties (id, name, type) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Bio-Hof Müller',              'farmer'),
  ('a1000000-0000-0000-0000-000000000002', 'Agro-Genossenschaft Gossau',  'farmer'),
  ('a1000000-0000-0000-0000-000000000003', 'Jowa AG',                     'processor'),
  ('a1000000-0000-0000-0000-000000000004', 'Coop Logistik AG',            'distributor'),
  ('a1000000-0000-0000-0000-000000000005', 'Coop',                        'retailer')
ON CONFLICT (id) DO NOTHING;

-- Locations (Swiss lat/lon)
INSERT INTO party_locations (id, party_id, label, latitude, longitude, address) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Hof Erlinsbach',               47.4167,  7.9333, 'Hofstrasse 12, 5018 Erlinsbach'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Agro Gossau',                  47.4160,  9.2510, 'Flawilerstrasse 5, 9201 Gossau SG'),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000003', 'Jowa Volketswil',              47.3830,  8.6500, 'Zürichstrasse 39, 8604 Volketswil'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000004', 'Coop Verteilzentrum Pratteln', 47.5170,  7.6980, 'Lägernstrasse 10, 4133 Pratteln'),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000005', 'Coop Zürich HB',               47.3782,  8.5403, 'Bahnhofplatz 15, 8001 Zürich'),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000005', 'Coop Bern Bahnhof',            46.9490,  7.4390, 'Bahnhofplatz 10, 3011 Bern')
ON CONFLICT (id) DO NOTHING;

-- Batch for a Jowa Ruchbrot (Swiss barcode)
INSERT INTO batches (id, product_barcode, batch_number) VALUES
  ('c1000000-0000-0000-0000-000000000001', '7610800749004', 'LOT-2026-JW-042')
ON CONFLICT (id) DO NOTHING;

-- Supply chain for that batch
INSERT INTO supply_chains (id, batch_id) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Nodes: two ingredient sources merge at Jowa, then travel to Coop
--   e1 (wheat, Erlinsbach)  ──┐
--                              ├──► e3 (Jowa processing) ──► e4 (Coop distrib.) ──► e5 (Zürich shelf)
--   e2 (rye, Gossau)        ──┘
INSERT INTO supply_chain_nodes (id, supply_chain_id, location_id, label, arrived_at, departed_at) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'Wheat harvest',       '2026-01-10 06:00:00+01', '2026-01-10 14:00:00+01'),
  ('e1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000002', 'Rye harvest',         '2026-01-10 07:00:00+01', '2026-01-10 15:00:00+01'),
  ('e1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000003', 'Bread processing',    '2026-01-11 08:00:00+01', '2026-01-11 16:00:00+01'),
  ('e1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000004', 'Regional distribution','2026-01-12 04:00:00+01', '2026-01-12 10:00:00+01'),
  ('e1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000005', 'Shelf stocking',      '2026-01-12 14:00:00+01', NULL)
ON CONFLICT (id) DO NOTHING;

-- Edges: two farmers merge into Jowa, then linear to shelf
INSERT INTO supply_chain_edges (from_node_id, to_node_id) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0000-000000000002', 'e1000000-0000-0000-0000-000000000003'),
  ('e1000000-0000-0000-0000-000000000003', 'e1000000-0000-0000-0000-000000000004'),
  ('e1000000-0000-0000-0000-000000000004', 'e1000000-0000-0000-0000-000000000005')
ON CONFLICT DO NOTHING;
