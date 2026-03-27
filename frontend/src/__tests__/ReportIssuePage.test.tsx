import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ReportIssuePage from '../components/ReportIssuePage';
import { vi } from 'vitest';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    reports: {
      createReport: vi.fn(),
    },
  },
}));

const mockReport = {
  id: 'uuid-111',
  productId: 1,
  category: 'quality_issue',
  description: null,
  createdAt: '2026-03-27T10:00:00Z',
};

function renderReportIssuePage(barcode = '12345678') {
  return render(
    <MemoryRouter initialEntries={[`/products/${barcode}/report`]}>
      <Routes>
        <Route path="/products/:barcode" element={<div>Product Page</div>} />
        <Route path="/products/:barcode/report" element={<ReportIssuePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ReportIssuePage', () => {
  it('renders the form with category select and description textarea', () => {
    renderReportIssuePage();

    expect(screen.getByText('Report an Issue')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue Type')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Briefly describe the issue...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders all category options', () => {
    renderReportIssuePage();

    const select = screen.getByLabelText('Issue Type');
    expect(select).toBeInTheDocument();
    expect(screen.queryByText('Expired Product')).not.toBeInTheDocument();
    expect(screen.getByText('Damaged Packaging')).toBeInTheDocument();
    expect(screen.getByText('Quality Issue')).toBeInTheDocument();
    expect(screen.getByText('Foreign Object Found')).toBeInTheDocument();
    expect(screen.getByText('Mislabeled / Wrong Information')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('shows confirmation message on successful submit', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.reports.createReport as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport);

    renderReportIssuePage();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(
        screen.getByText('Thanks for your feedback! Your report helps other users stay safe.'),
      ).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Back to Product' })).toBeInTheDocument();
  });

  it('calls createReport with the selected category and description', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.reports.createReport as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport);

    renderReportIssuePage('7610807001024');

    fireEvent.change(screen.getByLabelText('Issue Type'), {
      target: { value: 'damaged_packaging' },
    });
    fireEvent.change(screen.getByPlaceholderText('Briefly describe the issue...'), {
      target: { value: 'Box was crushed' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(client.reports.createReport).toHaveBeenCalledWith('7610807001024', {
        category: 'damaged_packaging',
        description: 'Box was crushed',
      });
    });
  });

  it('omits description when the field is empty', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.reports.createReport as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport);

    renderReportIssuePage();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(client.reports.createReport).toHaveBeenCalledWith('12345678', {
        category: 'damaged_packaging',
        description: undefined,
      });
    });
  });

  it('shows error message when API call fails', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.reports.createReport as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('network error'));

    renderReportIssuePage();

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(
        screen.getByText('Failed to submit your report. Please try again.'),
      ).toBeInTheDocument();
    });
    // Form should still be visible after error
    expect(screen.getByRole('button', { name: 'Submit Report' })).toBeInTheDocument();
  });

  it('Cancel button navigates back to the product page', () => {
    renderReportIssuePage('12345678');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(screen.getByText('Product Page')).toBeInTheDocument();
  });

  it('Back link navigates to the product page after successful submit', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.reports.createReport as ReturnType<typeof vi.fn>).mockResolvedValue(mockReport);

    renderReportIssuePage('12345678');

    fireEvent.click(screen.getByRole('button', { name: 'Submit Report' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Product' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Product' }));
    expect(screen.getByText('Product Page')).toBeInTheDocument();
  });
});
