// Wspólne stałe i helpery przechowalni (strona, modal przyjęcia, panel szczegółów).

// Rowerów jest kilkanaście na sezon, więc wystarczą dwie zakładki zamiast filtrów.
export const STORAGE_STATUS_TABS = [
  { value: 'stored', label: 'Na przechowaniu', status: 'stored' },
  { value: 'history', label: 'Historia', status: 'picked_up,cancelled' },
];

export { CATEGORY_OPTIONS, BIKE_TYPE_OPTIONS, categoryLabel } from '../../utils/equipment';

// Statusy zajmujące miejsce - tylko taki pobyt da się edytować, przedłużyć czy anulować.
export const ACTIVE_STORAGE_STATUSES = ['reserved', 'stored'];

// Przechowalnia działa w zimie - odbiór domyślnie 1 marca najbliższego sezonu
// (przyjęcie w styczniu/lutym: 1 marca tego samego roku).
export const defaultStorageEndDate = () => {
  const today = new Date();
  const year = today.getMonth() < 2 ? today.getFullYear() : today.getFullYear() + 1;
  return `${year}-03-01`;
};

export { formatMoney } from '../../utils/money';

export const storageKeys = {
  all: ['storage'],
  list: (params) => ['storage', 'bookings', params],
  detail: (id) => ['storage', 'booking', String(id)],
  dashboard: ['storage', 'dashboard'],
};
