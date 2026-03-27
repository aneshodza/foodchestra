import { useState } from 'react';
import HomeIcon from './components/shared/HomeIcon';
import Button from './components/shared/Button';
import BackendStatus from './components/shared/BackendStatus';
import ScannerView from './components/shared/ScannerView';

function App() {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

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
                  <Button 
                    label="Scan QR/Barcode" 
                    variant="primary"
                    onClick={() => setScanning(true)} 
                  />
                  {lastScan && (
                    <div className="alert alert-info mt-3 py-2 px-3 d-flex align-items-center gap-2">
                      <span className="material-icons">qr_code_2</span>
                      <span>Last scan: <strong>{lastScan}</strong></span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="d-flex flex-column gap-3">
                  <ScannerView 
                    onScanSuccess={(text) => {
                      setLastScan(text);
                      setScanning(false);
                    }} 
                  />
                  <Button 
                    label="Cancel" 
                    variant="secondary"
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
