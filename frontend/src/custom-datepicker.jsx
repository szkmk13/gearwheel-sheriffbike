import React from 'react';
import { Icon } from './icons.jsx';

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
    <div className="cdp" ref={ref} onKeyDown={onKey}
      style={{ zIndex: open ? 50 : 'auto', position: 'relative' }}>
      <button type="button" className={'cdp-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}>
        <span className={value ? '' : 'cdp-ph'}>{value ? fmtDisplay(value) : placeholder}</span>
        {Icon.clock({ width: 15, height: 15, className: 'cdp-cal-icon' })}
      </button>

      {open && (
        <div className="cdp-panel">
          <div className="cdp-head">
            <button type="button" className={'cdp-nav' + (!canGoPrev ? ' dis' : '')}
              onClick={canGoPrev ? prevMonth : undefined}
              aria-label="Poprzedni miesiac">
              {Icon.arrow({ width: 15, height: 15, style: { transform: 'rotate(180deg)', display: 'block' } })}
            </button>
            <span className="cdp-label">{MONTHS_PL[view.month]} {view.year}</span>
            <button type="button" className="cdp-nav" onClick={nextMonth} aria-label="Nastepny miesiac">
              {Icon.arrow({ width: 15, height: 15, style: { display: 'block' } })}
            </button>
          </div>

          <div className="cdp-grid">
            {DAYS_PL.map((d) => <div key={d} className="cdp-dow">{d}</div>)}
            {cells.map((day, i) => (
              <button key={i} type="button"
                className={
                  'cdp-day' +
                  (isSelected(day) ? ' sel' : '') +
                  (isToday(day) ? ' tod' : '') +
                  (isPast(day) || !day ? ' dis' : '')
                }
                disabled={!day || isPast(day)}
                onClick={() => selectDay(day)}>
                {day || ''}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export { CustomDatePicker };
