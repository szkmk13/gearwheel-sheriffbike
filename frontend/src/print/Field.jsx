// Etykieta + miejsce na wpis. Bez wartosci zostaje puste pole do dopisania dlugopisem.
// `wide` rozciaga pole na dwie kolumny siatki.
export default function Field({ label, children, clamp = false, bold = false, wide = false }) {
    const valueClass = ['field-value', clamp && 'clamp-2', bold && 'bold'].filter(Boolean).join(' ');
    return (
        <div className={`field${wide ? ' wide' : ''}`}>
            <span className="field-label">{label}</span>
            <div className={valueClass}>{children}</div>
        </div>
    );
}
