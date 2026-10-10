import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { fetchOrders, fetchDashboardStats, fetchOrdersCalendar } from '../api/orders';
import StickyHeader from '../components/StickyHeader';
import StatusBadge from '../components/StatusBadge';
import { DashboardSkeleton } from '../components/Skeleton';
import DayColumns from '../components/calendar/DayColumns';
import { OPEN_STATUSES, calendarQueryKey, groupByPickupDate } from '../components/calendar/calendarData';
import { addDays, parseISODate, toLocalISODate, todayISODate } from '../utils/dates';

// Pasek odbiorow: dzis w srodku, po 3 dni wstecz (zalegle) i do przodu.
const PICKUP_DAYS_AROUND_TODAY = 3;

export default function DashboardPage() {
    const navigate = useNavigate();

    const todayISO = todayISODate();
    const pickupDays = useMemo(() => {
        const today = parseISODate(todayISO);
        return Array.from(
            { length: 2 * PICKUP_DAYS_AROUND_TODAY + 1 },
            (_, i) => addDays(today, i - PICKUP_DAYS_AROUND_TODAY),
        );
    }, [todayISO]);
    const pickupStart = toLocalISODate(pickupDays[0]);
    const pickupEnd = toLocalISODate(pickupDays[pickupDays.length - 1]);

    const { data: pickupOrders = [], isLoading: isPickupsLoading, isError: isPickupsError } = useQuery({
        queryKey: calendarQueryKey(pickupStart, pickupEnd),
        queryFn: () => fetchOrdersCalendar({ start: pickupStart, end: pickupEnd, status: OPEN_STATUSES.join(',') }),
    });
    const pickupsByDay = useMemo(() => groupByPickupDate(pickupOrders), [pickupOrders]);

    const { data: stats, isLoading: isStatsLoading } = useQuery({
        queryKey: ['dashboardStats'],
        queryFn: () => fetchDashboardStats(),
    });

    const { data: ordersData, isLoading: isOrdersLoading } = useQuery({
        queryKey: ['orders'],
        queryFn: () => fetchOrders(),
    });

    const ordersList = ordersData?.results || [];

    if (isStatsLoading && isOrdersLoading) return <DashboardSkeleton />;

    return (
        <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
            <StickyHeader className="bg-[var(--color-paper)]">
                <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Dashboard warsztatu</h1>
                <p className="text-sm text-[var(--color-ink-3)] mt-1">Podsumowanie bieżących prac i statystyk serwisu</p>
            </StickyHeader>

            {/* Widżety statystyk */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-5 sm:p-6 shadow-sm">
                    <p className="text-sm font-medium text-[var(--color-ink-3)]">Klienci w systemie</p>
                    <p className="text-3xl font-bold text-[var(--color-ink)] mt-2">
                        {isStatsLoading ? '...' : (stats?.customers_count || 0)}
                    </p>
                    <span className="text-xs text-[var(--color-ink-3)] mt-1 block">Zarejestrowane bazy klientów</span>
                </div>

                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-5 sm:p-6 shadow-sm">
                    <p className="text-sm font-medium text-[var(--color-ink-3)]">Rowery w bazie</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                        {isStatsLoading ? '...' : (stats?.bikes_count || 0)}
                    </p>
                    <span className="text-xs text-[var(--color-ink-3)] mt-1 block">Przypisane do klientów</span>
                </div>

                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-5 sm:p-6 shadow-sm">
                    <p className="text-sm font-medium text-[var(--color-ink-3)]">Ukończone w tym tygodniu</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                        {isStatsLoading ? '...' : (stats?.orders_completed_this_week || 0)}
                    </p>
                    <span className="text-xs text-[var(--color-ink-3)] mt-1 block">Zamknięte i wydane</span>
                </div>

                <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-5 sm:p-6 shadow-sm">
                    <p className="text-sm font-medium text-[var(--color-ink-3)]">Przychód (ten tydzień)</p>
                    <p className="text-3xl font-bold text-[var(--color-accent)] mt-2">
                        {isStatsLoading ? '...' : (stats?.profit_this_week ? `${stats.profit_this_week} zł` : '0 zł')}
                    </p>
                    <span className="text-xs text-[var(--color-ink-3)] mt-1 block">Suma zrealizowanych kosztów</span>
                </div>
            </div>

            {/* Najbliższe odbiory: dziś +/- 3 dni */}
            <div className="mb-6 sm:mb-8">
                <div className="flex justify-between items-center mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--color-ink)]">Odbiory: najbliższe dni</h3>
                    <Link
                        to="/panel/calendar?view=week"
                        className="text-xs sm:text-sm font-medium text-[var(--color-accent)] hover:underline"
                    >
                        Otwórz kalendarz →
                    </Link>
                </div>
                {isPickupsError ? (
                    <p className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                        Nie udało się pobrać odbiorów.
                    </p>
                ) : (
                    // Bez dopisku "krócej" przy sobocie - to wiadomo na co dzień, zostaje sam kolor.
                    <DayColumns
                        hiddenBadges={['short']}
                        days={pickupDays}
                        ordersByDay={pickupsByDay}
                        isLoading={isPickupsLoading}
                        todayISO={todayISO}
                        onOpenDay={(day) => navigate(`/panel/calendar?view=day&date=${toLocalISODate(day)}`)}
                        columnClassName="md:min-h-[11rem]"
                    />
                )}
            </div>

            {/* Ostatnie aktywne zlecenia */}
            <div className="bg-[var(--color-paper-2)] border border-[var(--color-line)] rounded-xl p-4 sm:p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-base sm:text-lg font-semibold text-[var(--color-ink)]">Ostatnie aktywne zlecenia</h3>
                    <button 
                        onClick={() => navigate('/panel/orders')}
                        className="text-xs sm:text-sm font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
                    >
                        Zobacz wszystkie →
                    </button>
                </div>

                {isOrdersLoading ? (
                    <p className="text-sm text-[var(--color-ink-3)] py-8 text-center">Ładowanie zleceń...</p>
                ) : ordersList.length > 0 ? (
                    <div className="space-y-3">
                        {ordersList.slice(0, 5).map(order => (
                            <div 
                                key={order.id}
                                onClick={() => navigate(`/panel/orders/${order.id}`)}
                                className="p-3.5 sm:p-4 border border-[var(--color-line)] rounded-lg bg-[var(--color-paper)] flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-4 hover:bg-[var(--color-paper-3)] transition-colors cursor-pointer"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-[var(--color-ink)] text-sm sm:text-base truncate">
                                        #{order.id} <span className="text-[var(--color-ink-3)] font-normal">({order.bike_label})</span>
                                    </p>
                                    <p className="text-xs text-[var(--color-ink-3)] mt-0.5 truncate">Klient: {order.customer_name}</p>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 pt-1 sm:pt-0 border-t sm:border-t-0 border-[var(--color-line)]">
                                    <span className="text-xs sm:text-sm font-medium text-[var(--color-ink-2)]">{order.estimated_cost ? `${order.estimated_cost} zł` : '-'}</span>
                                    <StatusBadge status={order.status} />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-[var(--color-ink-3)] py-8 text-center">Brak zleceń do wyświetlenia.</p>
                )}
            </div>
        </div>
    );
}