export default function Button({ children, className = "", ...props }) {
    return (
        <button
            className={`bg-[#009ceb] hover:bg-[#0088cc] text-white px-5 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}