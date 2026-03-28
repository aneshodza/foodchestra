import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductView from '../components/ProductView';
import { vi } from 'vitest';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    products: {
      getByBarcode: vi.fn(),
      getCoolingStatus: vi.fn(),
      getEnrichment: vi.fn(),
    },
    reports: {
      getReports: vi.fn(),
      createReport: vi.fn(),
    },
  },
}));

vi.mock('../components/SupplyChainMap', () => ({
  default: ({ batchNumber }: { batchNumber: string }) => (
    <div data-testid="supply-chain-map">Mock Map for {batchNumber}</div>
  ),
}));

const mockProduct = {
  barcode: '12345678',
  name: 'Test Chocolate',
  brands: 'Test Brand',
  stores: 'Test Store',
  countries: 'Switzerland',
  quantity: '100g',
  nutriscoreGrade: 'a',
  ingredientsText: 'Cocoa, Sugar',
  ingredients: [],
  imageUrl: 'http://example.com/image.jpg',
};

const emptyReports = {
  count: 0,
  recentCount24h: 0,
  hasWarning: false,
  reports: [],
};

function renderProductView(barcode = '12345678', searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/products/${barcode}${searchParams}`]}>
      <Routes>
        <Route path="/" element={<div>Scanner Page</div>} />
        <Route path="/products/:barcode" element={<ProductView />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  const { client } = await import('@foodchestra/sdk');
  (client.products.getEnrichment as ReturnType<typeof vi.fn>).mockResolvedValue({
    safetyLevel: 'safe',
    safetyReason: 'No issues detected.',
    matchedRecalls: [],
    allergenWarnings: [],
    sustainabilityNote: '',
    qualityNote: '',
  });
  (client.products.getCoolingStatus as ReturnType<typeof vi.fn>).mockResolvedValue({ potentialBreach: false });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ProductView', () => {
  it('renders loading state initially', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderProductView();

    expect(screen.getByText('Fetching product details...')).toBeInTheDocument();
  });

  it('renders product details on success', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('Test Chocolate')).toBeInTheDocument();
      expect(screen.getByText('Test Brand')).toBeInTheDocument();
      expect(screen.getByText('12345678')).toBeInTheDocument();
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  it('renders error message when product is not found', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: false,
      product: null,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView('00000000');

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
    });
  });

  it('renders error message on API failure', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('Failed to load product details')).toBeInTheDocument();
    });
  });

  it('renders the product image when imageUrl is present', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      const img = screen.getByRole('img', { name: 'Test Chocolate' });
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'http://example.com/image.jpg');
    });
  });

  it('renders the no-image placeholder when imageUrl is absent', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, imageUrl: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('No image')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  it('shows N/A when quantity is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, quantity: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('shows N/A when stores is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, stores: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    });
  });

  it('does not show the ingredients section when ingredientsText is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, ingredientsText: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    expect(screen.queryByText('Ingredients')).not.toBeInTheDocument();
  });

  it('shows "Unknown Product" when name is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, name: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('Unknown Product')).toBeInTheDocument();
    });
  });

  it('shows "No brand info" when brands is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, brands: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('No brand info')).toBeInTheDocument();
    });
  });

  it('does not render the nutri-score badge when nutriscoreGrade is absent', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, nutriscoreGrade: null },
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    expect(screen.queryByText('Nutri')).not.toBeInTheDocument();
  });

  it('navigates back to the scanner page when Back is clicked', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Scanner Page')).toBeInTheDocument();
  });

  describe('Trace Journey section', () => {
    async function renderLoaded(barcode = '12345678', searchParams = '') {
      const { client } = await import('@foodchestra/sdk');
      (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
        found: true,
        product: mockProduct,
      });
      renderProductView(barcode, searchParams);
      await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    }

    it('shows the Trace Journey label after product loads', async () => {
      await renderLoaded();
      expect(screen.getByText('Trace Journey')).toBeInTheDocument();
    });

    it('renders the batch number input', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('Enter batch number')).toBeInTheDocument();
    });

    it('input is empty by default when no batchNumber in URL', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('Enter batch number')).toHaveValue('');
    });

    it('input is pre-filled when batchNumber is in the URL', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      expect(screen.getByPlaceholderText('Enter batch number')).toHaveValue('LOT-2026-JW-042');
    });

    it('input is disabled when batchNumber comes from the URL', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      expect(screen.getByPlaceholderText('Enter batch number')).toBeDisabled();
    });

    it('input is enabled when no batchNumber is in the URL', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('Enter batch number')).not.toBeDisabled();
    });

    it('journey button is disabled when input is empty', async () => {
      await renderLoaded();
      expect(screen.getByRole('button', { name: /route/i })).toBeDisabled();
    });

    it('journey button is enabled when input has a value', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      expect(screen.getByRole('button', { name: /route/i })).not.toBeDisabled();
    });

    it('typing in the input enables the journey button', async () => {
      await renderLoaded();
      const input = screen.getByPlaceholderText('Enter batch number');
      fireEvent.change(input, { target: { value: 'LOT-001' } });
      expect(screen.getByRole('button', { name: /route/i })).not.toBeDisabled();
    });

    it('clicking the journey button shows the supply chain map inline', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      fireEvent.click(screen.getByRole('button', { name: /route/i }));
      await waitFor(() => expect(screen.getByTestId('supply-chain-map')).toBeInTheDocument());
    });

    it('shows the map with the correct batch number', async () => {
      await renderLoaded();
      fireEvent.change(screen.getByPlaceholderText('Enter batch number'), {
        target: { value: 'LOT-CUSTOM-001' },
      });
      fireEvent.click(screen.getByRole('button', { name: /route/i }));
      await waitFor(() =>
        expect(screen.getByText('Mock Map for LOT-CUSTOM-001')).toBeInTheDocument(),
      );
    });
  });

  it('shows the Back to Scanner button on error and navigates back', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: false,
      product: null,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Back to Scanner' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Back to Scanner' }));
    expect(screen.getByText('Scanner Page')).toBeInTheDocument();
  });

  it('shows warning alert when hasWarning is true', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 6,
      recentCount24h: 5,
      hasWarning: true,
      reports: [],
    });

    renderProductView();

    await waitFor(() => {
      expect(
        screen.getByText('Multiple users have reported issues with this product recently.'),
      ).toBeInTheDocument();
    });
  });

  it('shows social proof text when count > 0', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 3,
      recentCount24h: 1,
      hasWarning: false,
      reports: [],
    });

    renderProductView();

    await waitFor(() => {
      expect(
        screen.getByText('3 users reported issues in the last 30 days'),
      ).toBeInTheDocument();
    });
  });

  it('does not show social proof when count is 0', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);

    renderProductView();

    await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    expect(screen.queryByText(/reported issues/)).not.toBeInTheDocument();
  });

  it('still shows product when reports fetch fails', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('reports error'));

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('Test Chocolate')).toBeInTheDocument();
    });
    expect(screen.queryByText(/reported issues/)).not.toBeInTheDocument();
  });

  it('shows cooling breach warning when potentialBreach is true', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
    (client.products.getCoolingStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      potentialBreach: true,
    });

    renderProductView();

    await waitFor(() => {
      expect(
        screen.getByText('A potential cooling chain breach was detected for this product. Quality may be affected.'),
      ).toBeInTheDocument();
    });
  });

  it('does not show cooling breach warning when potentialBreach is false', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
    (client.products.getCoolingStatus as ReturnType<typeof vi.fn>).mockResolvedValue({
      potentialBreach: false,
    });

    renderProductView();

    await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    expect(screen.queryByText(/cooling chain breach/)).not.toBeInTheDocument();
  });

  it('still shows product when cooling status fetch fails', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });
    (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
    (client.products.getCoolingStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('cooling error'));

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('Test Chocolate')).toBeInTheDocument();
    });
    expect(screen.queryByText(/cooling chain breach/)).not.toBeInTheDocument();
  });

  describe('AI Enrichment panel', () => {
    const mockRecall = {
      id: 6,
      headerDe: 'Coop ruft die Austern zurück',
      headerFr: null,
      headerIt: null,
      descriptionDe: 'Coop ruft die Austern aufgrund von Noroviren zurück.',
      metaDe: 'Bern, 8.1.2020',
      imageUrlDe: null,
      authorityNameDe: 'Bundesamt für Lebensmittelsicherheit und Veterinärwesen',
    };

    async function renderLoaded() {
      const { client } = await import('@foodchestra/sdk');
      (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
        found: true,
        product: mockProduct,
      });
      (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
      renderProductView();
      await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
    }

    it('shows AI Analysis card header', async () => {
      await renderLoaded();
      await waitFor(() => expect(screen.getByText('AI Analysis')).toBeInTheDocument());
    });

    it('shows safe status from enrichment', async () => {
      await renderLoaded();
      await waitFor(() => expect(screen.getByText('No Safety Concerns')).toBeInTheDocument());
    });

    it('shows danger status with matched recall', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
        found: true,
        product: mockProduct,
      });
      (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
      (client.products.getEnrichment as ReturnType<typeof vi.fn>).mockResolvedValue({
        safetyLevel: 'danger',
        safetyReason: 'Active government recall due to Noroviren.',
        matchedRecalls: [mockRecall],
        allergenWarnings: ['Shellfish'],
        sustainabilityNote: '',
        qualityNote: '',
      });

      renderProductView();

      await waitFor(() => {
        expect(screen.getByText('Safety Alert')).toBeInTheDocument();
        expect(screen.getByText('Active government recall due to Noroviren.')).toBeInTheDocument();
        expect(screen.getByText('Coop ruft die Austern zurück')).toBeInTheDocument();
        expect(screen.getByText('Shellfish')).toBeInTheDocument();
      });
    });

    it('shows allergen badges', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
        found: true,
        product: mockProduct,
      });
      (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
      (client.products.getEnrichment as ReturnType<typeof vi.fn>).mockResolvedValue({
        safetyLevel: 'caution',
        safetyReason: 'Contains allergens.',
        matchedRecalls: [],
        allergenWarnings: ['Gluten', 'Lactose'],
        sustainabilityNote: 'Low carbon footprint.',
        qualityNote: 'Good nutriscore.',
      });

      renderProductView();

      await waitFor(() => {
        expect(screen.getByText('Gluten')).toBeInTheDocument();
        expect(screen.getByText('Lactose')).toBeInTheDocument();
        expect(screen.getByText('Low carbon footprint.')).toBeInTheDocument();
        expect(screen.getByText('Good nutriscore.')).toBeInTheDocument();
      });
    });

    it('shows unavailable message when enrichment fails', async () => {
      const { client } = await import('@foodchestra/sdk');
      (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
        found: true,
        product: mockProduct,
      });
      (client.reports.getReports as ReturnType<typeof vi.fn>).mockResolvedValue(emptyReports);
      (client.products.getEnrichment as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('agent down'),
      );

      renderProductView();

      await waitFor(() => expect(screen.getByText('Test Chocolate')).toBeInTheDocument());
      await waitFor(() =>
        expect(screen.getByText('AI analysis unavailable right now.')).toBeInTheDocument(),
      );
    });
  });
});
