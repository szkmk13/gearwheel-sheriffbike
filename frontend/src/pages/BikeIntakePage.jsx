import React from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import QrScanner from '../lib/QrScanner.jsx';
import DashboardLayout from './DashboardLayout.jsx';
import { CustomSelect } from '../custom-select.jsx';

const BIKE_TYPES = [
  { value: 'road', label: 'Szosowy' },
  { value: 'mtb', label: 'MTB' },
  { value: 'city', label: 'Miejski' },
  { value: 'gravel', label: 'Gravel' },
  { value: 'electric', label: 'Elektryczny' },
  { value: 'other', label: 'Inny' },
];

function BikeIntakePage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = React.useState([]);
  const [customerMode, setCustomerMode] = React.useState('existing');
  const [customerId, setCustomerId] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [showScanner, setShowScanner] = React.useState(false);
  const [scanError, setScanError] = React.useState('');
  const [foundBike, setFoundBike] = React.useState(null);
  const [customerBikes, setCustomerBikes] = React.useState([]);
  const [bikeChoice, setBikeChoice] = React.useState(null);
  const [orderDescription, setOrderDescription] = React.useState('');
  const [estimatedCost, setEstimatedCost] = React.useState('');
  const [orderCreated, setOrderCreated] = React.useState(false);
  const [newCustomer, setNewCustomer] = React.useState({
    first_name: '', last_name: '', phone: '', email: '',
  });
  const [bike, setBike] = React.useState({
    brand: '', model: '', bike_type: 'road', color: '', serial_no: '', year: '',
  });
  const [photo, setPhoto] = React.useState(null);
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    apiFetch('/api/customers/customers/')
      .then((res) => (res.ok ? res.json() : { results: [] }))
      .then((data) => setCustomers(data.results || data || []))
      .catch(() => setCustomers([]));
  }, []);

  const setNewCustomerField = (k) => (e) => setNewCustomer((f) => ({ ...f, [k]: e.target.value }));
  const setBikeField = (k) => (e) => setBike((f) => ({ ...f, [k]: e.target.value }));

  const selectedCustomer = customers.find((c) => String(c.id) === String(customerId));

  const filteredCustomers = React.useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter((c) => {
        const name = (c.first_name + ' ' + c.last_name).toLowerCase();
        return name.includes(q) || (c.phone || '').toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [customerSearch, customers]);

  const selectCustomerForScan = (id) => {
    setCustomerId(String(id));
    setCustomerSearch('');
    setShowScanner(false);
    setScanError('');
  };

  const selectCustomer = async (id) => {
    selectCustomerForScan(id);
    setCustomerBikes([]);
    setBikeChoice(null);
    try {
      const res = await apiFetch('/api/customers/bikes/?customer=' + id);
      const data = res.ok ? await res.json() : { results: [] };
      const bikes = data.results || data || [];
      setCustomerBikes(bikes);
      if (bikes.length === 0) setBikeChoice('new');
    } catch {
      setBikeChoice('new');
    }
  };

  const clearSelectedCustomer = () => {
    setCustomerId('');
    setCustomerSearch('');
    setCustomerBikes([]);
    setBikeChoice(null);
  };

  const chooseBike = (value) => {
    if (value === 'new') {
      setBikeChoice('new');
      setFoundBike(null);
      return;
    }
    const chosen = customerBikes.find((b) => String(b.id) === value);
    setBikeChoice(value);
    setFoundBike(chosen || null);
  };

  const resetForm = () => {
    setCustomerMode('existing');
    setCustomerId('');
    setCustomerSearch('');
    setShowScanner(false);
    setScanError('');
    setFoundBike(null);
    setCustomerBikes([]);
    setBikeChoice(null);
    setOrderDescription('');
    setEstimatedCost('');
    setOrderCreated(false);
    setNewCustomer({ first_name: '', last_name: '', phone: '', email: '' });
    setBike({ brand: '', model: '', bike_type: 'road', color: '', serial_no: '', year: '' });
    setPhoto(null);
    setError('');
  };

  const handleQrDecode = async (text) => {
    setScanError('');
    try {
      const res = await apiFetch('/api/customers/bikes/lookup/?code=' + encodeURIComponent(text));
      if (res.status === 404) {
        setScanError('Nie znaleziono roweru dla zeskanowanego kodu.');
        return;
      }
      if (!res.ok) {
        throw new Error('Wystąpił błąd podczas wyszukiwania.');
      }
      const data = await res.json();
      setFoundBike(data);
      selectCustomerForScan(data.customer);
    } catch (err) {
      setScanError(err.message || 'Wystąpił błąd podczas wyszukiwania.');
    }
  };

  const handleScanError = (message) => {
    setScanError(message);
    setShowScanner(false);
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await apiFetch('/api/orders/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: customerId,
          bike: foundBike.id,
          description: orderDescription,
          estimated_cost: estimatedCost || null,
          priority: 'normal',
        }),
      });
      if (!res.ok) {
        throw new Error('Nie udało się utworzyć zlecenia.');
      }
      setOrderCreated(true);
    } catch (err) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let resolvedCustomerId = customerId;

      if (customerMode === 'new') {
        const res = await apiFetch('/api/customers/customers/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newCustomer),
        });
        if (!res.ok) {
          throw new Error('Nie udało się utworzyć klienta.');
        }
        const created = await res.json();
        resolvedCustomerId = created.id;
      }

      if (!resolvedCustomerId) {
        throw new Error('Wybierz klienta lub utwórz nowego.');
      }

      const formData = new FormData();
      formData.append('customer', resolvedCustomerId);
      formData.append('brand', bike.brand);
      formData.append('model', bike.model);
      formData.append('bike_type', bike.bike_type);
      formData.append('color', bike.color);
      formData.append('serial_no', bike.serial_no);
      if (bike.year) formData.append('year', bike.year);
      if (photo) formData.append('photo', photo);

      const bikeRes = await apiFetch('/api/customers/bikes/', {
        method: 'POST',
        body: formData,
      });

      if (!bikeRes.ok) {
        throw new Error('Nie udało się zapisać roweru.');
      }

      const createdBike = await bikeRes.json();

      const orderRes = await apiFetch('/api/orders/orders/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: resolvedCustomerId,
          bike: createdBike.id,
          description: orderDescription,
          estimated_cost: estimatedCost || null,
          priority: 'normal',
        }),
      });

      if (!orderRes.ok) {
        throw new Error('Rower zapisany, ale nie udało się utworzyć zlecenia.');
      }

      navigate('/panel/intake/' + createdBike.id + '/confirm');
    } catch (err) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setSubmitting(false);
    }
  };

  const awaitingBikeChoice = !foundBike && customerMode === 'existing' && !!selectedCustomer && customerBikes.length > 0 && bikeChoice === null;
  const showBikeFields = !foundBike && !awaitingBikeChoice && (customerMode === 'new' || bikeChoice === 'new' || !selectedCustomer);

  if (orderCreated) {
    return (
      <DashboardLayout>
        <div className="book-card" style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 8px' }}>Zlecenie utworzone</h2>
          <p className="muted">Nowe zlecenie naprawy zostało zapisane dla wybranego roweru.</p>
          <button type="button" className="btn btn-primary btn-lg" onClick={resetForm} style={{ marginTop: 16 }}>
            Przyjmij kolejny rower
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
    <form
      className="book-card"
      onSubmit={foundBike ? submitOrder : submit}
      noValidate
      style={{ maxWidth: 640, margin: '0 auto' }}
    >
      <h2 style={{ margin: '0 0 16px' }}>Przyjęcie roweru</h2>

        {!foundBike && (
          <div className="bf-field">
            <label>Klient</label>
            <div className="bf-seg">
              <button
                type="button"
                className={'bf-seg-btn' + (customerMode === 'existing' ? ' on' : '')}
                onClick={() => setCustomerMode('existing')}
              >
                Istniejący klient
              </button>
              <button
                type="button"
                className={'bf-seg-btn' + (customerMode === 'new' ? ' on' : '')}
                onClick={() => setCustomerMode('new')}
              >
                Nowy klient
              </button>
            </div>
          </div>
        )}

        {!foundBike && customerMode === 'existing' && (
          <div className="bf-field">
            <label>Klient</label>
            {selectedCustomer ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <strong>
                  {selectedCustomer.first_name} {selectedCustomer.last_name}
                  {selectedCustomer.phone ? ' (' + selectedCustomer.phone + ')' : ''}
                </strong>
                <button
                  type="button"
                  onClick={clearSelectedCustomer}
                  style={{ background: 'none', border: 'none', color: 'var(--accent-deep)', textDecoration: 'underline', cursor: 'pointer', padding: 0 }}
                >
                  Zmień
                </button>
              </div>
            ) : null}
            {selectedCustomer && customerBikes.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <label>Rower</label>
                <CustomSelect
                  value={bikeChoice}
                  onChange={chooseBike}
                  placeholder="Wybierz rower…"
                  options={[
                    ...customerBikes.map((b) => ({ value: String(b.id), label: `${b.brand} ${b.model}` })),
                    { value: 'new', label: 'Nowy rower' },
                  ]}
                />
              </div>
            )}
            {!selectedCustomer && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder="Szukaj po imieniu, nazwisku lub telefonie…"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setShowScanner((v) => !v);
                      setScanError('');
                    }}
                  >
                    {showScanner ? 'Anuluj' : 'Skanuj QR'}
                  </button>
                </div>
                {filteredCustomers.length > 0 && (
                  <ul style={{ listStyle: 'none', margin: '4px 0 0', padding: 0, border: '1px solid var(--line)', borderRadius: 8 }}>
                    {filteredCustomers.map((cust) => (
                      <li key={cust.id}>
                        <button
                          type="button"
                          onClick={() => selectCustomer(cust.id)}
                          style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--ink)',
                          }}
                        >
                          {cust.first_name} {cust.last_name} {cust.phone ? '(' + cust.phone + ')' : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {showScanner && (
                  <div style={{ marginTop: 12 }}>
                    <QrScanner onDecode={handleQrDecode} onError={handleScanError} />
                  </div>
                )}
                {scanError && <div className="bf-error">{scanError}</div>}
              </>
            )}
          </div>
        )}

        {!foundBike && customerMode === 'new' && (
          <div className="bf-row">
            <div className="bf-field">
              <label>Imię</label>
              <input value={newCustomer.first_name} onChange={setNewCustomerField('first_name')} />
            </div>
            <div className="bf-field">
              <label>Nazwisko</label>
              <input value={newCustomer.last_name} onChange={setNewCustomerField('last_name')} />
            </div>
            <div className="bf-field">
              <label>Telefon</label>
              <input value={newCustomer.phone} onChange={setNewCustomerField('phone')} inputMode="tel" />
            </div>
            <div className="bf-field">
              <label>E-mail</label>
              <input type="email" value={newCustomer.email} onChange={setNewCustomerField('email')} />
            </div>
          </div>
        )}

        {foundBike && (
          <div className="bf-field">
            <label>Znaleziony rower</label>
            <div className="bs-summary">
              <div>
                <span>Klient</span>
                <strong>
                  {selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : '-'}
                  {selectedCustomer && selectedCustomer.phone ? ' (' + selectedCustomer.phone + ')' : ''}
                </strong>
              </div>
              <div>
                <span>Rower</span>
                <strong>{foundBike.brand} {foundBike.model} {foundBike.color ? '- ' + foundBike.color : ''}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setFoundBike(null); clearSelectedCustomer(); }}
              style={{ background: 'none', border: 'none', color: 'var(--accent-deep)', textDecoration: 'underline', cursor: 'pointer', padding: 0, marginTop: 8 }}
            >
              Zmień klienta / rower
            </button>
          </div>
        )}

        {showBikeFields && (
        <div className="bf-row">
          <div className="bf-field">
            <label>Marka</label>
            <input value={bike.brand} onChange={setBikeField('brand')} />
          </div>
          <div className="bf-field">
            <label>Model</label>
            <input value={bike.model} onChange={setBikeField('model')} />
          </div>
        </div>
        )}

        {showBikeFields && (
        <div className="bf-row">
          <div className="bf-field">
            <label>Typ roweru</label>
            <CustomSelect
              value={bike.bike_type}
              onChange={(v) => setBike((f) => ({ ...f, bike_type: v }))}
              options={BIKE_TYPES}
            />
          </div>
          <div className="bf-field">
            <label>Kolor</label>
            <input value={bike.color} onChange={setBikeField('color')} />
          </div>
        </div>
        )}

        {showBikeFields && (
        <div className="bf-row">
          <div className="bf-field">
            <label>Numer seryjny</label>
            <input value={bike.serial_no} onChange={setBikeField('serial_no')} />
          </div>
          <div className="bf-field">
            <label>Rok</label>
            <input type="number" value={bike.year} onChange={setBikeField('year')} />
          </div>
        </div>
        )}

        {showBikeFields && (
        <div className="bf-field">
          <label>Zdjęcie roweru <span className="muted">(opcjonalnie)</span></label>
          <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files[0] || null)} />
        </div>
        )}

        {(foundBike || showBikeFields) && (
        <div className="bf-field">
          <label>Opis zlecenia</label>
          <textarea
            rows={3}
            required
            value={orderDescription}
            onChange={(e) => setOrderDescription(e.target.value)}
          />
        </div>
        )}

        {(foundBike || showBikeFields) && (
        <div className="bf-field">
          <label>Wstępna wycena <span className="muted">(opcjonalnie, zł)</span></label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
          />
        </div>
        )}

        {error && <div className="bf-error">{error}</div>}

      <button type="submit" className="btn btn-primary btn-lg bf-submit" disabled={submitting || awaitingBikeChoice}>
        {submitting ? 'Zapisywanie…' : (foundBike ? 'Utwórz zlecenie' : 'Przyjmij rower')}
      </button>
    </form>
    </DashboardLayout>
  );
}

export default BikeIntakePage;
