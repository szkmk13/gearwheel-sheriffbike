import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchClientDetails, updateClient, createBike } from "../api/clients";

import Button from "../components/Button";
import SlidePanel from "../components/SlidePanel";
import Input from "../components/Input";
import Select from "../components/Select";
import { getInitials } from "../components/ClientCard";
import StatusBadge from "../components/StatusBadge"; 

const EditIcon = () => (
  <div className="text-gray-400 transition-colors">
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
  </div>
);

export default function ClientDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [isEditFormOpen, setIsEditFormOpen] = useState(false);
    const [isAddBikeFormOpen, setIsAddBikeFormOpen] = useState(false);

    const editFormRef = useRef(null);
    const bikeFormRef = useRef(null);

    const { data: client, isLoading, isError, error } = useQuery({
        queryKey: ['client', id],
        queryFn: () => fetchClientDetails(id),
    });

    const editMutation = useMutation({
        mutationFn: updateClient,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', id] });
            queryClient.invalidateQueries({ queryKey: ['clients'] }); 
            editFormRef.current?.reset();
            setIsEditFormOpen(false);
            toast.success("Dane klienta zostały zaktualizowane!");
        },
        onError: (error) => toast.error(`Wystąpił błąd edycji: ${error.message}`)
    });

    const bikeMutation = useMutation({
        mutationFn: createBike,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['client', id] }); 
            bikeFormRef.current?.reset();
            setIsAddBikeFormOpen(false);
            toast.success("Rower został pomyślnie dodany!");
        },
        onError: (error) => toast.error(`Wystąpił błąd zapisu roweru: ${error.message}`)
    });

    const handleEditClient = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const fullName = formData.get('fullName').trim();
        const nameParts = fullName.split(' ');

        const updatedData = {
            first_name: nameParts[0],
            last_name: nameParts.slice(1).join(' ') || '-',
            email: formData.get('email') || "",
            phone: formData.get('phone'),
            notes: formData.get('notes') || ""
        };

        editMutation.mutate({ id, clientData: updatedData });
    };

    const handleAddBike = (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newBikeData = {
            customer: parseInt(id),
            brand: formData.get('brand'),
            model: formData.get('model'),
            bike_type: formData.get('bike_type')
        };

        bikeMutation.mutate(newBikeData);
    };

    if (isLoading) return <div className="p-8 text-gray-500 font-medium">Ładowanie szczegółów klienta...</div>;
    if (isError) return <div className="p-8 text-red-500 font-medium">Wystąpił błąd: {error.message}</div>;
    if (!client) return <div className="p-8 text-red-500 font-medium">Nie znaleziono klienta.</div>;

    const fullName = `${client.first_name} ${client.last_name}`.trim();
    const clientBikes = client.bikes || [];
    const clientOrders = client.repair_orders || [];

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
                    <span className="text-gray-700 font-medium cursor-pointer hover:text-gray-900 transition-colors">
                        Wróć do klientów
                    </span>
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-2xl shrink-0">
                        {getInitials(fullName)}
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{fullName}</h1>
                        <p className="text-gray-500 mt-1">{client.email || 'Brak e-maila'} • {client.phone}</p>
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
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{client.notes}</p>
                        </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Zarejestrowane rowery</h3>
                        {clientBikes.length > 0 ? (
                        <div className="space-y-3">
                            {clientBikes.map(bike => (
                            <div key={bike.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        {bike.brand} <span className="font-normal text-gray-600">{bike.model}</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 capitalize">{bike.bike_type}</p>
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
                        {clientOrders.length > 0 ? (
                            <div className="space-y-3">
                                {clientOrders.map(order => (
                                    <div 
                                        key={order.id} 
                                        onClick={() => navigate(`/panel/orders/${order.id}`)}
                                        className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
                                    >
                                        <div>
                                            <p className="font-semibold text-gray-800">
                                                #{order.id} <span className="font-normal text-gray-600 ml-1">{order.bike_label}</span>
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {new Date(order.created_at).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <StatusBadge status={order.status} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-gray-100 rounded text-gray-500 text-sm p-4 text-center">
                                Brak zleceń serwisowych dla tego klienta.
                            </div>
                        )}
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
                        ref={editFormRef}
                        onSubmit={handleEditClient} 
                        className="flex flex-col gap-6"
                    >
                        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                Dane kontaktowe
                            </h3>

                            <Input
                                name="fullName"
                                label="Imię i nazwisko"
                                defaultValue={fullName}
                                required={true}
                            />

                            <Input
                                name="email"
                                label="Adres e-mail"
                                type="email"
                                defaultValue={client.email}
                            />

                            <Input
                                name="phone"
                                label="Numer telefonu"
                                type="tel"
                                defaultValue={client.phone}
                                required={true}
                            />
                        </div>

                        <div className="bg-white border border-gray-200 rounded-lg p-6">
                            <div className="flex justify-between items-center mb-3 pb-2">
                                <h3 className="text-lg font-semibold text-gray-800">Notatki</h3>
                            </div>
                            
                            <textarea 
                                name="notes"
                                defaultValue={client.notes}
                                className="w-full mt-2 p-3 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800 
                                        focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] min-h-[120px] resize-y"
                                placeholder="Dodatkowe informacje o kliencie..."
                            ></textarea>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    editFormRef.current?.reset();
                                    setIsEditFormOpen(false);
                                }}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            >Anuluj</button>

                            <Button type="submit" disabled={editMutation.isPending}>
                                {editMutation.isPending ? "Zapisywanie..." : "Zapisz zmiany"}
                            </Button>
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

                    <form ref={bikeFormRef} onSubmit={handleAddBike} className="flex flex-col gap-6">
                        <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col gap-4">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">Dane roweru</h3>

                            <div className="mb-2">
                                <p className="text-sm font-medium text-gray-700">Właściciel</p>
                                <p className="text-sm text-gray-900 mt-1 font-semibold">{fullName}</p>
                            </div>

                            <Input
                                name="brand"
                                label="Producent"
                                placeholder="np. Trek, Giant, Kross"
                                required={true}
                            />
                            <Input
                                name="model"
                                label="Model"
                                placeholder="np. Domane SL5"
                                required={true}
                            />
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
                        
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => {
                                    bikeFormRef.current?.reset();
                                    setIsAddBikeFormOpen(false);
                                }}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                            >Anuluj</button>

                            <Button type="submit" disabled={bikeMutation.isPending}>
                                {bikeMutation.isPending ? "Zapisywanie..." : "Zapisz rower"}
                            </Button>
                        </div>
                    </form>
                </div>
            </SlidePanel>
        </div>
    )
}