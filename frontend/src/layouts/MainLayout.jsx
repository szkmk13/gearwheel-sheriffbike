import { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from "../components/Sidebar";
import QRScannerModal from "../components/QRScannerModal";

export default function MainLayout() {
    const { user, isLoading } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
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
        <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-[var(--color-paper)]">
            {/* Pasek górny na urządzeniach mobilnych z przyciskiem skanera i hamburgera */}
            <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#1A1613] text-[#F6F2EB] border-b border-[#E3DBCE]/10 shrink-0 z-30">
                <div className="text-lg font-bold tracking-tight">
                    SHERIFF <span style={{ color: 'var(--color-accent)' }}>BIKE</span>
                </div>
                
                <div className="flex items-center gap-1.5">
                    {/* Szybki przycisk skanera QR na telefonach w nagłówku */}
                    <button
                        type="button"
                        onClick={() => setIsQRScannerOpen(true)}
                        className="px-2.5 py-1.5 rounded-lg text-white bg-white/10 hover:bg-white/15 transition-colors focus:outline-none cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
                        aria-label="Skanuj kod QR"
                        title="Skanuj kod QR"
                    >
                        <svg className="w-4 h-4 text-[var(--color-accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                        </svg>
                        <span>Skanuj QR</span>
                    </button>

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
                </div>
            </header>

            {/* Panel boczny */}
            <Sidebar 
                isOpen={isMobileMenuOpen} 
                onClose={() => setIsMobileMenuOpen(false)} 
                onOpenScanner={() => setIsQRScannerOpen(true)}
            />

            {/* Główna zawartość */}
            <main className="flex-1 overflow-y-auto min-w-0 bg-[var(--color-paper)]">
                <Outlet />
            </main>

            {/* Modal skanera kodów QR */}
            <QRScannerModal 
                isOpen={isQRScannerOpen} 
                onClose={() => setIsQRScannerOpen(false)} 
            />
        </div>
    );
}