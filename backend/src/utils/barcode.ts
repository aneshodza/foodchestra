/**
 * Returns true for numeric strings of 4–14 digits, covering EAN-8, EAN-13, and UPC-A.
 */
export function isValidBarcode(barcode: string): boolean {
  return /^\d{4,14}$/.test(barcode);
}
