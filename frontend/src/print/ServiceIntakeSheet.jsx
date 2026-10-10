import IntakeHeader from "./sections/IntakeHeader";
import ServicesBlock from "./sections/ServicesBlock";
import CustomerStub from "./sections/CustomerStub";
import "./print.css";

// Arkusz A4 "Przyjecie serwisowe roweru": czesc serwisowa + odcinek dla klienta.
//
// data: {
//   order: { tagNumber },
//   receivedAt, plannedPickupAt,           // daty (Date | string | null)
//   customer: { fullName, phone },
//   bikes: [{ model, serialNumber }],      // zlecenie moze obejmowac kilka sztuk sprzetu
//   services: [{ name, price }],
//   notes,
//   estimatedCost,                         // sformatowana kwota ("250 zł") albo ""
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
