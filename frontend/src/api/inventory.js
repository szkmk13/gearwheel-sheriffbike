import { get } from './config';

const BASE = '/api/inventory';

// Kod usługi "Przechowanie zimowe" w katalogu (apps/inventory/catalog.py: STORAGE_SERVICE_SKU).
export const STORAGE_SERVICE_SKU = 'USL-PRZECHOWANIE';

// GET /api/inventory/parts/ - Katalog usług, części i akcesoriów (stronicowany).
// `search` szuka po nazwie i SKU, `kind` = service | part | accessory.
export const fetchCatalogItems = async (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.append(key, value);
  });
  const queryString = params.toString();
  return get(queryString ? `${BASE}/parts/?${queryString}` : `${BASE}/parts/`);
};

// GET /api/inventory/parts/popular/ - Najczęściej dodawane do zleceń (ostatnie 90 dni),
// przy małej historii dopełnione katalogiem bazowym. Zwykła lista, bez stronicowania.
export const fetchPopularCatalogItems = async (limit = 8) => get(`${BASE}/parts/popular/?limit=${limit}`);
