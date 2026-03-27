import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import ScannerView from '../components/shared/ScannerView';

const mockStart = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockStop = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockClear = vi.hoisted(() => vi.fn());
const mockGetState = vi.hoisted(() => vi.fn().mockReturnValue(1));

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    start = mockStart;
    stop = mockStop;
    clear = mockClear;
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
    mockStart.mockImplementation(async (_facing: unknown, _config: unknown, successCb: (text: string) => Promise<void> | void) => {
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

  it('does not call onScanSuccess a second time when cooldown is active', async () => {
    const onScanSuccess = vi.fn();
    mockStart.mockImplementation(async (_facing: unknown, _config: unknown, successCb: (text: string) => Promise<void> | void) => {
      await successCb('first-scan');
      await successCb('second-scan'); // should be blocked by cooldown
    });
    mockStop.mockResolvedValue(undefined);

    render(<ScannerView onScanSuccess={onScanSuccess} />);
    await waitFor(() => expect(onScanSuccess).toHaveBeenCalledTimes(1));
    expect(onScanSuccess).toHaveBeenCalledWith('first-scan');
  });

  it('shows the cooldown indicator after a successful scan', async () => {
    mockStart.mockImplementation(async (_facing: unknown, _config: unknown, successCb: (text: string) => Promise<void> | void) => {
      await successCb('barcode-value');
    });
    mockStop.mockResolvedValue(undefined);

    render(<ScannerView onScanSuccess={() => {}} />);
    await waitFor(() => expect(screen.getByText('check_circle')).toBeInTheDocument());
  });

  it('stops the scanner on unmount when it is scanning', async () => {
    mockGetState.mockReturnValue(2); // SCANNING state
    const { unmount } = render(<ScannerView onScanSuccess={() => {}} />);

    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    unmount();

    await waitFor(() => expect(mockStop).toHaveBeenCalled());
  });

  it('does not call stop on unmount when scanner is not running', async () => {
    mockGetState.mockReturnValue(1); // NOT_STARTED
    const { unmount } = render(<ScannerView onScanSuccess={() => {}} />);

    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));
    unmount();

    await waitFor(() => expect(mockClear).toHaveBeenCalled());
    expect(mockStop).not.toHaveBeenCalled();
  });

  it('passes barcode formats when mode is barcode', async () => {
    render(<ScannerView onScanSuccess={() => {}} mode="barcode" />);
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));

    const config = mockStart.mock.calls[0][1] as { formatsToSupport: number[] };
    // QR_CODE (0) should not be in the list
    expect(config.formatsToSupport).not.toContain(0);
    // EAN_13 (2) should be present
    expect(config.formatsToSupport).toContain(2);
  });

  it('passes only QR_CODE format when mode is qr', async () => {
    render(<ScannerView onScanSuccess={() => {}} mode="qr" />);
    await waitFor(() => expect(mockStart).toHaveBeenCalledTimes(1));

    const config = mockStart.mock.calls[0][1] as { formatsToSupport: number[] };
    expect(config.formatsToSupport).toEqual([0]); // QR_CODE only
  });
});
