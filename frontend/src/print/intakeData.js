// Mapowanie zlecenia z API (RepairOrderDetailSerializer) na dane formularza przyjecia.

// 600100200 / 48600100200 -> +48 600 100 200. Inny format zostaje bez zmian.
export function formatPhone(phone) {
    if (!phone) return "";
    const digits = phone.replace(/\D/g, "");
    const local = digits.length === 11 && digits.startsWith("48") ? digits.slice(2) : digits;
    if (local.length !== 9) return phone;
    return `+48 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

// "250.00" -> "250 zł", "250.5" -> "250,50 zł". Brak kwoty -> "" (pole zostaje do dopisania).
export function formatCost(value) {
    if (value === null || value === undefined || value === "") return "";
    const amount = Number(value);
    if (Number.isNaN(amount)) return "";
    const fractionDigits = Number.isInteger(amount) ? 0 : 2;
    return `${amount.toLocaleString("pl-PL", {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    })} zł`;
}

// 'bike' / 'winter' gdy cale zlecenie jest jednego rodzaju, 'mixed' gdy sa oba.
function intakeCategory(bikes) {
    const categories = new Set(bikes.map((bike) => bike.category || "bike"));
    if (categories.size === 1) return [...categories][0];
    return categories.size === 0 ? "bike" : "mixed";
}

// Suma cen pozycji zlecenia. Zadna pozycja bez ceny -> null (kwota zostaje do dopisania).
function servicesTotal(services) {
    const priced = services.filter((service) => service.price != null);
    if (priced.length === 0) return null;
    return Math.round(priced.reduce((sum, service) => sum + service.price, 0) * 100) / 100;
}

export function toIntakeData(order) {
    const customer = order.customer || {};
    const services = (order.items || []).map((item) => ({
        name: Number(item.quantity) === 1 ? item.description : `${item.description} x${Number(item.quantity)}`,
        price: item.unit_price != null ? Number(item.unit_price) * Number(item.quantity) : null,
    }));
    // Szacowany koszt wpisany na zleceniu ma pierwszenstwo; bez niego - suma wybranych uslug.
    const hasEstimate = order.estimated_cost !== null && order.estimated_cost !== undefined && order.estimated_cost !== "";
    return {
        category: intakeCategory(order.bikes || []),
        order: { tagNumbers: order.tag_numbers || [] },
        receivedAt: order.accepted_at || order.created_at,
        plannedPickupAt: order.estimated_pickup_date,
        customer: {
            fullName: [customer.first_name, customer.last_name].filter(Boolean).join(" "),
            phone: formatPhone(customer.phone),
        },
        bikes: (order.bikes || []).map((bike) => ({
            model: [bike.brand, bike.model].filter(Boolean).join(" "),
            serialNumber: bike.serial_no,
            tag: bike.tag_number,
        })),
        services,
        notes: order.description,
        estimatedCost: formatCost(hasEstimate ? order.estimated_cost : servicesTotal(services)),
    };
}
