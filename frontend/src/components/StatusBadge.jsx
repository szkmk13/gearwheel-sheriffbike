const statusMap = {
    accepted: { label: 'Przyjęte', className: 'bg-blue-100 text-blue-700' },
    diagnosing: { label: 'Diagnoza', className: 'bg-yellow-100 text-yellow-800' },
    waiting_parts: { label: 'Czeka na części', className: 'bg-purple-100 text-purple-700' },
    in_progress: { label: 'W trakcie', className: 'bg-blue-100 text-blue-700' },
    done: { label: 'Gotowe', className: 'bg-green-100 text-green-700' },
    delivered: { label: 'Odebrane', className: 'bg-gray-100 text-gray-500' },
    cancelled: { label: 'Anulowane', className: 'bg-red-100 text-red-700' },
    OK: { label: 'OK', className: 'bg-green-100 text-green-700' },
    'Niski stan': { label: 'Niski stan', className: 'bg-orange-100 text-orange-700' }
};

export default function StatusBadge({ status }) {
    const config = statusMap[status] || { 
        label: status, 
        className: 'bg-gray-100 text-gray-700' 
    };

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}