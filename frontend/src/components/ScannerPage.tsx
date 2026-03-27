import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import { looksLikeBarcode } from '../utils/barcode';
import { parseGs1QrCode } from '../utils/gs1';
import { ScanMode } from '../types';
import HomeIcon from './shared/HomeIcon';
import Button from './shared/Button';
import ScannerView from './shared/ScannerView';

const ScannerPage = () => {
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('qr');
  const [qrError, setQrError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lastQrScan = searchParams.get('scanned');

  const startScan = (mode: ScanMode) => {
    setScanMode(mode);
    setScanning(true);
    setQrError(null);
  };

  const handleScanSuccess = (text: string) => {
    setScanning(false);
    client.scans.logScan({ scanResult: text, scanType: scanMode }).catch(console.error);

    if (scanMode === 'barcode') {
      if (looksLikeBarcode(text)) {
        navigate(`/products/${encodeURIComponent(text)}`);
      } else {
        navigate(`/?scanned=${encodeURIComponent(text)}`);
      }
    } else {
      const gs1 = parseGs1QrCode(text);
      if (gs1) {
        navigate(`/products/${encodeURIComponent(gs1.barcode)}`, {
          state: { batchNumber: gs1.batchNumber, expiryDate: gs1.expiryDate },
        });
      } else {
        setQrError('Could not read QR code. Is this a valid GS1 code?');
      }
    }
  };

  return (
    <main className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h1 className="card-title d-flex align-items-center gap-2 mb-4">
                <HomeIcon />
                Foodchestra
              </h1>
              <p className="card-text text-secondary mb-4">
                Track your food&apos;s journey from farm to shelf.
              </p>

              {!scanning ? (
                <div className="d-grid gap-2">
                  <div className="row g-2">
                    <div className="col-6">
                      <Button
                        label="Scan QR Code"
                        variant="primary"
                        onClick={() => startScan('qr')}
                      />
                    </div>
                    <div className="col-6">
                      <Button
                        label="Scan Barcode"
                        variant="secondary"
                        onClick={() => startScan('barcode')}
                      />
                    </div>
                  </div>
                  {qrError && (
                    <div className="alert alert-danger mt-3 py-2 px-3 d-flex align-items-center gap-2">
                      <span className="material-icons">error_outline</span>
                      <span>{qrError}</span>
                    </div>
                  )}
                  {lastQrScan && (
                    <div className="alert alert-info mt-3 py-2 px-3 d-flex align-items-center gap-2">
                      <span className="material-icons">qr_code_2</span>
                      <span>Scanned: <strong>{lastQrScan}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <div className="text-center mb-2">
                    <span className="badge bg-primary">
                      Scanning {scanMode === 'qr' ? 'QR Code' : 'Barcode'}...
                    </span>
                  </div>
                  <ScannerView
                    mode={scanMode}
                    onScanSuccess={handleScanSuccess}
                  />
                  <Button
                    label="Cancel"
                    variant="danger"
                    onClick={() => setScanning(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ScannerPage;
