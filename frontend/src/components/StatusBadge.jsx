export default function StatusBadge({ status }) {
    let colorStyles = "bg-gray-100 text-gray-700";

    switch (status) {
        case "W trakcie":
            colorStyles = "bg-blue-100 text-blue-700";
            break;
        case "Gotowe":
            colorStyles = "bg-green-100 text-green-700"
            break;
        case "Odebrane":
            colorStyles = "bg-gray-100 text-gray-500"
            break;
        case "OK": 
            colorStyles = "bg-green-100 text-green-700";
            break;
        case "Niski stan":
            colorStyles = "bg-orange-100 text-orange-700"
            break;
    }

    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorStyles}`}>
            {status}
        </span>
    );
}
