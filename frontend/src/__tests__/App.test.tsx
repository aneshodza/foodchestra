import { render, screen } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    health: { getAlive: vi.fn().mockResolvedValue({ status: 'ok' }) },
    scans: { logScan: vi.fn().mockResolvedValue({}) },
    products: { getByBarcode: vi.fn().mockReturnValue(new Promise(() => {})), getCoolingStatus: vi.fn().mockReturnValue(new Promise(() => {})) },
    reports: { getReports: vi.fn().mockReturnValue(new Promise(() => {})), createReport: vi.fn().mockReturnValue(new Promise(() => {})) },
    batches: { getByBatchNumber: vi.fn().mockReturnValue(new Promise(() => {})), getSupplyChain: vi.fn().mockReturnValue(new Promise(() => {})) },
    coolingChain: { getCoolingChain: vi.fn().mockReturnValue(new Promise(() => {})) },
  },
}));

vi.mock('../components/SupplyChainMap', () => ({
  default: () => <div>Mock Map</div>,
}));

vi.mock('../components/shared/ScannerView', () => ({
  default: () => <div>Mock Scanner</div>,
}));

afterEach(() => {
  vi.clearAllMocks();
  window.history.pushState({}, '', '/');
});

describe('App', () => {
  it('renders the scanner page at /', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Scan QR Code/i })).toBeInTheDocument();
  });

  it('renders the product page at /products/:barcode', () => {
    window.history.pushState({}, '', '/products/12345678');
    render(<App />);
    expect(screen.getByText(/Fetching product details/i)).toBeInTheDocument();
  });

  it('redirects unknown routes to /', () => {
    window.history.pushState({}, '', '/some/unknown/route');
    render(<App />);
    expect(screen.getByRole('button', { name: /Scan QR Code/i })).toBeInTheDocument();
  });
});
