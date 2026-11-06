// Puste pole i sama kropka (Number('.') to NaN) nie są liczbą.
export const isPositive = (value) => value !== '' && Number(value) > 0;
export const isNonNegative = (value) => value !== '' && Number(value) >= 0;

// Pole liczby dziesiętnej, które przyjmuje przecinek i kropkę (przecinek zamienia się na kropkę,
// czyli format API). type="number" w części przeglądarek odrzuca przecinek, więc to zwykłe pole
// tekstowe z klawiaturą numeryczną na telefonie, a strzałki góra/dół zmieniają wartość o 1.
export function decimalInputProps(value, setValue, { min = 0, onKeyDown } = {}) {
  return {
    type: 'text',
    inputMode: 'decimal',
    autoComplete: 'off',
    value,
    onChange: (e) => {
      const next = e.target.value.replace(',', '.');
      if (/^\d*\.?\d{0,2}$/.test(next)) setValue(next);
    },
    onKeyDown: (e) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.key === 'ArrowUp' ? 1 : -1;
        const next = Math.max(min, Math.round(((Number(value) || 0) + step) * 100) / 100);
        setValue(String(next));
      }
      onKeyDown?.(e);
    },
  };
}
