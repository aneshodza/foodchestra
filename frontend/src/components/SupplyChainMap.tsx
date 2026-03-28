import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet-arrowheads';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import type { LatLngBoundsExpression, LatLngTuple } from 'leaflet';
import { client } from '@foodchestra/sdk';
import type {
  SupplyChain,
  SupplyChainNode,
  CoolingChainEdgeData,
  CoolingChainReading,
} from '@foodchestra/sdk';
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

function ArrowPolyline({ positions, onClick }: { positions: LatLngTuple[]; onClick: () => void }) {
  const map = useMap();
  // Use a ref so the click handler is always fresh without being a useEffect dep.
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;

  useEffect(() => {
    const line = L.polyline(positions, { color: POLYLINE_COLOUR, weight: 3, opacity: 0.85 }).arrowheads({
      size: '12px',
      frequency: 'endonly',
      fill: true,
      yawn: 40,
    });
    line.on('click', () => onClickRef.current());
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

function formatChartTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface EdgePopupProps {
  fromNode: SupplyChainNode;
  toNode: SupplyChainNode;
  readings: CoolingChainReading[];
  onClose: () => void;
}

function EdgePopup({ fromNode, toNode, readings, onClose }: EdgePopupProps) {
  const midpoint: LatLngTuple = [
    (fromNode.location.latitude + toNode.location.latitude) / 2,
    (fromNode.location.longitude + toNode.location.longitude) / 2,
  ];

  const chartData = readings.map((r) => ({
    time: new Date(r.recordedAt).getTime(),
    celsius: r.celsius,
  }));

  return (
    <Popup
      position={midpoint}
      maxWidth={280}
      eventHandlers={{ remove: onClose }}
    >
      <div className="supply-chain-map__edge-popup">
        <p className="supply-chain-map__edge-popup-route">
          {fromNode.location.party.name}
          <span className="material-icons supply-chain-map__edge-popup-arrow">arrow_forward</span>
          {toNode.location.party.name}
        </p>
        {readings.length === 0 ? (
          <p className="supply-chain-map__popup-detail">No temperature data available.</p>
        ) : (
          <LineChart width={256} height={128} data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
            <XAxis
              dataKey="time"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickCount={4}
              tickFormatter={formatChartTime}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              unit="°"
              width={32}
              tick={{ fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              labelFormatter={(t) =>
                new Date(t as number).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              }
              formatter={(val) => [`${val}°C`, 'Temp']}
            />
            <Line
              type="monotone"
              dataKey="celsius"
              stroke={POLYLINE_COLOUR}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        )}
      </div>
    </Popup>
  );
}

interface SelectedEdge {
  fromNode: SupplyChainNode;
  toNode: SupplyChainNode;
  data: CoolingChainEdgeData | undefined;
}

export default function SupplyChainMap({ batchNumber, barcode }: SupplyChainMapProps) {
  const [supplyChain, setSupplyChain] = useState<SupplyChain | null>(null);
  const [coolingByEdge, setCoolingByEdge] = useState<Map<string, CoolingChainEdgeData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openPopupId, setOpenPopupId] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<SelectedEdge | null>(null);

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

        const [chainResult, coolingResult] = await Promise.allSettled([
          client.batches.getSupplyChain(batches[0].id),
          client.coolingChain.getCoolingChain(batchNumber, barcode),
        ]);
        if (cancelled) return;

        if (chainResult.status === 'rejected') {
          setError('Failed to load supply chain data.');
          setLoading(false);
          return;
        }

        const chain = chainResult.value;
        const cooling = coolingResult.status === 'fulfilled' ? coolingResult.value : [];

        const edgeMap = new Map<string, CoolingChainEdgeData>(
          cooling.map((c) => [`${c.fromNodeId}:${c.toNodeId}`, c]),
        );

        setSupplyChain(chain);
        setCoolingByEdge(edgeMap);
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

        {supplyChain.edges.map((edge, i) => {
          const from = nodeById.get(edge.fromNodeId);
          const to = nodeById.get(edge.toNodeId);
          if (!from || !to) return null;
          return (
            <ArrowPolyline
              key={i}
              positions={[
                [from.location.latitude, from.location.longitude],
                [to.location.latitude, to.location.longitude],
              ]}
              onClick={() =>
                setSelectedEdge({
                  fromNode: from,
                  toNode: to,
                  data: coolingByEdge.get(`${edge.fromNodeId}:${edge.toNodeId}`),
                })
              }
            />
          );
        })}

        {selectedEdge && (
          <EdgePopup
            fromNode={selectedEdge.fromNode}
            toNode={selectedEdge.toNode}
            readings={selectedEdge.data?.readings ?? []}
            onClose={() => setSelectedEdge(null)}
          />
        )}
      </MapContainer>
    </div>
  );
}
