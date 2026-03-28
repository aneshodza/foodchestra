import { haversineKm } from '../utils/haversine';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(47.376, 8.541, 47.376, 8.541)).toBe(0);
  });

  it('calculates Zurich → Bern (~95 km)', () => {
    const km = haversineKm(47.376, 8.541, 46.948, 7.449);
    expect(km).toBeGreaterThan(90);
    expect(km).toBeLessThan(100);
  });

  it('calculates Zurich → London (~778 km air distance)', () => {
    const km = haversineKm(47.376, 8.541, 51.507, -0.128);
    expect(km).toBeGreaterThan(750);
    expect(km).toBeLessThan(810);
  });

  it('is symmetric (A→B equals B→A)', () => {
    const ab = haversineKm(47.376, 8.541, 46.948, 7.449);
    const ba = haversineKm(46.948, 7.449, 47.376, 8.541);
    expect(ab).toBeCloseTo(ba, 5);
  });
});
