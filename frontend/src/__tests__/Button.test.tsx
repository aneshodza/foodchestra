import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/shared/Button';

describe('Button', () => {
  it('renders with the given label', () => {
    render(<Button label="Click me" onClick={() => {}} />);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies the primary variant class by default', () => {
    render(<Button label="Test" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  it('applies the correct class for secondary variant', () => {
    render(<Button label="Test" onClick={() => {}} variant="secondary" />);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');
  });

  it('applies the correct class for danger variant', () => {
    render(<Button label="Test" onClick={() => {}} variant="danger" />);
    expect(screen.getByRole('button')).toHaveClass('btn-danger');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button label="Test" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when the disabled prop is true', () => {
    render(<Button label="Test" onClick={() => {}} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(<Button label="Test" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('always has type="button"', () => {
    render(<Button label="Test" onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
