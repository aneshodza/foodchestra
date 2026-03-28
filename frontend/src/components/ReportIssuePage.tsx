import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { client } from '@foodchestra/sdk';
import type { ReportCategory } from '@foodchestra/sdk';
import { useSetAgentContext } from '../context/AgentContext';
import Button from './shared/Button';
import './ReportIssuePage.scss';

const MAX_DESCRIPTION_LENGTH = 500;

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  damaged_packaging: 'Damaged Packaging',
  quality_issue: 'Quality Issue',
  foreign_object: 'Foreign Object Found',
  mislabeled: 'Mislabeled / Wrong Information',
  other: 'Other',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ReportCategory[];

const ReportIssuePage = () => {
  const { barcode } = useParams<{ barcode: string }>();
  useSetAgentContext(`Page: Report Issue. The user is filing a complaint for barcode: ${barcode}.`);
  const [category, setCategory] = useState<ReportCategory>('damaged_packaging');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!barcode) return;

    setSubmitting(true);
    setError(null);

    try {
      await client.reports.createReport(barcode, {
        category,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
    } catch {
      setError('Failed to submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="container py-5 report-issue-page">
        <div className="report-issue-page__card">
          <div className="alert alert-success d-flex align-items-center gap-2 mb-4">
            <span className="material-icons">check_circle</span>
            <span>Thanks for your feedback! Your report helps other users stay safe.</span>
          </div>
          <Link to={`/products/${barcode}`}>
            <Button label="Back to Product" variant="primary" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 report-issue-page">
      <div className="d-flex align-items-center gap-2 mb-4">
        <Link
          to={`/products/${barcode}`}
          className="text-decoration-none d-flex align-items-center gap-1 text-secondary"
        >
          <span className="material-icons">arrow_back</span>
          <span>Back</span>
        </Link>
      </div>

      <div className="card shadow-sm border-0 report-issue-page__card">
        <div className="card-body p-4">
          <h1 className="h4 mb-1">Report an Issue</h1>
          <p className="text-muted mb-4">
            Your report is anonymous and helps the community stay safe.
          </p>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-3">
              <span className="material-icons">error_outline</span>
              <span>{error}</span>
            </div>
          )}

          <div className="mb-3">
            <label htmlFor="report-category" className="form-label fw-semibold">
              Issue Type
            </label>
            <select
              id="report-category"
              className="form-select report-issue-page__category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value as ReportCategory)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="report-description" className="form-label fw-semibold">
              Description <span className="fw-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="report-description"
              className="form-control report-issue-page__description"
              placeholder="Briefly describe the issue..."
              value={description}
              maxLength={MAX_DESCRIPTION_LENGTH}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="report-issue-page__char-hint mt-1 text-end">
              {description.length}/{MAX_DESCRIPTION_LENGTH}
            </div>
          </div>

          <div className="d-flex gap-2">
            <Button
              label={submitting ? 'Submitting...' : 'Submit Report'}
              variant="danger"
              onClick={handleSubmit}
              disabled={submitting}
            />
            <Link to={`/products/${barcode}`}>
              <Button label="Cancel" variant="secondary" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportIssuePage;
