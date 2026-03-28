import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import type { Product, ReportsResponse } from '@foodchestra/sdk';
import Button from './shared/Button';
import './ProductView.scss';

const ProductView = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlBatchNumber = searchParams.get('batchNumber');
  const [batchInput, setBatchInput] = useState(urlBatchNumber || '');
  const [product, setProduct] = useState<Product | null>(null);
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!barcode) return;

    setLoading(true);
    setError(null);

    Promise.allSettled([
      client.products.getByBarcode(barcode),
      client.reports.getReports(barcode),
    ]).then(([productResult, reportsResult]) => {
      if (productResult.status === 'fulfilled') {
        const res = productResult.value;
        if (res.found && res.product) {
          setProduct(res.product);
        } else {
          setError('Product not found');
        }
      } else {
        console.error('Failed to fetch product:', productResult.reason);
        setError('Failed to load product details');
      }

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        console.error('Failed to fetch reports:', reportsResult.reason);
        // Reports are secondary — degrade gracefully
      }

      setLoading(false);
    });
  }, [barcode]);

  if (loading) {
    return (
      <div className="container py-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-secondary">Fetching product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger d-flex align-items-center gap-2">
          <span className="material-icons">error_outline</span>
          <span>{error || 'An unexpected error occurred'}</span>
        </div>
        <Link to="/">
          <Button label="Back to Scanner" variant="secondary" />
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-4 product-view">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link to="/" className="text-decoration-none d-flex align-items-center gap-1 text-secondary">
          <span className="material-icons">arrow_back</span>
          <span>Back</span>
        </Link>
      </div>

      {reports?.hasWarning && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
          <span className="material-icons">warning</span>
          <span>Multiple users have reported issues with this product recently.</span>
        </div>
      )}

      <div className="card shadow-sm border-0 overflow-hidden">
        <div className="row g-0">
          <div className="col-md-4 bg-light d-flex align-items-center justify-content-center p-4">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name || 'Product'}
                className="img-fluid rounded product-image"
              />
            ) : (
              <div className="text-secondary text-center">
                <span className="material-icons display-1">inventory_2</span>
                <p>No image available</p>
              </div>
            )}
          </div>
          <div className="col-md-8">
            <div className="card-body p-4">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h1 className="h3 mb-1">{product.name || 'Unknown Product'}</h1>
                  <p className="text-muted mb-0">{product.brands || 'No brand info'}</p>
                </div>
                {product.nutriscoreGrade && (
                  <div className={`nutriscore nutriscore-${product.nutriscoreGrade.toLowerCase()}`}>
                    <span className="nutriscore-label">Nutri-Score</span>
                    <span className="nutriscore-grade">{product.nutriscoreGrade.toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="mb-4">
                <span className="badge bg-light text-dark border py-2 px-3">
                  <span className="material-icons align-middle fs-6 me-1">barcode_scanner</span>
                  {product.barcode}
                </span>
              </div>

              <div className="row g-4">
                <div className="col-sm-6">
                  <h5 className="h6 text-uppercase text-muted small fw-bold mb-2">Quantity</h5>
                  <p>{product.quantity || 'N/A'}</p>
                </div>
                <div className="col-sm-6">
                  <h5 className="h6 text-uppercase text-muted small fw-bold mb-2">Stores</h5>
                  <p>{product.stores || 'N/A'}</p>
                </div>
                <div className="col-sm-12">
                  <h5 className="h6 text-uppercase text-muted small fw-bold mb-2">Ingredients</h5>
                  <p className="small text-secondary">
                    {product.ingredientsText || 'No ingredient list available.'}
                  </p>
                </div>
              </div>

              {reports && reports.count > 0 && (
                <p className="text-muted small mt-2 mb-0">
                  <span className="material-icons align-middle fs-6 me-1">people</span>
                  {reports.count} {reports.count === 1 ? 'user' : 'users'} reported issues in the last 30 days
                </p>
              )}

              <div className="mt-4 pt-3 border-top d-flex gap-2">
                <Button
                  label="Report Issue"
                  variant="outline-danger"
                  onClick={() => navigate(`/products/${barcode}/report`)}
                />
              </div>

              <div className="mt-3">
                <label htmlFor="batch-number-input" className="form-label small text-muted fw-semibold text-uppercase">
                  Trace Journey
                </label>
                <div className="input-group">
                  <input
                    id="batch-number-input"
                    type="text"
                    className="form-control"
                    placeholder="Batch number"
                    value={batchInput}
                    onChange={(e) => setBatchInput(e.target.value)}
                    disabled={!!urlBatchNumber}
                  />
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={!batchInput.trim()}
                    onClick={() =>
                      navigate(
                        `/products/${encodeURIComponent(barcode!)}/maps/${encodeURIComponent(batchInput.trim())}`,
                      )
                    }
                  >
                    <span className="material-icons align-middle">route</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductView;
