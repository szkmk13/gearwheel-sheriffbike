export default function Button({ children, className = "", ...props }) {
    return (
        <button
            className={`bg-accent hover:bg-accent-deep text-white px-5 py-2.5 rounded-md font-medium text-sm transition-colors shadow-sm flex items-center gap-2 cursor-pointer ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}