import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchOrders, fetchDashboardStats } from '../api/orders';
import StickyHeader from '../components/StickyHeader';
import StatusBadge from '../components/StatusBadge';

export default function DashboardPage() {
    const navigate = useNavigate();

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: () => fetchDashboardStats(),
    });

    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => fetchOrders(),
    });

    const ordersList = ordersData?.results || [];

    if (isStatsLoading || isOrdersLoading) {
        return <div className="p-8 text-gray-500 font-medium">Ładowanie statystyk dashboardu...</div>;
    }

    return (
        <div className="px-8 pb-8 relative bg-gray-50 min-h-full">
            <StickyHeader className="bg-gray-50">
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard warsztatu</h1>
                <p className="text-sm text-gray-500 mt-1">Podsumowanie bieżących prac i statystyk serwisu</p>
            </StickyHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Klienci w systemie</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats?.customers_count || 0}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Zarejestrowane bazy klientów</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Rowery w bazie</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats?.bikes_count || 0}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Przypisane do klientów</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Ukończone w tym tygodniu</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats?.orders_completed_this_week || 0}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Zamknięte i wydane</span>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <p className="text-sm font-medium text-gray-500">Przychód (ten tydzień)</p>
                    <p className="text-3xl font-bold text-[var(--color-accent)] mt-2">
                        {stats?.profit_this_week ? `${stats.profit_this_week} zł` : '0 zł'}
                    </p>
                    <span className="text-xs text-gray-400 mt-1 block">Suma zrealizowanych kosztów</span>
                </div>
            </div>

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