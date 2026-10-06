import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ServiceIntakeSheet from "./ServiceIntakeSheet";
import { toIntakeData } from "./intakeData";

const PRINTING_CLASS = "intake-printing";

// Przycisk drukujacy formularz przyjecia prosto ze strony zlecenia, bez osobnej podstrony.
// Arkusz jest caly czas wyrenderowany poza ekranem (portal do <body>), zeby auto-dopasowanie
// zakresu uslug mialo prawdziwy layout do zmierzenia. Na czas druku klasa na <body> chowa
// aplikacje i pokazuje tylko arkusz - bez niej zwykle Ctrl+P na stronie dziala jak dotad.
export default function PrintIntakeButton({ order, className }) {
    const [fontsReady, setFontsReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        // Ponowne dopasowanie po doczytaniu fontu (inna szerokosc znakow niz fallback).
        document.fonts.ready.then(() => {
            if (!cancelled) setFontsReady(true);
        });
        return () => { cancelled = true; };
    }, []);

    // Sprzatanie, gdy ktos opusci strone w trakcie druku.
    useEffect(() => () => document.body.classList.remove(PRINTING_CLASS), []);

    const handlePrint = async () => {
        await document.fonts.ready;
        const previousTitle = document.title;
        // Tytul strony to domyslna nazwa pliku przy "Zapisz jako PDF".
        document.title = `Przyjecie - zawieszka ${order.bike_tag_number}`;
        document.body.classList.add(PRINTING_CLASS);
        const cleanup = () => {
            document.body.classList.remove(PRINTING_CLASS);
            document.title = previousTitle;
        };
        window.addEventListener("afterprint", cleanup, { once: true });
        window.print();
    };

    return (
        <>
            <button type="button" onClick={handlePrint} className={className}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Drukuj przyjęcie
            </button>
            {createPortal(
                <div className="intake-print-root" aria-hidden="true">
                    <ServiceIntakeSheet data={toIntakeData(order)} fitKey={fontsReady} />
                </div>,
                document.body,
            )}
        </>
    );
}
