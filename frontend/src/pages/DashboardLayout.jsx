import React from 'react';
import { NavLink } from 'react-router-dom';
import { Wrench } from 'lucide-react';
import { useAuth } from '../lib/auth.jsx';

const INTAKE_ITEM = { label: 'Przyjęcie', to: '/panel/intake', icon: Wrench };

const NAV_ITEMS = [
  { label: 'Podsumowanie', to: '/panel' },
  { label: 'Zamówienia', to: '/panel/orders' },
  { label: 'Klienci', to: null },
  { label: 'Rowery', to: null },
  { label: 'Magazyn', to: null },
  { label: 'Inwentaryzacja', to: null },
];

function DashboardLayout({ children }) {
  const { logout } = useAuth();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <aside
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 240,
          background: 'var(--paper-2)',
          borderLeft: '1px solid var(--line)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--ink)' }}>
          Sheriff Bike
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <NavLink
            to={INTAKE_ITEM.to}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              color: 'var(--accent-ink)',
              background: 'var(--accent)',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            <INTAKE_ITEM.icon size={16} />
            {INTAKE_ITEM.label}
          </NavLink>

          {NAV_ITEMS.map((item) =>
            item.to ? (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === '/panel'}
                style={({ isActive }) => ({
                  padding: '10px 12px',
                  borderRadius: 8,
                  textDecoration: 'none',
                  color: isActive ? 'var(--accent-deep)' : 'var(--ink-2)',
                  background: 'transparent',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                })}
              >
                {item.label}
              </NavLink>
            ) : (
              <span
                key={item.label}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  color: 'var(--ink-3)',
                  fontWeight: 500,
                  cursor: 'not-allowed',
                }}
              >
                {item.label}
              </span>
            )
          )}
        </nav>

        <button
          type="button"
          onClick={logout}
          style={{
            marginTop: 'auto',
            padding: '10px 12px',
            borderRadius: 8,
            border: 'none',
            background: 'transparent',
            color: 'var(--ink-2)',
            fontWeight: 500,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          Wyloguj
        </button>
      </aside>
      <main style={{ marginRight: 240, padding: '48px 32px' }}>{children}</main>
    </div>
  );
}

export default DashboardLayout;
