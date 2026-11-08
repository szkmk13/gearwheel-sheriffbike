// Kategorie sprzetu (Bike.category) - wspolne dla zlecen, przechowalni i kart klienta.

export const CATEGORY_OPTIONS = [
  { value: 'bike', label: 'Rower' },
  { value: 'winter', label: 'Sprzęt zimowy' },
];

// Nazwy grup w listach wyboru sprzetu (liczba mnoga).
export const CATEGORY_GROUP_LABELS = {
  bike: 'Rowery',
  winter: 'Sprzęt zimowy',
};

export const BIKE_TYPE_OPTIONS = [
  { value: 'road', label: 'Szosowy (road)' },
  { value: 'mtb', label: 'Górski (mtb)' },
  { value: 'city', label: 'Miejski (city)' },
  { value: 'gravel', label: 'Gravel (gravel)' },
  { value: 'electric', label: 'Elektryczny (electric)' },
  { value: 'other', label: 'Inny (other)' },
];

export const categoryLabel = (category) =>
  CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;

export const bikeTypeLabel = (bikeType) =>
  BIKE_TYPE_OPTIONS.find((t) => t.value === bikeType)?.label ?? bikeType;

// "Górski (mtb)" -> "Górski" - do miejsc, gdzie etykieta stoi już w nawiasie.
export const bikeTypeShortLabel = (bikeType) => bikeTypeLabel(bikeType).replace(/ \(.*\)$/, '');

// Sezon zimowy: listopad - luty. Marzec - pazdziernik to sezon rowerowy.
// To tylko wartosc domyslna - przyjecie z drugiej kategorii zawsze jest mozliwe.
const WINTER_MONTHS = [10, 11, 0, 1]; // getMonth(): 0 = styczen

export const isWinterSeason = (date = new Date()) => WINTER_MONTHS.includes(date.getMonth());

export const defaultCategoryForDate = (date = new Date()) => (isWinterSeason(date) ? 'winter' : 'bike');

export const SEASON_HINTS = {
  winter: 'Listopad - luty: domyślnie sprzęt zimowy',
  bike: 'Marzec - październik: domyślnie rower',
};

// Podpowiedzi w polach nowego sprzetu.
export const EQUIPMENT_PLACEHOLDERS = {
  bike: { brand: 'np. Trek', model: 'np. Marlin 7' },
  winter: { brand: 'np. Atomic', model: 'np. Redster G9' },
};

// Kategorie obecne w zleceniu (zlecenie moze miec sprzet z obu), w stalej kolejnosci.
export const orderCategories = (order) => {
  const present = new Set((order?.bikes || []).map((b) => b.category));
  return CATEGORY_OPTIONS.map((c) => c.value).filter((c) => present.has(c));
};

// Dane do wysylki nowej sztuki sprzetu - sprzet zimowy nie ma typu roweru.
export const equipmentPayload = ({ category, bike_type, ...rest }) => ({
  ...rest,
  category,
  bike_type: category === 'winter' ? 'other' : (bike_type || 'other'),
});
