// Wspólne stałe i helpery przechowalni (strona, modal przyjęcia, panel szczegółów).

// Rowerów jest kilkanaście na sezon, więc wystarczą dwie zakładki zamiast filtrów.
export const STORAGE_STATUS_TABS = [
  { value: 'stored', label: 'Na przechowaniu', status: 'stored' },
  { value: 'history', label: 'Historia', status: 'picked_up,cancelled' },
];

export const CATEGORY_OPTIONS = [
  { value: 'bike', label: 'Rower' },
  { value: 'winter', label: 'Sprzęt zimowy' },
];

export const BIKE_TYPE_OPTIONS = [
  { value: 'road', label: 'Szosowy (road)' },
  { value: 'mtb', label: 'Górski (mtb)' },
  { value: 'city', label: 'Miejski (city)' },
  { value: 'gravel', label: 'Gravel (gravel)' },
  { value: 'electric', label: 'Elektryczny (electric)' },
  { value: 'other', label: 'Inny (other)' },
];

// Statusy zajmujące miejsce - tylko taki pobyt da się edytować, przedłużyć czy anulować.
export const ACTIVE_STORAGE_STATUSES = ['reserved', 'stored'];

// Przechowalnia działa w zimie - odbiór domyślnie 1 marca najbliższego sezonu
// (przyjęcie w styczniu/lutym: 1 marca tego samego roku).
export const defaultStorageEndDate = () => {
  const today = new Date();
  const year = today.getMonth() < 2 ? today.getFullYear() : today.getFullYear() + 1;
  return `${year}-03-01`;
};

export const categoryLabel = (category) =>
  CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;

export { formatMoney } from '../../utils/money';

export const storageKeys = {
  all: ['storage'],
  list: (params) => ['storage', 'bookings', params],
  detail: (id) => ['storage', 'booking', String(id)],
  dashboard: ['storage', 'dashboard'],
};
