export default function SlidePanel ({ isOpen, onClose, children }) {
    return (
        <>
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 transition-opacity"
                    onClick={onClose} 
                />
            )}

            <div
                className={`fixed top-0 right-0 w-full md:w-[600px] h-full bg-[#F6F2EB] shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col 
                    ${ isOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="p-6 bg-white border-b border-[#E3DBCE] flex items-center shadow-2xs">
                    <button
                        onClick={onClose}
                        className="p-2 border border-transparent hover:border-[#E3DBCE] hover:bg-gray-100 rounded-full transition-colors cursor-pointer text-gray-700"
                        title="Zamknij panel"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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