import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import { looksLikeBarcode } from '../utils/barcode';
import { parseGs1QrCode } from '../utils/gs1';
import type { ScanMode } from '../types';
import { useSetAgentContext } from '../context/AgentContext';
import Button from './shared/Button';
import ScannerView from './shared/ScannerView';
import GlassBlock from './shared/GlassBlock';
import './ScannerPage.scss';

const ScannerPage = () => {
  useSetAgentContext(
    'Page: Home / Scanner. The user has not yet scanned any product. No barcode, batch number, or product information is available.',
  );
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
        const params = new URLSearchParams();
        if (gs1.batchNumber) params.set('batchNumber', gs1.batchNumber);
        if (gs1.expiryDate) params.set('expiryDate', gs1.expiryDate);
        const query = params.toString() ? `?${params.toString()}` : '';
        navigate(`/products/${encodeURIComponent(gs1.barcode)}${query}`);
      } else {
        setQrError('Could not read QR code. Is this a valid GS1 code?');
      }
    }
  };

  return (
    <main className="scanner-page">
      <div className="scanner-page__content">
        <GlassBlock className="scanner-page__card">
          {!scanning ? (
            <>
              <div className="scanner-page__hero">
                <span className="material-icons scanner-page__logo-icon">music_note</span>
                <h1 className="scanner-page__title">Foodchestra</h1>
                <p className="scanner-page__tagline">
                  Every product has a rhythm — here is yours.
                </p>
                <p className="scanner-page__subtitle">
                  Ready to scan the product that&apos;s ready to sing?
                </p>
              </div>

              <div className="scanner-page__actions">
                <Button
                  label="Scan QR Code"
                  variant="primary"
                  icon="qr_code_scanner"
                  fullWidth
                  onClick={() => startScan('qr')}
                />
                <Button
                  label="Scan Barcode"
                  variant="outline"
                  icon="barcode_scanner"
                  fullWidth
                  onClick={() => startScan('barcode')}
                />
              </div>

              {qrError && (
                <div className="scanner-page__alert scanner-page__alert--danger">
                  <span className="material-icons">error_outline</span>
                  <span>{qrError}</span>
                </div>
              )}
              {lastQrScan && (
                <div className="scanner-page__alert scanner-page__alert--info">
                  <span className="material-icons">qr_code_2</span>
                  <span>Scanned: <strong>{lastQrScan}</strong></span>
                </div>
              )}
            </>
          ) : (
            <div className="scanner-page__scanning">
              <div className="scanner-page__scanning-badge">
                <span className="material-icons">
                  {scanMode === 'qr' ? 'qr_code_scanner' : 'barcode_scanner'}
                </span>
                Scanning {scanMode === 'qr' ? 'QR Code' : 'Barcode'}...
              </div>
              <ScannerView
                mode={scanMode}
                onScanSuccess={handleScanSuccess}
              />
              <Button
                label="Cancel"
                variant="ghost"
                onClick={() => setScanning(false)}
              />
            </div>
          )}
        </GlassBlock>
      </div>
    </main>
  );
};

export default ScannerPage;
