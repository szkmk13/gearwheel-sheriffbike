import { CATEGORY_OPTIONS, SEASON_HINTS } from "../../utils/equipment";
import CategoryIcon from "./CategoryIcon";

// Wybrany segment: rower w akcencie warsztatu, sprzet zimowy w granacie z sekcji zimowej
// strony - tryb formularza ma byc widoczny na pierwszy rzut oka.
const ACTIVE_STYLES = {
  bike: 'bg-[var(--color-accent)] text-white',
  winter: 'bg-[var(--color-winter-bg)] text-[var(--color-winter-ice)]',
};

const HINTS = {
  manual: 'Wybrano ręcznie',
  equipment: 'Według wybranego sprzętu',
};

/**
 * Przelacznik Rower | Sprzet zimowy.
 *
 * `hint`: 'season' pokazuje, skad wziela sie wartosc domyslna, 'manual' - ze wybrano recznie,
 * 'equipment' - ze kategoria wynika z wybranego sprzetu, null - bez podpowiedzi. `size="sm"` dla mniejszych formularzy (karta klienta).
 */
export default function CategorySwitch({ value, onChange, hint = null, size = 'md', name = 'category' }) {
  const pad = size === 'sm' ? 'py-2 text-sm' : 'py-3 text-[15px]';

  return (
    <div className="flex flex-col gap-1.5">
      <div
        role="radiogroup"
        aria-label="Rodzaj sprzętu"
        className="grid grid-cols-2 gap-1 p-1 rounded-xl border border-[var(--color-line)] bg-[var(--color-paper-2)]"
      >
        {CATEGORY_OPTIONS.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={`flex items-center justify-center gap-2 rounded-lg font-medium cursor-pointer ${pad}
                transition-colors duration-200 motion-reduce:transition-none
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-1
                ${active ? ACTIVE_STYLES[option.value] : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper)]'}`}
            >
              <CategoryIcon category={option.value} className={size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} />
              {option.label}
            </button>
          );
        })}
      </div>
      {/* Wartosc trafia tez do FormData formularza */}
      <input type="hidden" name={name} value={value} />
      {hint && (
        <p className="text-xs text-[var(--color-ink-3)] px-1">
          {HINTS[hint] ?? SEASON_HINTS[value]}
        </p>
      )}
    </div>
  );
}
