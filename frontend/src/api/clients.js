import { fetcher, get, post, patch, del } from './config';

// GET /api/customers/ - Pobiera listę klientów (wspiera paginację, wyszukiwanie po imieniu/nazwisku)
export const fetchClients = async (searchQuery = '') => {
  const url = searchQuery ? `/api/customers/?search=${encodeURIComponent(searchQuery)}` : '/api/customers/';
  return fetcher(url);
};

// GET /api/customers/{id}/ - Pobiera szczegóły klienta. Obiekt zwrotny zawiera już w sobie tablicę rowerów
export const fetchClientDetails = async (clientId) => {
  return fetcher(`/api/customers/${clientId}/`);
};

// POST /api/customers/ - Dodaje nowego klienta
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

// GET /api/customers/bikes/lookup/ - Wyszukiwanie roweru po kodzie QR (sheriff-code)
export const lookupBike = async (code) => {
  return get(`/api/customers/bikes/lookup/?code=${encodeURIComponent(code)}`);
};