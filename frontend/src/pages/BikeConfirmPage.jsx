import React from 'react';
import { Link, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { apiFetch } from '../lib/api.js';
import DashboardLayout from './DashboardLayout.jsx';

function BikeConfirmPage() {
  const { id } = useParams();
  const [bike, setBike] = React.useState(null);
  const [qrDataUrl, setQrDataUrl] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    let cancelled = false;

    apiFetch('/api/customers/bikes/' + id + '/')
      .then((res) => {
        if (!res.ok) throw new Error('Nie znaleziono roweru.');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setBike(data);
        const sheriffCode = 'sheriff-' + data.id + '-' + data.uuid;
        return QRCode.toDataURL(sheriffCode);
      })
      .then((dataUrl) => {
        if (!cancelled && dataUrl) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Wystąpił błąd.');
      });

    return () => { cancelled = true; };
  }, [id]);

  if (error) {
    return (
      <DashboardLayout>
        <div className="book-card" style={{ maxWidth: 480, margin: '0 auto' }}>
          <div className="bf-error">{error}</div>
          <Link className="btn btn-ghost" to="/panel/intake" style={{ marginTop: 16 }}>Wróć do przyjęcia</Link>
        </div>
      </DashboardLayout>
    );
  }

  if (!bike) return <DashboardLayout>{null}</DashboardLayout>;

  const sheriffCode = 'sheriff-' + bike.id + '-' + bike.uuid;

  return (
    <DashboardLayout>
      <div className="book-card" style={{ maxWidth: 480, margin: '0 auto', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px' }}>Rower przyjęty</h2>
        <p className="muted" style={{ marginTop: 0 }}>Naklej etykietę z poniższym kodem QR na rower.</p>

        {qrDataUrl && (
          <img src={qrDataUrl} alt={sheriffCode} width={220} height={220} style={{ margin: '16px auto', display: 'block' }} />
        )}

        <p style={{ fontWeight: 600, wordBreak: 'break-all' }}>{sheriffCode}</p>

        <div className="bs-summary" style={{ textAlign: 'left' }}>
          <div><span>Marka / model</span><strong>{bike.brand} {bike.model}</strong></div>
          <div><span>Kolor</span><strong>{bike.color || '-'}</strong></div>
          <div><span>Klient</span><strong>{bike.customer_name || bike.customer}</strong></div>
        </div>

        <Link className="btn btn-primary btn-lg" to="/panel/intake" style={{ marginTop: 16 }}>
          Przyjmij kolejny rower
        </Link>
      </div>
    </DashboardLayout>
  );
}

export default BikeConfirmPage;
