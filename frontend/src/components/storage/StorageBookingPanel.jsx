import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import StatusBadge from "../StatusBadge";
import Input from "../Input";
import DateInput from "../DateInput";
import Button from "../Button";
import { Skeleton } from "../Skeleton";
import {
  cancelStorage, checkOutStorage, extendStorage, fetchStorageBooking, registerStoragePayment, updateStorageBooking,
} from "../../api/storage";
import { addDays, formatDate, formatDateTime, parseISODate, toLocalISODate } from "../../utils/dates";
import { ACTIVE_STORAGE_STATUSES, categoryLabel, formatMoney, storageKeys } from "./storageData";

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
    if (action === 'payment') return { amount: booking.balance_due, note: '' };
    if (action === 'extend') return { end_date: '', note: '' };
    if (action === 'edit') {
      return {
        start_date: booking.start_date, end_date: booking.end_date, price: booking.price,
        check_in_notes: booking.check_in_notes, check_out_notes: booking.check_out_notes,
      };
    }
    return { text: '' };
  });
  const set = (name) => (e) => setValues((prev) => ({ ...prev, [name]: e.target.value }));

  const run = {
    checkout: () => checkOutStorage({ id: booking.id, notes: values.text }),
    extend: () => extendStorage({ id: booking.id, ...values }),
    payment: () => registerStoragePayment({ id: booking.id, ...values }),
    cancel: () => cancelStorage({ id: booking.id, reason: values.text }),
    edit: () => updateStorageBooking({ id: booking.id, data: values }),
  }[action];

  const successMessage = {
    checkout: 'Sprzęt wydany klientowi.',
    extend: 'Przedłużono przechowanie.',
    payment: 'Zapisano wpłatę.',
    cancel: 'Przechowanie anulowane.',
    edit: 'Zapisano zmiany.',
  }[action];

  const mutation = useMutation({
    mutationFn: run,
    onSuccess: (updated) => {
      queryClient.setQueryData(storageKeys.detail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: storageKeys.all });
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
    payment: 'Nowa wpłata',
    cancel: 'Anulowanie przechowania',
    edit: 'Edycja przechowania',
  };

  return (
    <form onSubmit={submit} className={`${cardClass} border-[var(--color-accent)]/40`}>
      <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-4">{titles[action]}</h4>

      {action === 'checkout' && (
        <>
          {Number(booking.balance_due) > 0 && (
            <p className="mb-4 p-3 text-sm rounded-lg bg-orange-50 border border-orange-200 text-orange-800">
              Do zapłaty zostało <b>{formatMoney(booking.balance_due)}</b>. Wydanie nie jest blokowane, ale saldo zostanie widoczne.
            </p>
          )}
          <NoteField label="Uwagi przy wydaniu" value={values.text} onChange={set('text')} placeholder="np. odebrał syn klienta" />
        </>
      )}

      {action === 'extend' && (
        <>
          <DateInput label="Nowa data odbioru" value={values.end_date} onChange={set('end_date')} min={dayAfter(booking.end_date)} required />
          <NoteField label="Notatka" value={values.note} onChange={set('note')} placeholder="np. klient wyjeżdża, odbierze później" />
        </>
      )}

      {action === 'payment' && (
        <>
          <Input
            label={`Kwota (zł) - do zapłaty ${formatMoney(booking.balance_due)}`} type="number" min="0.01" step="0.01"
            max={booking.balance_due} required value={values.amount} onChange={set('amount')}
          />
          <NoteField label="Notatka" value={values.note} onChange={set('note')} placeholder="np. gotówka, BLIK" />
        </>
      )}

      {action === 'cancel' && (
        <NoteField label="Powód anulowania" value={values.text} onChange={set('text')} placeholder="np. klient zrezygnował" />
      )}

      {action === 'edit' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
            <DateInput label="Od" value={values.start_date} onChange={set('start_date')} required />
            <DateInput label="Do" value={values.end_date} onChange={set('end_date')} min={values.start_date} required />
            <Input
              label="Cena (zł)" type="number" min={booking.paid_amount} step="0.01" required
              value={values.price} onChange={set('price')}
            />
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
  const hasBalance = Number(booking.balance_due) > 0;
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
        (isActive || hasBalance) && booking.status !== 'cancelled' && (
          <div className="flex flex-wrap gap-2">
            {booking.status === 'stored' && (
              <Button type="button" onClick={() => setAction('checkout')}>Wydaj sprzęt</Button>
            )}
            {isActive && <button type="button" className={secondaryBtn} onClick={() => setAction('extend')}>Przedłuż</button>}
            {hasBalance && <button type="button" className={secondaryBtn} onClick={() => setAction('payment')}>Dodaj wpłatę</button>}
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

      {/* TERMIN I PŁATNOŚĆ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-2">Termin</p>
          <Row label="Od">{formatDate(booking.start_date)}</Row>
          <Row label="Do (odbiór)">
            <span className={booking.is_overdue ? 'text-red-600' : ''}>{formatDate(booking.end_date)}</span>
          </Row>
          <Row label="Przyjęto">{formatDateTime(booking.checked_in_at)}</Row>
          <Row label="Wydano">{formatDateTime(booking.checked_out_at)}</Row>
        </div>
        <div className={cardClass}>
          <p className="text-xs uppercase tracking-wider text-[var(--color-ink-3)] mb-2">Płatność</p>
          <Row label="Cena">{formatMoney(booking.price)}</Row>
          <Row label="Zapłacono">{formatMoney(booking.paid_amount)}</Row>
          <Row label="Do zapłaty">
            <span className={hasBalance ? 'text-orange-700' : 'text-green-700'}>
              {hasBalance ? formatMoney(booking.balance_due) : 'Opłacone'}
            </span>
          </Row>
          {booking.paid_at && <Row label="Opłacone dnia">{formatDateTime(booking.paid_at)}</Row>}
        </div>
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
