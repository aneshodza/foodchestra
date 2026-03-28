-- Seed cooling chain readings for the 4 transport edges from migration 005.
-- Edge IDs are auto-generated UUIDs, so we look them up by node pairs.
--
-- Edge A: Erlinsbach (e1) → Jowa (e3)  — 14:00 Jan 10 → 08:00 Jan 11 +01
-- Edge B: Gossau (e2) → Jowa (e3)      — 15:00 Jan 10 → 08:00 Jan 11 +01
-- Edge C: Jowa (e3) → Pratteln (e4)    — 16:00 Jan 11 → 04:00 Jan 12 +01
-- Edge D: Pratteln (e4) → Zürich HB (e5)— 10:00 Jan 12 → 14:00 Jan 12 +01

-- Edge A: mostly 3–5 °C with a spike to 14 °C around midnight (door opened at loading dock)
INSERT INTO cooling_chain_readings (edge_id, recorded_at, celsius)
SELECT e.id, ts, celsius FROM supply_chain_edges e
CROSS JOIN (VALUES
  ('2026-01-10 14:00:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-10 15:30:00+01'::TIMESTAMPTZ,  3.8),
  ('2026-01-10 17:00:00+01'::TIMESTAMPTZ,  3.9),
  ('2026-01-10 18:30:00+01'::TIMESTAMPTZ,  4.2),
  ('2026-01-10 20:00:00+01'::TIMESTAMPTZ,  4.0),
  ('2026-01-10 21:30:00+01'::TIMESTAMPTZ,  4.3),
  ('2026-01-10 23:00:00+01'::TIMESTAMPTZ, 14.1),
  ('2026-01-11 00:30:00+01'::TIMESTAMPTZ,  6.2),
  ('2026-01-11 02:00:00+01'::TIMESTAMPTZ,  4.5),
  ('2026-01-11 03:30:00+01'::TIMESTAMPTZ,  3.9),
  ('2026-01-11 05:00:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-11 06:30:00+01'::TIMESTAMPTZ,  3.8)
) AS t(ts, celsius)
WHERE e.from_node_id = 'e1000000-0000-0000-0000-000000000001'
  AND e.to_node_id   = 'e1000000-0000-0000-0000-000000000003';

-- Edge B: mostly 4 °C with a spike to 16 °C mid-evening (longer route, minor cold chain break)
INSERT INTO cooling_chain_readings (edge_id, recorded_at, celsius)
SELECT e.id, ts, celsius FROM supply_chain_edges e
CROSS JOIN (VALUES
  ('2026-01-10 15:00:00+01'::TIMESTAMPTZ,  4.0),
  ('2026-01-10 16:30:00+01'::TIMESTAMPTZ,  4.2),
  ('2026-01-10 18:00:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-10 19:30:00+01'::TIMESTAMPTZ, 16.3),
  ('2026-01-10 21:00:00+01'::TIMESTAMPTZ,  7.8),
  ('2026-01-10 22:30:00+01'::TIMESTAMPTZ,  4.4),
  ('2026-01-11 00:00:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-11 01:30:00+01'::TIMESTAMPTZ,  3.9),
  ('2026-01-11 03:00:00+01'::TIMESTAMPTZ,  4.0),
  ('2026-01-11 04:30:00+01'::TIMESTAMPTZ,  4.2),
  ('2026-01-11 06:00:00+01'::TIMESTAMPTZ,  3.8),
  ('2026-01-11 07:30:00+01'::TIMESTAMPTZ,  4.0)
) AS t(ts, celsius)
WHERE e.from_node_id = 'e1000000-0000-0000-0000-000000000002'
  AND e.to_node_id   = 'e1000000-0000-0000-0000-000000000003';

-- Edge C: clean cold chain 3–5 °C throughout
INSERT INTO cooling_chain_readings (edge_id, recorded_at, celsius)
SELECT e.id, ts, celsius FROM supply_chain_edges e
CROSS JOIN (VALUES
  ('2026-01-11 16:00:00+01'::TIMESTAMPTZ,  3.9),
  ('2026-01-11 17:10:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-11 18:20:00+01'::TIMESTAMPTZ,  4.0),
  ('2026-01-11 19:30:00+01'::TIMESTAMPTZ,  3.8),
  ('2026-01-11 20:40:00+01'::TIMESTAMPTZ,  4.2),
  ('2026-01-11 21:50:00+01'::TIMESTAMPTZ,  4.1),
  ('2026-01-11 23:00:00+01'::TIMESTAMPTZ,  3.9),
  ('2026-01-12 00:10:00+01'::TIMESTAMPTZ,  4.0),
  ('2026-01-12 01:20:00+01'::TIMESTAMPTZ,  4.3),
  ('2026-01-12 02:30:00+01'::TIMESTAMPTZ,  4.1)
) AS t(ts, celsius)
WHERE e.from_node_id = 'e1000000-0000-0000-0000-000000000003'
  AND e.to_node_id   = 'e1000000-0000-0000-0000-000000000004';

-- Edge D: mostly 4–6 °C, spike to 12 °C at unloading
INSERT INTO cooling_chain_readings (edge_id, recorded_at, celsius)
SELECT e.id, ts, celsius FROM supply_chain_edges e
CROSS JOIN (VALUES
  ('2026-01-12 10:00:00+01'::TIMESTAMPTZ,  4.2),
  ('2026-01-12 10:24:00+01'::TIMESTAMPTZ,  4.5),
  ('2026-01-12 10:48:00+01'::TIMESTAMPTZ,  4.3),
  ('2026-01-12 11:12:00+01'::TIMESTAMPTZ,  4.8),
  ('2026-01-12 11:36:00+01'::TIMESTAMPTZ,  5.1),
  ('2026-01-12 12:00:00+01'::TIMESTAMPTZ,  5.4),
  ('2026-01-12 12:24:00+01'::TIMESTAMPTZ,  5.7),
  ('2026-01-12 12:48:00+01'::TIMESTAMPTZ,  6.1),
  ('2026-01-12 13:12:00+01'::TIMESTAMPTZ, 12.3),
  ('2026-01-12 13:36:00+01'::TIMESTAMPTZ,  8.5)
) AS t(ts, celsius)
WHERE e.from_node_id = 'e1000000-0000-0000-0000-000000000004'
  AND e.to_node_id   = 'e1000000-0000-0000-0000-000000000005';
