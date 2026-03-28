import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import SupplyChainMap from '../components/SupplyChainMap';

const { mockPolylineInstance, mockFitBounds } = vi.hoisted(() => {
  const mockPolylineInstance = {
    arrowheads: vi.fn().mockReturnThis(),
    addTo: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return { mockPolylineInstance, mockFitBounds: vi.fn() };
});

vi.mock('leaflet', () => ({
  default: {
    divIcon: vi.fn(() => ({})),
    polyline: vi.fn(() => mockPolylineInstance),
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: React.PropsWithChildren) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => null,
  Marker: ({ children }: React.PropsWithChildren<Record<string, unknown>>) => (
    <div data-testid="map-marker">{children}</div>
  ),
  Popup: ({ children }: React.PropsWithChildren) => (
    <div data-testid="map-popup">{children}</div>
  ),
  useMap: () => ({ fitBounds: mockFitBounds }),
}));

vi.mock('leaflet-arrowheads', () => ({}));

vi.mock('@foodchestra/sdk', () => ({
  client: {
    batches: {
      getByBatchNumber: vi.fn(),
      getSupplyChain: vi.fn(),
    },
  },
}));

const sampleBatch = {
  id: 'batch-1',
  product_barcode: '7610800749004',
  batch_number: 'LOT-2026-JW-042',
  created_at: '2026-01-01T00:00:00Z',
};

const nodeA = {
  id: 'node-a',
  label: 'Wheat harvest',
  arrived_at: '2026-01-10T05:00:00Z',
  departed_at: '2026-01-10T13:00:00Z',
  location: {
    id: 'loc-a',
    party_id: 'party-a',
    label: 'Hof Erlinsbach',
    latitude: 47.4167,
    longitude: 7.9333,
    address: 'Hofstrasse 12, 5018 Erlinsbach',
    created_at: '2026-01-01T00:00:00Z',
    party: { id: 'party-a', name: 'Bio-Hof Müller', type: 'farmer', created_at: '2026-01-01T00:00:00Z' },
  },
};

const nodeB = {
  id: 'node-b',
  label: null,
  arrived_at: '2026-01-11T08:00:00Z',
  departed_at: null,
  location: {
    id: 'loc-b',
    party_id: 'party-b',
    label: 'Jowa Volketswil',
    latitude: 47.3833,
    longitude: 8.7,
    address: null,
    created_at: '2026-01-01T00:00:00Z',
    party: { id: 'party-b', name: 'Jowa AG', type: 'processor', created_at: '2026-01-01T00:00:00Z' },
  },
};

const sampleSupplyChain = {
  id: 'sc-1',
  batch_id: 'batch-1',
  created_at: '2026-01-01T00:00:00Z',
  nodes: [nodeA, nodeB],
  edges: [{ from_node_id: 'node-a', to_node_id: 'node-b' }],
};

async function setupMocks(batches = [sampleBatch], supplyChain = sampleSupplyChain) {
  const { client } = await import('@foodchestra/sdk');
  (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockResolvedValue(batches);
  (client.batches.getSupplyChain as ReturnType<typeof vi.fn>).mockResolvedValue(supplyChain);
  return client;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('SupplyChainMap', () => {
  describe('loading state', () => {
    it('shows a spinner while fetching data', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    });
  });

  describe('error states', () => {
    it('shows an error when no batch matches the barcode and batch number', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      render(<SupplyChainMap barcode="9999999" batchNumber="UNKNOWN" />);

      await waitFor(() => {
        expect(screen.getByText('No batch found for this product and batch number.')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
    });

    it('shows a generic error when the API throws', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load supply chain data.')).toBeInTheDocument();
      });
    });

    it('shows a generic error when getSupplyChain throws', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockResolvedValue([sampleBatch]);
      (client.batches.getSupplyChain as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('DB error'));

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load supply chain data.')).toBeInTheDocument();
      });
    });
  });

  describe('successful render', () => {
    it('renders the map container after data loads', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
    });

    it('renders one marker per supply chain node', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getAllByTestId('map-marker')).toHaveLength(2);
      });
    });

    it('shows party names inside popups', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Bio-Hof Müller')).toBeInTheDocument();
        expect(screen.getByText('Jowa AG')).toBeInTheDocument();
      });
    });

    it('shows party types inside popups', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('farmer')).toBeInTheDocument();
        expect(screen.getByText('processor')).toBeInTheDocument();
      });
    });

    it('shows location labels inside popups', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Hof Erlinsbach')).toBeInTheDocument();
        expect(screen.getByText('Jowa Volketswil')).toBeInTheDocument();
      });
    });

    it('shows address when present and omits it when null', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Hofstrasse 12, 5018 Erlinsbach')).toBeInTheDocument();
      });
    });

    it('shows node label when present and omits it when null', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText('Wheat harvest')).toBeInTheDocument();
      });
    });

    it('shows a dash for missing departed_at', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByText(/Departed:.*—/)).toBeInTheDocument();
      });
    });

    it('calls fitBounds with all node coordinates', async () => {
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(mockFitBounds).toHaveBeenCalledWith(
          expect.arrayContaining([
            [nodeA.location.latitude, nodeA.location.longitude],
            [nodeB.location.latitude, nodeB.location.longitude],
          ]),
          expect.any(Object),
        );
      });
    });

    it('creates a polyline for each edge', async () => {
      const L = (await import('leaflet')).default;
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(L.polyline).toHaveBeenCalledTimes(1);
        expect(L.polyline).toHaveBeenCalledWith(
          [
            [nodeA.location.latitude, nodeA.location.longitude],
            [nodeB.location.latitude, nodeB.location.longitude],
          ],
          expect.objectContaining({ color: '#dc3545' }),
        );
      });
    });

    it('does not create polylines when there are no edges', async () => {
      const L = (await import('leaflet')).default;
      const { client } = await import('@foodchestra/sdk');
      (client.batches.getByBatchNumber as ReturnType<typeof vi.fn>).mockResolvedValue([sampleBatch]);
      (client.batches.getSupplyChain as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...sampleSupplyChain,
        edges: [],
      });

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });
      expect(L.polyline).not.toHaveBeenCalled();
    });

    it('creates divIcons with the correct party type class', async () => {
      const L = (await import('leaflet')).default;
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(L.divIcon).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('supply-chain-map__marker--farmer'),
          }),
        );
        expect(L.divIcon).toHaveBeenCalledWith(
          expect.objectContaining({
            html: expect.stringContaining('supply-chain-map__marker--processor'),
          }),
        );
      });
    });

    it('applies dim class to non-final nodes and not to the final node', async () => {
      const L = (await import('leaflet')).default;
      await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        const calls = (L.divIcon as ReturnType<typeof vi.fn>).mock.calls.map(
          (args: unknown[]) => (args[0] as { html: string }).html,
        );
        const farmerCall = calls.find((h: string) => h.includes('marker--farmer'));
        const processorCall = calls.find((h: string) => h.includes('marker--processor'));
        // nodeA (farmer) has an outgoing edge → dim
        expect(farmerCall).toContain('marker--dim');
        // nodeB (processor) has no outgoing edge → final, not dim
        expect(processorCall).not.toContain('marker--dim');
      });
    });
  });

  describe('cleanup', () => {
    it('removes polylines when the component unmounts', async () => {
      await setupMocks();

      const { unmount } = render(
        <SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />,
      );

      await waitFor(() => {
        expect(screen.getByTestId('map-container')).toBeInTheDocument();
      });

      unmount();
      expect(mockPolylineInstance.remove).toHaveBeenCalled();
    });
  });

  describe('API calls', () => {
    it('calls getByBatchNumber with the correct barcode and batch number', async () => {
      const client = await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(client.batches.getByBatchNumber).toHaveBeenCalledWith(
          'LOT-2026-JW-042',
          '7610800749004',
        );
      });
    });

    it('calls getSupplyChain with the batch id from the first result', async () => {
      const client = await setupMocks();

      render(<SupplyChainMap barcode="7610800749004" batchNumber="LOT-2026-JW-042" />);

      await waitFor(() => {
        expect(client.batches.getSupplyChain).toHaveBeenCalledWith('batch-1');
      });
    });
  });
});
