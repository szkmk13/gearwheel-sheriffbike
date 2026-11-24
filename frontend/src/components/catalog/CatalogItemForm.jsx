import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
    createCatalogItem, updateCatalogItem, deleteCatalogItem, createCategory,
} from "../../api/inventory";
import Button from "../Button";
import Input from "../Input";
import Select from "../Select";
import { KIND_OPTIONS } from "./kinds";

// Select ma juz ukryta opcje z pustym value (placeholder), wiec "bez kategorii" ma wlasna wartosc.
const NO_CATEGORY = "none";

const EMPTY = {
    kind: "service",
    name: "",
    category: "",
    sku: "",
    barcode: "",
    unit: "szt.",
    purchase_price: "",
    sell_price: "",
    description: "",
    is_active: true,
};

const toForm = (item) => ({
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, item[key] ?? EMPTY[key]])),
    category: item.category ?? "",
});

// Puste pola liczbowe i kategoria ida jako null (DRF nie przyjmie "" dla liczby/klucza obcego).
const toPayload = (form) => ({
    ...form,
    category: form.category === "" ? null : Number(form.category),
    purchase_price: form.purchase_price === "" ? null : form.purchase_price,
    sell_price: form.sell_price === "" ? null : form.sell_price,
});

const textareaClass = "w-full p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 "
    + "focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[100px] resize-y shadow-sm";

// Dodawanie i edycja pozycji katalogu. `item` = null -> nowa pozycja.
// Komponent montowany od nowa dla kazdej pozycji (key w rodzicu), wiec stan startowy wystarcza.
export default function CatalogItemForm({ item, categories, onDone }) {
    const queryClient = useQueryClient();
    const isNew = !item;
    const [form, setForm] = useState(() => (isNew ? EMPTY : toForm(item)));
    const [newCategory, setNewCategory] = useState(null); // null = zwykly wybor z listy

    const set = (key) => (e) => {
        const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    const refresh = () => queryClient.invalidateQueries({ queryKey: ["catalog"] });

    const save = useMutation({
        mutationFn: async () => {
            const payload = toPayload(form);
            if (newCategory?.trim()) {
                const category = await createCategory(newCategory.trim());
                queryClient.invalidateQueries({ queryKey: ["catalog-categories"] });
                payload.category = category.id;
            }
            return isNew ? createCatalogItem(payload) : updateCatalogItem(item.id, payload);
        },
        onSuccess: () => {
            refresh();
            toast.success(isNew ? "Dodano pozycję do katalogu" : "Zapisano zmiany");
            onDone();
        },
        onError: (error) => toast.error(error.message),
    });

    const remove = useMutation({
        mutationFn: () => deleteCatalogItem(item.id),
        onSuccess: () => {
            refresh();
            toast.success("Usunięto pozycję z katalogu");
            onDone();
        },
        onError: (error) => toast.error(error.message),
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        save.mutate();
    };

    const handleDelete = () => {
        if (window.confirm(`Usunąć "${item.name}" z katalogu? Tego nie da się cofnąć.`)) remove.mutate();
    };

    const categoryOptions = categories.map((c) => ({ value: String(c.id), label: c.name }));

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[var(--color-ink)] px-1">
                {isNew ? "Nowa pozycja" : item.name}
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Podstawowe</h3>

                    <Input label="Nazwa" required value={form.name} onChange={set("name")} placeholder="np. Wymiana łańcucha" />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <Select label="Rodzaj" required options={KIND_OPTIONS} value={form.kind} onChange={set("kind")} />

                        {newCategory === null ? (
                            <div className="flex flex-col">
                                <Select
                                    label="Kategoria"
                                    options={[{ value: NO_CATEGORY, label: "Bez kategorii" }, ...categoryOptions]}
                                    value={form.category === "" ? NO_CATEGORY : String(form.category)}
                                    onChange={(e) => setForm((prev) => ({
                                        ...prev,
                                        category: e.target.value === NO_CATEGORY ? "" : e.target.value,
                                    }))}
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewCategory("")}
                                    className="-mt-3 mb-4 self-start text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                                >
                                    + nowa kategoria
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <Input
                                    label="Nowa kategoria"
                                    value={newCategory}
                                    onChange={(e) => setNewCategory(e.target.value)}
                                    placeholder="np. Koła"
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setNewCategory(null)}
                                    className="-mt-3 mb-4 self-start text-xs font-medium text-[var(--color-ink-3)] hover:underline cursor-pointer"
                                >
                                    wybierz z listy
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
                        <Input label="SKU / symbol" value={form.sku} onChange={set("sku")} />
                        <Input label="Kod EAN" value={form.barcode} onChange={set("barcode")} />
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={form.is_active}
                            onChange={set("is_active")}
                            className="w-4 h-4 accent-[var(--color-accent)] cursor-pointer"
                        />
                        Aktywna (widoczna przy dodawaniu do zlecenia)
                    </label>
                </div>

                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Cena</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                        <Input label="Cena sprzedaży (zł)" type="number" step="0.01" min="0"
                            value={form.sell_price} onChange={set("sell_price")} />
                        <Input label="Cena zakupu (zł)" type="number" step="0.01" min="0"
                            value={form.purchase_price} onChange={set("purchase_price")} />
                        <Input label="Jednostka" required value={form.unit} onChange={set("unit")} />
                    </div>
                    {!isNew && (
                        <p className="text-xs text-[var(--color-ink-3)]">
                            Zmiana ceny nie zmienia istniejących zleceń - mają cenę z chwili dodania.
                        </p>
                    )}
                </div>

                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-3">Opis</h3>
                    <textarea value={form.description} onChange={set("description")} className={textareaClass}
                        placeholder="Opcjonalny opis pozycji" />
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-[var(--color-line)]">
                    {!isNew && (
                        item.is_used || item.is_protected ? (
                            <span className="text-xs text-[var(--color-ink-3)] max-w-[240px]">
                                {item.is_used
                                    ? "Pozycja była użyta na zleceniu, więc zostaje w systemie. Możesz ją ukryć."
                                    : "Z tej pozycji korzysta przechowalnia, więc nie można jej usunąć."}
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={handleDelete}
                                disabled={remove.isPending}
                                className="px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                            >
                                Usuń
                            </button>
                        )
                    )}
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={onDone}
                        className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
                    >
                        Anuluj
                    </button>
                    <Button type="submit" disabled={save.isPending}>
                        {save.isPending ? "Zapisywanie..." : "Zapisz"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
