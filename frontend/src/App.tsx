import { useState } from 'react';
import HomeIcon from './components/shared/HomeIcon';
import Button from './components/shared/Button';
import BackendStatus from './components/shared/BackendStatus';
import ScannerView from './components/shared/ScannerView';
import { ScanMode } from './types';

function App() {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>('qr');

  const startScan = (mode: ScanMode) => {
    setLastScan(null); // Clear previous scan result
    setScanMode(mode);
    setScanning(true);
  };

  return (
    <>
      <BackendStatus />
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
                  {lastScan && (
                    <div className="alert alert-info mt-3 py-2 px-3 d-flex align-items-center gap-2">
                      <span className="material-icons">
                        {scanMode === 'qr' ? 'qr_code_2' : 'barcode_scanner'}
                      </span>
                      <span>Last scan: <strong>{lastScan}</strong></span>
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
                    onScanSuccess={(text) => {
                      setLastScan(text);
                      setScanning(false);
                    }} 
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
    </>
  );
}

export default App;
