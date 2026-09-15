import { fetcher, post } from './config';

// GET /api/customers/ - Pobiera listę klientów 
export const fetchClients = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.ordering) params.append('ordering', filters.ordering);
  
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

// POST /api/customers/bikes/ - Endpoint do tworzenia roweru 
export const createBike = async (bikeData) => {
  return post('/api/customers/bikes/', bikeData);
};

// Aktualizacja danych klienta
export const updateClient = async ({ id, clientData }) => {
  const response = await fetch(`/api/customers/${id}/`, {
    method: 'PATCH', 
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(clientData),
  });

  if (!response.ok) {
    throw new Error('Nie udało się zaktualizować danych klienta.');
  }

  return response.json();
};