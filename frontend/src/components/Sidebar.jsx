import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

export default function Sidebar({ isOpen = false, onClose = () => {}, onOpenScanner = () => {} }) {
    const { user, logout } = useAuth();

    const navLinkClass = ({ isActive }) =>
        `flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all font-medium text-sm ${
            isActive
                ? 'bg-white/10 text-white font-semibold shadow-sm border-l-4 border-[var(--color-accent)]'
                : 'text-[#8C8378] hover:text-[#F6F2EB] hover:bg-white/5'
        }`;

    return (
        <>
            {/* Tło przyciemniające (Backdrop) dla widoku mobilnego */}
            {isOpen && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
                    aria-hidden="true"
                />
            )}

            {/* Panel boczny nawigacji */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1A1613] text-[#F6F2EB] flex flex-col border-r border-[#E3DBCE]/10 transition-transform duration-300 ease-in-out md:static md:translate-x-0 md:min-h-screen md:shrink-0 ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                {/* LOGO + przycisk zamknięcia na mobile */}
                <div className="p-6 text-xl font-bold border-b border-[#E3DBCE]/10 tracking-tight flex items-center justify-between">
                    <div>
                        SHERIFF <span style={{ color: 'var(--color-accent)' }}>BIKE</span>
                    </div>
                    {/* Przycisk zamknięcia widoczny tylko na mobile wewnątrz drawera */}
                    <button
                        onClick={onClose}
                        className="md:hidden p-1.5 text-[#8C8378] hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        aria-label="Zamknij menu"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* NAVIGATION */}
                <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
                    <NavLink to="/panel" end className={navLinkClass} onClick={onClose}>
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/panel/orders" className={navLinkClass} onClick={onClose}>
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                        </svg>
                        <span>Zlecenia</span>
                    </NavLink>

                    <NavLink to="/panel/clients" className={navLinkClass} onClick={onClose}>
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Klienci</span>
                    </NavLink>

                    {/* Szybki skaner kodów QR */}
                    <div className="pt-2 my-2 border-t border-white/5">
                        <button
                            type="button"
                            onClick={() => {
                                onClose();
                                if (onOpenScanner) onOpenScanner();
                            }}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all font-medium text-sm text-[#8C8378] hover:text-[#F6F2EB] hover:bg-white/5 cursor-pointer text-left group"
                            title="Szybkie skanowanie kodu QR aparatem"
                        >
                            <svg className="w-5 h-5 shrink-0 text-[#8C8378] group-hover:text-[var(--color-accent)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                            </svg>
                            <span className="flex-1">Skanuj kod QR</span>
                        </button>
                    </div>
                </nav>

                {/* USER PROFILE */}
                <div className="p-4 border-t border-[#E3DBCE]/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase text-sm shrink-0"
                            style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                        >
                            {user?.username ? user.username.substring(0, 2) : '??'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                                {user?.username || 'Ładowanie...'}
                            </p>
                            <p className="text-xs text-[#8C8378]">
                                {user?.is_staff ? 'Administrator' : 'Serwisant'}
                            </p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={logout} 
                        className="p-2 text-[#8C8378] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer shrink-0 ml-1"
                        title="Wyloguj się"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </aside>
        </>
    );
}