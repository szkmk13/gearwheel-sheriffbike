import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrders, createOrder } from "../api/orders";
import { fetchClients, fetchClientDetails, createClient, createBike } from "../api/clients";

import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import SlidePanel from "../components/SlidePanel";
import StickyHeader from "../components/StickyHeader";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";

export default function OrdersPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef(null);

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAddOrderFormOpen, setIsAddOrderFormOpen] = useState(false);
  
  const [isNewClient, setIsNewClient] = useState(false);
  const [isNewBike, setIsNewBike] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const todayDate = new Date().toISOString().split('T')[0];

  const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => fetchOrders(),
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
        
        const newClientData = {
          first_name: nameParts[0],
          last_name: nameParts.slice(1).join(' ') || '-',
          phone: formData.get('phone'),
          email: formData.get('email') || '',
          notes: ''
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
    },
    onError: (error) => {
      alert(`Wystąpił błąd podczas przetwarzania: ${error.message}`);
    }
  });

  const handleAddOrder = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    mutation.mutate(formData);
  };

  return (
    <div className="px-8 pb-8 relative">
      <StickyHeader>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Zlecenia serwisowe</h1>
          <Button onClick={() => setIsAddOrderFormOpen(true)}>+ Przyjmij rower</Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1"> <SearchInput placeholder="Szukaj po kliencie, numerze zlecenia..."/> </div>
          <div>
            <select className="h-[46px] border border-gray-200 rounded-lg px-4 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#009ceb] shadow-sm">
              <option value="">Wszystkie</option>
              <option value="in_progress">W trakcie</option>
              <option value="done">Gotowe</option>
              <option value="delivered">Odebrane</option>
            </select>
          </div>
        </div>
      </StickyHeader>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-solid border-gray-200 text-sm text-gray-600">
              <th className="py-4 px-6 font-medium">Nr zlecenia</th>
              <th className="py-4 px-6 font-medium">Klient</th>
              <th className="py-4 px-6 font-medium">Rower</th>
              <th className="py-4 px-6 font-medium">Status</th>
              <th className="py-4 px-6 font-medium">Data przyjęcia</th>
              <th className="py-4 px-6 font-medium">Wartość</th>
            </tr>
          </thead>

          <tbody className="text-sm text-gray-800">
            {isOrdersLoading ? (
              <tr><td colSpan="6" className="py-4 px-6 text-center text-gray-500">Ładowanie...</td></tr>
            ) : ordersList.map((order, index) => (
              <tr 
                key={order.id} 
                onClick={() => setSelectedOrder(order)} 
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index === ordersList.length - 1 ? 'border-b-0' : '' }`}
              >
                <td className="py-4 px-6 font-medium text-gray-600">#{order.id}</td>
                <td className="py-4 px-6">{order.customer_name}</td>
                <td className="py-4 px-6 text-gray-600">{order.bike_label}</td>
                <td className="py-4 px-6"> <StatusBadge status={order.status}/> </td>
                <td className="py-4 px-6 text-gray-500">{new Date(order.created_at).toLocaleDateString()}</td>
                <td className="py-4 px-6 font-medium">{order.final_cost ? `${order.final_cost} zł` : (order.estimated_cost ? `~${order.estimated_cost} zł` : '-')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SlidePanel
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800"> #{selectedOrder.id} </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Klient: <span className="font-medium text-gray-700"> {selectedOrder.customer_name} </span>
                  </p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>
            </div>

            <div className="flex justify-between py-6 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Rower</p>
                <p className="font-medium text-gray-800"> {selectedOrder.bike_label} </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Data przyjęcia</p>
                <p className="font-medium text-gray-800"> {new Date(selectedOrder.created_at).toLocaleDateString()} </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Wartość</p>
                <p className="font-medium text-gray-800"> {selectedOrder.final_cost ? `${selectedOrder.final_cost} zł` : '-'} </p>
              </div>
            </div>

            <div className="bg-white border border-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-3 pb-2 border-b-4 border-black">
                <h3 className="text-lg font-semibold text-gray-800">Zawieszka serwisowa</h3>
              </div>
              <p className="text-sm text-gray-600 font-medium">
                Numer: {selectedOrder.bike_tag_number || '-'}
              </p>
            </div>
            
            <div className="bg-gray-300 rounded text-gray-600 font-medium p-3 text-sm">Lista użytych części (w budowie)</div>
            
            <Button 
              className="w-full justify-center py-3 text-base" 
              onClick={() => navigate(`/panel/orders/${selectedOrder.id}`)}
            >
              Otwórz pełne szczegóły zlecenia
            </Button>
          </div>
        )}
      </SlidePanel>

      <Modal 
        isOpen={isAddOrderFormOpen} 
        onClose={() => setIsAddOrderFormOpen(false)}
        title="Nowe zlecenie serwisowe"
      >
        <form ref={formRef} onSubmit={handleAddOrder} className="flex flex-col gap-6 mt-2">
          <div className="flex flex-col gap-6 pb-6 border-b border-gray-100">
            
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-800">
                  {isNewClient ? "Dane nowego klienta" : "Wybór klienta"}
                </h4>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newClientCheckbox"
                    checked={isNewClient}
                    onChange={(e) => {
                      setIsNewClient(e.target.checked);
                      if (e.target.checked) setIsNewBike(true); 
                    }}
                    className="w-4 h-4 text-[#009ceb] bg-white border-gray-300 rounded focus:ring-[#009ceb] cursor-pointer"
                  />
                  <label htmlFor="newClientCheckbox" className="text-sm font-medium text-gray-700 cursor-pointer">
                    Nowy klient
                  </label>
                </div>
              </div>

              {!isNewClient ? (
                <Select
                  name="customer"
                  label="Klient z bazy"
                  options={clientOptions}
                  placeholder="Wybierz klienta..."
                  required={!isNewClient} 
                  onChange={(e) => setSelectedClientId(e.target.value)}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Input name="fullName" label="Imię i nazwisko" placeholder="np. Jan Kowalski" required={true} />
                  <Input name="phone" label="Numer telefonu" type="tel" placeholder="np. +48 222 222 222" required={true} />
                  <div className="lg:col-span-2">
                    <Input name="email" label="Adres e-mail" type="email" placeholder="np. jan.kowalski@email.com" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-semibold text-gray-800">
                  {(isNewClient || isNewBike) ? "Rejestracja nowego roweru" : "Wybór przypisanego roweru"}
                </h4>
                
                {!isNewClient && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="newBikeCheckbox"
                      checked={isNewBike}
                      onChange={(e) => setIsNewBike(e.target.checked)}
                      className="w-4 h-4 text-[#009ceb] bg-white border-gray-300 rounded focus:ring-[#009ceb] cursor-pointer"
                    />
                    <label htmlFor="newBikeCheckbox" className="text-sm font-medium text-gray-700 cursor-pointer">
                      Nowy rower
                    </label>
                  </div>
                )}
              </div>

              {(!isNewClient && !isNewBike) ? (
                <Select
                  name="bike"
                  label="Rower przypisany do klienta"
                  options={bikeOptions}
                  placeholder="Wybierz rower..."
                  required={(!isNewClient && !isNewBike)}
                  disabled={!selectedClientId || bikeOptions.length === 0}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Input name="brand" label="Producent" placeholder="np. Trek" required={true} />
                  <Input name="model" label="Model" placeholder="np. Domane SL5" required={true} />
                  <Select
                    name="bike_type"
                    label="Typ roweru"
                    required={true}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
            <Input
              name="accepted_at"
              label="Data przyjęcia"
              type="date"
              defaultValue={todayDate}
              disabled={true} 
            />
            
            <Input
              name="estimated_cost"
              label="Szacowana wartość (zł)"
              type="number"
              placeholder="np. 150"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-sm font-medium text-gray-700 mb-1">
              Opis usterki / zakres prac <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] min-h-[120px] resize-y"
              placeholder="Dokładny opis tego, co należy wykonać..."
              required={true}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                formRef.current?.reset();
                setIsAddOrderFormOpen(false);
                setIsNewClient(false);
                setIsNewBike(false);
              }}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Zapisywanie..." : "Utwórz zlecenie"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}