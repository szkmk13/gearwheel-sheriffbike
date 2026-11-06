import { fetcher, get, post, patch, del } from './config';

// Pobiera listę zleceń z opcjonalnymi filtrami
export const fetchOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.category) params.append('category', filters.category);
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.bike) params.append('bike', filters.bike);
  if (filters.ordering) params.append('ordering', filters.ordering);
  if (filters.page) params.append('page', filters.page);
  
  const queryString = params.toString();
  const url = queryString ? `/api/orders/?${queryString}` : '/api/orders/';
  
  return fetcher(url);
};

// GET /api/orders/calendar/ - Zlecenia z datą odbioru w zakresie [start, end] (bez paginacji, maks. 42 dni)
export const fetchOrdersCalendar = async ({ start, end, status }) => {
  const params = new URLSearchParams({ start, end });
  if (status) params.append('status', status);
  return fetcher(`/api/orders/calendar/?${params.toString()}`);
};

// Tworzy nowe zlecenie naprawy
export const createOrder = async (newOrderData) => {
  return post('/api/orders/', newOrderData);
};

// Pobiera szczegóły pojedynczego zlecenia
export const fetchOrderDetails = async (id) => {
  return fetcher(`/api/orders/${id}/`);
};

// Aktualizuje zlecenie (częściowa aktualizacja PATCH)
export const updateOrder = async ({ id, orderData }) => {
  return patch(`/api/orders/${id}/`, orderData);
};

// Usuwa zlecenie
export const deleteOrder = async (id) => {
  return del(`/api/orders/${id}/`);
};

// Zmiana statusu zlecenia z wpisem do historii i opcjonalną notatką
export const changeOrderStatus = async (id, { status, note }) => {
  return post(`/api/orders/${id}/status/`, { status, note });
};

// Wysyła klientowi SMS o gotowości do odbioru (treść po ewentualnej edycji)
export const sendOrderSms = async (id, message) => {
  return post(`/api/orders/${id}/sms/`, { message });
};

// Pobiera historię zmian statusu dla zlecenia
export const fetchOrderStatusHistory = async (id) => {
  return get(`/api/orders/${id}/history/`);
};

// Pobiera pozycje zlecenia (usługi, części, akcesoria)
export const fetchOrderItems = async (id) => {
  return get(`/api/orders/${id}/items/`);
};

// Dodaje pozycję: z katalogu ({ part, quantity }) albo jednorazową
// ({ description, item_type, unit_price, quantity, save_to_catalog }). Przelicza final_cost zlecenia.
export const createOrderItem = async (id, itemData) => {
  return post(`/api/orders/${id}/items/`, itemData);
};

// Poprawia ilość, cenę, opis albo rodzaj pozycji
export const updateOrderItem = async (orderId, itemId, data) => {
  return patch(`/api/orders/${orderId}/items/${itemId}/`, data);
};

// Usuwa pozycję ze zlecenia
export const deleteOrderItem = async (orderId, itemId) => {
  return del(`/api/orders/${orderId}/items/${itemId}/`);
};

// Pobiera statystyki dashboardu
export const fetchDashboardStats = async () => {
  return get('/api/orders/dashboard/');
};

// Pobiera dane wykresu dashboardu
export const fetchDashboardChartData = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.append('period', params.period);
  if (params.startDate) searchParams.append('start_date', params.startDate);
  if (params.endDate) searchParams.append('end_date', params.endDate);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/orders/dashboard/chart/?${queryString}` : '/api/orders/dashboard/chart/';

  return fetcher(url);
};