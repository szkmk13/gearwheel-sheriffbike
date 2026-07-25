import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { STATUS_META, Badge } from '../lib/orderMeta.jsx';
import DashboardLayout from './DashboardLayout.jsx';

function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = React.useState([]);
  const [error, setError] = React.useState('');
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch('/api/orders/orders/')
      .then((res) => {
        if (!res.ok) throw new Error('Nie udało się pobrać zleceń.');
        return res.json();
      })
      .then((data) => setOrders(data.results || data || []))
      .catch((err) => setError(err.message || 'Wystąpił błąd.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <h1 style={{ margin: '0 0 16px', color: 'var(--ink)' }}>Zamówienia</h1>

      {error && <div className="bf-error">{error}</div>}

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <span className="bf-spinner" aria-label="Ładowanie…" />
        </div>
      )}

      {!loading && !error && orders.length === 0 && <p style={{ color: 'var(--ink-2)' }}>Brak zleceń.</p>}

      {!loading && orders.length > 0 && (
        <div
          className="book-card"
          style={{ padding: 0, overflow: 'hidden' }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--paper-3)' }}>
                {['Klient', 'Rower', 'Status', 'Data'].map((h) => (
                  <th
                    key={h}
                    style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--ink-2)', fontWeight: 600, fontSize: 13 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => navigate('/panel/orders/' + order.id)}
                  style={{ cursor: 'pointer', borderTop: '1px solid var(--line)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--paper-3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ padding: '12px 16px' }}>{order.customer_name}</td>
                  <td style={{ padding: '12px 16px' }}>{order.bike_label}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge meta={STATUS_META[order.status]} fallback={order.status} />
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--ink-2)' }}>
                    {new Date(order.created_at).toLocaleDateString('pl-PL')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}

export default OrdersListPage;
