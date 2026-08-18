import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOrderDetails, updateOrder } from "../api/orders";

import StatusBadge from "../components/StatusBadge";
import Button from "../components/Button";

export default function OrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Pobieranie szczegółów zlecenia z serwera
    const { data: order, isLoading, isError, error } = useQuery({
        queryKey: ['order', id],
        queryFn: () => fetchOrderDetails(id),
    });

    // Mutacja do natychmiastowej aktualizacji statusu
    const statusMutation = useMutation({
        mutationFn: updateOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
        },
        onError: (error) => alert(`Błąd aktualizacji statusu: ${error.message}`)
    });

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        statusMutation.mutate({ id, orderData: { status: newStatus } });
    };

    if (isLoading) return <div className="p-8 text-gray-500 font-medium">Ładowanie szczegółów zlecenia...</div>;
    if (isError) return <div className="p-8 text-red-500 font-medium">Wystąpił błąd: {error.message}</div>;
    if (!order) return <div className="p-8 text-red-500 font-medium">Nie znaleziono zlecenia.</div>;

    return (
        <div className="p-8">
            {/* Nawigacja powrotna */}
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate('/panel/orders')}
                    className="flex items-center p-2 border border-transparent hover:border-gray-200 hover:bg-gray-200 rounded-full transition-colors cursor-pointer mr-2"
                >
                    <svg className="w-6 h-6 text-gray-800 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-gray-700 font-medium hover:text-gray-900 transition-colors">
                        Wróć do zleceń
                    </span>
                </button>
            </div>

            {/* Główny nagłówek zlecenia */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold text-gray-900">Zlecenie #{order.id}</h1>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="text-gray-500">
                        Przyjęto: <span className="font-medium text-gray-700">{new Date(order.created_at).toLocaleDateString()}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 font-medium">Zmień status:</span>
                    <select 
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:ring-[#009ceb] focus:border-[#009ceb]"
                        value={order.status}
                        onChange={handleStatusChange}
                        disabled={statusMutation.isPending}
                    >
                        <option value="in_progress">W trakcie</option>
                        <option value="done">Gotowe do odbioru</option>
                        <option value="delivered">Odebrane (Zakończone)</option>
                    </select>
                </div>
            </div>

            {/* Główne informacje */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lewa i Środkowa kolumna (Dane) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col sm:flex-row gap-8">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Klient</h3>
                            <p className="text-lg font-medium text-gray-900">{order.customer_name}</p>
                            <Button className="mt-3 !px-3 !py-1.5 text-xs" onClick={() => navigate(`/panel/clients/${order.customer}`)}>
                                Zobacz profil klienta
                            </Button>
                        </div>
                        <div className="w-px bg-gray-200 hidden sm:block"></div>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Rower i zawieszka</h3>
                            <p className="text-lg font-medium text-gray-900">{order.bike_label}</p>
                            <div className="mt-2 inline-block px-3 py-1 bg-gray-100 rounded text-sm font-semibold text-gray-700 border border-gray-200">
                                Zawieszka: {order.bike_tag_number || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Opis usterki / Wymagane prace</h3>
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 text-gray-700 whitespace-pre-wrap">
                            {order.description}
                        </div>
                    </div>
                </div>

                {/* Prawa kolumna (Moduł Kosztów i Części - W BUDOWIE) */}
                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Podsumowanie kosztów</h3>
                        
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100 text-sm">
                            <span className="text-gray-500">Szacowany koszt:</span>
                            <span className="font-medium text-gray-700">{order.estimated_cost ? `${order.estimated_cost} zł` : '-'}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-2 text-lg">
                            <span className="font-bold text-gray-900">Do zapłaty:</span>
                            <span className="font-bold text-[#009ceb]">{order.final_cost ? `${order.final_cost} zł` : '0 zł'}</span>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6 opacity-70">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">Części i usługi</h3>
                            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">W BUDOWIE</span>
                        </div>
                        <p className="text-sm text-gray-500 text-center py-8">
                            Moduł dodawania części i robocizny zostanie wdrożony w kolejnym etapie.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}