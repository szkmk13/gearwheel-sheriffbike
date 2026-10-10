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

// Godziny pracy serwisu wg dnia tygodnia (indeks z weekdayIndex: 0 = poniedzialek).
// 'short' - czynne krocej, 'closed' - nieczynne. Pozostale dni: zwykly dzien pracy.
const WORKSHOP_DAY_KIND = { 5: 'short', 6: 'closed' };

// 'short' | 'closed' | null
export function workshopDayKind(date) {
  return WORKSHOP_DAY_KIND[weekdayIndex(date)] ?? null;
}

// Dzis + DEFAULT_PICKUP_DAYS, a gdy wypada w dzien zamkniety - pierwszy kolejny dzien pracy.
export function defaultPickupDate() {
  const today = new Date();
  let date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_PICKUP_DAYS);
  while (workshopDayKind(date) === 'closed') date = addDays(date, 1);
  return toLocalISODate(date);
}

// Daty YYYY-MM-DD porownujemy jako stringi - format jest leksykograficznie uporzadkowany.
export function isOrderOverdue(order) {
  if (!order?.estimated_pickup_date || CLOSED_STATUSES.includes(order.status)) return false;
  return order.estimated_pickup_date < todayISODate();
}

// --- Kalendarz ---------------------------------------------------------------
// Tydzien zaczyna sie w poniedzialek. Wszystko liczymy na lokalnych datach.

export const MONTH_NAMES = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
];
// Dopelniacz do dat typu "8 października 2026".
export const MONTH_NAMES_GENITIVE = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
];
export const WEEKDAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nd'];
export const WEEKDAY_NAMES = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// YYYY-MM-DD -> Date (lokalna polnoc) albo null, gdy string nie jest data.
export function parseISODate(value) {
  const match = typeof value === 'string' && value.match(ISO_DATE_ONLY);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return toLocalISODate(date) === value ? date : null;
}

export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

export function addMonths(date, months) {
  // Dzien przycinamy do dlugosci miesiaca: 31 stycznia + 1 miesiac = 28/29 lutego, nie 3 marca.
  const lastDay = new Date(date.getFullYear(), date.getMonth() + months + 1, 0).getDate();
  return new Date(date.getFullYear(), date.getMonth() + months, Math.min(date.getDate(), lastDay));
}

// 0 = poniedzialek ... 6 = niedziela
export function weekdayIndex(date) {
  return (date.getDay() + 6) % 7;
}

export function startOfWeek(date) {
  return addDays(date, -weekdayIndex(date));
}

// 42 dni (6 pelnych tygodni) siatki miesiaca, od poniedzialku przed 1. dniem miesiaca.
export function monthGridDays(date) {
  const first = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(date) {
  const first = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}
