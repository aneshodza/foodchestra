export interface Gs1ScanData {
  barcode: string;
  batchNumber: string | null;
  expiryDate: string | null;
}

function normaliseGtin(raw: string): string | null {
  if (!/^\d+$/.test(raw)) return null;
  const padded = raw.padStart(14, '0');
  let barcode = padded;
  while (barcode.length > 8 && barcode[0] === '0') {
    barcode = barcode.slice(1);
  }
  // Must meet the same 7+ digit threshold as looksLikeBarcode
  return barcode.length >= 7 ? barcode : null;
}

function buildResult(ais: Map<string, string>): Gs1ScanData | null {
  const rawGtin = ais.get('01');
  if (!rawGtin) return null;
  const barcode = normaliseGtin(rawGtin);
  if (!barcode) return null;
  return {
    barcode,
    batchNumber: ais.get('10') ?? null,
    expiryDate: ais.get('17') ?? null,
  };
}

export function parseGs1QrCode(input: string): Gs1ScanData | null {
  if (!input) return null;

  // URL format: https://id.gs1.org/01/09506000134352/10/ABC123/17/231130
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const url = new URL(input);
      const segments = url.pathname.split('/').filter(Boolean);
      const ais = new Map<string, string>();
      for (let i = 0; i + 1 < segments.length; i += 2) {
        const ai = segments[i];
        const value = segments[i + 1];
        if (/^\d{2,4}$/.test(ai)) {
          ais.set(ai, decodeURIComponent(value));
        }
      }
      return buildResult(ais);
    } catch {
      return null;
    }
  }

  // Bracket element string format: (01)09506000134352(10)ABC123(17)231130
  if (input.includes('(')) {
    const ais = new Map<string, string>();
    const regex = /\((\d{2,4})\)([^(]+)/g;
    let match;
    while ((match = regex.exec(input)) !== null) {
      ais.set(match[1], match[2].trim());
    }
    if (ais.size === 0) return null;
    return buildResult(ais);
  }

  return null;
}
