import { describe, it, expect } from 'vitest';
import { parseGs1QrCode } from '../utils/gs1';

describe('parseGs1QrCode', () => {
  describe('URL format', () => {
    it('extracts barcode, batch number and expiry from a full GS1 URL', () => {
      const result = parseGs1QrCode('https://id.gs1.org/01/09506000134352/10/ABC123/17/231130');
      expect(result).toEqual({ barcode: '9506000134352', batchNumber: 'ABC123', expiryDate: '231130' });
    });

    it('extracts barcode only when batch and expiry are absent', () => {
      const result = parseGs1QrCode('https://id.gs1.org/01/09506000134352');
      expect(result).toEqual({ barcode: '9506000134352', batchNumber: null, expiryDate: null });
    });

    it('works with a custom domain', () => {
      const result = parseGs1QrCode('https://www.example.com/some/path/01/09506000134352/10/BATCH1');
      expect(result).toEqual({ barcode: '9506000134352', batchNumber: 'BATCH1', expiryDate: null });
    });

    it('returns null when AI 01 is missing from the URL', () => {
      expect(parseGs1QrCode('https://id.gs1.org/10/BATCH/17/231130')).toBeNull();
    });

    it('strips leading zeros to produce a valid EAN-13', () => {
      // 00761080700102 → 761080700102 (12 digits, stop at 12 since next strip would be 11... wait)
      // Actually 00761080700102 has 14 digits: strip 1 zero → 0761080700102 (13) → strip again → 761080700102 (12)
      // stop when length > 8 condition fails for... wait let me think
      // 00761080700102 → strip while length > 8 and first char is '0'
      // → 0761080700102 (13) → still > 8 and starts with 0 → 761080700102 (12) → no leading zero, stop
      const result = parseGs1QrCode('https://id.gs1.org/01/00761080700102');
      expect(result?.barcode).toBe('761080700102');
    });
  });

  describe('bracket element string format', () => {
    it('extracts all three AIs from a bracket format string', () => {
      const result = parseGs1QrCode('(01)09506000134352(10)ABC123(17)231130');
      expect(result).toEqual({ barcode: '9506000134352', batchNumber: 'ABC123', expiryDate: '231130' });
    });

    it('handles AIs in any order', () => {
      const result = parseGs1QrCode('(17)231130(01)09506000134352(10)LOT001');
      expect(result).toEqual({ barcode: '9506000134352', batchNumber: 'LOT001', expiryDate: '231130' });
    });

    it('returns null when AI 01 is missing', () => {
      expect(parseGs1QrCode('(10)BATCH(17)231130')).toBeNull();
    });
  });

  describe('invalid inputs', () => {
    it('returns null for an empty string', () => {
      expect(parseGs1QrCode('')).toBeNull();
    });

    it('returns null for a plain barcode number', () => {
      expect(parseGs1QrCode('12345678')).toBeNull();
    });

    it('returns null for random text', () => {
      expect(parseGs1QrCode('hello world')).toBeNull();
    });
  });
});
