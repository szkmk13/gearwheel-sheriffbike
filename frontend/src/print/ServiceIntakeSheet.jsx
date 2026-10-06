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
// }
export default function ServiceIntakeSheet({ data, fitKey }) {
    return (
        <div className="sheet">
            <IntakeHeader data={data} />
            <ServicesBlock services={data.services} notes={data.notes} fitKey={fitKey} />
            <CustomerStub data={data} />
        </div>
    );
}
