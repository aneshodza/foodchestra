import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import EcologicalFootprint from '../components/EcologicalFootprint';

const { mockGetByBatchNumber, mockGetSupplyChain } = vi.hoisted(() => ({
  mockGetByBatchNumber: vi.fn(),
  mockGetSupplyChain:   vi.fn(),
}));

vi.mock('@foodchestra/sdk', () => ({
  client: {
    batches: {
      getByBatchNumber: mockGetByBatchNumber,
      getSupplyChain:   mockGetSupplyChain,
    },
  },
}));

const mockBatch = { id: 'batch-1', productBarcode: '7610807001024', batchNumber: 'LOT-001', createdAt: '' };

// Zurich → Bern → Basel triangle: ~95 km + ~80 km ≈ 175 km total (Regional)
const mockSupplyChain = {
  id: 'sc-1',
  batchId: 'batch-1',
  createdAt: '',
  nodes: [
    { id: 'n1', label: 'Farm',  arrivedAt: null, departedAt: null, location: { id: 'l1', partyId: 'p1', label: null, latitude: 47.376, longitude: 8.541, address: null, createdAt: '', party: { id: 'p1', name: 'Farm', type: 'farmer',    createdAt: '' } } },
    { id: 'n2', label: 'Mill',  arrivedAt: null, departedAt: null, location: { id: 'l2', partyId: 'p2', label: null, latitude: 46.948, longitude: 7.449, address: null, createdAt: '', party: { id: 'p2', name: 'Mill', type: 'processor', createdAt: '' } } },
    { id: 'n3', label: 'Store', arrivedAt: null, departedAt: null, location: { id: 'l3', partyId: 'p3', label: null, latitude: 47.558, longitude: 7.588, address: null, createdAt: '', party: { id: 'p3', name: 'Coop', type: 'retailer',  createdAt: '' } } },
  ],
  edges: [
    { fromNodeId: 'n1', toNodeId: 'n2' },
    { fromNodeId: 'n2', toNodeId: 'n3' },
  ],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('EcologicalFootprint', () => {
  it('shows loading state initially', () => {
    mockGetByBatchNumber.mockReturnValue(new Promise(() => {}));

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="LOT-001" />);

    expect(screen.getByText('Ecological Footprint')).toBeInTheDocument();
    expect(screen.getByText('Calculating transport distance…')).toBeInTheDocument();
  });

  it('renders km and CO₂ after supply chain loads', async () => {
    mockGetByBatchNumber.mockResolvedValue([mockBatch]);
    mockGetSupplyChain.mockResolvedValue(mockSupplyChain);

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="LOT-001" />);

    await waitFor(() => {
      expect(screen.getByText('km travelled')).toBeInTheDocument();
      expect(screen.getByText('CO₂ equivalent')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 transport legs/)).toBeInTheDocument();
  });

  it('shows a Regional rating badge for ~175 km chain', async () => {
    mockGetByBatchNumber.mockResolvedValue([mockBatch]);
    mockGetSupplyChain.mockResolvedValue(mockSupplyChain);

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="LOT-001" />);

    await waitFor(() => expect(screen.getByText('Regional')).toBeInTheDocument());
  });

  it('shows unavailable when no batch found', async () => {
    mockGetByBatchNumber.mockResolvedValue([]);

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="UNKNOWN" />);

    await waitFor(() =>
      expect(screen.getByText('Supply chain data unavailable for this batch.')).toBeInTheDocument(),
    );
  });

  it('shows unavailable when fetch fails', async () => {
    mockGetByBatchNumber.mockRejectedValue(new Error('network error'));

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="LOT-001" />);

    await waitFor(() =>
      expect(screen.getByText('Supply chain data unavailable for this batch.')).toBeInTheDocument(),
    );
  });

  it('shows Local rating for same-location chain (0 km)', async () => {
    const shortChain = {
      ...mockSupplyChain,
      nodes: [
        mockSupplyChain.nodes[0],
        { ...mockSupplyChain.nodes[0], id: 'n2' },
      ],
      edges: [{ fromNodeId: 'n1', toNodeId: 'n2' }],
    };
    mockGetByBatchNumber.mockResolvedValue([mockBatch]);
    mockGetSupplyChain.mockResolvedValue(shortChain);

    render(<EcologicalFootprint barcode="7610807001024" batchNumber="LOT-001" />);

    await waitFor(() => expect(screen.getByText('Local')).toBeInTheDocument());
  });
});
