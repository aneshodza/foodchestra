import { describe, it, expect } from 'vitest';
import { looksLikeBarcode } from '../utils/barcode';

describe('looksLikeBarcode', () => {
  it('accepts a 7-digit string (minimum length)', () => {
    expect(looksLikeBarcode('1234567')).toBe(true);
  });

  it('accepts a valid EAN-8 (8 digits)', () => {
    expect(looksLikeBarcode('12345678')).toBe(true);
  });

  it('accepts a valid UPC-A (12 digits)', () => {
    expect(looksLikeBarcode('012345678905')).toBe(true);
  });

  it('accepts a valid EAN-13 (13 digits)', () => {
    expect(looksLikeBarcode('4006381333931')).toBe(true);
  });

  it('rejects a 6-digit string (too short)', () => {
    expect(looksLikeBarcode('123456')).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(looksLikeBarcode('')).toBe(false);
  });

  it('rejects a string with letters', () => {
    expect(looksLikeBarcode('ABCDEFG')).toBe(false);
  });

  it('rejects an alphanumeric string', () => {
    expect(looksLikeBarcode('1234ABC')).toBe(false);
  });

  it('rejects a URL', () => {
    expect(looksLikeBarcode('https://example.com/product/123')).toBe(false);
  });

  it('rejects a string with leading whitespace', () => {
    expect(looksLikeBarcode(' 12345678')).toBe(false);
  });

  it('rejects a string with a decimal point', () => {
    expect(looksLikeBarcode('1234567.8')).toBe(false);
  });
});
