export interface Recall {
  id: number;
  headerDe: string | null;
  headerFr: string | null;
  headerIt: string | null;
  descriptionDe: string | null;
  descriptionFr: string | null;
  descriptionIt: string | null;
  metaDe: string | null;
  imageUrlDe: string | null;
  authorityCodeDe: string | null;
  authorityNameDe: string | null;
}

export interface RecallsResponse {
  recalls: Recall[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductRecallsResponse {
  recalls: Recall[];
}
