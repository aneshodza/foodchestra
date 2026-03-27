import { fetchAllRecalls, type RecallSwissEntry, RECALLSWISS_DEFAULT_BASE } from '@foodchestra/sdk';
import { upsertRecalls, type RecallRow } from '../repositories/recalls.repository';

const RECALLS_BASE = process.env['RECALLSWISS_BASE_URL'] || RECALLSWISS_DEFAULT_BASE;

function toRow(entry: RecallSwissEntry): RecallRow {
  return {
    id: entry.id,
    header_de: entry.headerDe ?? null,
    header_fr: entry.headerFr ?? null,
    header_it: entry.headerIt ?? null,
    description_de: entry.descriptionDe ?? null,
    description_fr: entry.descriptionFr ?? null,
    description_it: entry.descriptionIt ?? null,
    meta_de: entry.metaDe ?? null,
    image_url_de: entry.image?.urlDe ?? null,
    authority_code_de: entry.marktaufsichtsbehoerde?.kuerzelDe ?? null,
    authority_name_de: entry.marktaufsichtsbehoerde?.nameDe ?? null,
  };
}

export async function fetchAndStoreRecalls(): Promise<{ stored: number }> {
  const entries = await fetchAllRecalls(RECALLS_BASE);
  const rows = entries.map(toRow);
  await upsertRecalls(rows);
  return { stored: rows.length };
}
