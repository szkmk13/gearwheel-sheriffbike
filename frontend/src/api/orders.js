import { fetcher, post, patch } from './config';

export const fetchOrders = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.status) params.append('status', filters.status);
  if (filters.priority) params.append('priority', filters.priority);
  if (filters.ordering) params.append('ordering', filters.ordering);
  
  const queryString = params.toString();
  const url = queryString ? `/api/orders/?${queryString}` : '/api/orders/';
  
  return fetcher(url);
};

export const createOrder = async (newOrderData) => {
  return post('/api/orders/', newOrderData);
};

export const fetchOrderDetails = async (id) => {
  return fetcher(`/api/orders/${id}/`);
};

export const updateOrder = async ({ id, orderData }) => {
  return patch(`/api/orders/${id}/`, orderData);
};

export const fetchDashboardStats = async () => {
  return fetcher('/api/orders/dashboard/');
};

export const fetchDashboardChartData = async (params = {}) => {
  const searchParams = new URLSearchParams();
  if (params.period) searchParams.append('period', params.period);
  if (params.startDate) searchParams.append('start_date', params.startDate);
  if (params.endDate) searchParams.append('end_date', params.endDate);

  const queryString = searchParams.toString();
  const url = queryString ? `/api/orders/dashboard/chart/?${queryString}` : '/api/orders/dashboard/chart/';

  return fetcher(url);
};