import Input from "../Input";
import Select from "../Select";
import CategoryIcon from "./CategoryIcon";
import {
  BIKE_TYPE_OPTIONS, CATEGORY_GROUP_LABELS, CATEGORY_OPTIONS, EQUIPMENT_PLACEHOLDERS,
  equipmentName, newEquipmentItem, tagCounts,
} from "../../utils/equipment";

const checkboxClass = "w-4 h-4 text-[var(--color-accent)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer disabled:cursor-not-allowed";

// Podpowiedz pod numerem: powtorzenie na tym zleceniu (blad) albo numer zajety gdzie indziej
// (tylko ostrzezenie - zawieszki wracaja do obiegu, a dane bywaja nieaktualne).
function TagHint({ value, counts, takenTags }) {
  const key = String(value ?? '').trim();
  if (!key) return null;
  if (counts[key] > 1) {
    return <p className="mt-1 text-xs font-medium text-red-600">Ten numer jest już na tym zleceniu.</p>;
  }
  const orders = takenTags?.[key];
  if (orders?.length) {
    return (
      <p className="mt-1 text-xs font-medium text-amber-700">
        Wisi na zleceniu {orders.map((id) => `#${id}`).join(', ')}.
      </p>
    );
  }
  return null;
}

// Pole numeru zawieszki: "#" przed wartoscia, same cyfry.
function TagInput({ value, onChange, disabled, invalid, label }) {
  return (
    <div className="relative">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[var(--color-ink-3)]">#</span>
      <input
        type="text" inputMode="numeric" pattern="[0-9]*" required
        aria-label={label}
        placeholder="nr"
        disabled={disabled}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        className={`w-24 pl-6 pr-2 py-1.5 border rounded-md text-sm font-semibold bg-white text-[var(--color-ink)]
          focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]
          ${invalid ? 'border-red-400' : 'border-gray-300'}`}
      />
    </div>
  );
}

/**
 * Wybor kilku sztuk sprzetu na jedno zlecenie, kazda z wlasna zawieszka: checkboxy ze
 * sprzetem klienta plus wiersze nowego, jeszcze niezapisanego sprzetu. Komponent nie trzyma
 * stanu - formularz przekazuje `selectedIds` / `tags` (id -> numer) / `newItems` (kazdy z `tag`)
 * i dostaje zmiany przez `onSelectedChange` / `onTagsChange` / `onNewItemsChange`.
 *
 * - `primaryCategory`: ta kategoria jest na gorze listy i jest domyslna dla nowego wiersza.
 * - `lockedIds`: Map id -> powod; taka sztuka zostaje zaznaczona i nie da sie jej odznaczyc
 *   (np. ma rezerwacje w przechowalni tego zlecenia). Numer da sie zmienic.
 * - `unavailableIds`: Map id -> powod; taka sztuka jest odznaczona i nie da sie jej wybrac
 *   (np. juz lezy w przechowalni).
 * - `takenTags`: {"12": [5]} - numery wiszace na innych nieodebranych zleceniach (ostrzezenie).
 * - `onScan`: gdy podany, w naglowku pojawia sie "Skanuj QR".
 */
export default function EquipmentPicker({
  equipment = [],
  selectedIds,
  onSelectedChange,
  tags,
  onTagsChange,
  newItems,
  onNewItemsChange,
  primaryCategory = 'bike',
  lockedIds = new Map(),
  unavailableIds = new Map(),
  takenTags = {},
  onScan,
  disabled = false,
  title = 'Sprzęt',
}) {
  const toggle = (id) => {
    if (lockedIds.has(id) || unavailableIds.has(id)) return;
    onSelectedChange(selectedIds.includes(id) ? selectedIds.filter((b) => b !== id) : [...selectedIds, id]);
  };

  const setTag = (id, value) => onTagsChange({ ...tags, [id]: value });

  const updateItem = (key, name, value) => {
    onNewItemsChange(newItems.map((item) => (item.key === key ? { ...item, [name]: value } : item)));
  };

  const addItem = () => onNewItemsChange([...newItems, newEquipmentItem(primaryCategory)]);
  const removeItem = (key) => onNewItemsChange(newItems.filter((item) => item.key !== key));

  // Najpierw sprzet z kategorii z przelacznika, nizej reszta - nic nie jest ukryte.
  const order = [primaryCategory, ...CATEGORY_OPTIONS.map((c) => c.value).filter((c) => c !== primaryCategory)];
  const groups = order
    .map((category) => ({
      category,
      items: equipment.filter((bike) => (bike.category || 'bike') === category),
    }))
    .filter((group) => group.items.length > 0);

  const count = selectedIds.length + newItems.length;
  const counts = tagCounts([...selectedIds.map((id) => tags[id]), ...newItems.map((item) => item.tag)]);
  const isRepeated = (value) => counts[String(value ?? '').trim()] > 1;

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
        <h4 className="text-sm font-semibold text-[var(--color-ink)]">
          {title}
          <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${count ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]' : 'bg-[var(--color-paper-3)] text-[var(--color-ink-3)]'}`}>
            {count ? `wybrano: ${count} szt.` : 'nic nie wybrano'}
          </span>
        </h4>
        <div className="flex items-center gap-4">
          {onScan && (
            <button
              type="button" onClick={onScan} disabled={disabled}
              className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
              title="Zeskanuj kod QR sprzętu"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Skanuj QR
            </button>
          )}
          <button
            type="button" onClick={addItem} disabled={disabled}
            className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer disabled:opacity-50 disabled:no-underline"
          >
            + Dodaj nowy sprzęt
          </button>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.category} className="mb-4">
          {groups.length > 1 && (
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)] mb-1.5">
              {CATEGORY_GROUP_LABELS[group.category]}
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {group.items.map((bike) => {
              const checked = selectedIds.includes(bike.id);
              const lockReason = lockedIds.get(bike.id) || unavailableIds.get(bike.id);
              const unavailable = unavailableIds.has(bike.id);
              return (
                <div
                  key={bike.id}
                  className={`p-3 border rounded-lg transition-colors ${
                    checked
                      ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
                      : unavailable
                        ? 'border-[var(--color-line)] bg-gray-50 opacity-60'
                        : 'border-[var(--color-line)] bg-[var(--color-paper-2)] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <label
                      title={lockReason}
                      className={`flex flex-1 min-w-0 items-center gap-3 ${lockReason || disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <input
                        type="checkbox" className={checkboxClass}
                        checked={checked} disabled={!!lockReason || disabled}
                        onChange={() => toggle(bike.id)}
                      />
                      <CategoryIcon category={bike.category || 'bike'} className="w-4 h-4 text-[var(--color-ink-3)]" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-[var(--color-ink)] truncate">{equipmentName(bike)}</span>
                        {(lockReason || bike.serial_no) && (
                          <span className="block text-xs text-[var(--color-ink-3)] truncate">
                            {lockReason || `nr ${bike.serial_no}`}
                          </span>
                        )}
                      </span>
                    </label>
                    {checked && (
                      <TagInput
                        label={`Nr zawieszki: ${equipmentName(bike)}`}
                        value={tags[bike.id]} onChange={(value) => setTag(bike.id, value)}
                        disabled={disabled} invalid={isRepeated(tags[bike.id])}
                      />
                    )}
                  </div>
                  {checked && <TagHint value={tags[bike.id]} counts={counts} takenTags={takenTags} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {newItems.map((item, index) => (
        <div key={item.key} className="p-4 mb-3 border border-dashed border-[var(--color-line)] rounded-lg bg-[var(--color-paper-2)]">
          <div className="flex justify-between items-center mb-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
              <CategoryIcon category={item.category} className="w-3.5 h-3.5" />
              Nowy sprzęt {index + 1}
            </span>
            <button
              type="button" onClick={() => removeItem(item.key)} disabled={disabled}
              className="text-xs text-[var(--color-ink-3)] hover:text-red-600 cursor-pointer"
            >
              Usuń
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr] gap-x-4 items-start">
            <div className="flex flex-col gap-1.5 mb-4">
              <span className="text-sm font-medium text-gray-700">Zawieszka <span className="text-red-500">*</span></span>
              <TagInput
                label={`Nr zawieszki: nowy sprzęt ${index + 1}`}
                value={item.tag} onChange={(value) => updateItem(item.key, 'tag', value)}
                disabled={disabled} invalid={isRepeated(item.tag)}
              />
              <TagHint value={item.tag} counts={counts} takenTags={takenTags} />
            </div>
            <Select
              label="Kategoria" required options={CATEGORY_OPTIONS} disabled={disabled}
              value={item.category} onChange={(e) => updateItem(item.key, 'category', e.target.value)}
            />
            <Input
              label="Producent" required disabled={disabled}
              placeholder={EQUIPMENT_PLACEHOLDERS[item.category].brand}
              value={item.brand} onChange={(e) => updateItem(item.key, 'brand', e.target.value)}
            />
            <Input
              label="Model" required disabled={disabled}
              placeholder={EQUIPMENT_PLACEHOLDERS[item.category].model}
              value={item.model} onChange={(e) => updateItem(item.key, 'model', e.target.value)}
            />
            {item.category === 'bike' && (
              <div className="lg:col-start-2">
                <Select
                  label="Typ roweru" required options={BIKE_TYPE_OPTIONS} disabled={disabled}
                  value={item.bike_type} onChange={(e) => updateItem(item.key, 'bike_type', e.target.value)}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {equipment.length === 0 && newItems.length === 0 && (
        <p className="text-sm text-[var(--color-ink-3)]">Klient nie ma jeszcze sprzętu - dodaj nowy.</p>
      )}
    </div>
  );
}
