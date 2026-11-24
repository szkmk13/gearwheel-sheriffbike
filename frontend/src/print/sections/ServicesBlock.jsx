import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_PT = 11;
const MIN_FONT_PT = 9;
const STEP_PT = 0.5;

// Pudelko o stalej wysokosci: gdy tresc sie nie miesci, zmniejszamy font do 9 pt, a dalej
// obcinamy z dopiskiem - dokument nie moze przejsc na 2. strone, bo odcinek klienta musi
// zostac na dole. `deps` wymuszaja ponowne dopasowanie (np. `fitKey` po doczytaniu fontu).
function useFitFont(deps) {
    const boxRef = useRef(null);
    const [fontPt, setFontPt] = useState(MAX_FONT_PT);
    const [truncated, setTruncated] = useState(false);

    useLayoutEffect(() => {
        const box = boxRef.current;
        if (!box) return;
        const overflows = () => box.scrollHeight > box.clientHeight + 1;

        let size = MAX_FONT_PT;
        box.style.fontSize = `${size}pt`;
        while (overflows() && size > MIN_FONT_PT) {
            size -= STEP_PT;
            box.style.fontSize = `${size}pt`;
        }
        setFontPt(size);
        setTruncated(overflows());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps);

    return { boxRef, fontPt, truncated };
}

// Srodek kartki podzielony na pol: po lewej sam opis (opis zlecenia), po prawej
// podsumowanie kosztow (pozycje z cenami + szacowany koszt naprawy).
export default function ServicesBlock({ services, notes, estimatedCost, fitKey }) {
    const fault = useFitFont([notes, fitKey]);
    const costs = useFitFont([services, fitKey]);

    return (
        <div className="services-split">
            <section className="services-col">
                <h2 className="services-heading">Opis:</h2>
                <div ref={fault.boxRef} className="services" style={{ fontSize: `${fault.fontPt}pt` }}>
                    {notes && <p className="services-notes">{notes}</p>}
                    {fault.truncated && <div className="services-more">…ciąg dalszy w systemie</div>}
                </div>
            </section>

            <section className="services-col costs-col">
                <h2 className="services-heading">Podsumowanie kosztów</h2>
                <div ref={costs.boxRef} className="services" style={{ fontSize: `${costs.fontPt}pt` }}>
                    {services.length > 0 && (
                        <ul className="costs-list">
                            {services.map((service, i) => (
                                <li key={i} className="costs-row">
                                    <span className="costs-name">{service.name}</span>
                                    <span className="costs-price">
                                        {service.price != null ? `${service.price} zł` : ""}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                    {costs.truncated && <div className="services-more">…ciąg dalszy w systemie</div>}
                </div>
                {/* Poza dopasowywanym pudelkiem, zeby kwota nigdy nie zostala obcieta. */}
                <div className="services-cost">
                    <span>Szacowany koszt naprawy:</span>
                    <span className="services-cost-value">{estimatedCost}</span>
                </div>
            </section>
        </div>
    );
}
