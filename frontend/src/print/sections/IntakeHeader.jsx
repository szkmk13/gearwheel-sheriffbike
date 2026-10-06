import Field from "../Field";
import { formatDate } from "../../utils/dates";

// Tytul + siatka pol czesci serwisowej. Kolejnosc i etykiety 1:1 z papierowa kartka.
export default function IntakeHeader({ data }) {
    return (
        <>
            <h1 className="sheet-title">Przyjęcie serwisowe roweru</h1>

            <div className="intake-grid">
                <Field label="Data przyjęcia">{data.receivedAt && formatDate(data.receivedAt)}</Field>
                <Field label="Dane klienta" clamp>{data.customer.fullName}</Field>
                <Field label="Model roweru i numer">
                    {data.bikes.map((bike, i) => (
                        <span key={i} className="line">
                            {bike.model}
                            {bike.serialNumber && (data.bikes.length > 1 ? `, nr ${bike.serialNumber}` : null)}
                        </span>
                    ))}
                    {/* Jedna sztuka sprzetu: model i nr ramy w osobnych liniach, jak na kartce. */}
                    {data.bikes.length === 1 && data.bikes[0].serialNumber && (
                        <span className="line">{data.bikes[0].serialNumber}</span>
                    )}
                </Field>

                <Field label="Data odbioru">{data.plannedPickupAt && formatDate(data.plannedPickupAt)}</Field>
                <Field label="Telefon">{data.customer.phone}</Field>
                <div />
            </div>

            <hr className="separator" />
        </>
    );
}
