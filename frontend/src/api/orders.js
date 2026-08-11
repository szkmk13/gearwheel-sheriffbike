import { fetcher, API_BASE_URL } from './config';

export const fetchOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  
  const queryString = params.toString();
  const url = queryString ? `/api/orders/?${queryString}` : '/api/orders/';
  
  return fetcher(url);
};

export const createOrder = async (newOrderData) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newOrderData),
  });

  if (!response.ok) {
    throw new Error('Nie udało się utworzyć zlecenia.');
  }
  return response.json();
};


// Pobiera szczegóły pojedynczego zlecenia
export const fetchOrderDetails = async (id) => {
  return fetcher(`/api/orders/${id}/`);
};

// Aktualizuje zlecenie (np. zmiana statusu lub opisu)
export const updateOrder = async ({ id, orderData }) => {
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}/`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });

  if (!response.ok) {
    throw new Error('Nie udało się zaktualizować zlecenia.');
  }
  return response.json();
};