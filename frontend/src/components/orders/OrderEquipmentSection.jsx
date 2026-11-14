import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import Modal from "../Modal";
import Button from "../Button";
import CategoryIcon from "../equipment/CategoryIcon";
import EquipmentPicker from "../equipment/EquipmentPicker";
import { createBike, fetchClientDetails } from "../../api/clients";
import { updateOrder } from "../../api/orders";
import { fetchStorageBookings } from "../../api/storage";
import { formatDate, isOrderOverdue } from "../../utils/dates";
import { bikeTypeShortLabel, saveNewEquipment } from "../../utils/equipment";

const badgeClass = "inline-block px-2.5 py-0.5 rounded text-xs font-semibold border";

// Sprzęt zlecenia: wszystkie sztuki, jedna zawieszka i termin odbioru dla całości.
export default function OrderEquipmentSection({ order, locked }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const bikes = order.bikes || [];

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-[var(--color-ink-3)] uppercase tracking-wider">
          Sprzęt i zawieszka {bikes.length > 1 && <span className="normal-case">({bikes.length} szt.)</span>}
        </h3>
        {!locked && (
          <button
            onClick={() => setIsEditOpen(true)}
            className="text-xs font-medium text-[var(--color-accent)] hover:underline cursor-pointer"
          >
            Zmień sprzęt
          </button>
        )}
      </div>

      <ul className="divide-y divide-[var(--color-line)]">
        {bikes.map((bike) => (
          <li key={bike.id} className="py-2 first:pt-0 flex items-start gap-2.5">
            <CategoryIcon category={bike.category || 'bike'} className="w-4 h-4 mt-1 text-[var(--color-ink-3)]" />
            <div className="min-w-0">
              <Link
                to={`/panel/bikes/${bike.id}`}
                className="block text-base font-medium text-[var(--color-ink)] hover:text-[var(--color-accent)] truncate transition-colors"
              >
                {`${bike.brand} ${bike.model || ''}`.trim()}
              </Link>
              <p className="text-xs text-[var(--color-ink-3)] truncate">
                {[
                  bike.category !== 'winter' && bike.bike_type ? bikeTypeShortLabel(bike.bike_type) : null,
                  bike.serial_no ? `${bike.category === 'winter' ? 'nr seryjny' : 'nr ramy'} ${bike.serial_no}` : null,
                  bike.color || null,
                ].filter(Boolean).join(' • ') || 'Karta sprzętu →'}
              </p>
            </div>
          </li>
        ))}
        {bikes.length === 0 && (
          <li className="py-2 text-sm text-[var(--color-ink-3)]">{order.bike_label || 'Brak przypiętego sprzętu'}</li>
        )}
      </ul>

      <div className="pt-3 flex flex-wrap gap-2">
        <span className={`${badgeClass} bg-[var(--color-paper)] text-[var(--color-ink-2)] border-[var(--color-line)]`}>
          Zawieszka: #{order.bike_tag_number || '-'}
        </span>
        <span className={`${badgeClass} ${isOrderOverdue(order) ? 'bg-red-50 text-red-700 border-red-200' : 'bg-[var(--color-paper)] text-[var(--color-ink-2)] border-[var(--color-line)]'}`}>
          Planowany odbiór: {formatDate(order.estimated_pickup_date)}{isOrderOverdue(order) && ' - po terminie'}
        </span>
      </div>

      {isEditOpen && <EditEquipmentModal order={order} onClose={() => setIsEditOpen(false)} />}
    </div>
  );
}

// Zmiana zestawu sprzętu istniejącego zlecenia (PATCH `bikes`). Zawieszka zostaje ta sama.
function EditEquipmentModal({ order, onClose }) {
  const queryClient = useQueryClient();
  const customerId = order.customer?.id;
  const [selectedIds, setSelectedIds] = useState(() => (order.bikes || []).map((b) => b.id));
  const [newItems, setNewItems] = useState([]);
  const [created, setCreated] = useState([]);

  const { data: client } = useQuery({
    queryKey: ['client', String(customerId)],
    queryFn: () => fetchClientDetails(customerId),
    enabled: !!customerId,
  });

  // Sztuka z rezerwacją w przechowalni tego zlecenia musi na nim zostać (backend też tego pilnuje).
  const { data: bookings } = useQuery({
    queryKey: ['storage', 'bookings', { customer: customerId }],
    queryFn: () => fetchStorageBookings({ customer: customerId }),
    enabled: !!customerId,
  });
  const lockedIds = new Map(
    (bookings?.results || [])
      .filter((booking) => booking.repair_order === order.id)
      .map((booking) => [booking.bike, 'ma rezerwację w przechowalni'])
  );

  // Sprzęt zlecenia na wierzchu, nawet zanim dociągnie się karta klienta.
  const equipment = [...(order.bikes || [])];
  [...(client?.bikes || []), ...created].forEach((bike) => {
    if (!equipment.some((b) => b.id === bike.id)) equipment.push(bike);
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const createdIds = await saveNewEquipment(customerId, newItems, createBike, (bike, item) => {
        setCreated((prev) => [...prev, bike]);
        setSelectedIds((prev) => [...prev, bike.id]);
        setNewItems((prev) => prev.filter((i) => i.key !== item.key));
      });
      return updateOrder({ id: order.id, orderData: { bikes: [...selectedIds, ...createdIds] } });
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['order', String(order.id)], updated);
      queryClient.invalidateQueries({ queryKey: ['order', String(order.id)] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['client', String(customerId)] });
      toast.success('Zaktualizowano sprzęt zlecenia.');
      onClose();
    },
    onError: (error) => toast.error(`Nie udało się zapisać sprzętu: ${error.message}`),
  });

  const count = selectedIds.length + newItems.length;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (count === 0) {
      toast.error('Zlecenie musi mieć co najmniej jedną sztukę sprzętu.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Modal isOpen onClose={onClose} title={`Sprzęt zlecenia #${order.id}`} maxWidth="max-w-3xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 mt-2">
        <div className="p-5 bg-[var(--color-paper)] border border-[var(--color-line)] rounded-xl shadow-sm">
          <EquipmentPicker
            title={`Sprzęt klienta${client ? `: ${client.first_name} ${client.last_name}` : ''}`}
            equipment={equipment}
            selectedIds={selectedIds}
            onSelectedChange={setSelectedIds}
            newItems={newItems}
            onNewItemsChange={setNewItems}
            primaryCategory={order.bikes?.[0]?.category || 'bike'}
            lockedIds={lockedIds}
            disabled={mutation.isPending}
          />
        </div>
        <p className="text-xs text-[var(--color-ink-3)]">
          Cała lista dalej ma jedną zawieszkę #{order.bike_tag_number}. Sprzęt odznaczony tutaj zostaje na karcie klienta.
        </p>
        <div className="flex justify-end gap-3 pt-4 border-t border-[var(--color-line)]">
          <button
            type="button" onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper)] rounded-md transition-colors cursor-pointer"
          >
            Anuluj
          </button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Zapisywanie...' : `Zapisz (${count} szt.)`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
