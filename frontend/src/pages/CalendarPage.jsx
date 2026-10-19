import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchOrdersCalendar } from "../api/orders";

import StatusBadge from "../components/StatusBadge";
import StickyHeader from "../components/StickyHeader";
import { Skeleton } from "../components/Skeleton";
import OrderChip from "../components/calendar/OrderChip";
import DayColumns from "../components/calendar/DayColumns";
import {
  OPEN_STATUSES, WORKSHOP_DAY_STYLE, calendarQueryKey, groupByPickupDate,
} from "../components/calendar/calendarData";
import {
  MONTH_NAMES, MONTH_NAMES_GENITIVE, WEEKDAY_SHORT, WEEKDAY_NAMES,
  addDays, addMonths, isOrderOverdue, monthGridDays, parseISODate,
  toLocalISODate, todayISODate, weekDays, weekdayIndex, workshopDayKind,
} from "../utils/dates";

const VIEWS = [
  { value: 'month', label: 'Miesiąc' },
  { value: 'week', label: 'Tydzień' },
  { value: 'day', label: 'Dzień' },
];

// Ile zleceń mieści się w komórce miesiąca, zanim zwiniemy resztę w "+N więcej".
const MAX_CHIPS_IN_MONTH_CELL = 3;

// Kropki w kompaktowym widoku miesiąca na telefonie - w kolorach odznak statusu.
const STATUS_DOT = {
  accepted: 'bg-blue-500',
  estimating: 'bg-yellow-500',
  waiting_parts: 'bg-purple-500',
  in_progress: 'bg-blue-500',
  done: 'bg-green-500',
  delivered: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

const PRIORITY_LABEL = { low: 'Niski', normal: 'Normalny', high: 'Wysoki', urgent: 'Pilny' };

function rangeTitle(view, date, days) {
  if (view === 'month') return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
  if (view === 'day') {
    return `${WEEKDAY_NAMES[weekdayIndex(date)]}, ${date.getDate()} ${MONTH_NAMES_GENITIVE[date.getMonth()]} ${date.getFullYear()}`;
  }
  const first = days[0];
  const last = days[days.length - 1];
  const lastPart = `${last.getDate()} ${MONTH_NAMES_GENITIVE[last.getMonth()]} ${last.getFullYear()}`;
  if (first.getMonth() === last.getMonth()) return `${first.getDate()} - ${lastPart}`;
  const firstYear = first.getFullYear() === last.getFullYear() ? '' : ` ${first.getFullYear()}`;
  return `${first.getDate()} ${MONTH_NAMES_GENITIVE[first.getMonth()]}${firstYear} - ${lastPart}`;
}

function OrderCard({ order }) {
  const overdue = isOrderOverdue(order);

  return (
    <Link
      to={`/panel/orders/${order.id}`}
      className={`flex items-start justify-between gap-3 p-4 bg-white border rounded-xl shadow-sm hover:border-[var(--color-accent)] transition-colors ${
        overdue ? 'border-red-300' : 'border-[var(--color-line)]'
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-ink)]">
          <span className="text-[var(--color-accent)]">#{order.bike_tag_number}</span>
          <span className="truncate">{order.customer_name}</span>
        </div>
        <p className="mt-0.5 text-sm text-[var(--color-ink-2)] truncate">{order.bike_label}</p>
        <p className="mt-1 text-xs text-gray-500">
          Priorytet: {PRIORITY_LABEL[order.priority] ?? order.priority}
          {order.cost != null && ` · ${order.cost} zł`}
          {overdue && <span className="ml-2 font-semibold text-red-600">Po terminie</span>}
        </p>
      </div>
      <StatusBadge status={order.status} />
    </Link>
  );
}

function DayOrdersList({ orders, isLoading }) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }
  if (orders.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">Brak odbiorów zaplanowanych na ten dzień.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {orders.map((order) => <OrderCard key={order.id} order={order} />)}
    </div>
  );
}

function MonthView({ date, days, ordersByDay, isLoading, todayISO, onOpenDay }) {
  // Na telefonie komórki są za małe na kafelki - pokazujemy kropki, a listę dnia pod siatką.
  const [selectedISO, setSelectedISO] = useState(null);
  const activeISO = selectedISO && days.some((d) => toLocalISODate(d) === selectedISO)
    ? selectedISO
    : toLocalISODate(date);
  const activeDate = parseISODate(activeISO);

  return (
    <>
      <div className="bg-white border border-[var(--color-line)] rounded-xl overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-[var(--color-line)] bg-[var(--color-paper)]">
          {/* Pierwszy tydzien siatki zaczyna sie w poniedzialek, wiec days[i] to i-ty dzien tygodnia. */}
          {WEEKDAY_SHORT.map((name, i) => (
            <div
              key={name}
              className={`py-2 text-center text-xs font-semibold uppercase tracking-wide text-gray-500 ${
                WORKSHOP_DAY_STYLE[workshopDayKind(days[i])]?.cell ?? ''
              }`}
            >
              {name}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const iso = toLocalISODate(day);
            const orders = ordersByDay[iso] ?? [];
            const inMonth = day.getMonth() === date.getMonth();
            const isToday = iso === todayISO;
            const isActive = iso === activeISO;
            const hidden = orders.length - MAX_CHIPS_IN_MONTH_CELL;
            // Sobota/niedziela trzymaja swoj kolor tez poza miesiacem - tam wyroznia je wyblakly numer.
            const background = WORKSHOP_DAY_STYLE[workshopDayKind(day)]?.cell ?? (inMonth ? '' : 'bg-gray-50/70');

            return (
              <div
                key={iso}
                onClick={() => setSelectedISO(iso)}
                className={`min-h-[3.75rem] md:min-h-[7.5rem] p-1 md:p-1.5 border-[var(--color-line)] ${
                  index % 7 !== 6 ? 'border-r' : ''
                } ${index < 35 ? 'border-b' : ''} ${background} ${
                  isActive ? 'max-md:ring-2 max-md:ring-inset max-md:ring-[var(--color-accent)]/40' : ''
                } cursor-pointer md:cursor-default`}
              >
                <div className="flex justify-center md:justify-start mb-1">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenDay(day); }}
                    className={`hidden md:inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      isToday
                        ? 'bg-[var(--color-accent)] text-white'
                        : `hover:bg-gray-100 ${inMonth ? 'text-[var(--color-ink)]' : 'text-gray-400'}`
                    }`}
                    title="Pokaż dzień"
                  >
                    {day.getDate()}
                  </button>
                  <span
                    className={`md:hidden inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${
                      isToday ? 'bg-[var(--color-accent)] text-white' : inMonth ? 'text-[var(--color-ink)]' : 'text-gray-400'
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {isLoading ? (
                  inMonth && <Skeleton className="hidden md:block h-5 w-full" />
                ) : (
                  <>
                    <div className="hidden md:flex flex-col gap-1">
                      {orders.slice(0, MAX_CHIPS_IN_MONTH_CELL).map((order) => (
                        <OrderChip key={order.id} order={order} />
                      ))}
                      {hidden > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onOpenDay(day); }}
                          className="text-left px-1.5 text-xs font-semibold text-gray-600 hover:text-[var(--color-accent)] cursor-pointer"
                        >
                          +{hidden} więcej
                        </button>
                      )}
                    </div>
                    <div className="md:hidden flex flex-wrap justify-center gap-0.5">
                      {orders.slice(0, 4).map((order) => (
                        <span key={order.id} className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[order.status] ?? 'bg-gray-400'}`} />
                      ))}
                      {orders.length > 4 && <span className="text-[10px] leading-none text-gray-500">+</span>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="md:hidden mt-5">
        <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">
          {WEEKDAY_NAMES[weekdayIndex(activeDate)]}, {activeDate.getDate()} {MONTH_NAMES_GENITIVE[activeDate.getMonth()]}
        </h2>
        <DayOrdersList orders={ordersByDay[activeISO] ?? []} isLoading={isLoading} />
      </div>
    </>
  );
}

export default function CalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showClosed, setShowClosed] = useState(false);

  const todayISO = todayISODate();
  // Widok i data w URL-u, żeby odświeżenie strony albo link trzymały to samo miejsce.
  const view = VIEWS.some((v) => v.value === searchParams.get('view')) ? searchParams.get('view') : 'month';
  const dayISO = parseISODate(searchParams.get('date')) ? searchParams.get('date') : todayISO;
  const date = useMemo(() => parseISODate(dayISO), [dayISO]);
  // Sobota (krócej) / niedziela (nieczynne) - opis przy tytule widoku dnia.
  const dayStyle = WORKSHOP_DAY_STYLE[workshopDayKind(date)];

  const days = useMemo(() => {
    if (view === 'month') return monthGridDays(date);
    if (view === 'week') return weekDays(date);
    return [date];
  }, [view, date]);

  const start = toLocalISODate(days[0]);
  const end = toLocalISODate(days[days.length - 1]);

  const { data: orders = [], isLoading, isFetching, isError, error } = useQuery({
    queryKey: calendarQueryKey(start, end, showClosed),
    queryFn: () => fetchOrdersCalendar({ start, end, status: showClosed ? undefined : OPEN_STATUSES.join(',') }),
    // Przy przełączaniu okresu zostawiamy poprzednie dane, zamiast migać pustą siatką.
    placeholderData: keepPreviousData,
  });

  const ordersByDay = useMemo(() => groupByPickupDate(orders), [orders]);

  const goTo = (nextView, nextDate) => {
    setSearchParams({ view: nextView, date: toLocalISODate(nextDate) }, { replace: true });
  };

  const shift = (direction) => {
    if (view === 'month') goTo(view, addMonths(date, direction));
    else if (view === 'week') goTo(view, addDays(date, 7 * direction));
    else goTo(view, addDays(date, direction));
  };

  const openDay = (day) => goTo('day', day);

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 relative bg-[var(--color-paper)] min-h-full">
      <StickyHeader className="bg-[var(--color-paper)]">
        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-semibold text-[var(--color-ink)]">Kalendarz odbiorów</h1>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(view, parseISODate(todayISO))}
                className="px-3.5 py-2 bg-[var(--color-paper-2)] border border-[var(--color-line)] hover:bg-white text-[var(--color-ink)] rounded-md font-medium text-sm transition-colors shadow-xs cursor-pointer"
              >
                Dziś
              </button>
              <button
                type="button"
                onClick={() => shift(-1)}
                className="p-2 rounded-full hover:bg-gray-100 text-[var(--color-ink)] cursor-pointer transition-colors"
                aria-label="Poprzedni okres"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => shift(1)}
                className="p-2 rounded-full hover:bg-gray-100 text-[var(--color-ink)] cursor-pointer transition-colors"
                aria-label="Następny okres"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <h2 className="ml-1 text-base sm:text-lg font-semibold text-[var(--color-ink)]">
                {rangeTitle(view, date, days)}
              </h2>
              {view === 'day' && dayStyle && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${dayStyle.cell} ${dayStyle.badgeClass}`}>
                  {dayStyle.note}
                </span>
              )}
              {isFetching && !isLoading && (
                <span className="ml-1 text-xs text-gray-400">Ładowanie...</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--color-ink-2)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showClosed}
                  onChange={(e) => setShowClosed(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--color-line)] text-[var(--color-accent)] focus:ring-[var(--color-accent)] cursor-pointer"
                />
                Pokaż wszystkie
              </label>

              <div className="inline-flex rounded-md border border-[var(--color-line)] bg-[var(--color-paper-2)] p-0.5 shadow-xs">
                {VIEWS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => goTo(option.value, date)}
                    className={`px-3 py-1.5 text-sm font-medium rounded cursor-pointer transition-colors ${
                      view === option.value
                        ? 'bg-white text-[var(--color-accent)] shadow-sm'
                        : 'text-[var(--color-ink-2)] hover:text-[var(--color-ink)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </StickyHeader>

      {isError && (
        <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          Nie udało się pobrać zleceń: {error.message}
        </div>
      )}

      {view === 'month' && (
        <MonthView
          date={date}
          days={days}
          ordersByDay={ordersByDay}
          isLoading={isLoading}
          todayISO={todayISO}
          onOpenDay={openDay}
        />
      )}
      {view === 'week' && (
        <DayColumns
          days={days}
          ordersByDay={ordersByDay}
          isLoading={isLoading}
          todayISO={todayISO}
          onOpenDay={openDay}
          columnClassName="md:min-h-[24rem]"
        />
      )}
      {view === 'day' && (
        <div className="max-w-3xl">
          <DayOrdersList orders={ordersByDay[dayISO] ?? []} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
}
