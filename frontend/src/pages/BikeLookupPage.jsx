import React from 'react';
import { apiFetch } from '../lib/api.js';
import DashboardLayout from './DashboardLayout.jsx';

function BikeLookupPage() {
  const [code, setCode] = React.useState('');
  const [bike, setBike] = React.useState(null);
  const [orders, setOrders] = React.useState([]);
  const [error, setError] = React.useState('');
  const [searching, setSearching] = React.useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBike(null);
    setOrders([]);
    setSearching(true);
    try {
      const res = await apiFetch('/api/customers/bikes/lookup/?code=' + encodeURIComponent(code));
      if (res.status === 404) {
        setError('Nie znaleziono roweru dla podanego kodu.');
        return;
      }
      if (!res.ok) {
        throw new Error('Wystąpił błąd podczas wyszukiwania.');
      }
      const data = await res.json();
      setBike(data);

      const ordersRes = await apiFetch('/api/orders/orders/?bike=' + data.id);
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.results || ordersData || []);
      }
    } catch (err) {
      setError(err.message || 'Wystąpił błąd podczas wyszukiwania.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <DashboardLayout>
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <form className="book-card" onSubmit={submit} noValidate>
        <h2 style={{ margin: '0 0 16px' }}>Wyszukaj rower</h2>
        <div className="bf-field">
          <label>Kod QR / sheriff code</label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="sheriff-123-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
          />
        </div>
        {error && <div className="bf-error">{error}</div>}
        <button type="submit" className="btn btn-primary btn-lg bf-submit" disabled={searching}>
          {searching ? 'Szukam…' : 'Szukaj'}
        </button>
      </form>

      {bike && (
        <div className="book-card" style={{ marginTop: 24 }}>
          <h3 style={{ marginTop: 0 }}>Rower</h3>
          <div className="bs-summary">
            <div><span>Marka / model</span><strong>{bike.brand} {bike.model}</strong></div>
            <div><span>Kolor</span><strong>{bike.color || '-'}</strong></div>
            <div><span>Klient</span><strong>{bike.customer_name || (bike.customer && bike.customer.id)}</strong></div>
          </div>

          <h3>Historia napraw</h3>
          {orders.length === 0 ? (
            <p className="muted">Brak zleceń naprawy dla tego roweru.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {orders.map((o) => (
                <li key={o.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                  <strong>#{o.id}</strong> - {o.status} ({o.priority}) - {new Date(o.created_at).toLocaleDateString('pl-PL')}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}

export default BikeLookupPage;
