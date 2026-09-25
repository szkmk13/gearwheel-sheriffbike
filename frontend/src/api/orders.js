import { fetcher, get, post, patch, del } from './config';

// Pobiera listę zleceń z opcjonalnymi filtrami
export const fetchOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.category) params.append('category', filters.category);
  if (filters.customer) params.append('customer', filters.customer);
  if (filters.bike) params.append('bike', filters.bike);
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);
  if (filters.page) params.append('page', filters.page);
  
  const queryString = params.toString();
  const url = queryString ? `/api/orders/?${queryString}` : '/api/orders/';
  
  return fetcher(url);
};

// Pobiera szczegóły pojedynczego zlecenia
export const fetchOrderDetails = async (id) => {
  return fetcher(`/api/orders/${id}/`);
};

// Tworzy nowe zlecenie naprawy
export const createOrder = async (newOrderData) => {
  return post('/api/orders/', newOrderData);
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

// Pobiera historię zmian statusu dla zlecenia
export const fetchOrderStatusHistory = async (id) => {
  return get(`/api/orders/${id}/history/`);
};

// Pobiera listę pozycji (części i robocizna) dla zlecenia
export const fetchOrderItems = async (id) => {
  return get(`/api/orders/${id}/items/`);
};

// Dodaje pozycję (część lub robociznę) do zlecenia
export const createOrderItem = async (id, itemData) => {
  return post(`/api/orders/${id}/items/`, itemData);
};

// Pobiera statystyki dashboardu
export const fetchDashboardStats = async () => {
  return get('/api/orders/dashboard/');
};