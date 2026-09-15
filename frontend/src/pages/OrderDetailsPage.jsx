import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { fetchOrderDetails, updateOrder } from "../api/orders";

import StatusBadge from "../components/StatusBadge";

export default function OrderDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: order, isLoading, isError, error } = useQuery({
        queryKey: ['order', id],
        queryFn: () => fetchOrderDetails(id),
    });

    const statusMutation = useMutation({
        mutationFn: updateOrder,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['order', id] });
            queryClient.invalidateQueries({ queryKey: ['orders'] });
            toast.success("Status zlecenia został zaktualizowany!"); 
        },
        onError: (error) => toast.error(`Błąd aktualizacji statusu: ${error.message}`) 
    });

    const handleStatusChange = (e) => {
        const newStatus = e.target.value;
        statusMutation.mutate({ id, orderData: { status: newStatus } });
    };

    if (isLoading) return <div className="p-8 text-[var(--color-ink-3)] font-medium bg-[var(--color-paper)] min-h-full">Ładowanie szczegółów zlecenia...</div>;
    if (isError) return <div className="p-8 text-[var(--color-accent)] font-medium bg-[var(--color-paper)] min-h-full">Wystąpił błąd: {error.message}</div>;
    if (!order) return <div className="p-8 text-[var(--color-accent)] font-medium bg-[var(--color-paper)] min-h-full">Nie znaleziono zlecenia.</div>;

    return (
        <div className="p-8 bg-[var(--color-paper)] min-h-full">
            <div className="flex items-center mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center p-2 border border-transparent hover:border-[var(--color-line)] hover:bg-[var(--color-paper-3)] rounded-full transition-colors cursor-pointer mr-2"
                >
                    <svg className="w-6 h-6 text-[var(--color-ink)] mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    <span className="text-[var(--color-ink-2)] font-medium cursor-pointer hover:text-[var(--color-ink)] transition-colors">
                        Powrót
                    </span>
                </button>
            </div>

            <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <h1 className="text-3xl font-bold text-[var(--color-ink)]">Zlecenie #{order.id}</h1>
                        <StatusBadge status={order.status} />
                    </div>
                    <p className="text-[var(--color-ink-3)]">
                        Przyjęto: <span className="font-medium text-[var(--color-ink-2)]">{new Date(order.created_at).toLocaleDateString()}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-[var(--color-ink-2)] font-medium">Zmień status:</span>
                    <select 
                        className="border border-[var(--color-line)] rounded-md px-3 py-2 text-sm bg-[var(--color-paper-2)] text-[var(--color-ink)] focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
                        value={order.status}
                        onChange={handleStatusChange}
                        disabled={statusMutation.isPending}
                    >
                        <option value="accepted">Zaakceptowane</option>
                        <option value="diagnosing">Diagnoza</option>
                        <option value="waiting_parts">Czeka na części</option>
                        <option value="in_progress">W trakcie</option>
                        <option value="done">Gotowe</option>
                        <option value="delivered">Odebrane</option>
                        <option value="cancelled">Anulowane</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 flex flex-col sm:flex-row gap-8">
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[var(--color-ink-3)] uppercase tracking-wider mb-3">Klient</h3>
                            
                            {/* Odnośnik do profilu klienta */}
                            {order.customer?.id ? (
                                <button
                                    onClick={() => navigate(`/panel/clients/${order.customer.id}`)}
                                    className="text-lg font-medium text-[var(--color-accent)] hover:underline text-left cursor-pointer transition-colors block mb-1"
                                >
                                    {order.customer.first_name} {order.customer.last_name}
                                </button>
                            ) : (
                                <p className="text-lg font-medium text-[var(--color-ink)]">
                                    {order.customer?.first_name} {order.customer?.last_name}
                                </p>
                            )}
                            
                            <div className="mt-2 text-sm text-[var(--color-ink-2)] space-y-1">
                                <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                                    {order.customer?.phone || 'Brak telefonu'}
                                </p>
                                <p className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[var(--color-ink-3)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                                    {order.customer?.email || 'Brak e-maila'}
                                </p>
                            </div>
                        </div>

                        <div className="w-px bg-[var(--color-line)] hidden sm:block"></div>

                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-[var(--color-ink-3)] uppercase tracking-wider mb-3">Rower i zawieszka</h3>
                            <p className="text-lg font-medium text-[var(--color-ink)]">
                                {order.bike?.brand} {order.bike?.model}
                            </p>
                            <div className="mt-3 inline-block px-3 py-1 bg-[var(--color-paper)] rounded text-sm font-semibold text-[var(--color-ink-2)] border border-[var(--color-line)]">
                                Zawieszka: #{order.bike_tag_number || '-'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-3">Opis usterki / Wymagane prace</h3>
                        <div className="p-4 bg-[var(--color-paper)] rounded-lg border border-[var(--color-line)] text-[var(--color-ink-2)] whitespace-pre-wrap">
                            {order.description}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-[var(--color-ink)] mb-4">Podsumowanie kosztów</h3>
                        
                        <div className="flex justify-between items-center mb-2 pb-2 border-b border-[var(--color-line)] text-sm">
                            <span className="text-[var(--color-ink-3)]">Szacowany koszt:</span>
                            <span className="font-medium text-[var(--color-ink-2)]">{order.estimated_cost ? `${order.estimated_cost} zł` : '-'}</span>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4 pt-2 text-lg">
                            <span className="font-bold text-[var(--color-ink)]">Do zapłaty:</span>
                            <span className="font-bold text-[var(--color-accent)]">{order.final_cost ? `${order.final_cost} zł` : '0 zł'}</span>
                        </div>
                    </div>

                    <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-lg p-6 opacity-70">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-[var(--color-ink)]">Części i usługi</h3>
                            <span className="text-xs font-bold bg-yellow-100 text-yellow-800 px-2 py-1 rounded">W BUDOWIE</span>
                        </div>
                        <p className="text-sm text-[var(--color-ink-3)] text-center py-8">
                            Moduł dodawania części i robocizny zostanie wdrożony w kolejnym etapie.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}