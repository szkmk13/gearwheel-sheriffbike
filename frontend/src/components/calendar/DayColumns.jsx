import OrderChip from "./OrderChip";
import { Skeleton } from "../Skeleton";
import { WORKSHOP_DAY_STYLE } from "./calendarData";
import { WEEKDAY_SHORT, toLocalISODate, weekdayIndex, workshopDayKind } from "../../utils/dates";

// Kolumny dni z kafelkami zlecen - widok tygodnia w kalendarzu i pasek "dzis +/- 3 dni"
// na dashboardzie. Dni nie musza zaczynac sie od poniedzialku. Na telefonie lista dni.
// Soboty (krocej) i niedziele (nieczynne) maja wlasne tlo; dzis ma pierwszenstwo.
// `columnClassName` ustawia np. minimalna wysokosc kolumny na desktopie.
// `hiddenBadges` - rodzaje dni bez dopisku w naglowku (kolor tla zostaje), np. ['short'].
export default function DayColumns({
  days, ordersByDay, isLoading, todayISO, onOpenDay, columnClassName = '', hiddenBadges = [],
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 md:gap-0 md:bg-white md:border md:border-[var(--color-line)] md:rounded-xl md:overflow-hidden md:shadow-sm">
      {days.map((day, index) => {
        const iso = toLocalISODate(day);
        const orders = ordersByDay[iso] ?? [];
        const isToday = iso === todayISO;
        const dayKind = workshopDayKind(day);
        const dayStyle = WORKSHOP_DAY_STYLE[dayKind];
        const badge = dayStyle && !hiddenBadges.includes(dayKind) ? dayStyle : null;
        const background = isToday
          ? 'bg-white md:bg-[var(--color-accent)]/5'
          : dayStyle?.cell ?? 'bg-white md:bg-transparent';

        return (
          <div
            key={iso}
            className={`${background} border border-[var(--color-line)] rounded-xl md:rounded-none md:border-0 ${
              index < days.length - 1 ? 'md:border-r' : ''
            } ${columnClassName}`}
          >
            <button
              type="button"
              onClick={() => onOpenDay(day)}
              className="w-full flex md:flex-col items-center gap-2 md:gap-1 px-3 py-2 md:py-3 border-b border-[var(--color-line)] hover:bg-black/[0.03] cursor-pointer transition-colors"
              title="Pokaż dzień w kalendarzu"
            >
              <span className={`text-xs font-semibold uppercase tracking-wide ${isToday ? 'text-[var(--color-accent)]' : 'text-gray-500'}`}>
                {WEEKDAY_SHORT[weekdayIndex(day)]}
              </span>
              <span
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base font-semibold ${
                  isToday ? 'bg-[var(--color-accent)] text-white' : 'text-[var(--color-ink)]'
                }`}
              >
                {day.getDate()}
              </span>
              {/* Pusty dopisek w zwykle dni trzyma rowna wysokosc naglowkow na desktopie. */}
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  badge ? badge.badgeClass : 'hidden md:block invisible'
                }`}
                aria-hidden={!badge}
              >
                {badge ? badge.badge : '-'}
              </span>
              {orders.length > 0 && (
                <span className="md:hidden ml-auto text-xs text-gray-500">{orders.length} odb.</span>
              )}
            </button>

            <div className="flex flex-col gap-1 p-2">
              {isLoading ? (
                <Skeleton className="h-5 w-full" />
              ) : orders.length === 0 ? (
                <p className="md:hidden py-1 text-xs text-gray-400">Brak odbiorów</p>
              ) : (
                orders.map((order) => <OrderChip key={order.id} order={order} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
