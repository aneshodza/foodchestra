import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    health: { getAlive: vi.fn().mockResolvedValue({ status: 'ok' }) },
    scans: { logScan: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('../components/shared/ScannerView', () => ({
  default: ({ onScanSuccess }: { onScanSuccess: (text: string) => void }) => (
    <button onClick={() => onScanSuccess('scanned-value')}>Mock Scanner</button>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('App', () => {
  it('shows the QR and Barcode scan buttons initially', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Scan Barcode' })).toBeInTheDocument();
  });

  it('shows the scanner after clicking Scan QR Code', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    expect(screen.getByText('Mock Scanner')).toBeInTheDocument();
  });

  it('shows the scanner after clicking Scan Barcode', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan Barcode' }));
    expect(screen.getByText('Mock Scanner')).toBeInTheDocument();
  });

  it('returns to the scan buttons after clicking Cancel', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: 'Scan QR Code' })).toBeInTheDocument();
  });

  it('shows the last scan result after a successful scan', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByText('Mock Scanner'));
    await waitFor(() => expect(screen.getByText('scanned-value')).toBeInTheDocument());
  });

  it('sends the scan to the backend via the SDK', async () => {
    const { client } = await import('@foodchestra/sdk');
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Scan QR Code' }));
    fireEvent.click(screen.getByText('Mock Scanner'));
    await waitFor(() =>
      expect(client.scans.logScan).toHaveBeenCalledWith({
        scanResult: 'scanned-value',
        scanType: 'qr',
      }),
    );
  });
});
