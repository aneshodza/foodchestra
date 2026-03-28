import { useEffect, useState } from 'react';
import { client } from '@foodchestra/sdk';
import type { SupplyChain } from '@foodchestra/sdk';
import { haversineKm } from '../utils/haversine';
import GlassBlock from './shared/GlassBlock';
import './EcologicalFootprint.scss';

// Approximate road-freight average for a grocery item (~500 g product in a shared load).
// Basis: 0.1 kg CO₂ per tonne-km × ~0.0021 tonne average product weight.
const CO2_KG_PER_KM = 0.00021;

interface FootprintRating {
  label: string;
  modifier: string;
  icon: string;
}

function getRating(km: number): FootprintRating {
  if (km < 100)  return { label: 'Local',         modifier: 'local',         icon: 'home_pin' };
  if (km < 500)  return { label: 'Regional',       modifier: 'regional',      icon: 'near_me' };
  if (km < 2000) return { label: 'National',       modifier: 'national',      icon: 'map' };
  return          { label: 'International',        modifier: 'international', icon: 'flight' };
}

function computeFootprint(chain: SupplyChain): { totalKm: number; edgeCount: number } {
  const nodesById = new Map(chain.nodes.map((n) => [n.id, n]));
  let totalKm = 0;
  let edgeCount = 0;

  for (const edge of chain.edges) {
    const from = nodesById.get(edge.fromNodeId);
    const to   = nodesById.get(edge.toNodeId);
    if (!from || !to) continue;
    totalKm += haversineKm(
      from.location.latitude,  from.location.longitude,
      to.location.latitude,    to.location.longitude,
    );
    edgeCount++;
  }

  return { totalKm, edgeCount };
}

interface Props {
  barcode: string;
  batchNumber: string;
}

const EcologicalFootprint = ({ barcode, batchNumber }: Props) => {
  const [result, setResult]   = useState<{ totalKm: number; edgeCount: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setResult(null);

    (async () => {
      try {
        const batches = await client.batches.getByBatchNumber(batchNumber, barcode);
        const batch = batches[0];
        if (!batch) { if (!cancelled) setFailed(true); return; }

        const chain = await client.batches.getSupplyChain(batch.id);
        if (!cancelled) setResult(computeFootprint(chain));
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [barcode, batchNumber]);

  if (loading) {
    return (
      <GlassBlock className="ecological-footprint">
        <div className="ecological-footprint__header">
          <span className="material-icons">eco</span>
          <span>Ecological Footprint</span>
          <div className="ecological-footprint__spinner" role="status">
            <span className="sr-only">Loading…</span>
          </div>
        </div>
        <div className="ecological-footprint__empty">
          Calculating transport distance…
        </div>
      </GlassBlock>
    );
  }

  if (failed || !result) {
    return (
      <GlassBlock className="ecological-footprint">
        <div className="ecological-footprint__header">
          <span className="material-icons">eco</span>
          <span>Ecological Footprint</span>
        </div>
        <div className="ecological-footprint__empty">
          <span className="material-icons">cloud_off</span>
          Supply chain data unavailable for this batch.
        </div>
      </GlassBlock>
    );
  }

  const { totalKm, edgeCount } = result;
  const co2Kg    = totalKm * CO2_KG_PER_KM;
  const co2Label = co2Kg < 0.1
    ? `${(co2Kg * 1000).toFixed(0)} g`
    : `${co2Kg.toFixed(2)} kg`;
  const rating   = getRating(totalKm);

  return (
    <GlassBlock className="ecological-footprint">
      <div className="ecological-footprint__header">
        <span className="material-icons">eco</span>
        <span>Ecological Footprint</span>
        <span className={`ecological-footprint__badge ecological-footprint__badge--${rating.modifier}`}>
          <span className="material-icons">{rating.icon}</span>
          {rating.label}
        </span>
      </div>
      <div className="ecological-footprint__body">
        <div className="ecological-footprint__stats">
          <div className="ecological-footprint__stat">
            <p className="ecological-footprint__stat-value">
              {Math.round(totalKm).toLocaleString()}
            </p>
            <p className="ecological-footprint__stat-label">km travelled</p>
          </div>
          <div className="ecological-footprint__stat">
            <p className="ecological-footprint__stat-value ecological-footprint__stat-value--co2">
              {co2Label}
            </p>
            <p className="ecological-footprint__stat-label">CO₂ equivalent</p>
          </div>
        </div>
        <p className="ecological-footprint__disclaimer">
          Across {edgeCount} transport {edgeCount === 1 ? 'leg' : 'legs'}.
          CO₂ estimate uses a road-freight average of {(CO2_KG_PER_KM * 1000).toFixed(2)} g/km.
        </p>
      </div>
    </GlassBlock>
  );
};

export default EcologicalFootprint;
