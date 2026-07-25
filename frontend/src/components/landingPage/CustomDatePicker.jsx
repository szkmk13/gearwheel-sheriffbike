import React from 'react';
import { Icon } from './Icons.jsx';

const MONTHS_PL = [
  'Styczen', 'Luty', 'Marzec', 'Kwiecien', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpien', 'Wrzesien', 'Pazdziernik', 'Listopad', 'Grudzien',
];
const DAYS_PL = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];

function fmtDisplay(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}.${m}.${y}`;
}

function CustomDatePicker({ value, onChange, placeholder = 'Wybierz termin…' }) {
  const today = React.useMemo(() => {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
  }, []);

  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [open, setOpen] = React.useState(false);
  const [view, setView] = React.useState(() => {
    const base = parsed || today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  React.useEffect(() => {
    if (parsed) setView({ year: parsed.getFullYear(), month: parsed.getMonth() });
  }, [value]);

  const prevMonth = () => setView((v) => {
    const d = new Date(v.year, v.month - 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const nextMonth = () => setView((v) => {
    const d = new Date(v.year, v.month + 1, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const canGoPrev = new Date(view.year, view.month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  const firstDayOfMonth = new Date(view.year, view.month, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectDay = (day) => {
    if (!day) return;
    const date = new Date(view.year, view.month, day);
    if (date < today) return;
    const ds = `${view.year}-${String(view.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    onChange(ds);
    setOpen(false);
  };

  const isSelected = (day) => {
    if (!day || !value) return false;
    const [y, m, d] = value.split('-');
    return Number(y) === view.year && Number(m) - 1 === view.month && Number(d) === day;
  };
  const isPast = (day) => {
    if (!day) return false;
    return new Date(view.year, view.month, day) < today;
  };
  const isToday = (day) => {
    if (!day) return false;
    return view.year === today.getFullYear() && view.month === today.getMonth() && day === today.getDate();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
    if ((e.key === 'Enter' || e.key === ' ') && !open) { e.preventDefault(); setOpen(true); }
  };

  return (
    <div className="relative" style={{ zIndex: open ? 50 : 'auto' }} ref={ref} onKeyDown={onKey}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-[1.5px] bg-paper-2 py-3.5 pl-4 pr-3.5 text-left text-[15px] font-semibold text-ink transition-colors " +
          (open ? "border-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" : "border-line")
        }
      >
        <span className={value ? '' : 'font-medium text-ink-3'}>{value ? fmtDisplay(value) : placeholder}</span>
        <Icon.clock width={15} height={15} className={"flex-none transition-colors " + (open ? "text-accent" : "text-ink-3")} />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-[200] w-[290px] rounded-2xl border border-line bg-paper-2 p-3.5 shadow-lg">
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={canGoPrev ? prevMonth : undefined}
              aria-label="Poprzedni miesiac"
              className={
                "grid h-[30px] w-[30px] place-items-center rounded-lg border-[1.5px] border-line bg-paper-2 text-ink-2 transition-colors " +
                (!canGoPrev ? "cursor-default opacity-30" : "cursor-pointer hover:border-accent hover:bg-accent-soft hover:text-accent-deep")
              }
            >
              <Icon.arrow width={15} height={15} style={{ transform: 'rotate(180deg)', display: 'block' }} />
            </button>
            <span className="flex-1 text-center text-sm font-bold text-ink">{MONTHS_PL[view.month]} {view.year}</span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Nastepny miesiac"
              className="grid h-[30px] w-[30px] cursor-pointer place-items-center rounded-lg border-[1.5px] border-line bg-paper-2 text-ink-2 transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-deep"
            >
              <Icon.arrow width={15} height={15} style={{ display: 'block' }} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DAYS_PL.map((d) => (
              <div key={d} className="py-1 pb-1.5 text-center text-[11px] font-bold tracking-wide text-ink-3">{d}</div>
            ))}
            {cells.map((day, i) => {
              const disabled = !day || isPast(day);
              const selected = isSelected(day);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => selectDay(day)}
                  className={
                    "grid aspect-square place-items-center rounded-lg border-0 bg-transparent text-[13px] font-semibold text-ink transition-colors " +
                    (selected
                      ? "bg-accent text-white shadow-[0_2px_8px_rgba(217,96,28,.45)]"
                      : isToday(day)
                        ? "border-[1.5px] border-accent text-accent-deep"
                        : disabled
                          ? "cursor-default font-medium text-ink-3 opacity-35"
                          : "cursor-pointer hover:bg-accent-soft hover:text-accent-deep")
                  }
                >
                  {day || ''}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export { CustomDatePicker };
