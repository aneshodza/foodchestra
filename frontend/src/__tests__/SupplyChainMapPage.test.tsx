import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import SupplyChainMapPage from '../components/SupplyChainMapPage';

vi.mock('../components/SupplyChainMap', () => ({
  default: ({ barcode, batchNumber }: { barcode: string; batchNumber: string }) => (
    <div
      data-testid="supply-chain-map"
      data-barcode={barcode}
      data-batch-number={batchNumber}
    />
  ),
}));

function renderPage(barcode = '7610800749004', batchNumber = 'LOT-2026-JW-042') {
  return render(
    <MemoryRouter initialEntries={[`/products/${barcode}/maps/${batchNumber}`]}>
      <Routes>
        <Route path="/products/:barcode" element={<div data-testid="product-page">Product</div>} />
        <Route path="/products/:barcode/maps/:batchNumber" element={<SupplyChainMapPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SupplyChainMapPage', () => {
  it('renders the Supply Chain Journey heading', () => {
    renderPage();
    expect(screen.getByText('Supply Chain Journey')).toBeInTheDocument();
  });

  it('shows the batch number in the subtitle', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    expect(screen.getByText('LOT-2026-JW-042')).toBeInTheDocument();
  });

  it('shows the barcode in the subtitle', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    expect(screen.getByText('7610800749004')).toBeInTheDocument();
  });

  it('renders the SupplyChainMap with the correct barcode prop', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    expect(screen.getByTestId('supply-chain-map')).toHaveAttribute('data-barcode', '7610800749004');
  });

  it('renders the SupplyChainMap with the correct batchNumber prop', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    expect(screen.getByTestId('supply-chain-map')).toHaveAttribute(
      'data-batch-number',
      'LOT-2026-JW-042',
    );
  });

  it('back link points to the product page with batchNumber as query param', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    const backLink = screen.getByRole('link', { name: /back to product/i });
    expect(backLink).toHaveAttribute(
      'href',
      '/products/7610800749004?batchNumber=LOT-2026-JW-042',
    );
  });

  it('navigates back to the product page when the back link is clicked', () => {
    renderPage('7610800749004', 'LOT-2026-JW-042');
    fireEvent.click(screen.getByRole('link', { name: /back to product/i }));
    expect(screen.getByTestId('product-page')).toBeInTheDocument();
  });

  it('url-encodes special characters in barcode and batchNumber', () => {
    renderPage('123 456', 'LOT 2026');
    const backLink = screen.getByRole('link', { name: /back to product/i });
    expect(backLink.getAttribute('href')).toContain(encodeURIComponent('LOT 2026'));
  });
});
