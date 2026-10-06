import Field from "../Field";
import { formatDate } from "../../utils/dates";

// Tytul + siatka pol czesci serwisowej. Etykiety 1:1 z papierowa kartka.
export default function IntakeHeader({ data }) {
    return (
        <>
            <h1 className="sheet-title">Przyjęcie serwisowe roweru</h1>

            {/* Wiersz 1: daty i dane klienta. Wiersz 2: sprzet na dwie kolumny - zwykle to
                najdluzszy tekst (marka, model, nr ramy). */}
            <div className="intake-grid">
                <Field label="Data przyjęcia" bold>{data.receivedAt && formatDate(data.receivedAt)}</Field>
                <Field label="Dane klienta" clamp>{data.customer.fullName}</Field>
                <Field label="Telefon">{data.customer.phone}</Field>

                <Field label="Data odbioru" bold>{data.plannedPickupAt && formatDate(data.plannedPickupAt)}</Field>
                <Field label="Model roweru i numer" wide>
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
            </div>

            <hr className="separator" />
        </>
    );
}
