import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AgentContextProvider } from "./context/AgentContext";
import BackendStatus from "./components/shared/BackendStatus";
import AgentInput from "./components/shared/AgentInput";
import ScannerPage from "./components/ScannerPage";
import ProductView from "./components/ProductView";
import "./App.scss";

function App() {
  return (
    <AgentContextProvider>
      <Router>
        <BackendStatus />
        <AgentInput />
        <Routes>
          <Route path="/" element={<ScannerPage />} />
          <Route path="/products/:barcode" element={<ProductView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AgentContextProvider>
  );
}

export default App;
