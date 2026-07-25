export default function Button({ children, onClick, className = "" }) {
    return (
        <button
            onClick={onClick}
            className={'bg-[#009ceb] hover:bg-[#0088cc] text-white px-5 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2 ${className}'}
        >
            {children}
        </button>
    );
}