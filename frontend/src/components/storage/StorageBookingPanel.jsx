import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import StatusBadge from "../StatusBadge";
import DateInput from "../DateInput";
import Button from "../Button";
import { Skeleton } from "../Skeleton";
import {
  cancelStorage, checkOutStorage, extendStorage, fetchStorageBooking, updateStorageBooking,
} from "../../api/storage";
import { addDays, formatDate, formatDateTime, parseISODate, toLocalISODate } from "../../utils/dates";
import { ACTIVE_STORAGE_STATUSES, categoryLabel, storageKeys } from "./storageData";

const textareaClass = "w-full p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[70px] resize-y shadow-sm";
const cardClass = "bg-white border border-[var(--color-line)] rounded-xl p-4 sm:p-5 shadow-sm";
const secondaryBtn = "px-3.5 py-2 text-sm font-medium border border-[var(--color-line)] bg-[var(--color-paper-2)] hover:bg-white text-[var(--color-ink)] rounded-md transition-colors cursor-pointer";

// Przedłużenie tylko w przód - najwcześniej dzień po obecnym terminie.
const dayAfter = (isoDate) => toLocalISODate(addDays(parseISODate(isoDate), 1));

// Rzadkie akcje - schowane jako linki na dole panelu, ich formularz też pokazuje się tam.
const BOTTOM_ACTIONS = ['edit', 'cancel'];

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-[var(--color-ink-3)]">{label}</span>
      <span className="text-right font-medium text-[var(--color-ink)]">{children}</span>
    </div>
  );
}

function NoteField({ label, value, onChange, placeholder }) {
  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <textarea className={textareaClass} value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}

// Formularz jednej akcji. Każda akcja ma inne pola, więc stan trzyma jeden obiekt `values`.
function ActionForm({ action, booking, onDone, onCancel }) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => {
    if (action === 'extend') return { end_date: '', note: '' };
    if (action === 'edit') {
      return {
        start_date: booking.start_date, end_date: booking.end_date,
        check_in_notes: booking.check_in_notes, check_out_notes: booking.check_out_notes,
      };
    }
    return { text: '' };
  });
  const set = (name) => (e) => setValues((prev) => ({ ...prev, [name]: e.target.value }));

  const run = {
    checkout: () => checkOutStorage({ id: booking.id, notes: values.text }),
    extend: () => extendStorage({ id: booking.id, ...values }),
    cancel: () => cancelStorage({ id: booking.id, reason: values.text }),
    edit: () => updateStorageBooking({ id: booking.id, data: values }),
  }[action];

  const successMessage = {
    checkout: 'Sprzęt wydany klientowi.',
    extend: 'Przedłużono przechowanie.',
    cancel: 'Przechowanie anulowane.',
    edit: 'Zapisano zmiany.',
  }[action];

  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (updated) => {
      queryClient.setQueryData(storageKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: storageKeys.all });
      // Anulowanie zdejmuje sztukę z pozycji "Przechowanie zimowe" - kwota zlecenia się zmienia.
      if (action === 'cancel') {
        queryClient.invalidateQueries({ queryKey: ['order', String(updated.repair_order)] });
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
      toast.success(successMessage);
      onDone();
    },
    onError: (error) => toast.error(error.message),
  });

  const submit = (e) => {
    e.preventDefault();
    mutation.mutate();
  };

  const titles = {
    checkout: 'Wydanie sprzętu',
    extend: 'Przedłużenie przechowania',
    cancel: 'Anulowanie przechowania',
    edit: 'Edycja przechowania',
  };

  return (
    <form onSubmit={submit} className={`${cardClass} border-[var(--color-accent)]/40`}>
      <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-4">{titles[action]}</h4>

      {action === 'checkout' && (
        <>
          <p className="mb-4 p-3 text-sm rounded-lg bg-[var(--color-paper)] border border-[var(--color-line)] text-[var(--color-ink-2)]">
            Rozliczenie jest na{' '}
            <Link to={`/panel/orders/${booking.repair_order}`} className="font-medium text-[var(--color-accent)] hover:underline">
              zleceniu #{booking.repair_order}
            </Link>.
          </p>
          <NoteField label="Uwagi przy wydaniu" value={values.text} onChange={set('text')} placeholder="np. odebrał syn klienta" />
        </>
      )}

      {action === 'extend' && (
        <>
          <DateInput label="Nowa data odbioru" value={values.end_date} onChange={set('end_date')} min={dayAfter(booking.end_date)} required />
          <NoteField label="Notatka" value={values.note} onChange={set('note')} placeholder="np. klient wyjeżdża, odbierze później" />
        </>
      )}

      {action === 'cancel' && (
        <NoteField label="Powód anulowania" value={values.text} onChange={set('text')} placeholder="np. klient zrezygnował" />
      )}

      {action === 'edit' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <DateInput label="Od" value={values.start_date} onChange={set('start_date')} required />
            <DateInput label="Do" value={values.end_date} onChange={set('end_date')} min={values.start_date} required />
          </div>
          <NoteField label="Uwagi przy przyjęciu" value={values.check_in_notes} onChange={set('check_in_notes')} />
          <NoteField label="Uwagi przy wydaniu" value={values.check_out_notes} onChange={set('check_out_notes')} />
        </>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md cursor-pointer">
          Wróć
        </button>
        <Button
          type="submit" disabled={mutation.isPending}
          className={action === 'cancel' ? 'bg-red-600! hover:bg-red-700!' : ''}
        >
          {mutation.isPending ? 'Zapisywanie...' : action === 'cancel' ? 'Anuluj przechowanie' : 'Zapisz'}
        </Button>
      </div>
    </form>
  );
}

export default function StorageBookingPanel({ bookingId }) {
  const [action, setAction] = useState(null);

  const { data: booking, isLoading, isError, error } = useQuery({
    queryKey: storageKeys.detail(bookingId),
    queryFn: () => fetchStorageBooking(bookingId),
    enabled: !!bookingId,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }
  if (isError) {
    return <p className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">Nie udało się pobrać przechowania: {error.message}</p>;
  }
  if (!booking) return null;

  const isActive = ACTIVE_STORAGE_STATUSES.includes(booking.status);
  const { customer, bike } = booking;
  const closeAction = () => setAction(null);

  return (
    <div className="space-y-4">
      {/* NAGŁÓWEK */}
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-semibold text-[var(--color-ink)]">Zawieszka #{booking.tag}</h2>
        <StatusBadge status={booking.status} />
        {booking.is_overdue && (
          <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-red-100 text-red-700">Po terminie</span>
        )}
      </div>

      {/* AKCJE */}
      {action && !BOTTOM_ACTIONS.includes(action) ? (
        <ActionForm key={action} action={action} booking={booking} onDone={closeAction} onCancel={closeAction} />
      ) : (
        isActive && (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'stored' && (
              <Button type="button" onClick={() => setAction('checkout')}>Wydaj sprzęt</Button>
            )}
            <button type="button" className={secondaryBtn} onClick={() => setAction('extend')}>Przedłuż</button>
          </div>
        )
      )}

      {/* KLIENT I SPRZĘT */}
      <div className={cardClass}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-1">Klient</p>
            <Link to={`/panel/clients/${customer.id}`} className="text-base font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)]">
              {customer.first_name} {customer.last_name}
            </Link>
            <p className="text-sm text-[var(--color-ink-2)]">
              <a href={`tel:${customer.phone}`} className="hover:underline">{customer.phone}</a>
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-1">Sprzęt</p>
            <Link to={`/panel/bikes/${bike.id}`} className="text-base font-semibold text-[var(--color-ink)] hover:text-[var(--color-accent)]">
              {bike.brand} {bike.model}
            </Link>
            <p className="text-sm text-[var(--color-ink-2)]">{categoryLabel(bike.category)}</p>
          </div>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--color-line)]">
          <Link to={`/panel/orders/${booking.repair_order}`} className="text-sm font-medium text-[var(--color-accent)] hover:underline">
            Zlecenie serwisowe #{booking.repair_order} →
          </Link>
        </div>
      </div>

      {/* TERMIN - koszt przechowania jest pozycją na zleceniu */}
      <div className={cardClass}>
        <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-2">Termin</p>
        <Row label="Od">{formatDate(booking.start_date)}</Row>
        <Row label="Do (odbiór)">
          <span className={booking.is_overdue ? 'text-red-600' : ''}>{formatDate(booking.end_date)}</span>
        </Row>
        <Row label="Przyjęto">{formatDateTime(booking.checked_in_at)}</Row>
        <Row label="Wydano">{formatDateTime(booking.checked_out_at)}</Row>
      </div>

      {/* UWAGI */}
      {(booking.check_in_notes || booking.check_out_notes) && (
        <div className={cardClass}>
          {booking.check_in_notes && (
            <div className="mb-3 last:mb-0">
              <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-1">Uwagi przy przyjęciu</p>
              <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{booking.check_in_notes}</p>
            </div>
          )}
          {booking.check_out_notes && (
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-1">Uwagi przy wydaniu</p>
              <p className="text-sm text-[var(--color-ink)] whitespace-pre-line">{booking.check_out_notes}</p>
            </div>
          )}
        </div>
      )}

      {/* HISTORIA */}
      <div className={cardClass}>
        <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-3">Historia</p>
        {booking.events?.length ? (
          <ol className="space-y-3 pl-4 border-l-2 border-[var(--color-line)]">
            {booking.events.map((event) => (
              <li key={event.id} className="text-sm">
                <p className="font-medium text-[var(--color-ink)]">
                  {event.event_type_display}
                  <span className="font-normal text-[var(--color-ink-3)]"> - {formatDateTime(event.created_at)}{event.performed_by_name && `, ${event.performed_by_name}`}</span>
                </p>
                {event.note && <p className="text-[var(--color-ink-2)] whitespace-pre-line">{event.note}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-[var(--color-ink-3)]">Brak zdarzeń.</p>
        )}
      </div>

      {/* RZADKIE AKCJE */}
      {isActive && (BOTTOM_ACTIONS.includes(action) ? (
        <ActionForm key={action} action={action} booking={booking} onDone={closeAction} onCancel={closeAction} />
      ) : (
        <div className="flex justify-end gap-4 pt-1 text-xs">
          <button type="button" onClick={() => setAction('edit')} className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:underline cursor-pointer">
            Edytuj dane
          </button>
          <button type="button" onClick={() => setAction('cancel')} className="text-[var(--color-ink-3)] hover:text-red-600 hover:underline cursor-pointer">
            Anuluj przechowanie
          </button>
        </div>
      ))}
    </div>
  );
}
