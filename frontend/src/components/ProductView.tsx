import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import type { Product, ReportsResponse } from '@foodchestra/sdk';
import { useSetAgentContext } from '../context/AgentContext';
import Button from './shared/Button';
import GlassBlock from './shared/GlassBlock';
import ReportModal from './shared/ReportModal';
import SupplyChainMap from './SupplyChainMap';
import './ProductView.scss';

const ProductView = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const [searchParams] = useSearchParams();
  const urlBatchNumber = searchParams.get('batchNumber');
  const [batchInput, setBatchInput] = useState(urlBatchNumber || '');
  const [activeBatch, setActiveBatch] = useState(urlBatchNumber || '');
  const [product, setProduct] = useState<Product | null>(null);
  useSetAgentContext(
    product
      ? `Page: Product Detail. Barcode: ${barcode}. Batch number: ${urlBatchNumber || 'not provided'}. Product: ${product.name || 'unknown'}. Nutri-score: ${product.nutriscoreGrade || 'unknown'}.`
      : `Page: Product Detail. Barcode: ${barcode}. Product is still loading.`,
  );
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [coolingBreach, setCoolingBreach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (!barcode) return;

    setLoading(true);
    setError(null);

    Promise.allSettled([
      client.products.getByBarcode(barcode),
      client.reports.getReports(barcode),
      client.products.getCoolingStatus(barcode),
    ]).then(([productResult, reportsResult, coolingResult]) => {
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
      }

      if (coolingResult.status === 'fulfilled') {
        setCoolingBreach(coolingResult.value?.potentialBreach ?? false);
      }
      // Cooling status is optional — degrade gracefully on failure

      setLoading(false);
    });
  }, [barcode]);

  if (loading) {
    return (
      <div className="product-view__loading">
        <div className="product-view__spinner" role="status">
          <span className="sr-only">Loading...</span>
        </div>
        <p className="product-view__loading-text">Fetching product details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-view__error-page">
        <GlassBlock className="product-view__error-card">
          <div className="product-view__error-alert">
            <span className="material-icons">error_outline</span>
            <span>{error || 'An unexpected error occurred'}</span>
          </div>
          <Link to="/">
            <Button label="Back to Scanner" variant="outline" />
          </Link>
        </GlassBlock>
      </div>
    );
  }

  return (
    <div className="product-view">
      <div className="product-view__header">
        <Link to="/" className="product-view__back">
          <span className="material-icons">arrow_back</span>
          <span>Back</span>
        </Link>
      </div>

      {reports?.hasWarning && (
        <div className="product-view__warning">
          <span className="material-icons">warning</span>
          <span>Multiple users have reported issues with this product recently.</span>
        </div>
      )}

      {coolingBreach && (
        <div className="product-view__warning">
          <span className="material-icons">thermostat</span>
          <span>A potential cooling chain breach was detected for this product. Quality may be affected.</span>
        </div>
      )}

      <div className="product-view__layout">
        {/* Product intel */}
        <GlassBlock className="product-view__intel">
          <div className="product-view__image-section">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name || 'Product'}
                className="product-view__image"
              />
            ) : (
              <div className="product-view__image-placeholder">
                <span className="material-icons">inventory_2</span>
                <span>No image</span>
              </div>
            )}
          </div>

          <div className="product-view__meta">
            <div className="product-view__title-row">
              <div className="product-view__name-block">
                <h1 className="product-view__name">{product.name || 'Unknown Product'}</h1>
                <p className="product-view__brand">{product.brands || 'No brand info'}</p>
              </div>
              {product.nutriscoreGrade && (
                <div className={`product-view__nutriscore product-view__nutriscore--${product.nutriscoreGrade.toLowerCase()}`}>
                  <span className="product-view__nutriscore-label">Nutri</span>
                  <span className="product-view__nutriscore-grade">{product.nutriscoreGrade.toUpperCase()}</span>
                </div>
              )}
            </div>

            <div className="product-view__barcode-tag">
              <span className="material-icons">barcode_scanner</span>
              {product.barcode}
            </div>

            <div className="product-view__details">
              <div className="product-view__detail-item">
                <span className="product-view__detail-label">
                  <span className="material-icons">scale</span>
                  Quantity
                </span>
                <span className="product-view__detail-value">{product.quantity || 'N/A'}</span>
              </div>
              <div className="product-view__detail-item">
                <span className="product-view__detail-label">
                  <span className="material-icons">storefront</span>
                  Stores
                </span>
                <span className="product-view__detail-value">{product.stores || 'N/A'}</span>
              </div>
            </div>

            {product.ingredientsText && (
              <div className="product-view__ingredients">
                <h3 className="product-view__section-title">
                  <span className="material-icons">list_alt</span>
                  Ingredients
                </h3>
                <p className="product-view__ingredients-text">{product.ingredientsText}</p>
              </div>
            )}

            {reports && reports.count > 0 && (
              <div className="product-view__report-count">
                <span className="material-icons">people</span>
                {reports.count} {reports.count === 1 ? 'user' : 'users'} reported issues in the last 30 days
              </div>
            )}

            <div className="product-view__actions">
              <Button
                label="Report Issue"
                variant="danger"
                icon="flag"
                onClick={() => setShowReportModal(true)}
              />
            </div>

            <div className="product-view__trace">
              <label htmlFor="batch-number-input" className="product-view__trace-label">
                <span className="material-icons">route</span>
                Trace Journey
              </label>
              <div className="product-view__trace-input-row">
                <input
                  id="batch-number-input"
                  type="text"
                  className="product-view__trace-input"
                  placeholder="Enter batch number"
                  value={batchInput}
                  onChange={(e) => setBatchInput(e.target.value)}
                  disabled={!!urlBatchNumber}
                />
                <button
                  className="product-view__trace-btn"
                  type="button"
                  disabled={!batchInput.trim()}
                  onClick={() => setActiveBatch(batchInput.trim())}
                >
                  <span className="material-icons">route</span>
                </button>
              </div>
            </div>
          </div>
        </GlassBlock>

        {/* Supply chain map — shown when activeBatch is set */}
        {activeBatch && barcode && (
          <GlassBlock className="product-view__map-block">
            <div className="product-view__map-header">
              <h3 className="product-view__map-title">
                <span className="material-icons">map</span>
                Supply Chain Journey
              </h3>
              <p className="product-view__map-subtitle">Batch {activeBatch}</p>
            </div>
            <div className="product-view__map">
              <SupplyChainMap barcode={barcode} batchNumber={activeBatch} />
            </div>
          </GlassBlock>
        )}
      </div>

      {showReportModal && barcode && (
        <ReportModal
          barcode={barcode}
          onClose={() => setShowReportModal(false)}
          onSuccess={() => {
            window.dispatchEvent(
              new CustomEvent('foodchestra:agent-message', {
                detail: { message: 'Thanks for your report! The community appreciates your help keeping food safe. 🛡️' },
              }),
            );
          }}
        />
      )}
    </div>
  );
};

export default ProductView;
