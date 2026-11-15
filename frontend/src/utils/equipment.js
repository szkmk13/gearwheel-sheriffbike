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

// "Trek Marlin 7 (Górski)" / "Atomic Redster" - etykieta sztuki na listach wyboru.
export const equipmentName = (bike) => {
  const name = `${bike.brand} ${bike.model || ''}`.trim();
  return bike.category === 'winter' || !bike.bike_type ? name : `${name} (${bikeTypeShortLabel(bike.bike_type)})`;
};

// Licznik zamiast crypto.randomUUID - ten dziala tylko w bezpiecznym kontekscie (HTTPS/localhost),
// a panel bywa otwierany z telefonu po adresie IP w sieci lokalnej.
let nextNewItemKey = 0;

// Wiersz "nowego sprzetu" w formularzu - jeszcze niezapisana sztuka (z wlasna zawieszka).
export const newEquipmentItem = (category = 'bike') => ({
  key: ++nextNewItemKey, category, brand: '', model: '', bike_type: 'other', tag: '',
});

/**
 * Rejestruje po kolei nowe sztuki sprzetu klienta i zwraca liste {bike, tag_number}.
 *
 * `onCreated(bike, item)` wola sie po kazdej zapisanej sztuce - formularz przenosi ja wtedy
 * z "nowych" do zaznaczonych (razem z zawieszka), wiec gdy cos dalej sie nie uda (np. samo
 * zlecenie), ponowna proba nie zarejestruje tego sprzetu drugi raz.
 */
export async function saveNewEquipment(customerId, items, createBike, onCreated) {
  const entries = [];
  for (const item of items) {
    const bike = await createBike(equipmentPayload({
      customer: customerId,
      category: item.category,
      brand: item.brand.trim(),
      model: item.model.trim(),
      bike_type: item.bike_type,
    }));
    entries.push({ bike: bike.id, tag_number: parseInt(item.tag, 10) });
    onCreated?.(bike, item);
  }
  return entries;
}

// --- Zawieszki: kazda sztuka na zleceniu ma wlasny numer --------------------------------

// Bez powtorzen: zlecenia sprzed zawieszek per sztuka maja ten sam numer na kazdej sztuce.
export const uniqueTags = (tags = []) => [...new Set(tags)];

// [12, 13] -> "#12, #13"
export const formatTags = (tags = []) => uniqueTags(tags).map((tag) => `#${tag}`).join(', ');

// Krotko do list i kalendarza: "#12", "#12, #13", "#12 +3".
export const shortTags = (tags = []) => {
  const unique = uniqueTags(tags);
  if (unique.length <= 2) return formatTags(unique);
  return `#${unique[0]} +${unique.length - 1}`;
};

const TAG_RE = /^\d+$/;

// Numery wpisane w formularzu (stringi) -> komunikat bledu albo null.
export function tagError(values) {
  if (values.some((value) => !TAG_RE.test(String(value ?? '').trim()))) {
    return 'Wpisz numer zawieszki przy każdej sztuce sprzętu.';
  }
  const numbers = values.map((value) => parseInt(value, 10));
  const repeated = [...new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i))];
  if (repeated.length) {
    return `Każda sztuka musi mieć inną zawieszkę - powtarza się ${formatTags(repeated)}.`;
  }
  return null;
}

// Liczba wystapien kazdego numeru w formularzu - do podswietlenia powtorzen.
export const tagCounts = (values) => values.reduce((counts, value) => {
  const key = String(value ?? '').trim();
  if (key) counts[key] = (counts[key] || 0) + 1;
  return counts;
}, {});

// Wpisy {bike, tag_number} dla zaznaczonego, juz zapisanego sprzetu.
export const selectedEquipmentEntries = (selectedIds, tags) =>
  selectedIds.map((id) => ({ bike: id, tag_number: parseInt(tags[id], 10) }));
