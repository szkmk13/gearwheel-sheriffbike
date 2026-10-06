import { useLayoutEffect, useRef, useState } from "react";

const MAX_FONT_PT = 11;
const MIN_FONT_PT = 9;
const STEP_PT = 0.5;

// Zakres uslug ma stala wysokosc (reszta kartki nad odcinkiem). Gdy tresc sie nie miesci,
// zmniejszamy font do 9 pt, a dalej obcinamy z dopiskiem - dokument nie moze przejsc
// na 2. strone, bo odcinek klienta musi zostac na dole.
// `fitKey` wymusza ponowne dopasowanie, np. po doczytaniu fontu (inna szerokosc znakow).
export default function ServicesBlock({ services, notes, fitKey }) {
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
    }, [services, notes, fitKey]);

    return (
        <>
            <h2 className="services-heading">Zakres usług</h2>
            <div ref={boxRef} className="services" style={{ fontSize: `${fontPt}pt` }}>
                {services.length > 0 && (
                    <ul className="services-list">
                        {services.map((service, i) => (
                            <li key={i}>
                                {service.name}
                                {service.price != null && (
                                    <span className="services-price"> - {service.price} zł</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                {notes && <p className="services-notes">{notes}</p>}
                {truncated && <div className="services-more">…ciąg dalszy w systemie</div>}
            </div>
        </>
    );
}
