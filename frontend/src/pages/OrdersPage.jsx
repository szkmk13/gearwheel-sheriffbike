import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchOrders, createOrder } from "../api/orders";
import { fetchClientDetails, createClient, createBike, fetchBikeDetails, lookupClientByPhone } from "../api/clients";

import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import StickyHeader from "../components/StickyHeader";
import Modal from "../components/Modal";
import Input from "../components/Input";
import DateInput from "../components/DateInput";
import Select from "../components/Select";
import ClientSearchSelect from "../components/ClientSearchSelect";
import QRScannerModal from "../components/QRScannerModal";
import { TableRowsSkeleton, MobileOrderCardsSkeleton } from "../components/Skeleton";
import { todayISODate, defaultPickupDate, isOrderOverdue, formatDate } from "../utils/dates";
import CategorySwitch from "../components/equipment/CategorySwitch";
import { CategoryIcons } from "../components/equipment/CategoryIcon";
import EquipmentPicker from "../components/equipment/EquipmentPicker";
import {
  defaultCategoryForDate, newEquipmentItem, orderCategories, saveNewEquipment,
} from "../utils/equipment";

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Niski' },
  { value: 'normal', label: 'Normalny' },
  { value: 'high', label: 'Wysoki' },
  { value: 'urgent', label: 'Pilny' },
];

const priorityLabel = (priority) =>
  PRIORITY_OPTIONS.find((p) => p.value === priority)?.label ?? priority;

// Filtr listy - domyślnie wszystko, żeby zlecenia "spoza sezonu" nie znikały z widoku.
const CATEGORY_FILTERS = [
  { value: '', label: 'Wszystko' },
  { value: 'bike', label: 'Rowery' },
  { value: 'winter', label: 'Zimowe' },
];

const bikeCustomerId = (bike) => String(bike?.customer?.id || (typeof bike?.customer === 'number' ? bike.customer : '') || '');

export default function OrdersPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  const [isAddOrderFormOpen, setIsAddOrderFormOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  // Jedno zlecenie obejmuje kilka sztuk: zaznaczony sprzęt klienta + nowy, jeszcze niezapisany.
  const [selectedBikeIds, setSelectedBikeIds] = useState([]);
  const [newItems, setNewItems] = useState([]);
  // Sprzęt z QR / z linku, widoczny na liście zanim dociągną się szczegóły klienta.
  const [scannedBikes, setScannedBikes] = useState([]);
  // Klient wybrany z wyszukiwarki albo znaleziony po numerze w formularzu nowego klienta -
  // pokazywany od razu, zanim dociągną się jego szczegóły (rowery).
  const [foundClient, setFoundClient] = useState(null);
  // Tekst wpisany w wyszukiwarkę przed kliknięciem "+ Nowy klient" trafia do formularza nowego.
  const [newClientPrefill, setNewClientPrefill] = useState({ fullName: '', phone: '' });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // Rodzaj przyjmowanego sprzętu - domyślnie wg sezonu, zawsze do zmiany.
  // categorySource: 'season' | 'manual' | 'equipment' - skąd wzięła się wartość (podpowiedź pod przełącznikiem).
  const [equipmentCategory, setEquipmentCategory] = useState(() => defaultCategoryForDate());
  const [categorySource, setCategorySource] = useState('season');

  // Stan wyszukiwania i filtrowania
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [priorityFilters, setPriorityFilters] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [ordering, setOrdering] = useState("");

  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [openPriorityMenu, setOpenPriorityMenu] = useState(false);
  const statusMenuRef = useRef(null);
  const priorityMenuRef = useRef(null);

  // Zamykanie dropdownów filtrów po kliknięciu poza nimi
  useEffect(() => {
    if (!openStatusMenu && !openPriorityMenu) return;
    const close = (e) => {
      if (!statusMenuRef.current?.contains(e.target)) setOpenStatusMenu(false);
      if (!priorityMenuRef.current?.contains(e.target)) setOpenPriorityMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [openStatusMenu, openPriorityMenu]);

  const todayDate = todayISODate();

  // Obsługa otwierania formularza zlecenia z parametrów URL (np. po skanowaniu QR)
  useEffect(() => {
    const newOrderParam = searchParams.get('newOrder');
    const bikeIdParam = searchParams.get('bikeId');
    const customerIdParam = searchParams.get('customerId');

    if (newOrderParam === 'true') {
      setIsAddOrderFormOpen(true);
      setIsNewClient(false);
      setNewItems([]);

      if (bikeIdParam) {
        setSelectedBikeIds([Number(bikeIdParam)]);
        if (customerIdParam) {
          setSelectedClientId(String(customerIdParam));
        }

        // Pobierz dane roweru, aby uzupełnić dane klienta i nazwę roweru na liście
        fetchBikeDetails(bikeIdParam)
          .then((bike) => {
            if (bike) {
              setScannedBikes([bike]);
              followEquipmentCategory(bike);
              if (bikeCustomerId(bike) && !customerIdParam) {
                setSelectedClientId(bikeCustomerId(bike));
              }
            }
          })
          .catch((err) => {
            console.error("Błąd pobierania danych roweru:", err);
          });
      }

      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Przełącznik zawsze opisuje to, co faktycznie przyjmujemy - wybrany sprzęt ustawia kategorię.
  function followEquipmentCategory(bike) {
    if (!bike?.category) return;
    setEquipmentCategory(bike.category);
    setCategorySource('equipment');
  }

  // Skan dokłada sztukę do zlecenia. Sprzęt innego klienta przełącza formularz na tego klienta
  // (zlecenie ma jednego właściciela, a backend i tak odrzuci cudzy sprzęt).
  const handleBikeScannedForOrder = (bike) => {
    const customerId = bikeCustomerId(bike);
    const name = `${bike.brand} ${bike.model || ''}`.trim();
    const sameClient = isAddOrderFormOpen && !isNewClient && customerId && customerId === String(selectedClientId);

    if (sameClient) {
      setScannedBikes((prev) => (prev.some((b) => b.id === bike.id) ? prev : [...prev, bike]));
      if (selectedBikeIds.includes(bike.id)) {
        toast(`${name} jest już na tym zleceniu.`);
      } else {
        setSelectedBikeIds((prev) => [...prev, bike.id]);
        toast.success(`Dodano sprzęt: ${name}`);
      }
      return;
    }

    if (isAddOrderFormOpen && (selectedClientId || isNewClient)) {
      toast(`${name} należy do innego klienta - formularz przełączono na właściciela sprzętu.`, { duration: 6000 });
    } else {
      toast.success(`Wybrano sprzęt: ${name}`);
    }
    setScannedBikes([bike]);
    followEquipmentCategory(bike);
    setFoundClient(null);
    setSelectedClientId(customerId);
    setSelectedBikeIds([bike.id]);
    setNewItems([]);
    setIsNewClient(false);
    setIsAddOrderFormOpen(true);
  };

  // Klient jest unikalny po numerze - jeśli już istnieje, przełączamy formularz na niego,
  // żeby nie rejestrować drugi raz jego sprzętu.
  const handleNewClientPhoneBlur = async (e) => {
    const phone = e.target.value.trim();
    if (!phone) return;

    let client;
    try {
      client = await lookupClientByPhone(phone);
    } catch (err) {
      if (err.status !== 404) console.error("Błąd wyszukiwania klienta po numerze:", err);
      return;
    }

    const hasBikes = client.bikes?.length > 0;
    setFoundClient(client);
    setSelectedClientId(String(client.id));
    setSelectedBikeIds([]);
    setIsNewClient(false);
    // Wpisany już nowy sprzęt zostaje; pusty wiersz znika, jeśli klient ma sprzęt do wybrania.
    setNewItems((prev) => {
      const filled = prev.filter((item) => item.brand.trim() || item.model.trim());
      return filled.length || hasBikes ? filled : [newEquipmentItem(equipmentCategory)];
    });

    const name = `${client.first_name} ${client.last_name}`;
    const next = hasBikes ? 'wybierz sprzęt z listy.' : 'nie ma jeszcze sprzętu, zarejestruj nowy.';
    toast(`Klient z numerem ${client.phone} już istnieje: ${name} - ${next}`, { duration: 6000 });
    if (!client.rodo_accepted) {
      toast.error(`${name} nie ma w bazie zgody RODO - poproś o jej podpisanie.`, { duration: 8000 });
    }
  };

  const handleCloseOrderModal = () => {
    formRef.current?.reset();
    setIsAddOrderFormOpen(false);
    setIsNewClient(false);
    setSelectedClientId("");
    setSelectedBikeIds([]);
    setNewItems([]);
    setScannedBikes([]);
    setFoundClient(null);
    setNewClientPrefill({ fullName: '', phone: '' });
    setEquipmentCategory(defaultCategoryForDate());
    setCategorySource('season');
  };

  const { data: ordersData, isLoading: isOrdersLoading, isError, error } = useQuery({
    queryKey: ['orders', { search: searchQuery, status: statusFilters.join(','), priority: priorityFilters.join(','), category: categoryFilter, ordering }],
    queryFn: () => fetchOrders({ 
      search: searchQuery || undefined,
      category: categoryFilter || undefined,
      status: statusFilters.length > 0 ? statusFilters.join(',') : undefined, 
      priority: priorityFilters.length > 0 ? priorityFilters.join(',') : undefined, 
      ordering: ordering || undefined 
    }),
  });
  const ordersList = ordersData?.results || [];

  const { data: selectedClientDetails } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: () => fetchClientDetails(selectedClientId),
    enabled: !!selectedClientId && !isNewClient,
  });

  const selectedClient = selectedClientDetails
    ?? (foundClient && String(foundClient.id) === String(selectedClientId) ? foundClient : null);

  const handleClientPicked = (client) => {
    setFoundClient(client);
    setSelectedClientId(client ? String(client.id) : "");
    setSelectedBikeIds([]);
    setScannedBikes([]);
    // Klient bez sprzętu - od razu wiersz nowego, jak przy nowym kliencie.
    setNewItems(client && !client.bikes?.length ? [newEquipmentItem(equipmentCategory)] : []);
    if (client && !client.rodo_accepted) {
      toast.error(`${client.first_name} ${client.last_name} nie ma w bazie zgody RODO - poproś o jej podpisanie.`, { duration: 8000 });
    }
  };

  const handleCreateNewClient = (prefill) => {
    setNewClientPrefill({ fullName: '', phone: '', ...prefill });
    startNewClient();
  };

  const startNewClient = () => {
    setIsNewClient(true);
    setSelectedClientId("");
    setSelectedBikeIds([]);
    setScannedBikes([]);
    setNewItems((prev) => (prev.length ? prev : [newEquipmentItem(equipmentCategory)]));
  };

  const clientEquipment = [...(selectedClient?.bikes || [])];
  scannedBikes.forEach((bike) => {
    if (!clientEquipment.some((b) => b.id === bike.id)) clientEquipment.unshift(bike);
  });

  const handleSelectedEquipmentChange = (ids) => {
    setSelectedBikeIds(ids);
    // Przełącznik opisuje to, co przyjmujemy - przy pierwszej wybranej sztuce idzie za nią.
    if (ids.length === 1 && newItems.length === 0) {
      followEquipmentCategory(clientEquipment.find((b) => b.id === ids[0]));
    }
  };

  const handleCategoryChange = (category) => {
    setEquipmentCategory(category);
    setCategorySource('manual');
    // Jeszcze niewypełnione wiersze nowego sprzętu idą za przełącznikiem; zaznaczony sprzęt zostaje.
    setNewItems((prev) => prev.map((item) => (
      item.brand.trim() || item.model.trim() ? item : { ...item, category }
    )));
  };

  const piecesCount = selectedBikeIds.length + newItems.length;

  const mutation = useMutation({
    mutationFn: async (formData) => {
      let finalCustomerId = formData.get('customer') || selectedClientId;

      if (isNewClient) {
        const fullName = formData.get('fullName').trim();
        const nameParts = fullName.split(' ');
        const rodoAccepted = formData.get('rodo_accepted') === 'on';
        
        const newClientData = {
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || '-',
          phone: formData.get('phone'),
          email: formData.get('email') || '',
          notes: '',
          rodo_accepted: rodoAccepted
        };
        const createdClient = await createClient(newClientData);
        finalCustomerId = createdClient.id;
        // Klient jest unikalny po numerze - backend oddaje istniejącego zamiast tworzyć duplikat.
        if (createdClient.existing) {
          toast(`Klient z numerem ${createdClient.phone} już istnieje - zlecenie przypisano do: ${createdClient.first_name} ${createdClient.last_name}`, { duration: 6000 });
        }
        // Od teraz formularz pracuje na zapisanym kliencie - gdyby samo zlecenie się nie
        // zapisało, ponowna próba nie zakłada go drugi raz.
        setFoundClient({ ...createdClient, bikes: createdClient.bikes || [] });
        setSelectedClientId(String(createdClient.id));
        setIsNewClient(false);
      }

      // Każda zapisana sztuka od razu przechodzi z "nowych" do zaznaczonych (bez duplikatów przy ponownej próbie).
      const createdIds = await saveNewEquipment(parseInt(finalCustomerId), newItems, createBike, (bike, item) => {
        setScannedBikes((prev) => [...prev, bike]);
        setSelectedBikeIds((prev) => [...prev, bike.id]);
        setNewItems((prev) => prev.filter((i) => i.key !== item.key));
      });

      const newOrder = {
        customer: parseInt(finalCustomerId),
        bikes: [...selectedBikeIds, ...createdIds],
        bike_tag_number: parseInt(formData.get('bike_tag_number'), 10),
        description: formData.get('description'),
        priority: formData.get('priority') || 'normal',
        estimated_cost: formData.get('estimated_cost') || null,
        estimated_pickup_date: formData.get('estimated_pickup_date'),
      };

      return await createOrder(newOrder);
    },
    onSuccess: (createdOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      // POST zwraca pełne zlecenie (jak retrieve) - wkładamy je do cache, żeby strona
      // szczegółów nie czekała na ponowne pobranie. Klucz jak w OrderDetailsPage (id z URL-a to string).
      queryClient.setQueryData(['order', String(createdOrder.id)], createdOrder);
      handleCloseOrderModal();
      toast.success("Utworzono nowe zlecenie!");
      navigate(`/panel/orders/${createdOrder.id}`);
    },
    onError: (error) => toast.error(`Wystąpił błąd podczas przetwarzania: ${error.message}`)
  });

  const handleAddOrder = (e) => {
    e.preventDefault();
    if (!isNewClient && !selectedClientId) {
      toast.error('Wybierz klienta albo zaznacz "Nowy klient".');
      return;
    }
    if (piecesCount === 0) {
      toast.error('Wybierz albo dodaj co najmniej jedną sztukę sprzętu.');
      return;
    }
    const formData = new FormData(e.target);
    mutation.mutate(formData);
  };

  const toggleStatusFilter = (status) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriorityFilter = (priority) => {
    setPriorityFilters(prev => 
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  // Obsługa sortowania na zasadzie 3 kliknięć (rosnąco -> malejąco -> reset)
  const handleSortClick = (field) => {
    if (ordering === field) {
      setOrdering(`-${field}`);
    } else if (ordering === `-${field}`) {
      setOrdering("");
    } else {
      setOrdering(field);
    }
  };

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader className="bg-[var(--color-paper)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Zlecenia serwisowe</h1>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 bg-[var(--color-paper-2)] border border-[var(--color-line)] hover:bg-white text-[var(--color-ink)] rounded-md font-medium text-sm transition-colors shadow-xs cursor-pointer"
              title="Zeskanuj kod QR sprzętu, aby natychmiast utworzyć nowe zlecenie"
            >
              <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <span>Skanuj QR i przyjmij</span>
            </button>
            <Button onClick={() => setIsAddOrderFormOpen(true)} className="flex-1 sm:flex-initial justify-center">
              + Przyjmij sprzęt
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1"> 
            <SearchInput 
              placeholder="Szukaj po kliencie, nr zawieszki, sprzęcie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            /> 
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Filtr kategorii sprzętu */}
            <div role="radiogroup" aria-label="Rodzaj sprzętu" className="flex items-center h-[46px] p-1 gap-1 border border-[var(--color-line)] rounded-lg bg-[var(--color-paper-2)] shadow-sm">
              {CATEGORY_FILTERS.map((f) => {
                const active = categoryFilter === f.value;
                return (
                  <button
                    key={f.value || 'all'}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategoryFilter(f.value)}
                    className={`h-full px-2.5 sm:px-3 rounded-md text-xs sm:text-sm cursor-pointer transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                      active ? 'bg-[var(--color-paper-3)] text-[var(--color-ink)] font-medium' : 'text-[var(--color-ink-3)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Dropdown filtrowania statusów (wielokrotny wybór) */}
            <div className="relative" ref={statusMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setOpenStatusMenu(!openStatusMenu);
                  setOpenPriorityMenu(false);
                }}
                className="flex items-center justify-center gap-2 h-[46px] border border-[var(--color-line)] rounded-lg px-3 sm:px-4 bg-[var(--color-paper-2)] text-[var(--color-ink-2)] text-xs sm:text-sm hover:bg-[var(--color-paper-3)] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                <span>Statusy {statusFilters.length > 0 && `(${statusFilters.length})`}</span>
                <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {openStatusMenu && (
                <div className="absolute right-0 mt-2 w-52 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">Filtruj status</div>
                  {[
                    { id: 'accepted', label: 'Przyjęte' },
                    { id: 'estimating', label: 'Wycena' },
                    { id: 'waiting_parts', label: 'Czeka na części' },
                    { id: 'in_progress', label: 'W trakcie' },
                    { id: 'done', label: 'Gotowe' },
                    { id: 'delivered', label: 'Odebrane' },
                    { id: 'cancelled', label: 'Anulowane' }
                  ].map(st => (
                    <label key={st.id} className="flex items-center px-4 py-2 text-sm hover:bg-[var(--color-paper)] cursor-pointer text-[var(--color-ink-2)]">
                      <input 
                        type="checkbox" 
                        checked={statusFilters.includes(st.id)}
                        onChange={() => toggleStatusFilter(st.id)}
                        className="w-4 h-4 mr-2 text-[var(--color-accent)] rounded border-[var(--color-line)] focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                      {st.label}
                    </label>
                  ))}
                  {statusFilters.length > 0 && (
                    <div className="border-t border-[var(--color-line)] mt-1 pt-1 px-2">
                      <button onClick={() => setStatusFilters([])} className="w-full text-center text-xs text-[var(--color-accent)] py-1 font-medium hover:underline">Wyczyść filtry</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Dropdown filtrowania priorytetów (wielokrotny wybór) */}
            <div className="relative" ref={priorityMenuRef}>
              <button
                type="button"
                onClick={() => {
                  setOpenPriorityMenu(!openPriorityMenu);
                  setOpenStatusMenu(false);
                }}
                className="flex items-center justify-center gap-2 h-[46px] border border-[var(--color-line)] rounded-lg px-3 sm:px-4 bg-[var(--color-paper-2)] text-[var(--color-ink-2)] text-xs sm:text-sm hover:bg-[var(--color-paper-3)] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
              >
                <span>Priorytety {priorityFilters.length > 0 && `(${priorityFilters.length})`}</span>
                <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>

              {openPriorityMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-lg py-2 z-50">
                  <div className="px-4 py-2 text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">Filtruj priorytet</div>
                  {PRIORITY_OPTIONS.map(pr => (
                    <label key={pr.value} className="flex items-center px-4 py-2 text-sm hover:bg-[var(--color-paper)] cursor-pointer text-[var(--color-ink-2)]">
                      <input 
                        type="checkbox" 
                        checked={priorityFilters.includes(pr.value)}
                        onChange={() => togglePriorityFilter(pr.value)}
                        className="w-4 h-4 mr-2 text-[var(--color-accent)] rounded border-[var(--color-line)] focus:ring-[var(--color-accent)] cursor-pointer"
                      />
                      {pr.label}
                    </label>
                  ))}
                  {priorityFilters.length > 0 && (
                    <div className="border-t border-[var(--color-line)] mt-1 pt-1 px-2">
                      <button onClick={() => setPriorityFilters([])} className="w-full text-center text-xs text-[var(--color-accent)] py-1 font-medium hover:underline">Wyczyść filtry</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </StickyHeader>

      {/* Wyświetlanie błędów pobierania, jeśli występują */}
      {isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-[var(--color-accent)] font-medium">
          Wystąpił błąd podczas pobierania danych: {error.message}
        </div>
      )}

      {/* Widok tabeli dla ekranów desktop / tablet */}
      <div className="hidden md:block bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-[var(--color-paper-2)] border-b border-solid border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
                <th className="py-4 px-6 font-medium">Zawieszka</th>
                <th className="py-4 px-6 font-medium">Klient</th>
                <th className="py-4 px-6 font-medium">Sprzęt</th>
                <th className="py-4 px-6 font-medium">Status</th>

                {/* Sortowalna kolumna: Data przyjęcia */}
                <th 
                  onClick={() => handleSortClick('created_at')}
                  className="py-4 px-6 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data przyjęcia</span>
                    <span className="text-xs text-[var(--color-ink-3)]">
                      {ordering === 'created_at' ? '▲' : ordering === '-created_at' ? '▼' : '↕'}
                    </span>
                  </div>
                </th>

                {/* Sortowalna kolumna: Planowany odbiór */}
                <th 
                  onClick={() => handleSortClick('estimated_pickup_date')}
                  className="py-4 px-6 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Odbiór</span>
                    <span className="text-xs text-[var(--color-ink-3)]">
                      {ordering === 'estimated_pickup_date' ? '▲' : ordering === '-estimated_pickup_date' ? '▼' : '↕'}
                    </span>
                  </div>
                </th>

                <th className="py-4 px-6 font-medium">Priorytet</th>

                {/* Sortowalna kolumna: Wartość */}
                <th 
                  onClick={() => handleSortClick('estimated_cost')}
                  className="py-4 px-6 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Wartość</span>
                    <span className="text-xs text-[var(--color-ink-3)]">
                      {ordering === 'estimated_cost' ? '▲' : ordering === '-estimated_cost' ? '▼' : '↕'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="text-sm text-[var(--color-ink)]">
              {isOrdersLoading ? (
                <TableRowsSkeleton rows={6} cols={8} />
              ) : ordersList.length > 0 ? (
                ordersList.map((order, index) => (
                  <tr 
                    key={order.id} 
                    onClick={() => navigate(`/panel/orders/${order.id}`)}
                    className={`border-b border-[var(--color-line)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${index === ordersList.length - 1 ? 'border-b-0' : '' }`}
                  >
                    <td className="py-4 px-6 font-bold text-[var(--color-ink)]">#{order.bike_tag_number}</td>
                    <td className="py-4 px-6 font-medium">{order.customer_name}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-2)]">
                      <span className="inline-flex items-start gap-2">
                        <span className="mt-0.5"><CategoryIcons categories={orderCategories(order)} /></span>
                        {order.bike_label}
                      </span>
                    </td>
                    <td className="py-4 px-6"> <StatusBadge status={order.status}/> </td>
                    <td className="py-4 px-6 text-[var(--color-ink-3)]">{formatDate(order.created_at)}</td>
                    <td className={`py-4 px-6 ${isOrderOverdue(order) ? 'font-semibold text-red-600' : 'text-[var(--color-ink-3)]'}`}>
                      {formatDate(order.estimated_pickup_date)}
                      {isOrderOverdue(order) && <span className="block text-[10px] uppercase tracking-wider">Po terminie</span>}
                    </td>
                    <td className="py-4 px-6 text-[var(--color-ink-2)]">{priorityLabel(order.priority || 'normal')}</td>
                    <td className="py-4 px-6 font-medium">{order.final_cost ? `${order.final_cost} zł` : (order.estimated_cost ? `${order.estimated_cost} zł` : '-')}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="py-8 px-6 text-center text-[var(--color-ink-3)]">
                    Brak zleceń spełniających kryteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Widok kart dla telefonów (rozwiązanie problemu wąskich ekranów) */}
      <div className="md:hidden space-y-3">
        {isOrdersLoading ? (
          <MobileOrderCardsSkeleton count={4} />
        ) : ordersList.length > 0 ? (
          ordersList.map((order) => (
            <div
              key={order.id}
              onClick={() => navigate(`/panel/orders/${order.id}`)}
              className={`bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-4 shadow-sm active:bg-[var(--color-paper-3)] transition-colors cursor-pointer space-y-2.5 ${
                orderCategories(order).includes('winter') ? 'border-l-4 border-l-[var(--color-winter-ice)]' : ''
              }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-ink)]">Zawieszka #{order.bike_tag_number || '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {order.priority && order.priority !== 'normal' && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-orange-100 text-orange-800">
                      {priorityLabel(order.priority)}
                    </span>
                  )}
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div>
                <p className="text-base font-semibold text-[var(--color-ink)]">{order.customer_name}</p>
                <p className="text-sm text-[var(--color-ink-2)] flex items-center gap-1.5">
                  <CategoryIcons categories={orderCategories(order)} className="w-3.5 h-3.5" />
                  {order.bike_label}
                </p>
              </div>

              <div className="pt-2 border-t border-[var(--color-line)] flex justify-between items-center text-xs text-[var(--color-ink-3)]">
                <div className="flex flex-col gap-0.5">
                  <span>Przyjęto: {formatDate(order.created_at)}</span>
                  {order.estimated_pickup_date && (
                    <span className={isOrderOverdue(order) ? 'font-semibold text-red-600' : ''}>
                      Odbiór: {formatDate(order.estimated_pickup_date)}{isOrderOverdue(order) && ' - po terminie'}
                    </span>
                  )}
                </div>
                <span className="text-sm font-bold text-[var(--color-accent)]">
                  {order.final_cost ? `${order.final_cost} zł` : (order.estimated_cost ? `${order.estimated_cost} zł` : '-')}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-8 text-center text-[var(--color-ink-3)] text-sm">
            Brak zleceń spełniających kryteria.
          </div>
        )}
      </div>

      <Modal 
        isOpen={isAddOrderFormOpen} 
        onClose={handleCloseOrderModal}
        title="Nowe zlecenie serwisowe"
      >
        <form ref={formRef} onSubmit={handleAddOrder} className="flex flex-col gap-6 mt-2">
            <div className="flex flex-col gap-6 pb-6 border-b border-[var(--color-line)]">
                <div className="p-5 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-sm transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                    {isNewClient ? "Dane nowego klienta" : "Wybór klienta"}
                    </h4>
                    <div className="flex items-center gap-2">
                    <input
                        type="checkbox" id="newClientCheckbox" checked={isNewClient}
                        onChange={(e) => {
                          if (e.target.checked) {
                            startNewClient();
                          } else {
                            setIsNewClient(false);
                            setNewItems([]);
                          }
                        }}
                        className="w-4 h-4 text-[var(--color-accent)] bg-[var(--color-paper-2)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <label htmlFor="newClientCheckbox" className="text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                        Nowy klient
                    </label>
                    </div>
                </div>

                {!isNewClient ? (
                    <ClientSearchSelect
                      name="customer"
                      label="Klient z bazy"
                      required
                      value={selectedClient}
                      onChange={handleClientPicked}
                      onCreateNew={handleCreateNewClient}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Input name="fullName" label="Imię i nazwisko" placeholder="np. Jan Kowalski" required={true} defaultValue={newClientPrefill.fullName} />
                      <Input name="phone" label="Numer telefonu" type="tel" placeholder="np. +48 222 222 222" required={true} defaultValue={newClientPrefill.phone} onBlur={handleNewClientPhoneBlur} />
                      <div className="lg:col-span-2">
                          <Input name="email" label="Adres e-mail" type="email" placeholder="np. jan.kowalski@email.com" />
                      </div>
                      <div className="lg:col-span-2 flex items-center gap-2 pt-2">
                          <input 
                            type="checkbox" 
                            id="rodo_accepted" 
                            name="rodo_accepted" 
                            required={true}
                            className="w-4 h-4 text-[var(--color-accent)] bg-[var(--color-paper-2)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                          />
                          <label htmlFor="rodo_accepted" className="text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                            Klient wyraził zgodę na przetwarzanie danych osobowych (RODO) <span className="text-[var(--color-accent)]">*</span>
                          </label>
                      </div>
                    </div>
                )}
                </div>

                <div className="p-5 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-sm transition-all">
                <div className="mb-4">
                  <CategorySwitch value={equipmentCategory} onChange={handleCategoryChange} hint={categorySource} />
                </div>

                {(selectedClientId || isNewClient) ? (
                    <EquipmentPicker
                      title="Sprzęt na zlecenie"
                      equipment={isNewClient ? [] : clientEquipment}
                      selectedIds={selectedBikeIds}
                      onSelectedChange={handleSelectedEquipmentChange}
                      newItems={newItems}
                      onNewItemsChange={setNewItems}
                      primaryCategory={equipmentCategory}
                      onScan={isNewClient ? undefined : () => setIsScannerOpen(true)}
                      disabled={mutation.isPending}
                    />
                ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[var(--color-ink-3)]">Najpierw wybierz klienta - albo zeskanuj QR sprzętu.</p>
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="text-xs font-semibold text-[var(--color-accent)] hover:underline cursor-pointer"
                      >
                        Skanuj QR sprzętu
                      </button>
                    </div>
                )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 border-t border-[var(--color-line)] pt-4">
                <DateInput name="accepted_at" label="Data przyjęcia" defaultValue={todayDate} disabled={true} />
                <DateInput name="estimated_pickup_date" label="Planowany odbiór" defaultValue={defaultPickupDate()} min={todayDate} required={true} />
                <Input name="bike_tag_number" label="Nr zawieszki" type="number" min="1" step="1" inputMode="numeric" placeholder="np. 12" required={true} />
                <Select
                    name="priority"
                    label="Priorytet"
                    defaultValue="normal"
                    options={PRIORITY_OPTIONS}
                />
                <Input name="estimated_cost" label="Szacowana wartość (zł)" type="number" placeholder="np. 150" />
            </div>

            <div className="flex flex-col">
                <label className="text-sm font-medium text-[var(--color-ink-2)] mb-1">
                Opis usterki / zakres prac <span className="text-[var(--color-accent)]">*</span>
                </label>
                <textarea
                name="description"
                className="w-full p-3 border border-[var(--color-line)] rounded-lg text-sm bg-[var(--color-paper-2)] placeholder-[var(--color-ink-3)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[120px] resize-y"
                placeholder="Dokładny opis tego, co należy wykonać..." required={true}
                ></textarea>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-line)]">
                <button
                type="button"
                onClick={handleCloseOrderModal}
                className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
                >Anuluj</button>
                <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Zapisywanie..." : "Utwórz zlecenie"}
                </Button>
            </div>
        </form>
      </Modal>

      {/* Skaner QR dedykowany do natychmiastowego otwierania zlecenia */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        initialAction="new_order"
        onBikeScanned={handleBikeScannedForOrder}
      />
    </div>
  );
}