import { formatDate } from "../../utils/dates";

function StubRow({ label, children, strong = false }) {
    return (
        <div className="stub-row">
            <span className="stub-label">{label}:</span>
            <span className={`stub-value${strong ? ' strong' : ''}`}>{children}</span>
        </div>
    );
}

// Odcinek do oderwania i oddania klientowi. "Numer" to sam numer zawieszki - po nim
// warsztat odnajduje sprzet przy odbiorze.
export default function CustomerStub({ data }) {
    return (
        <div className="stub">
            <h2 className="stub-title">Potwierdzenie przyjęcia sprzętu - dla klienta</h2>
            <div className="stub-grid">
                <StubRow label="Imię i nazwisko klienta">{data.customer.fullName}</StubRow>
                <StubRow label="Sprzęt">{data.bikes.map((bike) => bike.model).join(', ')}</StubRow>
                <StubRow label="Numer" strong>{data.order.tagNumber}</StubRow>
                <StubRow label="Planowany termin odbioru">
                    {data.plannedPickupAt && formatDate(data.plannedPickupAt)}
                </StubRow>
            </div>
        </div>
    );
}
