import { useState, useRef } from "react";
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

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  const [isAddOrderFormOpen, setIsAddOrderFormOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [isNewBike, setIsNewBike] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [ordering, setOrdering] = useState("");

  const [openStatusMenu, setOpenStatusMenu] = useState(false);
  const [openPriorityMenu, setOpenPriorityMenu] = useState(false);
  const [openSortMenu, setOpenSortMenu] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders', { status: statusFilter, priority: priorityFilter, ordering }],
    queryFn: () => fetchOrders({ 
      status: statusFilter, 
      priority: priorityFilter, 
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

  return (
    <div className="px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Zlecenia serwisowe</h1>
          <Button onClick={() => setIsAddOrderFormOpen(true)}>+ Przyjmij rower</Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1"> 
            <SearchInput placeholder="Szukaj po kliencie, numerze zlecenia..."/> 
          </div>
          
          <div className="relative">
            <button
              onClick={() => {
                setOpenSortMenu(!openSortMenu);
                setOpenStatusMenu(false);
                setOpenPriorityMenu(false);
              }}
              className="flex items-center justify-center gap-2 h-[46px] border border-[var(--color-line)] rounded-lg px-4 bg-[var(--color-paper-2)] text-[var(--color-ink-2)] text-sm hover:bg-[var(--color-paper-3)] transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <svg className="w-5 h-5 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
              <span>Sortowanie</span>
            </button>

            {openSortMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-lg py-2 z-50">
                <div className="px-4 py-2 text-xs font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">Sortuj według</div>
                <button onClick={() => { setOrdering(""); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${!ordering ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Domyślne</button>
                <button onClick={() => { setOrdering("-created_at"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === '-created_at' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Od najnowszych</button>
                <button onClick={() => { setOrdering("created_at"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === 'created_at' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Od najstarszych</button>
                <button onClick={() => { setOrdering("-priority"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === '-priority' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Najwyższy priorytet</button>
                <button onClick={() => { setOrdering("-updated_at"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === '-updated_at' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Ostatnio modyfikowane</button>
              </div>
            )}
          </div>
        </div>
      </StickyHeader>

      <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm overflow-visible">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[var(--color-paper-2)] border-b border-solid border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
              <th className="py-4 px-6 font-medium">Nr zlecenia</th>
              <th className="py-4 px-6 font-medium">Zawieszka</th>
              <th className="py-4 px-6 font-medium">Klient</th>
              <th className="py-4 px-6 font-medium">Rower</th>
              
              <th className="py-4 px-6 font-medium relative">
                <button 
                  onClick={() => {
                    setOpenStatusMenu(!openStatusMenu);
                    setOpenPriorityMenu(false);
                    setOpenSortMenu(false);
                  }}
                  className="flex items-center gap-1.5 hover:text-[var(--color-ink)] transition-colors cursor-pointer w-full text-left"
                >
                  <span>Status</span>
                  <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {openStatusMenu && (
                  <div className="absolute left-6 mt-2 w-48 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-lg py-2 z-50">
                    <button onClick={() => { setStatusFilter(""); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${!statusFilter ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Wszystkie statusy</button>
                    <button onClick={() => { setStatusFilter("accepted"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'accepted' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Zaakceptowane</button>
                    <button onClick={() => { setStatusFilter("diagnosing"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'diagnosing' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Diagnoza</button>
                    <button onClick={() => { setStatusFilter("waiting_parts"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'waiting_parts' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Czeka na części</button>
                    <button onClick={() => { setStatusFilter("in_progress"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'in_progress' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>W trakcie</button>
                    <button onClick={() => { setStatusFilter("done"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'done' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Gotowe</button>
                    <button onClick={() => { setStatusFilter("delivered"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'delivered' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Odebrane</button>
                    <button onClick={() => { setStatusFilter("cancelled"); setOpenStatusMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${statusFilter === 'cancelled' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Anulowane</button>
                  </div>
                )}
              </th>

              <th className="py-4 px-6 font-medium relative">
                <button 
                  onClick={() => {
                    setOpenPriorityMenu(!openPriorityMenu);
                    setOpenStatusMenu(false);
                    setOpenSortMenu(false);
                  }}
                  className="flex items-center gap-1.5 hover:text-[var(--color-ink)] transition-colors cursor-pointer w-full text-left"
                >
                  <span>Priorytet</span>
                  <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>

                {openPriorityMenu && (
                  <div className="absolute left-6 mt-2 w-48 bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-lg py-2 z-50">
                    <button onClick={() => { setPriorityFilter(""); setOpenPriorityMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${!priorityFilter ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Wszystkie priorytety</button>
                    <button onClick={() => { setPriorityFilter("low"); setOpenPriorityMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${priorityFilter === 'low' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Niski</button>
                    <button onClick={() => { setPriorityFilter("normal"); setOpenPriorityMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${priorityFilter === 'normal' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Normalny</button>
                    <button onClick={() => { setPriorityFilter("high"); setOpenPriorityMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${priorityFilter === 'high' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Wysoki</button>
                    <button onClick={() => { setPriorityFilter("urgent"); setOpenPriorityMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${priorityFilter === 'urgent' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Pilny</button>
                  </div>
                )}
              </th>

              <th className="py-4 px-6 font-medium">Data przyjęcia</th>
              <th className="py-4 px-6 font-medium">Wartość</th>
            </tr>
          </thead>

          <tbody className="text-sm text-[var(--color-ink)]">
            {isOrdersLoading ? (
              <tr><td colSpan="8" className="py-4 px-6 text-center text-[var(--color-ink-3)]">Ładowanie...</td></tr>
            ) : ordersList.length > 0 ? (
              ordersList.map((order, index) => (
                <tr 
                  key={order.id} 
                  onClick={() => navigate(`/panel/orders/${order.id}`)}
                  className={`border-b border-[var(--color-line)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${index === ordersList.length - 1 ? 'border-b-0' : '' }`}
                >
                  <td className="py-4 px-6 font-medium text-[var(--color-ink-2)]">#{order.id}</td>
                  <td className="py-4 px-6 font-bold text-[var(--color-ink)]">#{order.bike_tag_number}</td>
                  <td className="py-4 px-6">{order.customer_name}</td>
                  <td className="py-4 px-6 text-[var(--color-ink-2)]">{order.bike_label}</td>
                  <td className="py-4 px-6"> <StatusBadge status={order.status}/> </td>
                  <td className="py-4 px-6 capitalize text-[var(--color-ink-2)]">{order.priority || 'normal'}</td>
                  <td className="py-4 px-6 text-[var(--color-ink-3)]">{new Date(order.created_at).toLocaleDateString()}</td>
                  <td className="py-4 px-6 font-medium">{order.final_cost ? `${order.final_cost} zł` : (order.estimated_cost ? `~${order.estimated_cost} zł` : '-')}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="8" className="py-8 px-6 text-center text-[var(--color-ink-3)]">Brak zleceń spełniających kryteria.</td></tr>
            )}
          </tbody>
        </table>
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