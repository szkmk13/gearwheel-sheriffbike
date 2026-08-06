import { useState } from "react";
import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import StatusBadge from "../components/StatusBadge";
import SlidePanel from "../components/SlidePanel";
import StickyHeader from "../components/StickyHeader";
import Modal from "../components/Modal";
import Input from "../components/Input";
import Select from "../components/Select";
import { mockClients, mockBikes } from "./ClientsPage";

const mockOrders = [
  { id: "#2024-001", client: "****", bike: "Giant TCR Advanced", status: "W trakcie", date: "2024-05-08", price: "250 zł" },
  { id: "#2024-002", client: "****", bike: "Trek Domane SL5", status: "Gotowe", date: "2024-05-08", price: "180 zł" },
  { id: "#2024-003", client: "****", bike: "Specialized Rockhopper", status: "W trakcie", date: "2024-05-07", price: "320 zł" },
  { id: "#2024-004", client: "****", bike: "Canyon Endurace CF", status: "Gotowe", date: "2024-05-07", price: "150 zł" },
  { id: "#2024-005", client: "****", bike: "Scott Spark 900", status: "W trakcie", date: "2024-05-06", price: "420 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
  { id: "#2024-006", client: "****", bike: "BMC Teammachine", status: "Odebrane", date: "2024-05-05", price: "200 zł" },
];



export default function OrdersPage() {

  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isAddOrderFormOpen, setIsAddOrderFormOpen] = useState(false);
  const [isNewClient, setIsNewClient] = useState(false);
  const [isNewBike, setIsNewBike] = useState(false);

  const todayDate = new Date().toISOString().split('T')[0];
  const clientOptions = mockClients.map(client => ({
    value: client.id,
    label: client.name
  }));
  const bikeOptions = mockBikes.map(bike => ({
    value: bike.id,
    label: `${bike.manufacturer} ${bike.model}`
  }));

  const handleAddOrder = (e) => {
    e.preventDefault();
    console.log("Zapisywanie zlecenia...");
    setIsAddOrderFormOpen(false);
    setIsNewClient(false);
    setIsNewBike(false);
  };

  return (
    <div className="px-8 pb-8 relative">

      <StickyHeader>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Zlecenia serwisowe</h1>
          <Button onClick={() => setIsAddOrderFormOpen(true)}>+ Przymij rower</Button>
        </div>

        <div className="flex gap-4">
          <div className="flex-1"> <SearchInput placeholder="Szukaj po kliencie, numerze zlecenia..."/> </div>
          <div>
            <select className="h-[46px] border border-gray-200 rounded-lg px-4 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#009ceb] shadow-sm">
              <option>Wszystkie</option>
              <option>W trakcie</option>
              <option>Gotowe</option>
              <option>Odebrane</option>
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
            {mockOrders.map((order, index) => (
              <tr 
                key={order.id} 
                onClick={() => setSelectedOrder(order)} 
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${index === mockOrders.length - 1 ? 'border-b-0' : '' }`}
              >
                <td className="py-4 px-6 font-medium text-gray-600">{order.id}</td>
                <td className="py-4 px-6">{order.client}</td>
                <td className="py-4 px-6 text-gray-600">{order.bike}</td>
                <td className="py-4 px-6"> <StatusBadge status={order.status}/> </td>
                <td className="py-4 px-6 text-gray-500">{order.date}</td>
                <td className="py-4 px-6 font-medium">{order.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/*Podgląd zlecenia*/}
      <SlidePanel
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      >
        {selectedOrder && (
          <div className="space-y-6">

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800"> {selectedOrder.id} </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Klient: <span className="font-medium text-gray-700"> {selectedOrder.client} </span>
                  </p>
                </div>
                <StatusBadge status={selectedOrder.status} />
              </div>
            </div>

            <div className="flex justify-between py-6 gap-4 mt-6 pt-6 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">Rower</p>
                <p className="font-medium text-gray-800"> {selectedOrder.bike} </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Data przyjęcia</p>
                <p className="font-medium text-gray-800"> {selectedOrder.date} </p>
              </div>

              <div>
                <p className="text-xs text-gray-500 mb-1">Wartość</p>
                <p className="font-medium text-gray-800"> {selectedOrder.price} </p>
              </div>
            </div>

            <div className="bg-white border border-gray-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-3 pb-2 border-b-4 border-black">
                <h3 className="text-lg font-semibold text-gray-800">Zakres prac</h3>
              </div>
              <p className="text-sm text-gray-600 min-h-[60px]">
                W trakcie budowy...
              </p>
            </div>

            <div className="bg-gray-300 rounded text-gray-600 font-medium p-3 text-sm">Lista użytych części (w budowie)</div>

          </div>
        )}

      </SlidePanel>

      {/*Formularz dodania zlecenia*/}
      <Modal 
        isOpen={isAddOrderFormOpen} 
        onClose={() => setIsAddOrderFormOpen(false)}
        title="Nowe zlecenie serwisowe"
      >
        <form onSubmit={handleAddOrder} className="flex flex-col gap-6 mt-2">
          
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
                      if (e.target.checked) setIsNewBike(false); 
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
                  label="Klient"
                  options={clientOptions}
                  placeholder="Wybierz klienta z bazy..."
                  required={!isNewClient} 
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Input label="Imię i nazwisko" placeholder="np. Jan Kowalski" required={true} />
                  <Input label="Numer telefonu" type="tel" placeholder="np. +48 222 222 222" required={true} />
                  <div className="lg:col-span-2">
                    <Input label="Adres e-mail" type="email" placeholder="np. jan.kowalski@email.com" />
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
                  label="Rower"
                  options={bikeOptions}
                  placeholder="Wybierz przypisany rower..."
                  required={(!isNewClient && !isNewBike)}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Input label="Producent" placeholder="np. Trek, Giant" required={true} />
                  <Input label="Model" placeholder="np. Domane SL5" required={true} />
                  <Input label="Typ" placeholder="np. Szosowy, MTB" required={true} />
                </div>
              )}
            </div>

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-4">
            <Input
              label="Data przyjęcia"
              type="date"
              defaultValue={todayDate}
              required={true}
            />
            
            <Input
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
              className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] min-h-[120px] resize-y"
              placeholder="Dokładny opis tego, co należy wykonać..."
              required={true}
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddOrderFormOpen(false)}
              className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <Button type="submit">Utwórz zlecenie</Button>
          </div>

        </form>
      </Modal>
    
    </div>
  );
}