import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProductView from '../components/ProductView';
import { vi } from 'vitest';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    products: {
      getByBarcode: vi.fn(),
    },
  },
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

function renderProductView(barcode = '12345678', searchParams = '') {
  return render(
    <MemoryRouter initialEntries={[`/products/${barcode}${searchParams}`]}>
      <Routes>
        <Route path="/" element={<div>Scanner Page</div>} />
        <Route path="/products/:barcode" element={<ProductView />} />
        <Route
          path="/products/:barcode/maps/:batchNumber"
          element={<div data-testid="map-page">Map Page</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('ProductView', () => {
  it('renders loading state initially', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}));

    renderProductView();

    expect(screen.getByText('Fetching product details...')).toBeInTheDocument();
  });

  it('renders product details on success', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });

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

    renderProductView('00000000');

    await waitFor(() => {
      expect(screen.getByText('Product not found')).toBeInTheDocument();
    });
  });

  it('renders error message on API failure', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('API error'));

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

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('No image available')).toBeInTheDocument();
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
    });
  });

  it('shows N/A when quantity is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, quantity: null },
    });

    renderProductView();

    await waitFor(() => {
      expect(screen.getAllByText('N/A').some(el => el.closest('.col-sm-6'))).toBe(true);
    });
  });

  it('shows N/A when stores is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, stores: null },
    });

    renderProductView();

    await waitFor(() => {
      expect(screen.getAllByText('N/A').some(el => el.closest('.col-sm-6'))).toBe(true);
    });
  });

  it('shows fallback text when ingredientsText is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, ingredientsText: null },
    });

    renderProductView();

    await waitFor(() => {
      expect(screen.getByText('No ingredient list available.')).toBeInTheDocument();
    });
  });

  it('shows "Unknown Product" when name is missing', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: { ...mockProduct, name: null },
    });

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

    renderProductView();

    await waitFor(() => {
      expect(screen.queryByText('Nutri-Score')).not.toBeInTheDocument();
    });
  });

  it('navigates back to the scanner page when Back is clicked', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: true,
      product: mockProduct,
    });

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
      expect(screen.getByPlaceholderText('Batch number')).toBeInTheDocument();
    });

    it('input is empty by default when no batchNumber in URL', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('Batch number')).toHaveValue('');
    });

    it('input is pre-filled when batchNumber is in the URL', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      expect(screen.getByPlaceholderText('Batch number')).toHaveValue('LOT-2026-JW-042');
    });

    it('input is disabled when batchNumber comes from the URL', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      expect(screen.getByPlaceholderText('Batch number')).toBeDisabled();
    });

    it('input is enabled when no batchNumber is in the URL', async () => {
      await renderLoaded();
      expect(screen.getByPlaceholderText('Batch number')).not.toBeDisabled();
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
      const input = screen.getByPlaceholderText('Batch number');
      fireEvent.change(input, { target: { value: 'LOT-001' } });
      expect(screen.getByRole('button', { name: /route/i })).not.toBeDisabled();
    });

    it('clicking the journey button navigates to the map page', async () => {
      await renderLoaded('12345678', '?batchNumber=LOT-2026-JW-042');
      fireEvent.click(screen.getByRole('button', { name: /route/i }));
      await waitFor(() => expect(screen.getByTestId('map-page')).toBeInTheDocument());
    });

    it('navigates to the correct URL with the typed batch number', async () => {
      await renderLoaded();
      fireEvent.change(screen.getByPlaceholderText('Batch number'), {
        target: { value: 'LOT-CUSTOM-001' },
      });
      fireEvent.click(screen.getByRole('button', { name: /route/i }));
      await waitFor(() => expect(screen.getByTestId('map-page')).toBeInTheDocument());
    });
  });

  it('shows the Back to Scanner button on error and navigates back', async () => {
    const { client } = await import('@foodchestra/sdk');
    (client.products.getByBarcode as ReturnType<typeof vi.fn>).mockResolvedValue({
      found: false,
      product: null,
    });

    renderProductView();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Back to Scanner' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Back to Scanner' }));
    expect(screen.getByText('Scanner Page')).toBeInTheDocument();
  });
});
