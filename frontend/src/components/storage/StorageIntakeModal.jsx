import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Modal from "../Modal";
import Input from "../Input";
import Select from "../Select";
import DateInput from "../DateInput";
import Button from "../Button";
import ClientSearchSelect from "../ClientSearchSelect";
import { createBike, createClient, fetchClientDetails, lookupClientByPhone } from "../../api/clients";
import { fetchStorageBookings, storageIntake } from "../../api/storage";
import { todayISODate } from "../../utils/dates";
import {
  ACTIVE_STORAGE_STATUSES, BIKE_TYPE_OPTIONS, CATEGORY_OPTIONS, categoryLabel, defaultStorageEndDate, formatMoney,
  storageKeys,
} from "./storageData";

// Cena domyślna jest po stronie backendu (STORAGE_DEFAULT_PRICE) - tu tylko podpowiedź w polu.
const DEFAULT_PRICE_HINT = '550';

// Licznik zamiast crypto.randomUUID - ten działa tylko w bezpiecznym kontekście (HTTPS/localhost),
// a panel bywa otwierany z telefonu po adresie IP w sieci lokalnej.
let nextItemKey = 0;
const emptyItem = () => ({ key: ++nextItemKey, category: 'bike', brand: '', model: '', bike_type: 'other' });

const emptyForm = () => ({
  tag: '', startDate: todayISODate(), endDate: defaultStorageEndDate(), price: '', description: '', notes: '',
});

const textareaClass = "w-full p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[80px] resize-y shadow-sm";
const sectionClass = "p-5 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-sm";

// Przyjęcie sprzętu na przechowanie. Serwis nie robi rezerwacji z wyprzedzeniem - zlecenie
// (z naklejką) powstaje dopiero teraz, razem z pobytem dla każdej przyniesionej sztuki.
// `scannedBike` (z QR) od razu wybiera klienta i zaznacza ten rower.
export default function StorageIntakeModal({ isOpen, onClose, onCreated, scannedBike = null }) {
  const queryClient = useQueryClient();

  const [isNewClient, setIsNewClient] = useState(false);
  const [client, setClient] = useState(null);
  const [newClient, setNewClient] = useState({ fullName: '', phone: '', email: '', rodo: false });
  const [selectedBikeIds, setSelectedBikeIds] = useState([]);
  const [newItems, setNewItems] = useState([]);
  const [form, setForm] = useState(emptyForm);

  const setField = (name) => (e) => setForm((prev) => ({ ...prev, [name]: e.target.value }));

  const reset = () => {
    setIsNewClient(false);
    setClient(null);
    setNewClient({ fullName: '', phone: '', email: '', rodo: false });
    setSelectedBikeIds([]);
    setNewItems([]);
    setForm(emptyForm());
  };

  useEffect(() => {
    const customerId = scannedBike?.customer?.id;
    if (!isOpen || !customerId) return;
    let cancelled = false;
    fetchClientDetails(customerId)
      .then((found) => {
        if (cancelled) return;
        setIsNewClient(false);
        setClient(found);
        setSelectedBikeIds([scannedBike.id]);
        setNewItems([]);
      })
      .catch((err) => toast.error(`Nie udało się pobrać klienta roweru: ${err.message}`));
    return () => { cancelled = true; };
  }, [isOpen, scannedBike]);

  const handleClose = () => {
    reset();
    onClose();
  };

  // Sztuki klienta, które już leżą w przechowalni - nie da się ich przyjąć drugi raz.
  const { data: activeBookings } = useQuery({
    queryKey: storageKeys.list({ customer: client?.id, status: ACTIVE_STORAGE_STATUSES.join(',') }),
    queryFn: () => fetchStorageBookings({ customer: client.id, status: ACTIVE_STORAGE_STATUSES.join(',') }),
    enabled: !!client?.id,
  });
  const busyBikeIds = new Set((activeBookings?.results || []).map((b) => b.bike));

  // Klient z bazy (z wyszukiwarki albo po numerze) - rowery wybiera się z jego listy,
  // a gdy żadnego nie ma, od razu pojawia się formularz nowego.
  const pickClient = (picked) => {
    setClient(picked);
    setSelectedBikeIds([]);
    setNewItems(picked && !picked.bikes?.length ? [emptyItem()] : []);
    if (picked && !picked.rodo_accepted) {
      toast.error(`${picked.first_name} ${picked.last_name} nie ma w bazie zgody RODO - poproś o jej podpisanie.`, { duration: 8000 });
    }
  };

  const startNewClient = (prefill = {}) => {
    setIsNewClient(true);
    setClient(null);
    setSelectedBikeIds([]);
    setNewItems([emptyItem()]);
    setNewClient({ fullName: '', phone: '', email: '', rodo: false, ...prefill });
  };

  const cancelNewClient = () => {
    setIsNewClient(false);
    setNewItems([]);
  };

  // Klient jest unikalny po numerze - jeśli już istnieje, przełączamy formularz na niego,
  // jak w formularzu nowego zlecenia.
  const handleNewClientPhoneBlur = async () => {
    const value = newClient.phone.trim();
    if (!value) return;
    let found;
    try {
      found = await lookupClientByPhone(value);
    } catch (err) {
      if (err.status !== 404) toast.error(`Nie udało się sprawdzić numeru: ${err.message}`);
      return;
    }
    setIsNewClient(false);
    pickClient(found);
    toast(`Klient z numerem ${found.phone} już istnieje: ${found.first_name} ${found.last_name} - wybierz jego rower.`, { duration: 6000 });
  };

  const toggleBike = (id) => {
    setSelectedBikeIds((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const updateItem = (key, name, value) => {
    setNewItems((prev) => prev.map((item) => (item.key === key ? { ...item, [name]: value } : item)));
  };

  const piecesCount = selectedBikeIds.length + newItems.length;

  const mutation = useMutation({
    mutationFn: async () => {
      let customer = client;
      if (!customer) {
        const [firstName, ...rest] = newClient.fullName.trim().split(/\s+/);
        customer = await createClient({
          first_name: firstName,
          last_name: rest.join(' ') || '-',
          phone: newClient.phone.trim(),
          email: newClient.email,
          notes: '',
          rodo_accepted: newClient.rodo,
        });
        if (customer.existing) {
          toast(`Klient z numerem ${customer.phone} już istnieje - przyjęcie przypisano do: ${customer.first_name} ${customer.last_name}`, { duration: 6000 });
        }
        setClient({ ...customer, bikes: customer.bikes || [] });
        setIsNewClient(false);
      }

      // Nowy sprzęt zapisujemy od razu w stanie formularza - gdyby samo przyjęcie się nie
      // powiodło (np. zła data), ponowna próba nie zarejestruje go drugi raz.
      const createdIds = [];
      for (const item of newItems) {
        const bike = await createBike({
          customer: customer.id,
          category: item.category,
          brand: item.brand.trim(),
          model: item.model.trim(),
          bike_type: item.category === 'winter' ? 'other' : item.bike_type,
        });
        createdIds.push(bike.id);
        setClient((prev) => ({ ...prev, bikes: [...(prev?.bikes || []), bike] }));
        setSelectedBikeIds((prev) => [...prev, bike.id]);
        setNewItems((prev) => prev.filter((i) => i.key !== item.key));
      }

      return storageIntake({
        customer: customer.id,
        bikes: [...selectedBikeIds, ...createdIds],
        bike_tag_number: parseInt(form.tag, 10),
        start_date: form.startDate || undefined,
        end_date: form.endDate,
        price: form.price === '' ? undefined : form.price,
        description: form.description,
        notes: form.notes,
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: storageKeys.all });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(`Przyjęto na przechowanie: ${result.bookings.length} szt. (zlecenie #${result.repair_order})`);
      handleClose();
      onCreated?.(result);
    },
    onError: (error) => toast.error(`Nie udało się przyjąć sprzętu: ${error.message}`),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!client && !isNewClient) {
      toast.error('Wybierz klienta albo zaznacz "Nowy klient".');
      return;
    }
    if (piecesCount === 0) {
      toast.error('Wybierz albo dodaj co najmniej jedną sztukę sprzętu.');
      return;
    }
    mutation.mutate();
  };

  const bikes = client?.bikes || [];
  const pricePerPiece = form.price === '' ? Number(DEFAULT_PRICE_HINT) : Number(form.price);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Przyjęcie na przechowanie">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
        {/* KLIENT */}
        <div className={sectionClass}>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-semibold text-[var(--color-ink)]">
              {isNewClient ? 'Dane nowego klienta' : 'Wybór klienta'}
            </h4>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
              <input
                type="checkbox" checked={isNewClient}
                onChange={(e) => (e.target.checked ? startNewClient() : cancelNewClient())}
                className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
              />
              Nowy klient
            </label>
          </div>

          {!isNewClient ? (
            <ClientSearchSelect
              label="Klient z bazy" required
              value={client} onChange={pickClient} onCreateNew={startNewClient}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4">
              <Input
                label="Imię i nazwisko" placeholder="np. Jan Kowalski" required
                value={newClient.fullName} onChange={(e) => setNewClient((p) => ({ ...p, fullName: e.target.value }))}
              />
              <Input
                label="Numer telefonu" type="tel" placeholder="np. +48 500 600 700" required
                value={newClient.phone} onChange={(e) => setNewClient((p) => ({ ...p, phone: e.target.value }))}
                onBlur={handleNewClientPhoneBlur}
              />
              <div className="lg:col-span-2">
                <Input
                  label="Adres e-mail" type="email" placeholder="np. jan.kowalski@email.com"
                  value={newClient.email} onChange={(e) => setNewClient((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <label className="lg:col-span-2 flex items-center gap-2 text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                <input
                  type="checkbox" required checked={newClient.rodo}
                  onChange={(e) => setNewClient((p) => ({ ...p, rodo: e.target.checked }))}
                  className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                />
                Klient wyraził zgodę na przetwarzanie danych osobowych (RODO) <span className="text-[var(--color-accent)]">*</span>
              </label>
            </div>
          )}
        </div>

        {/* SPRZĘT */}
        {(client || isNewClient) && (
          <div className={sectionClass}>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-semibold text-[var(--color-ink)]">Sprzęt do przechowania</h4>
              <button
                type="button"
                onClick={() => setNewItems((prev) => [...prev, emptyItem()])}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
              >
                + Dodaj nowy sprzęt
              </button>
            </div>

            {bikes.length > 0 && (
              <div className="space-y-2 mb-4">
                {bikes.map((bike) => {
                  const busy = busyBikeIds.has(bike.id);
                  return (
                    <label
                      key={bike.id}
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-colors ${
                        busy
                          ? 'border-[var(--color-line)] bg-gray-50 opacity-60 cursor-not-allowed'
                          : selectedBikeIds.includes(bike.id)
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] cursor-pointer'
                            : 'border-[var(--color-line)] bg-[var(--color-paper-2)] hover:bg-white cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox" disabled={busy}
                        checked={selectedBikeIds.includes(bike.id)}
                        onChange={() => toggleBike(bike.id)}
                        className="w-4 h-4 text-[var(--color-accent)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                      <span className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-[var(--color-ink)]">{bike.brand} {bike.model}</span>
                        <span className="text-[var(--color-ink-3)]"> - {categoryLabel(bike.category)}</span>
                      </span>
                      {busy && <span className="text-xs font-medium text-[var(--color-ink-3)] shrink-0">już na przechowaniu</span>}
                    </label>
                  );
                })}
              </div>
            )}

            {newItems.map((item, index) => (
              <div key={item.key} className="p-4 mb-3 border border-dashed border-[var(--color-line)] rounded-lg bg-[var(--color-paper-2)]">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">Nowy sprzęt {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => setNewItems((prev) => prev.filter((i) => i.key !== item.key))}
                    className="text-xs text-[var(--color-ink-3)] hover:text-red-600 cursor-pointer"
                  >
                    Usuń
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4">
                  <Select
                    label="Kategoria" required options={CATEGORY_OPTIONS}
                    value={item.category} onChange={(e) => updateItem(item.key, 'category', e.target.value)}
                  />
                  <Input
                    label="Producent" required placeholder={item.category === 'winter' ? 'np. Atomic' : 'np. Trek'}
                    value={item.brand} onChange={(e) => updateItem(item.key, 'brand', e.target.value)}
                  />
                  <Input
                    label="Model" placeholder={item.category === 'winter' ? 'np. Redster' : 'np. Marlin 7'}
                    value={item.model} onChange={(e) => updateItem(item.key, 'model', e.target.value)}
                  />
                  {item.category === 'bike' && (
                    <Select
                      label="Typ roweru" options={BIKE_TYPE_OPTIONS}
                      value={item.bike_type} onChange={(e) => updateItem(item.key, 'bike_type', e.target.value)}
                    />
                  )}
                </div>
              </div>
            ))}

            {bikes.length === 0 && newItems.length === 0 && (
              <p className="text-sm text-[var(--color-ink-3)]">Klient nie ma jeszcze sprzętu - dodaj nowy.</p>
            )}
          </div>
        )}

        {/* PRZECHOWANIE */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 border-t border-[var(--color-line)] pt-4">
          <Input
            label="Nr zawieszki" type="number" min="0" step="1" inputMode="numeric" placeholder="np. 12" required
            value={form.tag} onChange={setField('tag')}
          />
          <DateInput label="Od" value={form.startDate} onChange={setField('startDate')} required />
          <DateInput label="Do (odbiór)" value={form.endDate} onChange={setField('endDate')} min={form.startDate || undefined} required />
          <Input
            label="Cena za sztukę (zł)" type="number" min="0" step="0.01" placeholder={DEFAULT_PRICE_HINT}
            value={form.price} onChange={setField('price')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Zakres serwisu</label>
            <textarea
              className={textareaClass} placeholder="Przechowanie zimowe"
              value={form.description} onChange={setField('description')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">Uwagi przy przyjęciu</label>
            <textarea
              className={textareaClass} placeholder="np. rysa na ramie, brak pedałów"
              value={form.notes} onChange={setField('notes')}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--color-line)]">
          <p className="text-sm text-[var(--color-ink-2)]">
            {piecesCount > 0 ? (
              <>Sztuk: <b>{piecesCount}</b>, razem <b>{formatMoney(pricePerPiece * piecesCount)}</b></>
            ) : 'Nie wybrano sprzętu'}
          </p>
          <div className="flex justify-end gap-3">
            <button
              type="button" onClick={handleClose}
              className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Zapisywanie...' : 'Przyjmij na przechowanie'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
