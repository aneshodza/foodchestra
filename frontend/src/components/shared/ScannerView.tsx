import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import './ScannerView.scss';

interface ScannerViewProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  mode?: 'qr' | 'barcode';
}

const ScannerView = ({ onScanSuccess, onScanError, mode = 'qr' }: ScannerViewProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cooldownRef = useRef(false);
  const [isCooldown, setIsCooldown] = useState(false);

  // Load configuration from environment variables
  const fps = Number(import.meta.env.VITE_SCANNER_FPS) || 10;
  const qrBoxWidth = Number(import.meta.env.VITE_SCANNER_QR_BOX_WIDTH) || 250;
  const qrBoxHeight = Number(import.meta.env.VITE_SCANNER_QR_BOX_HEIGHT) || 250;
  const barcodeBoxWidth = Number(import.meta.env.VITE_SCANNER_BARCODE_BOX_WIDTH) || 300;
  const barcodeBoxHeight = Number(import.meta.env.VITE_SCANNER_BARCODE_BOX_HEIGHT) || 150;

  const boxWidth = mode === 'qr' ? qrBoxWidth : barcodeBoxWidth;
  const boxHeight = mode === 'qr' ? qrBoxHeight : barcodeBoxHeight;

  useEffect(() => {
    // Create instance
    const scanner = new Html5Qrcode('reader');
    scannerRef.current = scanner;

    const config = {
      fps,
      qrbox: { width: boxWidth, height: boxHeight },
      aspectRatio: 1.333333,
      formatsToSupport: mode === 'qr' 
        ? [Html5QrcodeSupportedFormats.QR_CODE] 
        : [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ]
    };

    const startScanner = async () => {
      try {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (cooldownRef.current) return;
            
            cooldownRef.current = true;
            setIsCooldown(true);
            onScanSuccess(decodedText);
            
            // 2-second cooldown to prevent double scans
            setTimeout(() => {
              cooldownRef.current = false;
              setIsCooldown(false);
            }, 2000);
          },
          (errorMessage) => {
            if (onScanError) onScanError(errorMessage);
          }
        );
      } catch (err) {
        console.error('Failed to start scanner:', err);
      }
    };

    startScanner();

    // Cleanup on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch((err) => {
          console.error('Failed to stop scanner during cleanup:', err);
        });
      }
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
