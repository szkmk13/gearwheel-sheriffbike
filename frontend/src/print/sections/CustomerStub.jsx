import { formatDate } from "../../utils/dates";

function StubRow({ label, children }) {
    return (
        <div className="stub-row">
            <span className="stub-label">{label}:</span>
            <span className="stub-value">{children}</span>
        </div>
    );
}

// Odcinek do oderwania i oddania klientowi.
export default function CustomerStub({ data }) {
    // Numer dla klienta: zawieszka/data przyjecia, np. 86/06.10.2026. Data z kropkami, zeby
    // nie mieszala sie z ukosnikiem oddzielajacym zawieszke.
    const receivedOn = data.receivedAt ? formatDate(data.receivedAt).replaceAll('/', '.') : '';
    const number = data.order.tagNumber ? `${data.order.tagNumber}/${receivedOn}` : '';

    return (
        <div className="stub">
            <h2 className="stub-title">Potwierdzenie przyjęcia sprzętu - dla klienta</h2>
            <div className="stub-grid">
                <StubRow label="Imię i nazwisko klienta">{data.customer.fullName}</StubRow>
                <StubRow label="Sprzęt">{data.bikes.map((bike) => bike.model).join(', ')}</StubRow>
                <StubRow label="Numer">{number}</StubRow>
                <StubRow label="Planowany termin odbioru">
                    {data.plannedPickupAt && formatDate(data.plannedPickupAt)}
                </StubRow>
            </div>
        </div>
    );
}
