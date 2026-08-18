import { fetcher, API_BASE_URL } from './config';

// GET /api/customers/ - Pobiera listę klientów (wspiera paginację, wyszukiwanie po imieniu/nazwisku)
export const fetchClients = async (searchQuery = '') => {
  const url = searchQuery ? `/api/customers/?search=${searchQuery}` : '/api/customers/';
  return fetcher(url);
};

// GET /api/customers/{id}/ - Pobiera szczegóły klienta. Obiekt zwrotny zawiera już w sobie tablicę rowerów
export const fetchClientDetails = async (clientId) => {
  return fetcher(`/api/customers/${clientId}/`);
};

// POST /api/customers/ - Dodaje nowego klienta
export const createClient = async (newClientData) => {
  const response = await fetch(`${API_BASE_URL}/api/customers/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newClientData),
  });

  if (!response.ok) {
    throw new Error('Nie udało się zapisać klienta na serwerze.');
  }

  return response.json();
};

// POST /api/customers/bikes/ endpoint do tworzenia roweru 
export const createBike = async (bikeData) => {
  const response = await fetch(`${API_BASE_URL}/api/customers/bikes/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(bikeData),
  });

  if (!response.ok) {
    throw new Error('Nie udało się zapisać roweru w bazie.');
  }

  return response.json();
};

// Aktualizacja danych klienta
export const updateClient = async ({ id, clientData }) => {
  const response = await fetch(`${API_BASE_URL}/api/customers/${id}/`, {
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