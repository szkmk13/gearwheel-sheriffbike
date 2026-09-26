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
import { ClientCardSkeleton } from "../components/Skeleton";

export default function ClientsPage() {
  const navigate = useNavigate();
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  
  // Stan przełącznika widoku: 'grid' (kafelki) lub 'table' (tabela)
  const [viewMode, setViewMode] = useState("grid");
  
  // Stany wyszukiwania i sortowania
  const [searchQuery, setSearchQuery] = useState("");
  const [ordering, setOrdering] = useState("");

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

  // Obsługa sortowania w nagłówkach tabeli (3 kliknięcia: rosnąco -> malejąco -> reset)
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
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Baza klientów</h1>
          <Button onClick={() => setIsAddFormOpen(true)} className="w-full sm:w-auto">
            + Dodaj klienta
          </Button>  
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <SearchInput 
              placeholder="Szukaj po imieniu, nazwisku, e-mailu lub telefonie..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Przełącznik widoku: Tabela / Kafelki */}
          <div className="flex items-center justify-end bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-1 shadow-sm shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "grid" 
                  ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs" 
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              }`}
              title="Widok kafelków"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              <span className="hidden sm:inline">Kafelki</span>
            </button>

            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                viewMode === "table" 
                  ? "bg-[var(--color-paper)] text-[var(--color-ink)] shadow-xs" 
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              }`}
              title="Widok tabeli"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
        </div>
      </StickyHeader>

      {/* Wyświetlanie błędów pobierania, jeśli występują */}
      {isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-[var(--color-accent)] font-medium">
          Wystąpił błąd podczas pobierania danych: {error.message}
        </div>
      )}

      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <ClientCardSkeleton key={i} />
            ))
          ) : clientsList.length > 0 ? (
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
      ) : (
        <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[var(--color-paper-2)] border-b border-solid border-[var(--color-line)] text-sm text-[var(--color-ink-2)]">
                <th className="py-4 px-6 font-medium">ID</th>
                
                {/* Sortowalna kolumna: Nazwisko */}
                <th 
                  onClick={() => handleSortClick('last_name')}
                  className="py-4 px-6 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Imię i nazwisko</span>
                    <span className="text-xs text-[var(--color-ink-3)]">
                      {ordering === 'last_name' ? '▲' : ordering === '-last_name' ? '▼' : '↕'}
                    </span>
                  </div>
                </th>

                <th className="py-4 px-6 font-medium">Telefon</th>
                <th className="py-4 px-6 font-medium">E-mail</th>
                <th className="py-4 px-6 font-medium">Rowery</th>
                <th className="py-4 px-6 font-medium">Zlecenia</th>

                {/* Sortowalna kolumna: Data utworzenia */}
                <th 
                  onClick={() => handleSortClick('created_at')}
                  className="py-4 px-6 font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Data dodania</span>
                    <span className="text-xs text-[var(--color-ink-3)]">
                      {ordering === 'created_at' ? '▲' : ordering === '-created_at' ? '▼' : '↕'}
                    </span>
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="text-sm text-[var(--color-ink)]">
              {isLoading ? (
                <tr>
                  <td colSpan="7" className="py-8 px-6 text-center text-[var(--color-ink-3)]">
                    Ładowanie listy klientów...
                  </td>
                </tr>
              ) : clientsList.length > 0 ? (
                clientsList.map((client, index) => (
                  <tr 
                    key={client.id} 
                    onClick={() => navigate(`/panel/clients/${client.id}`)}
                    className={`border-b border-[var(--color-line)] hover:bg-[var(--color-paper)] transition-colors cursor-pointer ${index === clientsList.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="py-4 px-6 font-medium text-[var(--color-ink-2)]">#{client.id}</td>
                    <td className="py-4 px-6 font-semibold text-[var(--color-ink)]">{client.first_name} {client.last_name}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-2)]">{client.phone}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-3)]">{client.email || '-'}</td>
                    <td className="py-4 px-6 font-medium">{client.bikes?.length || 0}</td>
                    <td className="py-4 px-6 font-medium">{client.repair_orders_count ?? 0}</td>
                    <td className="py-4 px-6 text-[var(--color-ink-3)]">{new Date(client.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="py-8 px-6 text-center text-[var(--color-ink-3)]">
                    Brak klientów spełniających kryteria wyszukiwania.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      
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