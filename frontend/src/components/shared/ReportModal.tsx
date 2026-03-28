import { useState } from 'react';
import { client } from '@foodchestra/sdk';
import type { ReportCategory } from '@foodchestra/sdk';
import Button from './Button';
import GlassBlock from './GlassBlock';
import './ReportModal.scss';

const MAX_DESCRIPTION_LENGTH = 500;

const CATEGORY_LABELS: Record<ReportCategory, string> = {
  damaged_packaging: 'Damaged Packaging',
  quality_issue: 'Quality Issue',
  foreign_object: 'Foreign Object Found',
  mislabeled: 'Mislabeled / Wrong Information',
  other: 'Other',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ReportCategory[];

interface ReportModalProps {
  barcode: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ReportModal = ({ barcode, onClose, onSuccess }: ReportModalProps) => {
  const [category, setCategory] = useState<ReportCategory>('damaged_packaging');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      await client.reports.createReport(barcode, {
        category,
        description: description.trim() || undefined,
      });
      setSubmitted(true);
      onSuccess?.();
    } catch {
      setError('Failed to submit your report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="report-modal__overlay" onClick={handleOverlayClick}>
      <GlassBlock className="report-modal">
        <div className="report-modal__header">
          <h2 className="report-modal__title">Report an Issue</h2>
          <button className="report-modal__close" onClick={onClose} type="button" aria-label="Close">
            <span className="material-icons">close</span>
          </button>
        </div>

        {submitted ? (
          <div className="report-modal__success">
            <span className="material-icons report-modal__success-icon">check_circle</span>
            <p>Thanks for your feedback! Your report helps other users stay safe.</p>
            <Button label="Close" variant="primary" onClick={onClose} />
          </div>
        ) : (
          <>
            <p className="report-modal__subtitle">
              Your report is anonymous and helps the community stay safe.
            </p>

            {error && (
              <div className="report-modal__error">
                <span className="material-icons">error_outline</span>
                <span>{error}</span>
              </div>
            )}

            <div className="report-modal__field">
              <label htmlFor="report-category" className="report-modal__label">
                Issue Type
              </label>
              <select
                id="report-category"
                className="report-modal__select"
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

            <div className="report-modal__field">
              <label htmlFor="report-description" className="report-modal__label">
                Description <span className="report-modal__optional">(optional)</span>
              </label>
              <textarea
                id="report-description"
                className="report-modal__textarea"
                placeholder="Briefly describe the issue..."
                value={description}
                maxLength={MAX_DESCRIPTION_LENGTH}
                onChange={(e) => setDescription(e.target.value)}
              />
              <div className="report-modal__char-hint">
                {description.length}/{MAX_DESCRIPTION_LENGTH}
              </div>
            </div>

            <div className="report-modal__actions">
              <Button
                label={submitting ? 'Submitting...' : 'Submit Report'}
                variant="danger"
                onClick={handleSubmit}
                disabled={submitting}
              />
              <Button label="Cancel" variant="ghost" onClick={onClose} />
            </div>
          </>
        )}
      </GlassBlock>
    </div>
  );
};

export default ReportModal;
