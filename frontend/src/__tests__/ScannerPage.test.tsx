import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import ScannerPage from '../components/ScannerPage';
import ProductView from '../components/ProductView';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    health: { getAlive: vi.fn().mockResolvedValue({ status: 'ok' }) },
    scans: { logScan: vi.fn().mockResolvedValue({}) },
    products: { getByBarcode: vi.fn().mockReturnValue(new Promise(() => {})), getCoolingStatus: vi.fn().mockReturnValue(new Promise(() => {})), getEnrichment: vi.fn().mockReturnValue(new Promise(() => {})) },
    reports: { getReports: vi.fn().mockReturnValue(new Promise(() => {})) },
  },
}));

vi.mock('../components/SupplyChainMap', () => ({
  default: () => <div>Mock Map</div>,
}));

vi.mock('../components/shared/ScannerView', () => ({
  default: ({ onScanSuccess }: { onScanSuccess: (text: string) => void }) => (
    <>
      <button onClick={() => onScanSuccess('12345678')}>Mock Scanner</button>
      <button onClick={() => onScanSuccess('not-a-barcode')}>Mock Scanner Invalid</button>
      <button onClick={() => onScanSuccess('https://id.gs1.org/01/09506000134352/10/BATCH1/17/260131')}>Mock GS1 Scanner</button>
    </>
  ),
}));

vi.mock('../utils/gs1', () => ({
  parseGs1QrCode: vi.fn(),
}));

window.alert = vi.fn();

function renderWithRouter(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/products/:barcode" element={<ProductView />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScannerPage', () => {
  it('shows the QR and Barcode scan buttons initially', () => {
    renderWithRouter();
    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan Barcode' })).toBeInTheDocument();
  });

  it('shows the scanner after clicking Scan QR Code', () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    expect(screen.getByText('Mock Scanner')).toBeInTheDocument();
  });

  it('shows the scanner after clicking Scan Barcode', () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    expect(screen.getByText('Mock Scanner')).toBeInTheDocument();
  });

  it('returns to the scan buttons after clicking Cancel', () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeInTheDocument();
  });

  it('navigates to product page after a successful barcode scan', async () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    fireEvent.click(screen.getByText('Mock Scanner'));

    await waitFor(() => expect(screen.getByText(/Fetching product details/i)).toBeInTheDocument());
  });

  it('sends the scan to the backend via the SDK', async () => {
    const { client } = await import('@foodchestra/sdk');
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    fireEvent.click(screen.getByText('Mock Scanner'));
    await waitFor(() =>
      expect(client.scans.logScan).toHaveBeenCalledWith({
        scanResult: '12345678',
        scanType: 'barcode',
      }),
    );
  });

  it('logs the scan type as qr when scanning in QR mode', async () => {
    const { client } = await import('@foodchestra/sdk');
    const { parseGs1QrCode } = await import('../utils/gs1');
    vi.mocked(parseGs1QrCode).mockReturnValue(null);

    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByText('Mock Scanner'));
    await waitFor(() =>
      expect(client.scans.logScan).toHaveBeenCalledWith({
        scanResult: '12345678',
        scanType: 'qr',
      }),
    );
  });

  it('navigates to product page after a valid GS1 QR scan', async () => {
    const { parseGs1QrCode } = await import('../utils/gs1');
    vi.mocked(parseGs1QrCode).mockReturnValue({
      barcode: '9506000134352',
      batchNumber: 'BATCH1',
      expiryDate: '260131',
    });

    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByText('Mock Scanner'));

    await waitFor(() => expect(screen.getByText(/Fetching product details/i)).toBeInTheDocument());
  });

  it('shows an error when QR scan is not a valid GS1 code', async () => {
    const { parseGs1QrCode } = await import('../utils/gs1');
    vi.mocked(parseGs1QrCode).mockReturnValue(null);

    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByText('Mock Scanner'));

    await waitFor(() =>
      expect(screen.getByText(/Could not read QR code/i)).toBeInTheDocument(),
    );
  });

  it('shows the scan result inline when a barcode scan does not look like a barcode', async () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    fireEvent.click(screen.getByText('Mock Scanner Invalid'));

    await waitFor(() =>
      expect(screen.getByText('not-a-barcode')).toBeInTheDocument(),
    );
  });

  it('does not navigate to product page when barcode scan result is not a barcode', () => {
    renderWithRouter();
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    fireEvent.click(screen.getByText('Mock Scanner Invalid'));
    expect(screen.queryByText(/Fetching product details/i)).not.toBeInTheDocument();
  });

  it('displays the scanned value from the ?scanned= query param on load', () => {
    renderWithRouter('/?scanned=hello-world');
    expect(screen.getByText('hello-world')).toBeInTheDocument();
  });

  it('does not show the scan result banner when ?scanned= param is absent', () => {
    renderWithRouter();
    expect(screen.queryByText('Scanned:')).not.toBeInTheDocument();
  });
});
