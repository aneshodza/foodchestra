import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BackendStatus from './components/shared/BackendStatus';
import ScannerPage from './components/ScannerPage';
import ProductView from './components/ProductView';
import SupplyChainMapPage from './components/SupplyChainMapPage';
import ReportIssuePage from './components/ReportIssuePage';

function App() {
  return (
    <Router>
      <BackendStatus />
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/products/:barcode" element={<ProductView />} />
        <Route path="/products/:barcode/maps/:batchNumber" element={<SupplyChainMapPage />} />
        <Route path="/products/:barcode/report" element={<ReportIssuePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
