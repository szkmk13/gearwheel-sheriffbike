import { get, post, patch } from './config';

const BASE = '/api/storage';

// GET /api/storage/bookings/ - Lista pobytów (stronicowana) z filtrami
export const fetchStorageBookings = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, value);
  });
  const queryString = params.toString();
  return get(queryString ? `${BASE}/bookings/?${queryString}` : `${BASE}/bookings/`);
};

// GET /api/storage/bookings/{id}/ - Szczegóły pobytu wraz z historią zdarzeń
export const fetchStorageBooking = async (id) => get(`${BASE}/bookings/${id}/`);

// GET /api/storage/dashboard/ - Liczniki: na przechowaniu, do odbioru, po terminie, do zapłaty
export const fetchStorageDashboard = async () => get(`${BASE}/dashboard/`);

// POST /api/storage/intake/ - Przyjęcie sprzętu: zlecenie + pobyt na każdą sztukę naraz
export const storageIntake = async (data) => post(`${BASE}/intake/`, data);

// PATCH /api/storage/bookings/{id}/ - Edycja dat, ceny i notatek aktywnego pobytu
export const updateStorageBooking = async ({ id, data }) => patch(`${BASE}/bookings/${id}/`, data);

// POST /api/storage/bookings/{id}/check-out/ - Wydanie sprzętu klientowi
export const checkOutStorage = async ({ id, notes }) => post(`${BASE}/bookings/${id}/check-out/`, { notes });

// POST /api/storage/bookings/{id}/extend/ - Zmiana daty końca pobytu (w obie strony)
export const extendStorage = async ({ id, end_date, note }) => post(`${BASE}/bookings/${id}/extend/`, { end_date, note });

// POST /api/storage/bookings/{id}/payment/ - Dopisanie wpłaty
export const registerStoragePayment = async ({ id, amount, note }) => post(`${BASE}/bookings/${id}/payment/`, { amount, note });

// POST /api/storage/bookings/{id}/cancel/ - Anulowanie pobytu (rezerwacji się nie usuwa)
export const cancelStorage = async ({ id, reason }) => post(`${BASE}/bookings/${id}/cancel/`, { reason });
