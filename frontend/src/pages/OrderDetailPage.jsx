import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { STATUS_META, STATUS_TRANSITIONS, STATUS_HINTS, Badge } from '../lib/orderMeta.jsx';
import DashboardLayout from './DashboardLayout.jsx';
import { CustomSelect } from '../custom-select.jsx';

function formatDate(value) {
  return value ? new Date(value).toLocaleString('pl-PL') : '-';
}

function formatCost(value) {
  return value != null ? `${value} zł` : '-';
}

function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = React.useState(null);
  const [customer, setCustomer] = React.useState(null);
  const [bike, setBike] = React.useState(null);
  const [error, setError] = React.useState('');
  const [modalStatus, setModalStatus] = React.useState(null);
  const [statusNote, setStatusNote] = React.useState('');
  const [changingStatus, setChangingStatus] = React.useState(false);
  const [notifySms, setNotifySms] = React.useState(false);
  const [smsSent, setSmsSent] = React.useState(false);
  const [showOtherStatuses, setShowOtherStatuses] = React.useState(false);
  const [parts, setParts] = React.useState([]);
  const [partId, setPartId] = React.useState('');
  const [partQty, setPartQty] = React.useState('1');
  const [partPrice, setPartPrice] = React.useState('');
  const [addingPart, setAddingPart] = React.useState(false);
  const [partError, setPartError] = React.useState('');
  const [bikeHistory, setBikeHistory] = React.useState([]);
  const [showBikeHistory, setShowBikeHistory] = React.useState(false);

  const loadOrder = React.useCallback(() => {
    return apiFetch('/api/orders/orders/' + id + '/')
      .then((res) => {
        if (!res.ok) throw new Error('Nie znaleziono zlecenia.');
        return res.json();
      })
      .then((data) => {
        setOrder(data);
        setShowOtherStatuses(false);
        return data;
      });
  }, [id]);

  React.useEffect(() => {
    let cancelled = false;

    loadOrder()
      .then((data) => {
        if (cancelled) return;
        apiFetch('/api/customers/customers/' + data.customer + '/')
          .then((res) => (res.ok ? res.json() : null))
          .then((c) => !cancelled && setCustomer(c));
        apiFetch('/api/customers/bikes/' + data.bike + '/')
          .then((res) => (res.ok ? res.json() : null))
          .then((b) => !cancelled && setBike(b));
        apiFetch('/api/orders/orders/?bike=' + data.bike + '&ordering=-created_at')
          .then((res) => (res.ok ? res.json() : { results: [] }))
          .then((list) => {
            if (cancelled) return;
            setBikeHistory(list.results || list || []);
          });
      })
      .catch((err) => !cancelled && setError(err.message || 'Wystąpił błąd.'));

    return () => { cancelled = true; };
  }, [loadOrder]);

  React.useEffect(() => {
    apiFetch('/api/inventory/parts/')
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => setParts(data.results || data || []))
      .catch(() => setParts([]));
  }, []);

  const refreshOrder = () => {
    return apiFetch('/api/orders/orders/' + id + '/')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setOrder(data));
  };

  const addPart = async (e) => {
    e.preventDefault();
    setPartError('');
    if (!partId) return;
    const part = parts.find((p) => String(p.id) === String(partId));
    setAddingPart(true);
    try {
      const res = await apiFetch('/api/orders/orders/' + id + '/items/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_type: 'part',
          part: partId,
          description: part ? part.name : '',
          quantity: partQty || 1,
          unit_price: partPrice || part?.sell_price || 0,
        }),
      });
      if (!res.ok) throw new Error('Nie udało się dodać części.');
      await refreshOrder();
      setPartId('');
      setPartQty('1');
      setPartPrice('');
    } catch (err) {
      setPartError(err.message || 'Wystąpił błąd.');
    } finally {
      setAddingPart(false);
    }
  };

  const openStatusModal = (value) => {
    setModalStatus(value);
    setStatusNote('');
    setNotifySms(false);
    setShowOtherStatuses(false);
  };

  const closeStatusModal = () => {
    setModalStatus(null);
    setStatusNote('');
    setNotifySms(false);
  };

  const confirmStatusChange = async () => {
    setChangingStatus(true);
    setError('');
    setSmsSent(false);
    try {
      const res = await apiFetch('/api/orders/orders/' + id + '/status/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: modalStatus, note: statusNote }),
      });
      if (!res.ok) throw new Error('Nie udało się zmienić statusu.');
      const data = await res.json();
      setOrder(data);
      if (modalStatus === 'done' && notifySms) {
        // Mock - no real SMS provider wired up yet.
        setSmsSent(true);
      }
      setModalStatus(null);
      setStatusNote('');
      setNotifySms(false);
    } catch (err) {
      setError(err.message || 'Wystąpił błąd.');
    } finally {
      setChangingStatus(false);
    }
  };

  const suggestedStatuses = order ? (STATUS_TRANSITIONS[order.status] || []) : [];
  const isTerminal = !!order && suggestedStatuses.length === 0;
  const otherStatuses = order
    ? Object.keys(STATUS_META).filter((s) => s !== order.status && !suggestedStatuses.includes(s))
    : [];


  const partOptions = parts.map((p) => ({
    value: String(p.id),
    label: `${p.name}${p.sku ? ' (' + p.sku + ')' : ''} - stan: ${p.stock_quantity} ${p.unit}`,
  }));

  const choosePart = (value) => {
    setPartId(value);
    const part = parts.find((p) => String(p.id) === value);
    setPartPrice(part?.sell_price != null ? String(part.sell_price) : '');
  };

  const statusButtonStyle = (muted) => ({
    padding: '7px 14px',
    borderRadius: 999,
    fontSize: 13.5,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--line)',
    background: muted ? 'var(--paper-2)' : 'transparent',
    color: muted ? 'var(--ink-3)' : 'var(--ink)',
    opacity: muted ? 0.65 : 1,
  });

  if (error && !order) {
    return (
      <DashboardLayout>
        <div className="bf-error">{error}</div>
        <Link className="btn btn-ghost" to="/panel/orders" style={{ marginTop: 16 }}>Wróć do listy</Link>
      </DashboardLayout>
    );
  }

  if (!order) return <DashboardLayout>{null}</DashboardLayout>;

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Link
          to="/panel/orders"
          aria-label="Wróć do listy"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 32,
            height: 32,
            borderRadius: 8,
            border: '1px solid var(--line)',
            color: 'var(--ink)',
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ←
        </Link>
        <h1 style={{ margin: 0, color: 'var(--ink)' }}>Zlecenie #{order.id}</h1>
        <Badge meta={STATUS_META[order.status]} fallback={order.status} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 360px',
          gap: 16,
          alignItems: 'start',
          maxWidth: 1180,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="book-card">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {[
                ['Klient', customer ? `${customer.first_name} ${customer.last_name}${customer.phone ? ' (' + customer.phone + ')' : ''}` : '-'],
                ['Rower', bike ? `${bike.brand} ${bike.model}${bike.color ? ' - ' + bike.color : ''}` : '-'],
                ['Opis', order.description || '-'],
                ['Notatki mechanika', order.mechanic_notes || '-'],
                ['Koszt szacowany', formatCost(order.estimated_cost)],
                ['Koszt końcowy', formatCost(order.final_cost)],
                ['Utworzono', formatDate(order.created_at)],
                ['Przyjęto', formatDate(order.accepted_at)],
                ['Wydano', formatDate(order.delivered_at)],
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
                    minWidth: 0,
                  }}
                >
                  <span style={{ fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-3)', fontWeight: 700 }}>
                    {label}
                  </span>
                  <strong style={{ fontSize: 15, wordBreak: 'break-word' }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="book-card">
            <h3 style={{ marginBottom: 8 }}>Części użyte do serwisu</h3>
            {order.items && order.items.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Opis', 'Ilość', 'Cena jedn.'].map((h) => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--line)', color: 'var(--ink-2)', fontSize: 13 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{item.description}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{item.quantity}</td>
                      <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--line)' }}>{item.unit_price} zł</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="muted">Brak części.</p>
            )}

            <form onSubmit={addPart} className="bf-row" style={{ marginTop: 12, alignItems: 'flex-end' }}>
              <div className="bf-field" style={{ flex: 2 }}>
                <label>Część</label>
                <CustomSelect value={partId} onChange={choosePart} placeholder="Wybierz część…" options={partOptions} />
              </div>
              <div className="bf-field" style={{ maxWidth: 90 }}>
                <label>Ilość</label>
                <input type="number" min="0.01" step="0.01" value={partQty} onChange={(e) => setPartQty(e.target.value)} />
              </div>
              <div className="bf-field" style={{ maxWidth: 110 }}>
                <label>Cena jedn.</label>
                <input type="number" min="0" step="0.01" value={partPrice} onChange={(e) => setPartPrice(e.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={addingPart || !partId}>
                {addingPart ? 'Dodawanie…' : 'Dodaj część'}
              </button>
            </form>
            {partError && <div className="bf-error" style={{ marginTop: 10 }}>{partError}</div>}
          </div>

          <Link className="btn btn-ghost" to="/panel/orders" style={{ alignSelf: 'flex-start' }}>
            Wróć do listy
          </Link>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
          <div className="book-card" style={{ minWidth: 0 }}>
            <h3 style={{ marginBottom: 8 }}>Zmień status</h3>

            {isTerminal ? (
              <p className="muted">
                Zlecenie ma status "{STATUS_META[order.status]?.label || order.status}" - status nie może być już zmieniony.
              </p>
            ) : (
              <>
                <div className="bf-field">
                  <label>Nowy status</label>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, rowGap: 14 }}>
                    <Badge meta={STATUS_META[order.status]} fallback={order.status} />

                    {suggestedStatuses.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
                        {suggestedStatuses.map((value, i) => {
                          const n = suggestedStatuses.length;
                          const mid = (n - 1) / 2;
                          const arrow = n === 1 ? '→' : i < mid ? '↗' : i > mid ? '↘' : '→';
                          return (
                            <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--ink-3)', fontSize: 15, width: 18, textAlign: 'center' }}>{arrow}</span>
                              <button
                                type="button"
                                onClick={() => openStatusModal(value)}
                                className="status-tip"
                                data-tip={STATUS_HINTS[value] || ''}
                                style={statusButtonStyle(false)}
                              >
                                {STATUS_META[value]?.label || value}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {otherStatuses.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: 8,
                          minWidth: 0,
                          marginLeft: 8,
                          paddingLeft: 12,
                          borderLeft: '1px dashed var(--line)',
                        }}
                      >
                        {!showOtherStatuses ? (
                          <button
                            type="button"
                            onClick={() => setShowOtherStatuses(true)}
                            className="status-tip"
                            data-tip="Inne statusy"
                            style={statusButtonStyle(true)}
                          >
                            …
                          </button>
                        ) : (
                          otherStatuses.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => openStatusModal(value)}
                              className="status-tip"
                              data-tip={STATUS_HINTS[value] || ''}
                              style={statusButtonStyle(true)}
                            >
                              {STATUS_META[value]?.label || value}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {smsSent && <div className="bf-success">SMS do klienta wysłany (mock).</div>}
                {error && <div className="bf-error">{error}</div>}
              </>
            )}
          </div>

          <div className="book-card">
            <h3 style={{ marginBottom: 8 }}>Historia statusów</h3>
            {order.status_history && order.status_history.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {order.status_history.map((h) => (
                  <li key={h.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
                    <strong>{STATUS_META[h.old_status]?.label || h.old_status || '-'} → {STATUS_META[h.new_status]?.label || h.new_status}</strong>
                    {' - '}{formatDate(h.changed_at)}
                    {h.note && <div className="muted">{h.note}</div>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Brak historii.</p>
            )}
          </div>

          <div className="book-card">
            <button
              type="button"
              onClick={() => setShowBikeHistory((v) => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit',
                color: 'inherit',
              }}
            >
              <h3 style={{ margin: 0 }}>
                Historia zleceń tego roweru{bikeHistory.length > 0 ? ` (${bikeHistory.length})` : ''}
              </h3>
              <span style={{ color: 'var(--ink-3)', fontSize: 13 }}>{showBikeHistory ? '▲' : '▼'}</span>
            </button>

            {showBikeHistory && (
              bikeHistory.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0' }}>
                  {bikeHistory.map((o) => {
                    const isCurrent = String(o.id) === String(order.id);
                    return (
                    <li key={o.id}>
                      <Link
                        to={'/panel/orders/' + o.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10,
                          padding: '10px 12px',
                          margin: '2px 0',
                          borderRadius: 10,
                          border: isCurrent ? '2px solid var(--accent)' : '1px solid transparent',
                          borderBottom: isCurrent ? '2px solid var(--accent)' : '1px solid var(--line)',
                          color: 'var(--ink)',
                          textDecoration: 'none',
                        }}
                      >
                        <span>
                          <strong>Zlecenie #{o.id}</strong>
                          <span className="muted" style={{ marginLeft: 8 }}>{formatDate(o.created_at)}</span>
                        </span>
                        <Badge meta={STATUS_META[o.status]} fallback={o.status} />
                      </Link>
                    </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="muted" style={{ marginTop: 8 }}>Brak innych zleceń dla tego roweru.</p>
              )
            )}
          </div>
        </div>
      </div>

      {modalStatus && (
        <div
          onClick={closeStatusModal}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            className="book-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 420, width: '90%' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Badge meta={STATUS_META[order.status]} fallback={order.status} />
              <span style={{ color: 'var(--ink-3)' }}>→</span>
              <Badge meta={STATUS_META[modalStatus]} fallback={modalStatus} />
            </div>

            {STATUS_HINTS[modalStatus] && (
              <p className="muted" style={{ marginTop: 4 }}>{STATUS_HINTS[modalStatus]}</p>
            )}

            <div className="bf-field" style={{ marginTop: 8 }}>
              <label>Notatka <span className="muted">(opcjonalnie)</span></label>
              <input value={statusNote} onChange={(e) => setStatusNote(e.target.value)} autoFocus />
            </div>

            {modalStatus === 'done' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                />
                Powiadom klienta SMS-em o odbiorze (mock)
              </label>
            )}

            {error && <div className="bf-error">{error}</div>}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={confirmStatusChange}
                disabled={changingStatus}
              >
                {changingStatus ? 'Zapisywanie…' : 'Potwierdź zmianę statusu'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={closeStatusModal}>
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default OrderDetailPage;
