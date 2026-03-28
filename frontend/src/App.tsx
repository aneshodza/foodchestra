import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BackendStatus from './components/shared/BackendStatus';
import AgentInput from './components/shared/AgentInput';
import ScannerPage from './components/ScannerPage';
import ProductView from './components/ProductView';
import './App.scss';

function App() {
  return (
    <Router>
      <BackendStatus />
      <AgentInput />
      <Routes>
        <Route path="/" element={<ScannerPage />} />
        <Route path="/products/:barcode" element={<ProductView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
