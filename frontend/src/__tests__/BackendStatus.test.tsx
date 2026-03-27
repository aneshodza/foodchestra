import { render, screen, waitFor } from '@testing-library/react';
import BackendStatus from '../components/shared/BackendStatus';

vi.mock('@foodchestra/sdk', () => ({
  client: {
    health: {
      getAlive: vi.fn(),
    },
  },
}));

import { client } from '@foodchestra/sdk';

const mockGetAlive = client.health.getAlive as ReturnType<typeof vi.fn>;

afterEach(() => {
  vi.clearAllMocks();
});

describe('BackendStatus', () => {
  it('renders nothing while the initial check is in progress', () => {
    mockGetAlive.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<BackendStatus />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows "Backend up" after a successful health check', async () => {
    mockGetAlive.mockResolvedValue({ status: 'ok' });
    render(<BackendStatus />);
    await waitFor(() => expect(screen.getByText('Backend up')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveClass('alert-success');
  });

  it('shows "Backend down" after a failed health check', async () => {
    mockGetAlive.mockRejectedValue(new Error('connection refused'));
    render(<BackendStatus />);
    await waitFor(() => expect(screen.getByText('Backend down')).toBeInTheDocument());
    expect(screen.getByRole('status')).toHaveClass('alert-danger');
  });
});
