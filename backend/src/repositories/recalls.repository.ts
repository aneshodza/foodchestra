import { pool } from '../db';

export interface RecallRow {
  id: number;
  header_de: string | null;
  header_fr: string | null;
  header_it: string | null;
  description_de: string | null;
  description_fr: string | null;
  description_it: string | null;
  meta_de: string | null;
  image_url_de: string | null;
  authority_code_de: string | null;
  authority_name_de: string | null;
}

export async function upsertRecalls(recalls: RecallRow[]): Promise<void> {
  if (recalls.length === 0) return;

  const values: unknown[] = [];
  const placeholders = recalls.map((r, i) => {
    const base = i * 11;
    values.push(
      r.id,
      r.header_de,
      r.header_fr,
      r.header_it,
      r.description_de,
      r.description_fr,
      r.description_it,
      r.meta_de,
      r.image_url_de,
      r.authority_code_de,
      r.authority_name_de,
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10},$${base + 11},NOW())`;
  });

  await pool.query(
    `INSERT INTO recalls
       (id, header_de, header_fr, header_it, description_de, description_fr, description_it,
        meta_de, image_url_de, authority_code_de, authority_name_de, fetched_at)
     VALUES ${placeholders.join(',')}
     ON CONFLICT (id) DO UPDATE SET
       header_de        = EXCLUDED.header_de,
       header_fr        = EXCLUDED.header_fr,
       header_it        = EXCLUDED.header_it,
       description_de   = EXCLUDED.description_de,
       description_fr   = EXCLUDED.description_fr,
       description_it   = EXCLUDED.description_it,
       meta_de          = EXCLUDED.meta_de,
       image_url_de     = EXCLUDED.image_url_de,
       authority_code_de= EXCLUDED.authority_code_de,
       authority_name_de= EXCLUDED.authority_name_de,
       fetched_at       = EXCLUDED.fetched_at`,
    values,
  );
}

export async function getRecalls(page: number, pageSize: number): Promise<{ rows: RecallRow[]; total: number }> {
  const offset = (page - 1) * pageSize;

  const [dataResult, countResult] = await Promise.all([
    pool.query<RecallRow>(
      `SELECT id, header_de, header_fr, header_it, description_de, description_fr, description_it,
              meta_de, image_url_de, authority_code_de, authority_name_de
       FROM recalls
       ORDER BY id DESC
       LIMIT $1 OFFSET $2`,
      [pageSize, offset],
    ),
    pool.query<{ count: string }>('SELECT COUNT(*) AS count FROM recalls'),
  ]);

  return {
    rows: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count ?? '0', 10),
  };
}
