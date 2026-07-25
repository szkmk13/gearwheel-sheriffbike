export default function Input({
    label,
    type = "text",
    placeholder,
    value,
    defaultValue,
    onChange,
    required = false
}) {
    return (
        <div className="flex flex-col gap-1.5 mb-4">
            {label && (
                <label className="text-sm font-medium text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}

            <input
                type={type}
                placeholder={placeholder}
                value={value}
                defaultValue={defaultValue}
                onChange={onChange}
                required={required}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-400 text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-[#009ceb]/50 focus:border-[#009ceb] transition-all shadow-sm"
            />
        </div>
    );
}