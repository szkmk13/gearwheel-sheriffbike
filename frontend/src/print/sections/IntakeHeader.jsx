import Field from "../Field";
import { formatDate } from "../../utils/dates";

const TITLES = {
    bike: "Przyjęcie serwisowe roweru",
    winter: "Przyjęcie serwisowe sprzętu zimowego",
    mixed: "Przyjęcie serwisowe sprzętu",
};

// Tyle sztuk mieści się w nagłówku bez zabierania zakresowi usług zbyt dużo miejsca.
// Przy dłuższej liście ostatnia linia mówi, ile jeszcze jest w systemie.
const MAX_LISTED = 6;

// Tytul + siatka pol czesci serwisowej. Etykiety 1:1 z papierowa kartka.
export default function IntakeHeader({ data }) {
    const isBike = data.category === "bike";
    const bikes = data.bikes;
    const isMulti = bikes.length > 1;
    const listed = bikes.length > MAX_LISTED ? bikes.slice(0, MAX_LISTED - 1) : bikes;
    const hidden = bikes.length - listed.length;
    const label = isBike ? "Model roweru i numer" : "Model sprzętu i numer";

    return (
        <>
            <h1 className="sheet-title">{TITLES[data.category] ?? TITLES.bike}</h1>

            {/* Wiersz 1: daty i dane klienta. Wiersz 2: sprzet na dwie kolumny - zwykle to
                najdluzszy tekst (marka, model, nr ramy). Przy kilku sztukach wiersz rosnie,
                a zakres uslug ponizej oddaje miejsce (i w razie potrzeby zmniejsza font). */}
            <div className="intake-grid">
                <Field label="Data przyjęcia" bold>{data.receivedAt && formatDate(data.receivedAt)}</Field>
                <Field label="Dane klienta" clamp>{data.customer.fullName}</Field>
                <Field label="Telefon">{data.customer.phone}</Field>

                <Field label="Data odbioru" bold>{data.plannedPickupAt && formatDate(data.plannedPickupAt)}</Field>
                <Field label={isMulti ? `${label} (${bikes.length} szt.)` : label} wide grow={isMulti}>
                    {/* Jedna zawieszka obejmuje cale zlecenie, wiec tylko przed pierwsza pozycja. */}
                    {bikes.length === 0 && data.order.tagNumber && (
                        <span className="line"><strong>#{data.order.tagNumber}</strong></span>
                    )}
                    {listed.map((bike, i) => (
                        <span key={i} className="line">
                            {i === 0 && data.order.tagNumber && (
                                <><strong>#{data.order.tagNumber}</strong> - </>
                            )}
                            {bike.model}
                            {isMulti && bike.serialNumber && `, nr ${bike.serialNumber}`}
                        </span>
                    ))}
                    {hidden > 0 && (
                        <span className="line more">+ jeszcze {hidden} szt. - pełna lista w systemie</span>
                    )}
                    {/* Jedna sztuka sprzetu: model i nr ramy w osobnych liniach, jak na kartce. */}
                    {bikes.length === 1 && bikes[0].serialNumber && (
                        <span className="line">{bikes[0].serialNumber}</span>
                    )}
                </Field>
            </div>

            <hr className="separator" />
        </>
    );
}
