import { fetcher, get, post, patch, del } from './config';

// GET /api/customers/bikes/{id}/ - Pobiera szczegóły roweru (wraz z danymi klienta i historią zleceń)
export const fetchBikeDetails = async (bikeId) => {
  return fetcher(`/api/customers/bikes/${bikeId}/`);
};

// POST /api/customers/bikes/ - Rejestracja nowego roweru dla klienta
export const createBike = async (bikeData) => {
  return post('/api/customers/bikes/', bikeData);
};

// PATCH /api/customers/bikes/{id}/ - Aktualizacja danych roweru
export const updateBike = async ({ id, bikeData }) => {
  return patch(`/api/customers/bikes/${id}/`, bikeData);
};

// GET /api/customers/bikes/lookup/ - Wyszukiwanie roweru po kodzie QR (sheriff-code)
export const lookupBike = async (code) => {
  return get(`/api/customers/bikes/lookup/?code=${encodeURIComponent(code)}`);
};
