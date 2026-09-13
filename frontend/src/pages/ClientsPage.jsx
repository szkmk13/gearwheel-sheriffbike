import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchClients, createClient } from "../api/clients";
import Button from "../components/Button";
import SearchInput from "../components/SearchInput";
import ClientCard from "../components/ClientCard";
import SlidePanel from "../components/SlidePanel";
import Input from "../components/Input";
import StickyHeader from "../components/StickyHeader";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  // Stany wyszukiwania, filtrowania i sortowania
  const [searchQuery, setSearchQuery] = useState("");
  const [ordering, setOrdering] = useState("");
  const [openSortMenu, setOpenSortMenu] = useState(false);

  const formRef = useRef(null);
  const queryClient = useQueryClient();

  // Pobieranie klientów z uwzględnieniem wyszukiwania oraz sortowania
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['clients', searchQuery, ordering], 
    queryFn: () => fetchClients({ search: searchQuery, ordering: ordering || undefined }),
  });
  const clientsList = data?.results || [];

  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      formRef.current?.reset();
      setIsAddFormOpen(false);
      toast.success("Dodano nowego klienta!");
    },
    onError: (error) => {
      toast.error(`Wystąpił błąd: ${error.message}`);
    }
  });

  const handleAddClient = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const fullName = formData.get('fullName').trim();
    const nameParts = fullName.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';
    const rodoAccepted = formData.get('rodo_accepted') === 'on';

    const newClient = {
      first_name: firstName,
      last_name: lastName,
      email: formData.get('email') || "",
      phone: formData.get('phone'),
      notes: formData.get('notes') || "",
      rodo_accepted: rodoAccepted
    };

    mutation.mutate(newClient);
  };

  if (isLoading) return <div className="p-8 text-[var(--color-ink-3)] font-medium bg-[var(--color-paper)] min-h-full">Ładowanie danych z serwera...</div>;
  if (isError) return <div className="p-8 text-[var(--color-accent)] font-medium bg-[var(--color-paper)] min-h-full">Wystąpił błąd: {error.message}</div>;

  return (
    <div className="px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Baza klientów</h1>
          <Button onClick={() => setIsAddFormOpen(true)}>+ Dodaj klienta</Button>  
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <SearchInput 
              placeholder="Szukaj po imieniu, nazwisku, e-mailu lub telefonie..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="relative">
            <button
              onClick={() => setOpenSortMenu(!openSortMenu)}
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
                <button onClick={() => { setOrdering("last_name"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === 'last_name' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Nazwisko (A-Z)</button>
                <button onClick={() => { setOrdering("-last_name"); setOpenSortMenu(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[var(--color-paper)] ${ordering === '-last_name' ? 'font-semibold text-[var(--color-accent)]' : 'text-[var(--color-ink-2)]'}`}>Nazwisko (Z-A)</button>
              </div>
            )}
          </div>
        </div>
      </StickyHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clientsList.length > 0 ? (
          clientsList.map(client => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onClick={() => navigate(`/panel/clients/${client.id}`)}
            />
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-[var(--color-ink-3)] bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm">
            Brak klientów spełniających kryteria wyszukiwania.
          </div>
        )}
      </div>
      
      {/* Formularz dodawania klienta */}
      <SlidePanel
        isOpen={isAddFormOpen}
        onClose={() => setIsAddFormOpen(false)}
      >
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-[var(--color-ink)] px-1">Nowy klient</h2>

          <form ref={formRef} onSubmit={handleAddClient} className="flex flex-col gap-6">
            <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Dane kontaktowe</h3>

              <Input
                name="fullName"
                label="Imię i nazwisko"
                placeholder="np. Jan Kowalski"
                required={true}
              />

              <Input
                name="email"
                label="Adres e-mail"
                type="email"
                placeholder="np. jan.kowalski@email.com"
              />

              <Input
                name="phone"
                label="Numer telefonu"
                type="tel"
                placeholder="np. +48 222 222 222"
                required={true}
              />

              <div className="flex items-center gap-2 pt-4 mt-2 border-t border-[var(--color-line)]">
                <input 
                  type="checkbox" 
                  id="client_rodo_accepted" 
                  name="rodo_accepted" 
                  required={true}
                  className="w-4 h-4 text-[var(--color-accent)] bg-[var(--color-paper-2)] border-[var(--color-line)] rounded focus:ring-[var(--color-accent)] cursor-pointer"
                />
                <label htmlFor="client_rodo_accepted" className="text-sm font-medium text-[var(--color-ink-2)] cursor-pointer">
                  Klient wyraził zgodę na przetwarzanie danych osobowych (RODO) <span className="text-[var(--color-accent)]">*</span>
                </label>
              </div>
            </div>

            <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6">
              <div className="flex justify-between items-center mb-3 pb-2">
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">
                  Notatki
                </h3>
              </div>
              
              <textarea 
                name="notes"
                className="w-full mt-2 p-3 border border-[var(--color-line)] rounded-lg text-sm bg-[var(--color-paper-2)] placeholder-[var(--color-ink-3)] text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/50 focus:border-[var(--color-accent)] min-h-[120px] resize-y"
                placeholder="Dodatkowe informacje o kliencie"
              ></textarea>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[var(--color-line)]">
              <button
                type="button"
                onClick={() => {
                  formRef.current?.reset();
                  setIsAddFormOpen(false);
                }}
                className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
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