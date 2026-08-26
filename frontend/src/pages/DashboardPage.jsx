import { useQuery } from '@tanstack/react-query';
import { fetchOrders } from '../api/orders';
import StickyHeader from '../components/StickyHeader';
import StatusBadge from '../components/StatusBadge';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
    const navigate = useNavigate();
    
    const { data: ordersData, isLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => fetchOrders(),
    });

    const ordersList = ordersData?.results || [];

    // Statystyki
    const totalOrders = ordersList.length;
    const acceptedOrders = ordersList.filter(o => o.status === 'accepted').length;
    const inProgressOrders = ordersList.filter(o => o.status === 'in_progress').length;
    const doneOrders = ordersList.filter(o => o.status === 'done').length;

    // Szacowany przychód ze wszystkich aktywnych/ukończonych zleceń
    const totalEstimatedRevenue = ordersList.reduce((acc, order) => {
        return acc + (parseFloat(order.final_cost) || parseFloat(order.estimated_cost) || 0);
    }, 0);

    if (isLoading) return <div className="p-8 text-gray-500 font-medium">Ładowanie statystyk dashboardu...</div>;

    return (
        <div className="px-8 pb-8 relative">
            <StickyHeader>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard warsztatu</h1>
                <p className="text-sm text-gray-500 mt-1">Podsumowanie bieżących prac i statystyk serwisu</p>
            </StickyHeader>

            {/* Widżety główne */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                {/* Widżet 1: Wszystkie zlecenia */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Wszystkie zlecenia</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrders}</p>
                    <span className="text-xs text-gray-400 mt-1 block">W bazie warsztatu</span>
                </div>

                {/* Widżet 2: Zaakceptowane / Do zrobienia */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Przyjęte / Zaakceptowane</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">{acceptedOrders}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Oczekują na diagnozę/naprawę</span>
                </div>

                {/* Widżet 3: W trakcie */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">W trakcie naprawy</p>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{inProgressOrders}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Aktywne prace serwisowe</span>
                </div>

                {/* Widżet 4: Potencjalny przychód */}
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Szacowany przychód</p>
                    <p className="text-3xl font-bold text-[var(--color-accent)] mt-2">{totalEstimatedRevenue} zł</p>
                    <span className="text-xs text-gray-400 mt-1 block">Łączna wartość zleceń</span>
                </div>
            </div>

            {/* Sekcja dolna: Ostatnie zlecenia / Statusy */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-semibold text-gray-800">Ostatnie aktywne zlecenia</h3>
                    <button 
                        onClick={() => navigate('/panel/orders')}
                        className="text-sm font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                        Zobacz wszystkie →
                    </button>
                </div>

                {ordersList.length > 0 ? (
                    <div className="space-y-3">
                        {ordersList.slice(0, 5).map(order => (
                            <div 
                                key={order.id}
                                onClick={() => navigate(`/panel/orders/${order.id}`)}
                                className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800">
                                        #{order.id} <span className="text-gray-500 font-normal">({order.bike_label})</span>
                                    </p>
                                    <p className="text-xs text-gray-500 mt-0.5">Klient: {order.customer_name}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm font-medium">{order.estimated_cost ? `${order.estimated_cost} zł` : '-'}</span>
                                    <StatusBadge status={order.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500 py-4 text-center">Brak zleceń do wyświetlenia.</p>
                )}
            </div>
        </div>
    );
}