export const getInitials = (name) => {
    if (!name) return "";
    return name
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
};

export default function ClientCard({ client, onClick }) {
    // 1. Łączymy imię i nazwisko z danych serwerowych w jeden tekst
    const fullName = `${client.first_name} ${client.last_name}`.trim();

    return (
        <div
            onClick={onClick} 
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full cursor-pointer hover:shadow-md transition-shadow"
        >
            <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center font-bold text-lg shrink-0">
                    {getInitials(fullName)}
                </div>
                <div>
                    <h3 className="text-[15px] font-semibold text-gray-800">{fullName}</h3>
                    <p className="text-xs text-gray-500">{client.repair_orders || 0} zleceń</p>
                </div>
            </div>

            <div className="space-y-2.5 mb-6">
                <div className="flex items-center text-sm text-gray-600 gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {client.email || "Brak e-maila"}
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {client.phone || "Brak telefonu"}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center text-[13px] text-gray-500">
                <span>Rowerów zarejestrowanych:</span>
                <span className="font-semibold text-gray-700">{client.bikes?.length || 0}</span>
            </div>
        </div>
    )
}