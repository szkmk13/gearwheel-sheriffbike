import { useDeferredValue, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetchCatalogItem, fetchCatalogItems, fetchCategories, updateCatalogItem } from "../api/inventory";
import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import SlidePanel from "../components/SlidePanel";
import StickyHeader from "../components/StickyHeader";
import CatalogItemForm from "../components/catalog/CatalogItemForm";
import { KIND_TABS } from "../components/catalog/kinds";

const PAGE_SIZE = 50; // REST_FRAMEWORK.PAGE_SIZE w config/settings/base.py

const filterClass = "px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white text-gray-800 shadow-sm "
    + "focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]";

// Cena edytowana wprost na liscie (jak list_editable w adminie): zapis po Enter albo wyjsciu z pola.
function PriceCell({ item, onSave }) {
    const initial = item.sell_price ?? "";
    const [value, setValue] = useState(initial);
    const [prevInitial, setPrevInitial] = useState(initial);
    if (initial !== prevInitial) {
        // Nowe dane z serwera (po zapisie lub odswiezeniu) nadpisuja pole.
        setPrevInitial(initial);
        setValue(initial);
    }

    const commit = () => {
        const next = value === "" ? null : value;
        const unchanged = next === null ? item.sell_price == null : Number(next) === Number(item.sell_price);
        if (!unchanged) onSave({ sell_price: next });
    };

    return (
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <input
                type="number"
                step="0.01"
                min="0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onBlur={commit}
                onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                placeholder="-"
                aria-label={`Cena: ${item.name}`}
                className="w-24 px-2 py-1.5 text-right border border-transparent hover:border-[var(--color-line)] rounded-md bg-transparent
                           focus:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            />
            <span className="text-[var(--color-ink-3)]">zł</span>
        </div>
    );
}

// Lista nie zwraca opisu ani ceny zakupu - formularz dostaje pelna pozycje, inaczej zapis by je wyczyscil.
function EditLoader({ id, categories, onDone }) {
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ["catalog", "item", id],
        queryFn: () => fetchCatalogItem(id),
        staleTime: 0,
    });
    if (isLoading) return <p className="text-sm text-[var(--color-ink-3)]">Ładowanie pozycji...</p>;
    if (isError) return <p className="text-sm text-red-700">Nie udało się wczytać pozycji: {error.message}</p>;
    return <CatalogItemForm item={data} categories={categories} onDone={onDone} />;
}

// 1 pozycja, 2-4 pozycje, 5+ pozycji (ale 12-14 pozycji).
const plural = (n) => {
    if (n === 1) return "pozycja";
    const tens = n % 100;
    return n % 10 >= 2 && n % 10 <= 4 && (tens < 12 || tens > 14) ? "pozycje" : "pozycji";
};

function SortHeader({ field, label, ordering, onSort, className = "" }) {
    const icon = ordering === field ? "▲" : ordering === `-${field}` ? "▼" : "↕";
    return (
        <th
            onClick={() => onSort(field)}
            className={`py-4 px-4 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none ${className}`}
        >
            <div className="flex items-center gap-1.5">
                <span>{label}</span>
                <span className="text-xs text-[var(--color-ink-3)]">{icon}</span>
            </div>
        </th>
    );
}

// Zakladka "Katalog i uslugi": przeglad i edycja wszystkich uslug, czesci i akcesoriow
// (to samo co Part w Django adminie). Pozycji uzytej na zleceniu nie da sie usunac - tylko ukryc.
export default function CatalogPage() {
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const deferredSearch = useDeferredValue(search);
    const [kind, setKind] = useState("");
    const [category, setCategory] = useState("");
    const [active, setActive] = useState("");
    const [ordering, setOrdering] = useState("name");
    const [page, setPage] = useState(1);
    // undefined = panel zamkniety, null = nowa pozycja, obiekt = edycja.
    const [editing, setEditing] = useState(undefined);

    const filters = { search: deferredSearch, kind, category, is_active: active, ordering, page };
    const { data, isLoading, isError, error, isFetching } = useQuery({
        queryKey: ["catalog", filters],
        queryFn: () => fetchCatalogItems(filters),
        placeholderData: keepPreviousData,
    });
    const items = data?.results ?? [];
    const total = data?.count ?? 0;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

    const { data: categories = [] } = useQuery({
        queryKey: ["catalog-categories"],
        queryFn: fetchCategories,
    });

    const quickUpdate = useMutation({
        mutationFn: ({ id, changes }) => updateCatalogItem(id, changes),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["catalog"] });
            toast.success("Zapisano");
        },
        onError: (err) => {
            queryClient.invalidateQueries({ queryKey: ["catalog"] });
            toast.error(err.message);
        },
    });

    // Kazda zmiana filtra wraca na 1. strone.
    const withReset = (setter) => (value) => {
        setter(value);
        setPage(1);
    };

    const handleSort = (field) => {
        withReset(setOrdering)(ordering === field ? `-${field}` : field);
    };

    return (
        <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
            <StickyHeader className="bg-[var(--color-paper)]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Katalog i usługi</h1>
                    <Button onClick={() => setEditing(null)} className="w-full sm:w-auto">
                        + Dodaj pozycję
                    </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                    {KIND_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            type="button"
                            onClick={() => withReset(setKind)(tab.value)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border ${
                                kind === tab.value
                                    ? "bg-[var(--color-ink)] text-white border-[var(--color-ink)]"
                                    : "bg-white text-[var(--color-ink-2)] border-[var(--color-line)] hover:border-[var(--color-line-2)]"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1">
                        <SearchInput
                            placeholder="Szukaj po nazwie, SKU lub kodzie EAN..."
                            value={search}
                            onChange={(e) => withReset(setSearch)(e.target.value)}
                        />
                    </div>
                    <select
                        value={category}
                        onChange={(e) => withReset(setCategory)(e.target.value)}
                        className={filterClass}
                        aria-label="Kategoria"
                    >
                        <option value="">Wszystkie kategorie</option>
                        {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <select
                        value={active}
                        onChange={(e) => withReset(setActive)(e.target.value)}
                        className={filterClass}
                        aria-label="Widoczność"
                    >
                        <option value="">Aktywne i ukryte</option>
                        <option value="true">Tylko aktywne</option>
                        <option value="false">Tylko ukryte</option>
                    </select>
                </div>
            </StickyHeader>

            {isError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-[var(--color-accent)] font-medium">
                    Wystąpił błąd podczas pobierania katalogu: {error.message}
                </div>
            )}

            <div className={`bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm overflow-x-auto transition-opacity ${isFetching && !isLoading ? "opacity-70" : ""}`}>
                <table className="w-full text-left border-collapse min-w-[680px]">
                    <thead>
                        <tr className="border-b border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
                            <SortHeader field="name" label="Nazwa" ordering={ordering} onSort={handleSort} />
                            <th className="py-4 px-4 font-medium">Rodzaj</th>
                            <th className="py-4 px-4 font-medium">Kategoria</th>
                            <SortHeader field="sku" label="SKU" ordering={ordering} onSort={handleSort} />
                            <th className="py-4 px-4 font-medium">Jedn.</th>
                            <SortHeader field="sell_price" label="Cena" ordering={ordering} onSort={handleSort} />
                            <th className="py-4 px-4 font-medium text-center">Aktywna</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm text-[var(--color-ink)]">
                        {isLoading ? (
                            <tr>
                                <td colSpan="7" className="py-8 px-6 text-center text-[var(--color-ink-3)]">Ładowanie katalogu...</td>
                            </tr>
                        ) : items.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-8 px-6 text-center text-[var(--color-ink-3)]">
                                    Brak pozycji spełniających kryteria.
                                </td>
                            </tr>
                        ) : (
                            items.map((item) => (
                                <tr
                                    key={item.id}
                                    onClick={() => setEditing(item)}
                                    className={`border-b last:border-b-0 border-[var(--color-line)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${
                                        item.is_active ? "" : "text-[var(--color-ink-3)]"
                                    }`}
                                >
                                    <td className="py-2.5 px-4 font-semibold">
                                        {item.name}
                                        {!item.is_active && (
                                            <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-[var(--color-ink-3)]">ukryta</span>
                                        )}
                                    </td>
                                    <td className="py-2.5 px-4 text-[var(--color-ink-2)]">{item.kind_display}</td>
                                    <td className="py-2.5 px-4 text-[var(--color-ink-2)]">{item.category_name || "-"}</td>
                                    <td className="py-2.5 px-4 text-[var(--color-ink-3)] font-mono text-xs">{item.sku || "-"}</td>
                                    <td className="py-2.5 px-4 text-[var(--color-ink-3)]">{item.unit}</td>
                                    <td className="py-1.5 px-4">
                                        <PriceCell
                                            item={item}
                                            onSave={(changes) => quickUpdate.mutate({ id: item.id, changes })}
                                        />
                                    </td>
                                    <td className="py-2.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="checkbox"
                                            checked={item.is_active}
                                            onChange={(e) => quickUpdate.mutate({ id: item.id, changes: { is_active: e.target.checked } })}
                                            aria-label={`Aktywna: ${item.name}`}
                                            className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                                        />
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {total > 0 && (
                <div className="flex items-center justify-between mt-4 text-sm text-[var(--color-ink-2)]">
                    <span>
                        {total} {plural(total)}
                    </span>
                    {pages > 1 && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                disabled={page <= 1}
                                onClick={() => setPage((p) => p - 1)}
                                className="px-3 py-1.5 rounded-md border border-[var(--color-line)] bg-white hover:bg-[var(--color-paper)] disabled:opacity-40 disabled:cursor-default cursor-pointer"
                            >
                                ← Poprzednia
                            </button>
                            <span>Strona {page} z {pages}</span>
                            <button
                                type="button"
                                disabled={page >= pages}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 rounded-md border border-[var(--color-line)] bg-white hover:bg-[var(--color-paper)] disabled:opacity-40 disabled:cursor-default cursor-pointer"
                            >
                                Następna →
                            </button>
                        </div>
                    )}
                </div>
            )}

            <SlidePanel isOpen={editing !== undefined} onClose={() => setEditing(undefined)}>
                {editing === null && (
                    <CatalogItemForm key="new" item={null} categories={categories} onDone={() => setEditing(undefined)} />
                )}
                {editing && (
                    <EditLoader key={editing.id} id={editing.id} categories={categories} onDone={() => setEditing(undefined)} />
                )}
            </SlidePanel>
        </div>
    );
}
