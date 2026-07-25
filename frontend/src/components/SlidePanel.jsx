export default function SlidePanel ({ isOpen, onClose, children }) {
    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/20 z-40 transition-opacity"
                    onClick={onClose} 
                />
            )}

            <div
                className={`fixed top-0 right-0 w-full md:w-[600px] h-full bg-gray-50 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col 
                    ${ isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 bg-white border-b border-gray-200 flex items-center">
                    <button
                        onClick={onClose}
                        className="p-2 border border-transparent hover:border-gray-200 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                    >
                        <svg className="w-6 h-6 text-gray-800" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </>
    )
}