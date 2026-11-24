import { get, post, patch, del } from './config';

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

// --- Zakladka "Katalog i uslugi" (edycja katalogu jak w adminie) ---

// GET, PATCH i DELETE /parts/{id}/, POST /parts/ - pozycja katalogu (lista nie ma opisu ani ceny zakupu).
export const fetchCatalogItem = (id) => get(`${BASE}/parts/${id}/`);
export const createCatalogItem = (data) => post(`${BASE}/parts/`, data);
export const updateCatalogItem = (id, data) => patch(`${BASE}/parts/${id}/`, data);
// Backend odrzuca (409) pozycje uzyte na zleceniu - te mozna tylko ukryc (is_active=false).
export const deleteCatalogItem = (id) => del(`${BASE}/parts/${id}/`);

// Kategorie sa nieliczne (kilka), wiec pierwsza strona (50) wystarcza.
export const fetchCategories = async () => {
  const data = await get(`${BASE}/categories/`);
  return data?.results ?? data ?? [];
};
export const createCategory = (name) => post(`${BASE}/categories/`, { name });
