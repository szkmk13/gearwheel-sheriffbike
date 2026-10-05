// Wspolne formatowanie dat w panelu: zawsze DD/MM/YYYY, niezaleznie od jezyka przegladarki.
// Daty "kalendarzowe" (YYYY-MM-DD) liczymy na lokalnej dacie, a nie przez toISOString(),
// ktore liczy w UTC i tuz po polnocy cofaloby date o dzien.

// Na razie stala liczba dni - docelowo podpowiedz wolnego terminu.
export const DEFAULT_PICKUP_DAYS = 3;

// Zlecenia w tych statusach nie moga byc "po terminie" - sprzet jest gotowy albo wydany.
const CLOSED_STATUSES = ['done', 'delivered', 'cancelled'];

const pad = (n) => String(n).padStart(2, '0');

// Samo YYYY-MM-DD (np. DateField z API) parsujemy recznie: new Date('2026-10-05')
// traktuje je jako polnoc UTC, wiec na zachod od Greenwich wyszedlby dzien wczesniej.
const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function toDate(value) {
  if (value instanceof Date) return value;
  const match = typeof value === 'string' && value.match(ISO_DATE_ONLY);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Date(value);
}

function parse(value) {
  if (!value) return null;
  const date = toDate(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value) {
  const date = parse(value);
  if (!date) return '-';
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

export function formatDateTime(value) {
  const date = parse(value);
  if (!date) return '-';
  return `${formatDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toLocalISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISODate() {
  return toLocalISODate(new Date());
}

export function defaultPickupDate() {
  const date = new Date();
  date.setDate(date.getDate() + DEFAULT_PICKUP_DAYS);
  return toLocalISODate(date);
}

// Daty YYYY-MM-DD porownujemy jako stringi - format jest leksykograficznie uporzadkowany.
export function isOrderOverdue(order) {
  if (!order?.estimated_pickup_date || CLOSED_STATUSES.includes(order.status)) return false;
  return order.estimated_pickup_date < todayISODate();
}
