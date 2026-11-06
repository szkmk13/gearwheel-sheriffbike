import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Input from "../Input";
import Button from "../Button";
import { fetchCatalogItems, fetchPopularCatalogItems } from "../../api/inventory";
import { createOrderItem, deleteOrderItem, updateOrderItem } from "../../api/orders";
import { formatMoney } from "../../utils/money";
import { decimalInputProps, isNonNegative, isPositive } from "../../utils/decimalInput";

// Rodzaje pozycji - te same co w katalogu (Part.KIND_CHOICES).
export const ITEM_KINDS = [
  { value: 'service', label: 'Usługa', plural: 'Usługi', badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'part', label: 'Część', plural: 'Części', badge: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'accessory', label: 'Akcesorium', plural: 'Akcesoria', badge: 'bg-green-50 text-green-700 border-green-200' },
];
const kindOf = (value) => ITEM_KINDS.find((k) => k.value === value) ?? ITEM_KINDS[1];

// Wydanego ani anulowanego zlecenia backend już nie przelicza (orders.services.ITEMS_LOCKED_STATUSES).
export const ITEMS_LOCKED_STATUSES = ['delivered', 'cancelled'];

const MAX_RESULTS = 8;
const POPULAR_LIMIT = 8;
export const popularItemsKey = ['inventory', 'parts', 'popular'];
const DEBOUNCE_MS = 300;
const smallInputClass = "w-full px-2 py-1 border border-gray-300 rounded-md text-sm bg-white text-gray-800 text-right focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)]";

// "2.00" -> "2", "1.50" -> "1.5" - ilość bez zbędnych zer.
const formatQuantity = (value) => String(Number(value));
function KindBadge({ kind }) {
  const { label, badge } = kindOf(kind);
  return (
    <span className={`shrink-0 px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded border ${badge}`}>
      {label}
    </span>
  );
}

// Wyszukiwarka katalogu w trakcie pisania. Ostatnia opcja listy to pozycja jednorazowa
// z wpisanym tekstem - na wypadek, gdy w katalogu nie ma tego, czego szukamy.
// Przy pustym polu lista pokazuje najczęściej używane pozycje.
function CatalogSearch({ onPick, onOneOff }) {
  const [text, setText] = useState("");
  const [term, setTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setTerm(text.trim()), DEBOUNCE_MS);
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
    queryKey: ['inventory', 'parts', { search: term, is_active: true }],
    queryFn: () => fetchCatalogItems({ search: term, is_active: true }),
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
  });
  const { data: popular = [], isLoading: isPopularLoading } = useQuery({
    queryKey: popularItemsKey,
    queryFn: () => fetchPopularCatalogItems(POPULAR_LIMIT),
    staleTime: 5 * 60 * 1000,
  });
  const typed = text.trim();
  const results = !typed
    ? popular
    : term.length >= 2 && typed.length >= 2 ? (data?.results || []).slice(0, MAX_RESULTS) : [];
  const optionsCount = results.length + (typed ? 1 : 0);

  const reset = () => {
    setText("");
    setTerm("");
    setIsOpen(false);
    setHighlight(0);
  };

  const choose = (index) => {
    if (index < results.length) onPick(results[index]);
    else if (typed) onOneOff(typed);
    reset();
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
      e.preventDefault();
      if (isOpen && optionsCount) choose(highlight);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const searching = typed.length >= 2 && (isFetching || term !== typed);

  return (
    <div className="relative mb-4" ref={wrapperRef}>
      <svg className="absolute left-3.5 top-[21px] -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        autoComplete="off"
        value={text}
        placeholder="Szukaj usługi, części, akcesorium..."
        onChange={(e) => {
          setText(e.target.value);
          setIsOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800
                   focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] transition-all shadow-sm"
      />

      {isOpen && (typed || popular.length > 0 || isPopularLoading) && (
        <ul className="absolute z-30 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg py-1.5 max-h-96 overflow-y-auto">
          {!typed && (
            <li className="px-4 pt-1 pb-1.5 text-[10px] uppercase font-bold tracking-wider text-gray-400">
              {isPopularLoading ? 'Ładowanie...' : 'Najczęściej używane'}
            </li>
          )}
          {!typed ? null : typed.length < 2 ? (
            <li className="px-4 py-2 text-xs text-gray-400">Wpisz co najmniej 2 znaki, żeby przeszukać katalog.</li>
          ) : results.length === 0 ? (
            <li className="px-4 py-2 text-sm text-gray-500">{searching ? 'Szukam...' : 'Nic nie znaleziono w katalogu.'}</li>
          ) : null}
          {(!typed || typed.length >= 2) && (
            results.map((part, index) => (
              <li
                key={part.id}
                onMouseDown={(e) => { e.preventDefault(); choose(index); }}
                onMouseEnter={() => setHighlight(index)}
                className={`px-4 py-2 cursor-pointer flex justify-between items-center gap-3 ${highlight === index ? 'bg-[var(--color-paper)]' : ''}`}
              >
                <span className="min-w-0 flex items-center gap-2">
                  <KindBadge kind={part.kind} />
                  <span className="text-sm font-medium text-gray-900 truncate">{part.name}</span>
                </span>
                <span className="text-xs text-gray-500 shrink-0 whitespace-nowrap">
                  {formatMoney(part.sell_price)}{part.unit ? ` / ${part.unit}` : ''}
                </span>
              </li>
            ))
          )}
          {typed && <li
            onMouseDown={(e) => { e.preventDefault(); choose(results.length); }}
            onMouseEnter={() => setHighlight(results.length)}
            className={`mt-1 px-4 py-2 border-t border-gray-100 cursor-pointer text-sm font-semibold text-[var(--color-accent)] ${highlight === results.length ? 'bg-[var(--color-paper)]' : ''}`}
          >
            + Dodaj "{typed}" jako pozycję jednorazową
          </li>}
        </ul>
      )}
    </div>
  );
}

// Pozycja spoza katalogu, np. część sprowadzona specjalnie dla klienta.
function OneOffForm({ initialDescription, isPending, onSubmit, onCancel }) {
  const [values, setValues] = useState({
    description: initialDescription, item_type: 'part', quantity: '1', unit_price: '', save_to_catalog: false,
  });
  const set = (name) => (e) => setValues((prev) => ({
    ...prev, [name]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));
  const setValue = (name) => (value) => setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!values.description.trim()) return toast.error('Podaj opis pozycji.');
        if (!isPositive(values.quantity)) return toast.error('Ilość musi być większa od zera.');
        if (!isNonNegative(values.unit_price)) return toast.error('Podaj cenę (może być 0).');
        onSubmit({ ...values, quantity: String(Number(values.quantity)), unit_price: String(Number(values.unit_price)) });
      }}
      className="mb-4 p-4 bg-white border border-[var(--color-accent)]/40 rounded-lg"
    >
      <h4 className="text-sm font-semibold text-[var(--color-ink)] mb-3">Pozycja jednorazowa</h4>
      <Input label="Opis" required value={values.description} onChange={set('description')} autoFocus />
      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-sm font-medium text-gray-700">Rodzaj</label>
        <div className="flex gap-2">
          {ITEM_KINDS.map((kind) => (
            <button
              key={kind.value} type="button"
              onClick={() => setValues((prev) => ({ ...prev, item_type: kind.value }))}
              className={`flex-1 px-2 py-1.5 text-xs font-semibold rounded-md border cursor-pointer transition-colors ${
                values.item_type === kind.value
                  ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'border-[var(--color-line)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-white'
              }`}
            >
              {kind.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3">
        <Input label="Ilość" required {...decimalInputProps(values.quantity, setValue('quantity'), { min: 1 })} />
        <Input label="Cena (zł)" required placeholder="np. 49,99" {...decimalInputProps(values.unit_price, setValue('unit_price'))} />
      </div>
      <label className="flex items-center gap-2 mb-4 text-sm text-[var(--color-ink-2)] cursor-pointer">
        <input
          type="checkbox" checked={values.save_to_catalog} onChange={set('save_to_catalog')}
          className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
        />
        Zapisz też w katalogu
      </label>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md cursor-pointer">
          Anuluj
        </button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Dodawanie...' : 'Dodaj'}</Button>
      </div>
    </form>
  );
}

// Ilość i cena edytowane w miejscu - zapis po wyjściu z pola albo Enterze.
function ItemRow({ item, locked, onUpdate, onDelete }) {
  const [quantity, setQuantity] = useState(formatQuantity(item.quantity));
  const [price, setPrice] = useState(item.unit_price);

  useEffect(() => {
    setQuantity(formatQuantity(item.quantity));
    setPrice(item.unit_price);
  }, [item.quantity, item.unit_price]);

  const commit = () => {
    const changes = {};
    if (Number(quantity) !== Number(item.quantity)) changes.quantity = String(Number(quantity));
    if (Number(price) !== Number(item.unit_price)) changes.unit_price = String(Number(price));
    if (!Object.keys(changes).length) return;
    if (!isPositive(quantity) || !isNonNegative(price)) {
      toast.error('Ilość musi być większa od zera, a cena nie może być ujemna.');
      setQuantity(formatQuantity(item.quantity));
      setPrice(item.unit_price);
      return;
    }
    onUpdate(item.id, changes);
  };
  const commitOnEnter = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
  };

  return (
    <li className="py-2 border-b border-[var(--color-line)] last:border-b-0 flex flex-wrap items-center gap-x-3 gap-y-1">
      <span className="flex-1 min-w-[9rem] text-sm font-medium text-[var(--color-ink)] break-words">
        {item.description}
        {!item.part && <span className="ml-1.5 text-[10px] font-normal text-[var(--color-ink-3)] italic">jednorazowa</span>}
      </span>
      <div className="ml-auto flex items-center gap-1.5 text-sm">
        {locked ? (
          <span className="text-[var(--color-ink-2)] whitespace-nowrap">{formatQuantity(item.quantity)} × {formatMoney(item.unit_price)}</span>
        ) : (
          <>
            <div className="w-12">
              <input
                aria-label="Ilość" className={smallInputClass} onBlur={commit}
                {...decimalInputProps(quantity, setQuantity, { min: 1, onKeyDown: commitOnEnter })}
              />
            </div>
            <span className="text-[var(--color-ink-3)]">×</span>
            <div className="w-16">
              <input
                aria-label="Cena (zł)" className={smallInputClass} onBlur={commit}
                {...decimalInputProps(price, setPrice, { onKeyDown: commitOnEnter })}
              />
            </div>
          </>
        )}
        <span className="w-20 text-right font-semibold text-[var(--color-ink)] whitespace-nowrap">{formatMoney(item.line_total)}</span>
        {!locked && (
          <button
            type="button" onClick={() => onDelete(item)} title="Usuń pozycję"
            className="shrink-0 p-1 -mr-1 text-[var(--color-ink-3)] hover:text-red-600 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </li>
  );
}

export default function OrderItemsSection({ order }) {
  const queryClient = useQueryClient();
  const [oneOffDescription, setOneOffDescription] = useState(null);
  const locked = ITEMS_LOCKED_STATUSES.includes(order.status);
  const items = order.items || [];

  // Każda zmiana pozycji przelicza final_cost - odświeżamy zlecenie i listy z kwotami.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const addMutation = useMutation({
    mutationFn: (data) => createOrderItem(order.id, data),
    onSuccess: (item) => {
      refresh();
      queryClient.invalidateQueries({ queryKey: popularItemsKey });
      setOneOffDescription(null);
      // Pozycja katalogu, która już była na zleceniu, dopisuje się do ilości (backend scala).
      const merged = items.some((existing) => existing.id === item.id);
      toast.success(merged ? `${item.description} - ilość: ${formatQuantity(item.quantity)}` : `Dodano: ${item.description}`);
    },
    onError: (error) => toast.error(`Nie udało się dodać pozycji: ${error.message}`),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateOrderItem(order.id, id, data),
    onSuccess: refresh,
    onError: (error) => {
      toast.error(`Nie udało się zapisać zmiany: ${error.message}`);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (item) => deleteOrderItem(order.id, item.id),
    onSuccess: (_, item) => {
      refresh();
      toast.success(`Usunięto: ${item.description}`);
    },
    onError: (error) => toast.error(`Nie udało się usunąć pozycji: ${error.message}`),
  });

  return (
    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base sm:text-lg font-semibold text-[var(--color-ink)]">Części i usługi</h3>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-paper)] text-[var(--color-ink-2)] border border-[var(--color-line)]">
          {items.length}
        </span>
      </div>

      {locked ? (
        <p className="mb-4 p-3 text-sm rounded-lg bg-[var(--color-paper)] border border-[var(--color-line)] text-[var(--color-ink-2)]">
          Zlecenie jest zamknięte - pozycji nie można już zmieniać.
        </p>
      ) : oneOffDescription !== null ? (
        <OneOffForm
          initialDescription={oneOffDescription}
          isPending={addMutation.isPending}
          onSubmit={(values) => addMutation.mutate(values)}
          onCancel={() => setOneOffDescription(null)}
        />
      ) : (
        <CatalogSearch
          onPick={(part) => addMutation.mutate({ part: part.id, quantity: 1 })}
          onOneOff={setOneOffDescription}
        />
      )}

      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              locked={locked}
              onUpdate={(id, data) => updateMutation.mutate({ id, data })}
              onDelete={(target) => deleteMutation.mutate(target)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--color-ink-3)] text-center py-4">
          {locked ? 'Brak pozycji na zleceniu.' : 'Brak pozycji. Wyszukaj usługę lub część powyżej.'}
        </p>
      )}
    </div>
  );
}
