export default function Select({
    label,
    options = [],
    placeholder = "Wybierz...",
    required = false,
    ...props
}) {
    const selectProps = { ...props };
    if (selectProps.value === undefined && selectProps.defaultValue === undefined) {
        selectProps.defaultValue = "";
    }

    return (
        <div className="flex flex-col gap-1.5 mb-4">
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <select
                required={required}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] transition-all shadow-sm"
                {...selectProps} 
            >
                <option value="" disabled hidden>{placeholder}</option>
                
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
}