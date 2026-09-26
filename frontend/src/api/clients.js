import { fetcher, get, post, patch, del } from './config';

// GET /api/customers/ - Pobiera listę klientów (wspiera wyszukiwanie i sortowanie)
export const fetchClients = async (filters = {}) => {
  const params = new URLSearchParams();
  if (typeof filters === 'string') {
    if (filters) params.append('search', filters);
  } else {
    if (filters?.search) params.append('search', filters.search);
    if (filters?.ordering) params.append('ordering', filters.ordering);
  }
  
  const queryString = params.toString();
  const url = queryString ? `/api/customers/?${queryString}` : '/api/customers/';
  return fetcher(url);
};

// GET /api/customers/{id}/ - Pobiera szczegóły klienta
export const fetchClientDetails = async (clientId) => {
  return fetcher(`/api/customers/${clientId}/`);
};

// POST /api/customers/ - Dodaje nowego klienta (w tym rodo_accepted)
export const createClient = async (newClientData) => {
  return post('/api/customers/', newClientData);
};

// POST /api/customers/bikes/ - Endpoint do tworzenia sprzętu/roweru dla klienta
export const createBike = async (bikeData) => {
  return post('/api/customers/bikes/', bikeData);
};

// PATCH /api/customers/{id}/ - Aktualizacja danych klienta
export const updateClient = async ({ id, clientData }) => {
  return patch(`/api/customers/${id}/`, clientData);
};

// DELETE /api/customers/{id}/ - Usunięcie klienta
export const deleteClient = async (id) => {
  return del(`/api/customers/${id}/`);
};

// GET /api/customers/bikes/{id}/ - Pobiera szczegóły roweru
export const fetchBikeDetails = async (bikeId) => {
  return fetcher(`/api/customers/bikes/${bikeId}/`);
};

// PATCH /api/customers/bikes/{id}/ - Aktualizacja danych roweru
export const updateBike = async ({ id, bikeData }) => {
  return patch(`/api/customers/bikes/${id}/`, bikeData);
};

// GET /api/customers/bikes/lookup/ - Wyszukiwanie roweru po kodzie QR (sheriff-code)
export const lookupBike = async (code) => {
  return get(`/api/customers/bikes/lookup/?code=${encodeURIComponent(code)}`);
};