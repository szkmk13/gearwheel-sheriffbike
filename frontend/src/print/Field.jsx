// Etykieta + miejsce na wpis. Bez wartosci zostaje puste pole do dopisania dlugopisem.
export default function Field({ label, children, clamp = false }) {
    return (
        <div className="field">
            <span className="field-label">{label}</span>
            <div className={`field-value${clamp ? ' clamp-2' : ''}`}>{children}</div>
        </div>
    );
}
