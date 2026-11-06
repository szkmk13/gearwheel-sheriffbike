import { useEffect, useRef, useState } from "react";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchClients } from "../api/clients";

const MAX_RESULTS = 8;
const DEBOUNCE_MS = 300;

// Numery w bazie są w E.164 ("+48500600700"), a wyszukiwanie to `icontains` - spacje
// i myślniki z "500 600 700" by je rozjechały, więc dla wpisu wyglądającego na numer je wycinamy.
const normalizeSearch = (text) => {
  const trimmed = text.trim();
  return /^[\d\s+()-]+$/.test(trimmed) ? trimmed.replace(/[\s()-]/g, '') : trimmed;
};

const looksLikePhone = (text) => /^[\d\s+()-]+$/.test(text.trim());

// Wybór klienta z wyszukiwaniem w trakcie pisania (imię, nazwisko, telefon, e-mail).
// `value` to obiekt klienta albo null. Ukryte pole `name` niesie id klienta do FormData
// i pilnuje `required` natywną walidacją formularza.
export default function ClientSearchSelect({
  label = "Klient",
  name,
  value,
  onChange,
  onCreateNew,
  required = false,
  placeholder = "Wpisz imię, nazwisko lub numer telefonu...",
}) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(normalizeSearch(text)), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  useEffect(() => {
    if (!isOpen) return;
    const close = (e) => {
      if (!wrapperRef.current?.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [isOpen]);

  const { data, isFetching } = useQuery({
    queryKey: ['clients', { search: term }],
    queryFn: () => fetchClients({ search: term }),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  });
  const results = term.length >= 2 ? (data?.results || []).slice(0, MAX_RESULTS) : [];
  // Ostatnia pozycja listy to "Nowy klient" (jeśli formularz ją obsługuje).
  const optionsCount = results.length + (onCreateNew ? 1 : 0);

  const select = (client) => {
    onChange(client);
    setText("");
    setTerm("");
    setIsOpen(false);
  };

  const createNew = () => {
    const typed = text.trim();
    setIsOpen(false);
    setText("");
    onCreateNew(looksLikePhone(typed) ? { phone: typed } : { fullName: typed });
  };

  const choose = (index) => {
    if (index < results.length) select(results[index]);
    else if (onCreateNew) createNew();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlight((h) => (optionsCount ? (h + 1) % optionsCount : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => (optionsCount ? (h - 1 + optionsCount) % optionsCount : 0));
    } else if (e.key === 'Enter') {
      // Enter nie może wysłać całego formularza przy otwartej liście.
      e.preventDefault();
      if (isOpen && optionsCount) choose(highlight);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const hiddenInput = (
    <input
      tabIndex={-1}
      aria-hidden="true"
      name={name}
      required={required}
      value={value ? String(value.id) : ""}
      onChange={() => {}}
      className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
    />
  );

  if (value) {
    return (
      <div className="flex flex-col gap-1.5 mb-4">
        {label && <label className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>}
        <div className="relative flex items-center gap-3 p-3 bg-white border border-gray-300 rounded-lg shadow-sm">
          {hiddenInput}
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm bg-[var(--color-accent-soft)] text-[var(--color-accent)] shrink-0 uppercase">
            {value.first_name?.[0]}{value.last_name?.[0]}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{value.first_name} {value.last_name}</p>
            <p className="text-xs text-[var(--color-ink-3)] truncate">{value.phone}{value.email ? ` - ${value.email}` : ''}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setIsOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer shrink-0"
          >
            Zmień
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 mb-4" ref={wrapperRef}>
      {label && <label className="text-sm font-medium text-gray-700">{label} {required && <span className="text-red-500">*</span>}</label>}
      <div className="relative">
        {hiddenInput}
        <svg className="absolute z-10 left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            setIsOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="relative w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800
                     focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all shadow-sm"
        />

        {isOpen && (text.trim().length >= 2 || onCreateNew) && (
          <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 max-h-80 overflow-y-auto">
            {text.trim().length < 2 ? (
              <li className="px-4 py-2 text-xs text-gray-400">Wpisz co najmniej 2 znaki.</li>
            ) : results.length === 0 ? (
              <li className="px-4 py-2 text-sm text-gray-500">
                {isFetching || term !== normalizeSearch(text) ? 'Szukam...' : 'Brak klientów pasujących do wpisu.'}
              </li>
            ) : (
              results.map((client, index) => (
                <li
                  key={client.id}
                  onMouseDown={(e) => { e.preventDefault(); select(client); }}
                  onMouseEnter={() => setHighlight(index)}
                  className={`px-4 py-2 cursor-pointer flex justify-between items-center gap-3 ${highlight === index ? 'bg-[var(--color-paper)]' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-900 truncate">{client.first_name} {client.last_name}</span>
                    <span className="block text-xs text-gray-500 truncate">{client.phone}</span>
                  </span>
                  <span className="text-xs text-gray-400 shrink-0">
                    {client.bikes?.length ? `rowery: ${client.bikes.length}` : 'brak rowerów'}
                  </span>
                </li>
              ))
            )}
            {onCreateNew && (
              <li
                onMouseDown={(e) => { e.preventDefault(); createNew(); }}
                onMouseEnter={() => setHighlight(results.length)}
                className={`mt-1 px-4 py-2 border-t border-gray-100 cursor-pointer text-sm font-semibold text-[var(--color-accent)] ${highlight === results.length ? 'bg-[var(--color-paper)]' : ''}`}
              >
                + Nowy klient{text.trim() ? ` "${text.trim()}"` : ''}
              </li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
