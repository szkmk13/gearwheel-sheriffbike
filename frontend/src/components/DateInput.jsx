import { useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { formatDate } from "../utils/dates";

// Pole daty wyswietlane zawsze jako DD/MM/YYYY. Natywne <input type="date"> pokazuje format
// z jezyka przegladarki i nie da sie go zmienic, wiec widoczne jest zwykle pole tekstowe,
// a natywny input (wartosc YYYY-MM-DD pod `name`) sluzy tylko za kalendarz i za wartosc
// wysylana w FormData - dzieki temu `required` i `min` dzialaja jak dotad.
export default function DateInput({
    label,
    name,
    value,
    defaultValue = "",
    onChange,
    required = false,
    disabled = false,
    min,
    max,
}) {
    const nativeRef = useRef(null);
    const [innerValue, setInnerValue] = useState(defaultValue);
    const isControlled = value !== undefined;
    const currentValue = isControlled ? value : innerValue;

    const openPicker = () => {
        if (disabled) return;
        const input = nativeRef.current;
        if (!input) return;
        try {
            input.showPicker();
        } catch {
            // Starsze przegladarki bez showPicker() - fokus na natywnym polu.
            input.focus();
        }
    };

    const handleChange = (e) => {
        if (!isControlled) setInnerValue(e.target.value);
        onChange?.(e);
    };

    return (
        <div className="flex flex-col gap-1.5 mb-4">
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <div className="relative">
                <input
                    type="text"
                    readOnly
                    disabled={disabled}
                    value={currentValue ? formatDate(currentValue) : ""}
                    placeholder="DD/MM/RRRR"
                    onClick={openPicker}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openPicker();
                        }
                    }}
                    className="w-full pl-4 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 cursor-pointer
                               focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all shadow-sm
                               disabled:cursor-default disabled:bg-gray-50 disabled:text-gray-500"
                />
                <Calendar
                    aria-hidden="true"
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                />
                {/* Niewidoczny, ale nie display:none - przegladarka musi moc pokazac przy nim
                    komunikat walidacji `required`/`min`. */}
                <input
                    ref={nativeRef}
                    type="date"
                    name={name}
                    value={currentValue}
                    onChange={handleChange}
                    required={required}
                    disabled={disabled}
                    min={min}
                    max={max}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                />
            </div>
        </div>
    );
}
