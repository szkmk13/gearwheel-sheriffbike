import React from 'react';
import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 16,
      background: 'var(--paper)', color: 'var(--ink)', textAlign: 'center', padding: 24,
    }}>
      <h1 className="display" style={{ fontSize: 48, margin: 0 }}>404</h1>
      <p style={{ color: 'var(--ink-2)' }}>Nie znaleziono strony, której szukasz.</p>
      <Link className="btn btn-primary" to="/">Wróć na stronę główną</Link>
    </div>
  );
}

export default NotFoundPage;
