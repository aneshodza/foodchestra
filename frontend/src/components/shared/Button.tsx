import './Button.scss';

interface ButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  disabled?: boolean;
  icon?: string;
  fullWidth?: boolean;
}

function Button({ label, onClick, variant = 'primary', disabled = false, icon, fullWidth = false }: ButtonProps) {
  return (
    <button
      className={`fc-button fc-button--${variant}${fullWidth ? ' fc-button--full' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      {icon && <span className="material-icons fc-button__icon" aria-hidden="true">{icon}</span>}
      {label}
    </button>
  );
}

export default Button;
