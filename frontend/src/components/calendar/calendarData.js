// Wspolne dla kalendarza (/panel/calendar) i paska najblizszych odbiorow na dashboardzie.

// Domyslnie bez `done`, `delivered` i `cancelled` - przy tych zleceniach nie ma juz nic do zrobienia.
export const OPEN_STATUSES = ['accepted', 'estimating', 'waiting_parts', 'in_progress'];

// Klucz zaczyna sie od 'orders', wiec kazde invalidateQueries(['orders']) po zmianie
// zlecenia odswieza tez kalendarz i dashboard.
export const calendarQueryKey = (start, end, showClosed = false) => ['orders', 'calendar', start, end, showClosed];

// Wyglad dni o innych godzinach pracy (zob. workshopDayKind w utils/dates.js).
// `cell` - tlo komorki/kolumny, `badge` - dopisek w naglowku dnia, `note` - opis w widoku dnia.
export const WORKSHOP_DAY_STYLE = {
  short: { cell: 'bg-amber-50', badge: 'krócej', badgeClass: 'text-amber-700', note: 'serwis czynny krócej' },
  closed: { cell: 'bg-gray-100', badge: 'nieczynne', badgeClass: 'text-gray-500', note: 'serwis nieczynny' },
};

// { 'YYYY-MM-DD': [zlecenia] } - pod data odbioru.
export function groupByPickupDate(orders) {
  const grouped = {};
  for (const order of orders) {
    (grouped[order.estimated_pickup_date] ??= []).push(order);
  }
  return grouped;
}
