import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-arrowheads';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { client } from '@foodchestra/sdk';
import type { SupplyChain, SupplyChainNode } from '@foodchestra/sdk';
import type { PartyType } from '@foodchestra/sdk';
import './SupplyChainMap.scss';

// Matches $colour-danger in _colours.scss
const POLYLINE_COLOUR = '#dc3545';

const PARTY_TYPE_ICONS: Record<PartyType, string> = {
  farmer: 'agriculture',
  processor: 'factory',
  distributor: 'local_shipping',
  warehouse: 'warehouse',
  retailer: 'storefront',
};

function createMarkerIcon(partyType: PartyType, isFinal: boolean, isActive: boolean): L.DivIcon {
  const iconName = PARTY_TYPE_ICONS[partyType] || 'place';
  const dimClass = isFinal || isActive ? '' : ' supply-chain-map__marker--dim';
  return L.divIcon({
    className: '',
    html: `<div class="supply-chain-map__marker supply-chain-map__marker--${partyType}${dimClass}">
             <span class="material-icons">${iconName}</span>
           </div>`,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -46],
  });
}

function ArrowPolyline({ positions }: { positions: LatLngTuple[] }) {
  const map = useMap();

  useEffect(() => {
    const line = L.polyline(positions, { color: POLYLINE_COLOUR, weight: 3, opacity: 0.85 }).arrowheads({
      size: '12px',
      frequency: 'endonly',
      fill: true,
      yawn: 40,
    });
    line.addTo(map);
    return () => {
      line.remove();
    };
  }, [map, positions]);

  return null;
}

interface SupplyChainMapProps {
  batchNumber: string;
  barcode: string;
}

function BoundsFitter({ nodes }: { nodes: SupplyChainNode[] }) {
  const map = useMap();

  useEffect(() => {
    if (nodes.length === 0) return;
    const bounds: LatLngBoundsExpression = nodes.map(
      (n) => [n.location.latitude, n.location.longitude] as LatLngTuple,
    );
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, nodes]);

  return null;
}

function formatTimestamp(ts: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SupplyChainMap({ batchNumber, barcode }: SupplyChainMapProps) {
  const [supplyChain, setSupplyChain] = useState<SupplyChain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const batches = await client.batches.getByBatchNumber(batchNumber, barcode);
        if (cancelled) return;

        if (batches.length === 0) {
          setError('No batch found for this product and batch number.');
          setLoading(false);
          return;
        }

        const chain = await client.batches.getSupplyChain(batches[0].id);
        if (cancelled) return;

        setSupplyChain(chain);
      } catch {
        if (!cancelled) setError('Failed to load supply chain data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [batchNumber, barcode]);

  if (loading) {
    return (
      <div className="supply-chain-map__status">
        <div className="spinner-border text-secondary" role="status">
          <span className="visually-hidden">Loading supply chain…</span>
        </div>
      </div>
    );
  }

  if (error || !supplyChain) {
    return (
      <div className="supply-chain-map__status">
        <div className="alert alert-warning mb-0" role="alert">
          {error || 'No supply chain data available.'}
        </div>
      </div>
    );
  }

  const nodeById = new Map(supplyChain.nodes.map((n) => [n.id, n]));
  const fromNodeIds = new Set(supplyChain.edges.map((e) => e.fromNodeId));

  const polylines = supplyChain.edges
    .map((edge) => {
      const from = nodeById.get(edge.fromNodeId);
      const to = nodeById.get(edge.toNodeId);
      if (!from || !to) return null;
      return [
        [from.location.latitude, from.location.longitude] as LatLngTuple,
        [to.location.latitude, to.location.longitude] as LatLngTuple,
      ];
    })
    .filter((line): line is LatLngTuple[] => line !== null);

  // Default centre on Switzerland if no nodes
  const defaultCenter: LatLngTuple = [46.8182, 8.2275];

  return (
    <div className="supply-chain-map__container">
      <MapContainer
        center={defaultCenter}
        zoom={7}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <BoundsFitter nodes={supplyChain.nodes} />

        {supplyChain.nodes.map((node) => (
          <Marker
            key={node.id}
            position={[node.location.latitude, node.location.longitude]}
            icon={createMarkerIcon(node.location.party.type, !fromNodeIds.has(node.id), openPopupId === node.id)}
            eventHandlers={{
              popupopen: () => setOpenPopupId(node.id),
              popupclose: () => setOpenPopupId(null),
            }}
          >
            <Popup>
              <strong>{node.location.party.name}</strong>
              <span className="supply-chain-map__popup-party-type">
                {node.location.party.type}
              </span>
              {node.location.label && (
                <p className="supply-chain-map__popup-detail">{node.location.label}</p>
              )}
              {node.location.address && (
                <p className="supply-chain-map__popup-detail">{node.location.address}</p>
              )}
              {node.label && (
                <p className="supply-chain-map__popup-detail">
                  <em>{node.label}</em>
                </p>
              )}
              <p className="supply-chain-map__popup-detail">
                Arrived: {formatTimestamp(node.arrivedAt)}
              </p>
              <p className="supply-chain-map__popup-detail">
                Departed: {formatTimestamp(node.departedAt)}
              </p>
            </Popup>
          </Marker>
        ))}

        {polylines.map((positions, i) => (
          <ArrowPolyline key={i} positions={positions} />
        ))}
      </MapContainer>
    </div>
  );
}
