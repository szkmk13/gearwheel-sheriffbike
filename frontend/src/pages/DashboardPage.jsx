import React from 'react';
import { apiFetch } from '../lib/api.js';
import TrendChart from '../lib/TrendChart.jsx';
import DashboardLayout from './DashboardLayout.jsx';

function formatMoney(value) {
  return `${Number(value).toFixed(0)} zł`;
}

function formatWeek(value) {
  return new Date(value).toLocaleDateString('pl-PL');
}

function DashboardPage() {
  const [data, setData] = React.useState(null);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    apiFetch('/api/orders/dashboard/')
      .then((res) => {
        if (!res.ok) throw new Error('Nie udało się pobrać danych.');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message || 'Wystąpił błąd.'));
  }, []);

  return (
    <DashboardLayout>
      <h1 style={{ margin: '0 0 16px', color: 'var(--ink)' }}>Podsumowanie</h1>

      {error && <div className="bf-error">{error}</div>}

      {data && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 20,
            }}
          >
            {[
              ['Rowery', data.bikes_count],
              ['Klienci', data.customers_count],
              ['Ukończone w tym tygodniu', data.orders_completed_this_week],
              ['Zysk w tym tygodniu', formatMoney(data.profit_this_week)],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  background: 'var(--paper-2)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 5,
                }}
              >
                <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', fontWeight: 700 }}>
                  {label}
                </span>
                <strong style={{ fontSize: 22 }}>{value}</strong>
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            <TrendChart
              title="Ukończone zlecenia - ostatnie 8 tygodni"
              points={data.weekly_trend.map((w) => ({ label: formatWeek(w.week_start), value: w.orders_completed }))}
              formatValue={(v) => String(v)}
            />
            <TrendChart
              title="Zysk - ostatnie 8 tygodni"
              points={data.weekly_trend.map((w) => ({ label: formatWeek(w.week_start), value: Number(w.profit) }))}
              formatValue={formatMoney}
            />
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default DashboardPage;
