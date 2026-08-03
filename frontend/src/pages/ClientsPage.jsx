import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import ClientCard from "../components/ClientCard";
import SlidePanel from "../components/SlidePanel";
import Input from "../components/Input";
import StickyHeader from "../components/StickyHeader";

export const mockClients = [];

export const mockBikes = [];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);

  const handleAddClient = (e) => {
    e.preventDefault();
    console.log("Miejsce na przesłanie klienta do bazy");
    setIsAddFormOpen(false);
  };

  return (
    <div className="px-8 pb-8 relative">

      <StickyHeader>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Baza klientów</h1>
          <div className="flex gap-4">
            <Button onClick={() => setIsAddFormOpen(true)}>+ Dodaj klienta</Button>
          </div>  
        </div>

        <div className="w-full">
          <SearchInput placeholder="Szukaj klienta..." />
        </div>
      </StickyHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockClients.map(client => (
          <ClientCard 
            key={client.id} 
            client={client} 
            onClick={() => navigate(`/panel/clients/${client.id}`)}
          />
        ))}
      </div>
      
      {/*Formularz dodawania klienta*/}
      <SlidePanel
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 px-1">Nowy klient</h2>

          <form onSubmit={handleAddClient} className="flex flex-col gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Dane kontaktowe</h3>

              <Input
                label="Imie i nazwisko"
                placeholder="np. Jan Kowalski"
                required={true}
              />

              <Input
                label="Adres e-mail"
                type="email"
                placeholder="np. jan.kowalski@email.com"
              />

              <Input
                label="Numer telefonu"
                type="tel"
                placeholder="np. +48 222 222 222"
                required={true}
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-center mb-3 pb-2">
                <h3 className="text-lg font-semibold text-gray-800">
                  Notatki
                </h3>
              </div>
              
              <textarea 
                className="w-full mt-2 p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] min-h-[120px] resize-y"
                placeholder="Dodatkowe informacje o kliencie"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsAddFormOpen(false)}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Anuluj
              </button>

              <Button type='submit'>Zapisz klienta</Button>
            </div>
          </form>
        </div>
      </SlidePanel>
    </div>
  );
}