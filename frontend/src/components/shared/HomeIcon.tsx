interface HomeIconProps {
  className?: string;
}

function HomeIcon({ className = '' }: HomeIconProps) {
  return (
    <span className={`material-icons ${className}`.trim()} aria-hidden="true">
      home
    </span>
  );
}

export default HomeIcon;
