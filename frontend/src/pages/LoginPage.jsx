import React from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { SheriffStar } from '../icons.jsx';

function LoginPage() {
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (status === 'authenticated') {
      const next = searchParams.get('next') || '/panel/intake';
      navigate(next, { replace: true });
    }
  }, [status, navigate, searchParams]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(username, password);
      const next = searchParams.get('next') || '/panel/intake';
      navigate(next, { replace: true });
    } catch (err) {
      setError('Nieprawidłowa nazwa użytkownika lub hasło.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--paper)', padding: 24,
    }}>
      <form className="book-card" onSubmit={submit} noValidate style={{ maxWidth: 420, width: '100%' }}>
        <div className="eyebrow" style={{ justifyContent: 'center', marginBottom: 8 }}>
          <SheriffStar size={15} /> Sheriff Bike
        </div>
        <h2 style={{ textAlign: 'center', margin: '0 0 8px' }}>Logowanie</h2>
        <p className="muted" style={{ textAlign: 'center', marginTop: 0 }}>
          Panel dla pracowników warsztatu.
        </p>

        <div className="bf-field">
          <label>Nazwa użytkownika</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </div>

        <div className="bf-field">
          <label>Hasło</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <div className="bf-error">{error}</div>}

        <button type="submit" className="btn btn-primary btn-lg bf-submit" disabled={submitting}>
          {submitting ? 'Logowanie…' : 'Zaloguj się'}
        </button>

        <p className="bf-fine muted" style={{ textAlign: 'center' }}>
          <Link to="/">Wróć na stronę główną</Link>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
