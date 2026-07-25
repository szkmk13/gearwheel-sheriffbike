import React from 'react';
import { Icon } from './Icons.jsx';

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
    <div className="relative" style={{ zIndex: open ? 50 : 'auto' }} ref={ref} onKeyDown={onKey}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border-[1.5px] bg-paper-2 py-3.5 pl-4 pr-3.5 text-left text-[15px] font-semibold text-ink transition-colors " +
          (open ? "border-accent shadow-[0_0_0_4px_var(--color-accent-soft)]" : "border-line hover:border-line-2")
        }
      >
        <span className={"overflow-hidden text-ellipsis whitespace-nowrap " + (!current ? "text-ink-3" : "")}>{label}</span>
        <Icon.arrow width={14} height={14} className={"pointer-events-none flex-none text-ink-3 transition-transform " + (open ? "-rotate-90" : "rotate-90")} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-[200] overflow-hidden rounded-xl border border-line bg-paper-2 p-1 shadow-lg">
          {options.map((o) => {
            const val = o.value ?? o;
            const lbl = o.label ?? o;
            return (
              <button
                key={val}
                type="button"
                onClick={() => { onChange(val); setOpen(false); }}
                className={
                  "block w-full cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap rounded-lg px-3.5 py-2.5 text-left text-[14.5px] font-medium text-ink transition-colors hover:bg-accent-soft hover:text-accent-deep " +
                  (val === value ? "bg-accent-soft font-bold text-accent-deep" : "")
                }
              >
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
