import { Link } from "react-router-dom";
import { statusMap } from "../StatusBadge";
import { isOrderOverdue } from "../../utils/dates";

// Kafelek zlecenia w kalendarzu: kolor statusu, czerwony pasek po terminie, "!" przy pilnych.
export default function OrderChip({ order }) {
  const overdue = isOrderOverdue(order);
  const colors = statusMap[order.status]?.className ?? 'bg-gray-100 text-gray-700';
  const label = `#${order.bike_tag_number} ${order.customer_name}`;

  return (
    <Link
      to={`/panel/orders/${order.id}`}
      title={`${label} - ${order.bike_label}${overdue ? ' (po terminie)' : ''}`}
      className={`block truncate rounded px-1.5 py-0.5 text-xs font-medium hover:brightness-95 transition ${colors} ${
        overdue ? 'border-l-[3px] border-red-500' : ''
      }`}
    >
      {order.priority === 'urgent' && <span className="text-red-600 font-bold">! </span>}
      {label}
    </Link>
  );
}
