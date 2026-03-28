import { useParams, Link } from 'react-router-dom';
import SupplyChainMap from './SupplyChainMap';
import './SupplyChainMapPage.scss';

const SupplyChainMapPage = () => {
  const { barcode, batchNumber } = useParams<{ barcode: string; batchNumber: string }>();

  if (!barcode || !batchNumber) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">Missing barcode or batch number.</div>
      </div>
    );
  }

  return (
    <main className="container py-4 supply-chain-map-page">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link
          to={`/products/${encodeURIComponent(barcode)}?batchNumber=${encodeURIComponent(batchNumber)}`}
          className="text-decoration-none d-flex align-items-center gap-1 text-secondary"
        >
          <span className="material-icons">arrow_back</span>
          <span>Back to product</span>
        </Link>
      </div>

      <h1 className="h4 mb-1">Supply Chain Journey</h1>
      <p className="text-secondary small mb-4">
        Batch <strong>{batchNumber}</strong> · Barcode <strong>{barcode}</strong>
      </p>

      <SupplyChainMap barcode={barcode} batchNumber={batchNumber} />
    </main>
  );
};

export default SupplyChainMapPage;
