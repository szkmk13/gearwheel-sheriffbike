import { formatDate } from "../../utils/dates";

function StubRow({ label, children, strong = false, wide = false }) {
    return (
        <div className={`stub-row${wide ? ' wide' : ''}`}>
            <span className="stub-label">{label}:</span>
            <span className={`stub-value${strong ? ' strong' : ''}${wide ? ' clamp-2' : ''}`}>{children}</span>
        </div>
    );
}

// Odcinek do oderwania i oddania klientowi. "Numer" to sam numer zawieszki - po nim
// warsztat odnajduje sprzet przy odbiorze.
export default function CustomerStub({ data }) {
    const names = data.bikes.map((bike) => bike.model).join(', ');
    const isMulti = data.bikes.length > 1;

    const customer = <StubRow label="Imię i nazwisko klienta">{data.customer.fullName}</StubRow>;
    const number = <StubRow label="Numer" strong>{data.order.tagNumber}</StubRow>;
    const pickup = (
        <StubRow label="Planowany termin odbioru">
            {data.plannedPickupAt && formatDate(data.plannedPickupAt)}
        </StubRow>
    );
    const cost = <StubRow label="Szacowany koszt naprawy" strong>{data.estimatedCost}</StubRow>;

    return (
        <div className="stub">
            <h2 className="stub-title">Potwierdzenie przyjęcia sprzętu - dla klienta</h2>
            {isMulti ? (
                // Kilka sztuk: lista dostaje caly ostatni wiersz (do 2 linii), reszta jak zwykle.
                <div className="stub-grid">
                    {customer}
                    {number}
                    {pickup}
                    {cost}
                    <StubRow label={`Sprzęt (${data.bikes.length} szt.)`} wide>{names}</StubRow>
                </div>
            ) : (
                <div className="stub-grid">
                    {customer}
                    <StubRow label="Sprzęt">{names}</StubRow>
                    {number}
                    {pickup}
                    {cost}
                </div>
            )}
        </div>
    );
}
