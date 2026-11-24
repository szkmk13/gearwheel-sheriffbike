import IntakeHeader from "./sections/IntakeHeader";
import ServicesBlock from "./sections/ServicesBlock";
import CustomerStub from "./sections/CustomerStub";
import "./print.css";

// Arkusz A4 "Przyjecie serwisowe" (rower / sprzet zimowy): czesc serwisowa + odcinek dla klienta.
//
// data: {
//   order: { tagNumbers },                 // zawieszki wszystkich sztuk
//   receivedAt, plannedPickupAt,           // daty (Date | string | null)
//   customer: { fullName, phone },
//   bikes: [{ model, serialNumber, tag }], // kazda sztuka z wlasna zawieszka
//   services: [{ name, price }],
//   notes,
//   estimatedCost,                         // "250 zł": szacunek ze zlecenia, bez niego suma uslug; albo ""
// }
export default function ServiceIntakeSheet({ data, fitKey }) {
    return (
        <div className="sheet">
            <IntakeHeader data={data} />
            <ServicesBlock
                services={data.services}
                notes={data.notes}
                estimatedCost={data.estimatedCost}
                fitKey={fitKey}
            />
            <CustomerStub data={data} />
        </div>
    );
}
