import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchOrders, createOrder } from "../api/orders";
import { fetchClients, fetchClientDetails, createClient, createBike } from "../api/clients";

import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import StickyHeader from "../components/StickyHeader";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import { TableRowsSkeleton, MobileOrderCardsSkeleton } from "../components/Skeleton";

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  const [isAddOrderFormOpen, setIsAddOrderFormOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [isNewBike, setIsNewBike] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Stan wyszukiwania i filtrowania
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilters, setStatusFilters] = useState([]);
  const [priorityFilters, setPriorityFilters] = useState([]);
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

  const todayDate = new Date().toISOString().split('T')[0];

  const { data: ordersData, isLoading: isOrdersLoading, isError, error } = useQuery({
    queryKey: ['orders', { search: searchQuery, status: statusFilters.join(','), priority: priorityFilters.join(','), ordering }],
    queryFn: () => fetchOrders({ 
      search: searchQuery || undefined,
      status: statusFilters.length > 0 ? statusFilters.join(',') : undefined, 
      priority: priorityFilters.length > 0 ? priorityFilters.join(',') : undefined, 
      ordering: ordering || undefined 
    }),
  });
  const ordersList = ordersData?.results || [];

  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetchClients(),
  });
  const clientOptions = (clientsData?.results || []).map(client => ({
    value: client.id,
    label: `${client.first_name} ${client.last_name}`
  }));

  const { data: selectedClientDetails } = useQuery({
    queryKey: ['client', selectedClientId],
    queryFn: () => fetchClientDetails(selectedClientId),
    enabled: !!selectedClientId && !isNewClient,
  });
  const bikeOptions = (selectedClientDetails?.bikes || []).map(bike => ({
    value: bike.id,
    label: `${bike.brand} ${bike.model} (${bike.bike_type})`
  }));

  const mutation = useMutation({
    mutationFn: async (formData) => {
      let finalCustomerId = formData.get('customer');
      let finalBikeId = formData.get('bike');

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
      }

      if (isNewClient || isNewBike) {
        const newBikeData = {
          customer: parseInt(finalCustomerId),
          brand: formData.get('brand'),
          model: formData.get('model'),
          bike_type: formData.get('bike_type')
        };
        const createdBike = await createBike(newBikeData);
        finalBikeId = createdBike.id; 
      }

      const newOrder = {
        customer: parseInt(finalCustomerId),
        bike: parseInt(finalBikeId),
        bike_tag_number: parseInt(finalBikeId), 
        description: formData.get('description'),
        priority: formData.get('priority') || 'normal',
        estimated_cost: formData.get('estimated_cost') || null,
      };

      return await createOrder(newOrder);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      formRef.current?.reset();
      setIsAddOrderFormOpen(false);
      setIsNewClient(false);
      setIsNewBike(false);
      toast.success("Utworzono nowe zlecenie!");
    },
    onError: (error) => toast.error(`Wystąpił błąd podczas przetwarzania: ${error.message}`)
  });

  const handleAddOrder = (e) => {
    e.preventDefault();
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
          <Button onClick={() => setIsAddOrderFormOpen(true)} className="w-full sm:w-auto">
            + Przyjmij rower
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1"> 
            <SearchInput 
              placeholder="Szukaj po kliencie, numerze zlecenia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            /> 
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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
                    { id: 'diagnosing', label: 'Diagnoza' },
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
                  {[
                    { id: 'low', label: 'Niski' },
                    { id: 'normal', label: 'Normalny' },
                    { id: 'high', label: 'Wysoki' },
                    { id: 'urgent', label: 'Pilny' }
                  ].map(pr => (
                    <label key={pr.id} className="flex items-center px-4 py-2 text-sm hover:bg-[var(--color-paper)] cursor-pointer text-[var(--color-ink-2)]">
                      <input 
                        type="checkbox" 
                        checked={priorityFilters.includes(pr.id)}
                        onChange={() => togglePriorityFilter(pr.id)}
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
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr className="bg-[var(--color-paper-2)] border-b border-solid border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
                <th className="py-4 px-6 font-medium">Nr zlecenia</th>
                <th className="py-4 px-6 font-medium">Zawieszka</th>
                <th className="py-4 px-6 font-medium">Klient</th>
                <th className="py-4 px-6 font-medium">Rower</th>
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
                    <td className="py-4 px-6 font-medium text-[var(--color-ink-2)]">#{order.id}</td>
                    <td className="py-4 px-6 font-bold text-[var(--color-ink)]">#{order.bike_tag_number}</td>
                    <td className="py-4 px-6 font-medium">{order.customer_name}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-2)]">{order.bike_label}</td>
                    <td className="py-4 px-6"> <StatusBadge status={order.status}/> </td>
                    <td className="py-4 px-6 text-[var(--color-ink-3)]">{new Date(order.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                    <td className="py-4 px-6 capitalize text-[var(--color-ink-2)]">{order.priority || 'normal'}</td>
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
              className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-4 shadow-sm active:bg-[var(--color-paper-3)] transition-colors cursor-pointer space-y-2.5"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[var(--color-ink)]">#{order.id}</span>
                  <span className="px-2 py-0.5 bg-[var(--color-paper)] text-[var(--color-ink-2)] font-semibold rounded text-xs border border-[var(--color-line)]">
                    Zawieszka: #{order.bike_tag_number || '-'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.priority && order.priority !== 'normal' && (
                    <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-orange-100 text-orange-800">
                      {order.priority}
                    </span>
                  )}
                  <StatusBadge status={order.status} />
                </div>
              </div>

              <div>
                <p className="text-base font-semibold text-[var(--color-ink)]">{order.customer_name}</p>
                <p className="text-sm text-[var(--color-ink-2)]">{order.bike_label}</p>
              </div>

              <div className="pt-2 border-t border-[var(--color-line)] flex justify-between items-center text-xs text-[var(--color-ink-3)]">
                <span>Przyjęto: {new Date(order.created_at).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
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
        onClose={() => setIsAddOrderFormOpen(false)}
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
                        setIsNewClient(e.target.checked);
                        if (e.target.checked) setIsNewBike(true); 
                        }}
                        className="w-4 h-4 text-[var(--color-accent)] bg-[var(--color-paper-2)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                    />
                    <label htmlFor="newClientCheckbox" className="text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                        Nowy klient
                    </label>
                    </div>
                </div>

                {!isNewClient ? (
                    <Select
                      name="customer" label="Klient z bazy" options={clientOptions} placeholder="Wybierz klienta..."
                      required={!isNewClient} onChange={(e) => setSelectedClientId(e.target.value)}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Input name="fullName" label="Imię i nazwisko" placeholder="np. Jan Kowalski" required={true} />
                      <Input name="phone" label="Numer telefonu" type="tel" placeholder="np. +48 222 222 222" required={true} />
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
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-semibold text-[var(--color-ink)]">
                    {(isNewClient || isNewBike) ? "Rejestracja nowego roweru" : "Wybór przypisanego roweru"}
                    </h4>
                    
                    {!isNewClient && (
                    <div className="flex items-center gap-2">
                        <input
                        type="checkbox" id="newBikeCheckbox" checked={isNewBike}
                        onChange={(e) => setIsNewBike(e.target.checked)}
                        className="w-4 h-4 text-[var(--color-accent)] bg-[var(--color-paper-2)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                        />
                        <label htmlFor="newBikeCheckbox" className="text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">Nowy rower</label>
                    </div>
                    )}
                </div>

                {(!isNewClient && !isNewBike) ? (
                    <Select
                    name="bike" label="Rower przypisany do klienta" options={bikeOptions} placeholder="Wybierz rower..."
                    required={(!isNewClient && !isNewBike)} disabled={!selectedClientId || bikeOptions.length === 0}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <Input name="brand" label="Producent" placeholder="np. Trek" required={true} />
                    <Input name="model" label="Model" placeholder="np. Domane SL5" required={true} />
                    <Select
                        name="bike_type" label="Typ roweru" required={true}
                        options={[
                            { value: 'road', label: 'Szosowy (road)' },
                            { value: 'mtb', label: 'Górski (mtb)' },
                            { value: 'city', label: 'Miejski (city)' },
                            { value: 'gravel', label: 'Gravel (gravel)' },
                            { value: 'electric', label: 'Elektryczny (electric)' },
                            { value: 'other', label: 'Inny (other)' }
                        ]}
                    />
                    </div>
                )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-[var(--color-line)] pt-4">
                <Input name="accepted_at" label="Data przyjęcia" type="date" defaultValue={todayDate} disabled={true} />
                <Select
                    name="priority"
                    label="Priorytet"
                    defaultValue="normal"
                    options={[
                        { value: 'low', label: 'Niski' },
                        { value: 'normal', label: 'Normalny' },
                        { value: 'high', label: 'Wysoki' },
                        { value: 'urgent', label: 'Pilny' }
                    ]}
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
                onClick={() => {
                    formRef.current?.reset();
                    setIsAddOrderFormOpen(false);
                    setIsNewClient(false);
                    setIsNewBike(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
                >Anuluj</button>
                <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Zapisywanie..." : "Utwórz zlecenie"}
                </Button>
            </div>
        </form>
      </Modal>
    </div>
  );
}