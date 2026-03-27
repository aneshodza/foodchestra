import { isValidBarcode } from '../utils/barcode';

describe('isValidBarcode', () => {
  it('accepts a valid EAN-13', () => {
    expect(isValidBarcode('5901234123457')).toBe(true);
  });

  it('accepts a valid EAN-8', () => {
    expect(isValidBarcode('12345678')).toBe(true);
  });

  it('accepts a valid UPC-A (12 digits)', () => {
    expect(isValidBarcode('012345678905')).toBe(true);
  });

  it('accepts 4-digit minimum', () => {
    expect(isValidBarcode('1234')).toBe(true);
  });

  it('accepts 14-digit maximum', () => {
    expect(isValidBarcode('12345678901234')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidBarcode('')).toBe(false);
  });

  it('rejects fewer than 4 digits', () => {
    expect(isValidBarcode('123')).toBe(false);
  });

  it('rejects more than 14 digits', () => {
    expect(isValidBarcode('123456789012345')).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(isValidBarcode('1234567A90123')).toBe(false);
  });

  it('rejects a barcode with spaces', () => {
    expect(isValidBarcode('1234 567890123')).toBe(false);
  });
});
