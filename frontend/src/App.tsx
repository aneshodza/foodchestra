import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AgentContextProvider } from './context/AgentContext';
import BackendStatus from './components/shared/BackendStatus';
import AgentInput from './components/shared/AgentInput';
import ScannerPage from './components/ScannerPage';
import ProductView from './components/ProductView';
import SupplyChainMapPage from './components/SupplyChainMapPage';
import ReportIssuePage from './components/ReportIssuePage';

function App() {
  return (
    <AgentContextProvider>
      <Router>
        <BackendStatus />
        <Routes>
          <Route path="/" element={<ScannerPage />} />
          <Route path="/products/:barcode" element={<ProductView />} />
          <Route path="/products/:barcode/maps/:batchNumber" element={<SupplyChainMapPage />} />
          <Route path="/products/:barcode/report" element={<ReportIssuePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <div className="agent-bar">
          <div className="container">
            <AgentInput />
          </div>
        </div>
      </Router>
    </AgentContextProvider>
  );
}

export default App;
