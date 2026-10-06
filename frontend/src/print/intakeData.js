// Mapowanie zlecenia z API (RepairOrderDetailSerializer) na dane formularza przyjecia.

// 600100200 / 48600100200 -> +48 600 100 200. Inny format zostaje bez zmian.
export function formatPhone(phone) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    const local = digits.length === 11 && digits.startsWith("48") ? digits.slice(2) : digits;
    if (local.length !== 9) return phone;
    return `+48 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

export function toIntakeData(order) {
    const customer = order.customer || {};
    return {
        order: { tagNumber: order.bike_tag_number },
        receivedAt: order.accepted_at || order.created_at,
        plannedPickupAt: order.estimated_pickup_date,
        customer: {
            fullName: [customer.first_name, customer.last_name].filter(Boolean).join(" "),
            phone: formatPhone(customer.phone),
        },
        bikes: (order.bikes || []).map((bike) => ({
            model: [bike.brand, bike.model].filter(Boolean).join(" "),
            serialNumber: bike.serial_no,
        })),
        services: (order.items || []).map((item) => ({
            name: Number(item.quantity) === 1 ? item.description : `${item.description} x${Number(item.quantity)}`,
            price: item.unit_price != null ? Number(item.unit_price) * Number(item.quantity) : null,
        })),
        notes: order.description,
    };
}
