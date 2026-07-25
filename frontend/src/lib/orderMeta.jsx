import React from 'react';

const STATUS_META = {
  accepted: { label: 'Przyjęte', bg: '#F3E3C0', fg: '#7A5A12' },
  diagnosing: { label: 'Diagnoza', bg: '#DCE6F0', fg: '#2E4F6E' },
  waiting_parts: { label: 'Oczekuje na części', bg: '#F5DCC0', fg: '#8A4F12' },
  in_progress: { label: 'W trakcie', bg: '#F6D9C4', fg: '#9A4A16' },
  done: { label: 'Gotowe', bg: '#D9EEDD', fg: '#1E6B3A' },
  delivered: { label: 'Wydane', bg: '#C9E6D3', fg: '#155C31' },
  cancelled: { label: 'Anulowane', bg: '#F4D4D0', fg: '#932B20' },
};

const PRIORITY_META = {
  low: { label: 'Niski', bg: '#E3DBCE', fg: '#4B433B' },
  normal: { label: 'Normalny', bg: '#F3E3C0', fg: '#7A5A12' },
  high: { label: 'Wysoki', bg: '#F6D9C4', fg: '#9A4A16' },
  urgent: { label: 'Pilny', bg: '#F4D4D0', fg: '#932B20' },
};

const STATUS_CHOICES = Object.entries(STATUS_META).map(([value, m]) => ({ value, label: m.label }));
const PRIORITY_CHOICES = Object.entries(PRIORITY_META).map(([value, m]) => ({ value, label: m.label }));

// Valid next statuses from a given status, so the mechanic only sees sensible options.
const STATUS_TRANSITIONS = {
  accepted: ['diagnosing', 'cancelled'],
  diagnosing: ['waiting_parts', 'in_progress', 'cancelled'],
  waiting_parts: ['in_progress', 'cancelled'],
  in_progress: ['done', 'waiting_parts', 'cancelled'],
  done: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Hint shown to the mechanic when picking a target status, explaining what to do next.
const STATUS_HINTS = {
  accepted: 'Rower przyjęty do serwisu i czeka na diagnozę.',
  diagnosing: 'Ustal zakres prac i wprowadź wycenę - klient musi ją zaakceptować, zanim zaczniecie naprawę.',
  waiting_parts: 'Trzeba coś domówić - np. zamówić brakujące części albo poczekać na decyzję klienta.',
  in_progress: 'Praca nad rowerem właśnie się zaczyna.',
  done: 'Naprawa zakończona. Możesz powiadomić klienta SMS-em, że rower czeka na odbiór.',
  delivered: 'Klient odebrał rower - zlecenie zostaje zamknięte.',
  cancelled: 'Zlecenie zostaje anulowane.',
};

function Badge({ meta, fallback }) {
  if (!meta) return <span>{fallback}</span>;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 10px',
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        background: meta.bg,
        color: meta.fg,
        whiteSpace: 'nowrap',
      }}
    >
      {meta.label}
    </span>
  );
}

export { STATUS_META, PRIORITY_META, STATUS_CHOICES, PRIORITY_CHOICES, STATUS_TRANSITIONS, STATUS_HINTS, Badge };
