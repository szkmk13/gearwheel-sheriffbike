import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import StickyHeader from "../components/StickyHeader";
import SlidePanel from "../components/SlidePanel";
import { Skeleton, TableRowsSkeleton, MobileOrderCardsSkeleton } from "../components/Skeleton";
import StorageIntakeModal from "../components/storage/StorageIntakeModal";
import StorageBookingPanel from "../components/storage/StorageBookingPanel";
import QRScannerModal from "../components/QRScannerModal";
import {
  ACTIVE_STORAGE_STATUSES, STORAGE_STATUS_TABS, storageKeys,
} from "../components/storage/storageData";
import { fetchStorageBookings, fetchStorageDashboard } from "../api/storage";
import { formatDate } from "../utils/dates";

const PAGE_SIZE = 50; // = PAGE_SIZE w REST_FRAMEWORK

const chipClass = (active) =>
  `px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium border transition-colors cursor-pointer whitespace-nowrap ${
    active
      ? 'bg-[var(--color-ink)] text-[var(--color-paper)] border-[var(--color-ink)]'
      : 'bg-[var(--color-paper-2)] text-[var(--color-ink-2)] border-[var(--color-line)] hover:bg-[var(--color-paper-3)]'
  }`;

function StatTile({ label, value, hint, tone = 'default' }) {
  const toneClass = { default: 'text-[var(--color-ink)]', red: 'text-red-600' }[tone];
  return (
    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-4 shadow-sm">
      <p className="text-xs sm:text-sm text-[var(--color-ink-3)]">{label}</p>
      <p className={`text-2xl sm:text-3xl font-semibold mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--color-ink-3)] mt-1">{hint}</p>}
    </div>
  );
}

// Link do zlecenia naprawy prosto z listy - nie otwiera panelu szczegółów.
function OrderLink({ booking }) {
  return (
    <Link
      to={`/panel/orders/${booking.repair_order}`}
      onClick={(e) => e.stopPropagation()}
      className="font-medium text-[var(--color-accent)] hover:underline whitespace-nowrap"
    >
      Zlecenie #{booking.repair_order}
    </Link>
  );
}

export default function StoragePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannedBike, setScannedBike] = useState(null);

  // Filtry siedzą w URL-u, żeby odświeżenie strony i link do pozycji ich nie gubiły.
  const tab = STORAGE_STATUS_TABS.find((t) => t.value === searchParams.get('tab')) || STORAGE_STATUS_TABS[0];
  const search = searchParams.get('q') || '';
  const page = Number(searchParams.get('page')) || 1;
  const selectedId = searchParams.get('booking');

  const updateParams = (changes, { resetPage = true } = {}) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => {
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, value);
    });
    if (resetPage) next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const listParams = {
    status: tab.status,
    search: search || undefined,
    // Na przechowaniu najważniejsze jest, co wkrótce do odbioru; w historii - najnowsze.
    ordering: tab.value === 'stored' ? 'end_date' : '-start_date',
    page: page > 1 ? page : undefined,
  };

  const { data, isLoading, isError, error, isPlaceholderData } = useQuery({
    queryKey: storageKeys.list(listParams),
    queryFn: () => fetchStorageBookings(listParams),
    placeholderData: keepPreviousData,
  });
  const bookings = data?.results || [];
  const pageCount = Math.max(1, Math.ceil((data?.count || 0) / PAGE_SIZE));

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: storageKeys.dashboard,
    queryFn: fetchStorageDashboard,
  });

  const openBooking = (id) => updateParams({ booking: String(id) }, { resetPage: false });
  const closeBooking = () => updateParams({ booking: null }, { resetPage: false });

  // Skan QR: rower już leży w przechowalni -> jego panel (np. do wydania),
  // inaczej formularz przyjęcia z wybranym klientem i tym rowerem.
  const handleBikeScanned = async (bike) => {
    try {
      const active = await fetchStorageBookings({ bike: bike.id, status: ACTIVE_STORAGE_STATUSES.join(',') });
      const booking = active.results?.[0];
      if (booking) {
        updateParams({ tab: null, q: null, booking: String(booking.id) });
        return;
      }
    } catch (err) {
      toast.error(`Nie udało się sprawdzić przechowania roweru: ${err.message}`);
      return;
    }
    setScannedBike(bike);
    setIsIntakeOpen(true);
  };

  const emptyMessage = 'Brak sprzętu spełniającego kryteria.';

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader className="bg-[var(--color-paper)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Przechowalnia</h1>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[var(--color-paper-2)] border border-[var(--color-line)] hover:bg-white text-[var(--color-ink)] rounded-md font-medium text-sm transition-colors shadow-xs cursor-pointer"
              title="Zeskanuj kod QR roweru - przyjęcie albo wydanie"
            >
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Skanuj QR</span>
            </button>
            <Button onClick={() => setIsIntakeOpen(true)} className="flex-1 sm:flex-initial justify-center">
              + Przyjmij na przechowanie
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex gap-2">
            {STORAGE_STATUS_TABS.map((t) => (
              <button
                key={t.value} type="button" className={chipClass(tab.value === t.value)}
                onClick={() => updateParams({ tab: t === STORAGE_STATUS_TABS[0] ? null : t.value })}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex-1">
            <SearchInput
              placeholder="Szukaj po kliencie, telefonie, rowerze..."
              value={search}
              onChange={(e) => updateParams({ q: e.target.value })}
            />
          </div>
        </div>
      </StickyHeader>

      {/* LICZNIKI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        {isStatsLoading || !stats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)
        ) : (
          <>
            <StatTile label="Na przechowaniu" value={stats.stored_now} hint="rowerów w serwisie" />
            <StatTile label="Odbiór w ciągu 7 dni" value={stats.due_this_week} hint="termin do tygodnia" />
            <StatTile label="Po terminie" value={stats.overdue} tone={stats.overdue ? 'red' : 'default'} hint="nieodebrane w terminie" />
          </>
        )}
      </div>

      {isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
          Wystąpił błąd podczas pobierania danych: {error.message}
        </div>
      )}

      {/* TABELA - desktop / tablet */}
      <div className={`hidden md:block bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm overflow-hidden transition-opacity ${isPlaceholderData ? 'opacity-60' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
                <th className="py-4 px-6 font-medium">Zawieszka</th>
                <th className="py-4 px-6 font-medium">Klient</th>
                <th className="py-4 px-6 font-medium">Rower</th>
                <th className="py-4 px-6 font-medium">Termin</th>
                <th className="py-4 px-6 font-medium">Status</th>
                <th className="py-4 px-6 font-medium">Zlecenie</th>
              </tr>
            </thead>
            <tbody className="text-sm text-[var(--color-ink)]">
              {isLoading ? (
                <TableRowsSkeleton rows={6} cols={6} />
              ) : bookings.length > 0 ? (
                bookings.map((booking) => (
                  <tr
                    key={booking.id}
                    onClick={() => openBooking(booking.id)}
                    className={`border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${
                      String(booking.id) === selectedId ? 'bg-[var(--color-paper)]' : ''
                    }`}
                  >
                    <td className="py-4 px-6 font-bold">#{booking.tag}</td>
                    <td className="py-4 px-6 font-medium">{booking.customer_name}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-2)]">{booking.bike_label}</td>
                    <td className={`py-4 px-6 ${booking.is_overdue ? 'text-red-600 font-semibold' : 'text-[var(--color-ink-3)]'}`}>
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                      {booking.is_overdue && <span className="block text-[10px] uppercase tracking-wider">Po terminie</span>}
                    </td>
                    <td className="py-4 px-6"><StatusBadge status={booking.status} /></td>
                    <td className="py-4 px-6"><OrderLink booking={booking} /></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-8 px-6 text-center text-[var(--color-ink-3)]">{emptyMessage}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KARTY - telefon */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <MobileOrderCardsSkeleton count={4} />
        ) : bookings.length > 0 ? (
          bookings.map((booking) => (
            <div
              key={booking.id}
              onClick={() => openBooking(booking.id)}
              className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-4 shadow-sm active:bg-[var(--color-paper-3)] transition-colors cursor-pointer space-y-2.5"
            >
              <div className="flex justify-between items-center gap-2">
                <span className="text-sm font-bold text-[var(--color-ink)]">Zawieszka #{booking.tag}</span>
                <StatusBadge status={booking.status} />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--color-ink)]">{booking.customer_name}</p>
                <p className="text-sm text-[var(--color-ink-2)]">{booking.bike_label}</p>
              </div>
              <div className="pt-2 border-t border-[var(--color-line)] flex justify-between items-end gap-3 text-xs">
                <span className={booking.is_overdue ? 'font-semibold text-red-600' : 'text-[var(--color-ink-3)]'}>
                  {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                  {booking.is_overdue && ' (po terminie)'}
                </span>
                <span className="text-right text-sm"><OrderLink booking={booking} /></span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-8 text-center text-[var(--color-ink-3)] text-sm">
            {emptyMessage}
          </div>
        )}
      </div>

      {/* PAGINACJA */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--color-ink-2)]">
          <button
            type="button" disabled={!data?.previous}
            onClick={() => updateParams({ page: page - 1 > 1 ? String(page - 1) : null }, { resetPage: false })}
            className="px-3.5 py-2 border border-[var(--color-line)] rounded-md bg-[var(--color-paper-2)] hover:bg-white disabled:opacity-40 disabled:cursor-default cursor-pointer"
          >
            ← Poprzednia
          </button>
          <span>Strona {page} z {pageCount} ({data.count} poz.)</span>
          <button
            type="button" disabled={!data?.next}
            onClick={() => updateParams({ page: String(page + 1) }, { resetPage: false })}
            className="px-3.5 py-2 border border-[var(--color-line)] rounded-md bg-[var(--color-paper-2)] hover:bg-white disabled:opacity-40 disabled:cursor-default cursor-pointer"
          >
            Następna →
          </button>
        </div>
      )}

      <SlidePanel isOpen={!!selectedId} onClose={closeBooking}>
        {selectedId && <StorageBookingPanel key={selectedId} bookingId={selectedId} />}
      </SlidePanel>

      <StorageIntakeModal
        isOpen={isIntakeOpen}
        scannedBike={scannedBike}
        onClose={() => { setIsIntakeOpen(false); setScannedBike(null); }}
        onCreated={(result) => {
          if (result.bookings[0]) updateParams({ tab: null, q: null, booking: String(result.bookings[0].id) });
        }}
      />

      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        initialAction="new_order"
        onBikeScanned={handleBikeScanned}
        hint="Zeskanuj rower - przyjęcie albo wydanie z przechowalni"
        hideActionSwitch
      />
    </div>
  );
}
