import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import type { Product, ReportsResponse, EnrichmentResult } from '@foodchestra/sdk';
import { useSetAgentContext } from '../context/AgentContext';
import Button from './shared/Button';
import EcologicalFootprint from './EcologicalFootprint';
import './ProductView.scss';

const SAFETY_CONFIG = {
  safe: { alertClass: 'alert-success', icon: 'check_circle', label: 'No Safety Concerns' },
  caution: { alertClass: 'alert-warning', icon: 'warning_amber', label: 'Caution' },
  danger: { alertClass: 'alert-danger', icon: 'dangerous', label: 'Safety Alert' },
} as const;

const ProductView = () => {
  const { barcode } = useParams<{ barcode: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlBatchNumber = searchParams.get('batchNumber');
  const [batchInput, setBatchInput] = useState(urlBatchNumber || '');
  const [product, setProduct] = useState<Product | null>(null);
  const [reports, setReports] = useState<ReportsResponse | null>(null);
  const [enrichment, setEnrichment] = useState<EnrichmentResult | null>(null);
  const [enrichmentLoading, setEnrichmentLoading] = useState(true);
  const [coolingBreach, setCoolingBreach] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useSetAgentContext(
    product
      ? `Page: Product Detail. Barcode: ${barcode}. Batch number: ${urlBatchNumber || 'not provided'}. Product: ${product.name || 'unknown'}. Nutri-score: ${product.nutriscoreGrade || 'unknown'}. AI safety level: ${enrichment?.safetyLevel ?? 'loading'}. Government recalls: ${enrichment === null ? 'loading' : enrichment.matchedRecalls.length > 0 ? `${enrichment.matchedRecalls.length} active recall(s) found` : 'none'}.`
      : `Page: Product Detail. Barcode: ${barcode}. Product is still loading.`,
  );

  useEffect(() => {
    if (!barcode) return;

    setLoading(true);
    setError(null);
    setEnrichmentLoading(true);

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
      }

      if (coolingResult.status === 'fulfilled') {
        setCoolingBreach(coolingResult.value?.potentialBreach ?? false);
      }

      setLoading(false);
    });

    // Enrichment is slow (AI call) — load separately so product card shows immediately
    client.products.getEnrichment(barcode)
      .then((result) => setEnrichment(result))
      .catch((err) => console.error('Enrichment failed:', err))
      .finally(() => setEnrichmentLoading(false));
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

  const safetyConfig = enrichment ? SAFETY_CONFIG[enrichment.safetyLevel] : null;

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

      {coolingBreach && (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
          <span className="material-icons">thermostat</span>
          <span>A potential cooling chain breach was detected for this product. Quality may be affected.</span>
        </div>
      )}

      <div className="card shadow-sm border-0 overflow-hidden mb-4">
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

      {/* Ecological Footprint — only when batch is known (supply chain data available) */}
      {urlBatchNumber && (
        <div className="mb-4">
          <EcologicalFootprint barcode={barcode!} batchNumber={urlBatchNumber} />
        </div>
      )}

      {/* AI Enrichment Panel */}
      <div className="product-view__enrichment card border-0 shadow-sm">
        <div className="card-header product-view__enrichment-header d-flex align-items-center gap-2">
          <span className="material-icons fs-5">auto_awesome</span>
          <span className="fw-semibold">AI Analysis</span>
          {enrichmentLoading && (
            <div className="spinner-border spinner-border-sm text-primary ms-auto" role="status">
              <span className="visually-hidden">Analysing…</span>
            </div>
          )}
        </div>

        {enrichmentLoading && !enrichment && (
          <div className="card-body text-center text-muted py-4">
            <p className="mb-0 small">Analysing product safety, recalls, and sustainability…</p>
          </div>
        )}

        {!enrichmentLoading && !enrichment && (
          <div className="card-body text-center text-muted py-4">
            <span className="material-icons d-block mb-2 opacity-50">cloud_off</span>
            <p className="mb-0 small">AI analysis unavailable right now.</p>
          </div>
        )}

        {enrichment && (
          <div className="card-body p-0">
            {/* Safety level */}
            <div className={`product-view__enrichment-safety alert ${safetyConfig!.alertClass} rounded-0 mb-0 d-flex align-items-start gap-2`}>
              <span className="material-icons mt-1">{safetyConfig!.icon}</span>
              <div>
                <strong>{safetyConfig!.label}</strong>
                {enrichment.safetyReason && (
                  <p className="mb-0 small mt-1">{enrichment.safetyReason}</p>
                )}
              </div>
            </div>

            <div className="p-3 d-flex flex-column gap-3">
              {/* Matched recalls */}
              {enrichment.matchedRecalls.length > 0 && (
                <div>
                  <h6 className="product-view__enrichment-section-title">
                    <span className="material-icons align-middle fs-6 me-1">campaign</span>
                    Government Recalls ({enrichment.matchedRecalls.length})
                  </h6>
                  {enrichment.matchedRecalls.map((recall) => (
                    <div key={recall.id} className="product-view__recall-card card border-danger mb-2">
                      <div className="card-body p-3">
                        <div className="d-flex gap-3 align-items-start">
                          {recall.imageUrlDe && (
                            <img
                              src={recall.imageUrlDe}
                              alt="Recalled product"
                              className="product-view__recall-thumb"
                            />
                          )}
                          <div className="flex-grow-1">
                            <p className="mb-1 fw-bold text-danger small">{recall.headerDe}</p>
                            {recall.metaDe && (
                              <p className="small text-muted mb-1">
                                <span className="material-icons align-middle fs-6 me-1">calendar_today</span>
                                {recall.metaDe}
                              </p>
                            )}
                            {recall.authorityNameDe && (
                              <p className="small text-muted mb-2">
                                <span className="material-icons align-middle fs-6 me-1">account_balance</span>
                                {recall.authorityNameDe}
                              </p>
                            )}
                            {recall.descriptionDe && (
                              <p className="small mb-0 product-view__recall-description">{recall.descriptionDe}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Allergen warnings */}
              {enrichment.allergenWarnings.length > 0 && (
                <div>
                  <h6 className="product-view__enrichment-section-title">
                    <span className="material-icons align-middle fs-6 me-1">no_food</span>
                    Allergens
                  </h6>
                  <div className="d-flex flex-wrap gap-2">
                    {enrichment.allergenWarnings.map((allergen) => (
                      <span key={allergen} className="badge product-view__allergen-badge">{allergen}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quality & sustainability notes */}
              {(enrichment.qualityNote || enrichment.sustainabilityNote) && (
                <div className="row g-3">
                  {enrichment.qualityNote && (
                    <div className="col-sm-6">
                      <h6 className="product-view__enrichment-section-title">
                        <span className="material-icons align-middle fs-6 me-1">star_rate</span>
                        Quality
                      </h6>
                      <p className="small text-secondary mb-0">{enrichment.qualityNote}</p>
                    </div>
                  )}
                  {enrichment.sustainabilityNote && (
                    <div className="col-sm-6">
                      <h6 className="product-view__enrichment-section-title">
                        <span className="material-icons align-middle fs-6 me-1">eco</span>
                        Sustainability
                      </h6>
                      <p className="small text-secondary mb-0">{enrichment.sustainabilityNote}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductView;
