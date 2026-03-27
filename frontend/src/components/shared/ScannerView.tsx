import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanMode } from '../../types';
import './ScannerView.scss';

interface ScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  mode?: ScanMode;
}

const ScannerView = ({ onScanSuccess, onScanError, mode = 'qr' }: ScannerViewProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const [isCooldown, setIsCooldown] = useState(false);

  // Load configuration from environment variables
  const fps = Number(import.meta.env.VITE_SCANNER_FPS) || 15;
  const qrBoxWidth = Number(import.meta.env.VITE_SCANNER_QR_BOX_WIDTH) || 250;
  const qrBoxHeight = Number(import.meta.env.VITE_SCANNER_QR_BOX_HEIGHT) || 250;
  const barcodeBoxWidth = Number(import.meta.env.VITE_SCANNER_BARCODE_BOX_WIDTH) || 300;
  const barcodeBoxHeight = Number(import.meta.env.VITE_SCANNER_BARCODE_BOX_HEIGHT) || 150;

  const boxWidth = mode === 'qr' ? qrBoxWidth : barcodeBoxWidth;
  const boxHeight = mode === 'qr' ? qrBoxHeight : barcodeBoxHeight;

  useEffect(() => {
    let isMounted = true;
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    const stopScanner = async () => {
      const scanner = scannerRef.current;
      if (!scanner) return;
      scannerRef.current = null; // Prevent any concurrent or subsequent call from entering
      try {
        const state = scanner.getState();
        // SCANNING = 2, PAUSED = 3
        if (state === 2 || state === 3) {
          await scanner.stop();
        }
        scanner.clear();
      } catch (err) {
        console.warn('Failed to stop/clear scanner:', err);
      }
    };

    const config = {
      fps,
      qrbox: { width: boxWidth, height: boxHeight },
      aspectRatio: mode === 'barcode' ? 1.777778 : 1.333333,
      formatsToSupport: mode === 'qr'
        ? [Html5QrcodeSupportedFormats.QR_CODE]
        : [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true,
      },
    };

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            if (cooldownRef.current) return;
            
            cooldownRef.current = true;
            setIsCooldown(true);

            // Stop the camera immediately on success
            await stopScanner();
            
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            if (onScanError) onScanError(errorMessage);
          }
        );

        // If it unmounted while starting, stop it now
        if (!isMounted) {
          await stopScanner();
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to start scanner:', err);
        }
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [mode, onScanSuccess, onScanError, boxWidth, boxHeight, fps]);

  return (
    <div className="scanner-container">
      <div id="reader" />
      <div className="scanner-overlay">
        <div 
          className="scanner-roi" 
          style={{ width: `${boxWidth}px`, height: `${boxHeight}px` }} 
        />
      </div>
      {isCooldown && (
        <div className="scanner-cooldown">
          <span className="material-icons">check_circle</span>
        </div>
      )}
    </div>
  );
};

export default ScannerView;
