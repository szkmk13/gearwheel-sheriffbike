import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import SlidePanel from "../components/SlidePanel";
import Input from "../components/Input";
import { getInitials } from "../components/ClientCard";
import { mockClients } from "./ClientsPage";
import { mockBikes } from "./ClientsPage";

const EditIcon = () => (
  <button className="text-gray-400 hover:text-gray-700 transition-colors">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  </button>
);

export default function ClientDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isAddBikeFormOpen, setIsAddBikeFormOpen] = useState(false);

    const handleEditClient = (e) => {
        e.preventDefault();
        console.log("Miejsce na przesłanie klienta do bazy");
        setIsEditFormOpen(false); 
    };
    const handleAddBike = (e) => {
        e.preventDefault();
        console.log("Rower przypisany do klienta ID:", client.id);
        setIsAddBikeFormOpen(false);
    };

    const client = mockClients.find(c => c.id === parseInt(id));
    const clientBikes = mockBikes.filter(bike => bike.clientId === client.id);

    if (!client) {
        return <div className="p-8 text-red-500">Nie znaleziono klienta.</div>;
    }

    return(
        <div className="p-8">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/panel/clients')}
                    className="flex items-center p-2 border border-transparent hover:border-gray-200 hover:bg-gray-200 rounded-full transition-colors cursor-pointer mr-2"
                >
                    <svg className="w-6 h-6 text-gray-800 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span 
                        onClick={() => navigate('/panel/clients')} 
                        className="text-gray-700 font-medium cursor-pointer hover:text-gray-900 transition-colors"
                    >
                        Wróć do klientów
                    </span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-2xl shrink-0">
                        {getInitials(client.name)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{client.name}</h1>
                        <p className="text-gray-500 mt-1">{client.email} • {client.phone}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setIsEditFormOpen(true)} 
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <EditIcon /> Edytuj profil
                    </button>

                    <Button onClick={() => setIsAddBikeFormOpen(true)}>
                        + Dodaj rower
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-6">
                    {client.notes && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Notatki</h3>
                            <p className="text-sm text-gray-600">{client.notes}</p>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Zarejestrowane rowery</h3>
                        {clientBikes.length > 0 ? (
                        <div className="space-y-3">
                            {clientBikes.map(bike => (
                            <div key={bike.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                                <div>
                                <p className="font-semibold text-gray-800">{bike.manufacturer} <span className="font-normal text-gray-600">{bike.model}</span></p>
                                <p className="text-xs text-gray-500 mt-1">{bike.type}</p>
                                </div>
                            </div>
                            ))}
                        </div>
                        ) : (
                        <p className="text-sm text-gray-500">Brak rowerów w bazie.</p>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Historia zleceń</h3>
                        <div className="bg-gray-100 rounded text-gray-500 text-sm p-4 text-center">
                            Tu wstawimy historię zamówień klienta
                        </div>
                    </div>
                </div>
            </div>
        
            {/*Formularz edycji klienta*/}
            <SlidePanel
                isOpen={isEditFormOpen}
                onClose={() => setIsEditFormOpen(false)}
            >
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 px-1">
                        Edytuj dane
                    </h2>
                    
                    <form 
                        onSubmit={handleEditClient} 
                        className="flex flex-col gap-6"
                    >
                        <div className="bg-white border border-gray-200 rounded-lg 
                                        p-6 flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">
                            Dane kontaktowe
                        </h3>

                        <Input
                            label="Imię i nazwisko"
                            defaultValue={client.name}
                            required={true}
                        />

                        <Input
                            label="Adres e-mail"
                            type="email"
                            defaultValue={client.email}
                        />

                        <Input
                            label="Numer telefonu"
                            type="tel"
                            defaultValue={client.phone}
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
                            defaultValue={client.notes}
                            className="w-full mt-2 p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 
                                    focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] min-h-[120px] resize-y"
                            placeholder="Dodatkowe informacje o kliencie..."
                        ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsEditFormOpen(false)}
                            className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        >Anuluj</button>

                        <Button type="submit">Zapisz zmiany</Button>
                        </div>
                    </form>
                </div>
            </SlidePanel>
            

            {/* Formularz dodania roweru */}
            <SlidePanel 
                isOpen={isAddBikeFormOpen}
                onClose={() => setIsAddBikeFormOpen(false)}
            >
                <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-gray-900 px-1">Nowy rower</h2>

                    <form onSubmit={handleAddBike} className="flex flex-col gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Dane roweru</h3>

                        <div className="mb-2">
                            <p className="text-sm font-medium text-gray-700">Właściciel</p>
                            <p className="text-sm text-gray-900 mt-1 font-semibold">{client.name}</p>
                        </div>

                        <Input
                        label="Producent"
                        placeholder="np. Trek, Giant, Kross"
                        required={true}
                        />
                        <Input
                        label="Model"
                        placeholder="np. Domane SL5"
                        required={true}
                        />
                        <Input
                        label="Typ"
                        placeholder="np. Szosowy, MTB, Gravel"
                        required={true}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                        type="button"
                        onClick={() => setIsAddBikeFormOpen(false)}
                        className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transiton-colors"
                        >Anuluj</button>

                        <Button type="submit">Zapisz rower</Button>

                    </div>
                    </form>
                </div>
            </SlidePanel>
        </div>

    )
}