import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
    const { user, isLoading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();

    // Automatyczne zamykanie menu po przejściu na nową trasę
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">
                Weryfikacja sesji...
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    return (
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-gray-100">
            {/* Pasek górny na urządzeniach mobilnych z przyciskiem hamburgera */}
            <header className="md:hidden flex items-center justify-between px-5 py-3.5 bg-[#1A1613] text-[#F6F2EB] border-b border-[#E3DBCE]/10 shrink-0 z-30">
                <div className="text-lg font-bold tracking-tight">
                    SHERIFF <span style={{ color: 'var(--color-accent)' }}>BIKE</span>
                </div>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 rounded-lg text-[#F6F2EB] hover:bg-white/10 transition-colors focus:outline-none cursor-pointer"
                    aria-label={isMobileMenuOpen ? "Zamknij menu nawigacji" : "Otwórz menu nawigacji"}
                >
                    {isMobileMenuOpen ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    )}
                </button>
            </header>

            {/* Panel boczny */}
            <Sidebar 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
            />

            {/* Główna zawartość */}
            <main className="flex-1 overflow-y-auto min-w-0">
                <Outlet />
            </main>
        </div>
    );
}