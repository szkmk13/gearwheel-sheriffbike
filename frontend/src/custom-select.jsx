import React from 'react';
import { Icon } from './icons.jsx';

function CustomSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  const current = options.find((o) => (o.value ?? o) === value);
  const label = current?.label ?? current ?? placeholder ?? value;

  React.useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const onKey = (e) => {
    if (e.key === 'Escape') setOpen(false);
    if ((e.key === 'ArrowDown' || e.key === 'Enter') && !open) { e.preventDefault(); setOpen(true); }
  };

  return (
    <div className="csel" ref={ref} onKeyDown={onKey}
      style={{ zIndex: open ? 50 : 'auto', position: 'relative' }}>
      <button type="button" className={'csel-trigger' + (open ? ' open' : '')}
        onClick={() => setOpen((v) => !v)}>
        <span className={!current ? 'csel-placeholder' : ''}>{label}</span>
        {Icon.arrow({ width: 14, height: 14, className: 'csel-chev' })}
      </button>
      {open && (
        <div className="csel-dropdown">
          {options.map((o) => {
            const val = o.value ?? o;
            const lbl = o.label ?? o;
            return (
              <button key={val} type="button"
                className={'csel-opt' + (val === value ? ' on' : '')}
                onClick={() => { onChange(val); setOpen(false); }}>
                {lbl}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export { CustomSelect };
