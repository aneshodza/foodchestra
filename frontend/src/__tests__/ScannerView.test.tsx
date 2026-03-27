import { render, waitFor } from '@testing-library/react';
import ScannerView from '../components/shared/ScannerView';

const mockStart = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStop = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetState = vi.hoisted(() => vi.fn().mockReturnValue(1));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = mockStart;
    stop = mockStop;
    isScanning = false;
    getState = mockGetState;
  },
  Html5QrcodeSupportedFormats: {
    QR_CODE: 0,
    CODE_128: 1,
    EAN_13: 2,
    EAN_8: 3,
    UPC_A: 4,
    UPC_E: 5,
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('ScannerView', () => {
  it('renders the reader container', () => {
    render(<ScannerView onScanSuccess={() => {}} />);
    expect(document.getElementById('reader')).toBeInTheDocument();
  });

  it('starts the scanner on mount', async () => {
    render(<ScannerView onScanSuccess={() => {}} />);
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
  });

  it('calls onScanSuccess with the decoded text', async () => {
    const onScanSuccess = vi.fn();
    mockStart.mockImplementation(async (_facing: unknown, _config: unknown, successCb: (text: string) => void) => {
      await successCb('barcode-value');
    });
    mockStop.mockResolvedValue(undefined);

    render(<ScannerView onScanSuccess={onScanSuccess} />);
    await waitFor(() => expect(onScanSuccess).toHaveBeenCalledWith('barcode-value'));
  });

  it('calls onScanError when an error callback fires', async () => {
    const onScanError = vi.fn();
    mockStart.mockImplementation(async (_facing: unknown, _config: unknown, _successCb: unknown, errorCb: (err: string) => void) => {
      errorCb('scan error message');
    });

    render(<ScannerView onScanSuccess={() => {}} onScanError={onScanError} />);
    await waitFor(() => expect(onScanError).toHaveBeenCalledWith('scan error message'));
  });
});
