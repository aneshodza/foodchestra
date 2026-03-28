import { useEffect, useState } from 'react';
import { client } from '@foodchestra/sdk';
import './BackendStatus.scss';

type Status = 'checking' | 'up' | 'down';

const HEALTH_POLL_INTERVAL_MS = 5_000;

function BackendStatus() {
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    const check = () => {
      client.health
        .getAlive()
        .then(() => setStatus('up'))
        .catch(() => setStatus('down'));
    };

    check();
    const interval = setInterval(check, HEALTH_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (status === 'checking') return null;

  const isUp = status === 'up';

  return (
    <div className={`backend-status alert alert-${isUp ? 'success' : 'danger'} d-flex align-items-center gap-2`} role="status">
      <span className="material-icons backend-status__icon">
        {isUp ? 'check_circle' : 'error'}
      </span>
      <span className="backend-status__label">
        {isUp ? 'Backend up' : 'Backend down'}
      </span>
    </div>
  );
}

export default BackendStatus;
