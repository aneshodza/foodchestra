import { render, screen } from '@testing-library/react';
import App from '../App';
import { vi } from 'vitest';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    health: { getAlive: vi.fn().mockResolvedValue({ status: 'ok' }) },
    scans: { logScan: vi.fn().mockResolvedValue({}) },
    products: { getByBarcode: vi.fn().mockReturnValue(new Promise(() => {})) },
  },
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
    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeInTheDocument();
  });

  it('renders the product page at /products/:barcode', () => {
    window.history.pushState({}, '', '/products/12345678');
    render(<App />);
    expect(screen.getByText(/Fetching product details/i)).toBeInTheDocument();
  });
});
