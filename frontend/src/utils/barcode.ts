export function looksLikeBarcode(text: string): boolean {
  return /^\d{7,}$/.test(text);
}
