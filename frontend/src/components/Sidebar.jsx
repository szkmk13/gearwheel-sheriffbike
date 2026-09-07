import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

export default function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 bg-[#1A1613] text-[#F6F2EB] min-h-screen flex flex-col border-r border-[#E3DBCE]/10">
            {/* LOGO */}
            <div className='p-6 text-xl font-bold border-b border-[#E3DBCE]/10 tracking-tight'>
                SHERIFF <span style={{ color: 'var(--color-accent)' }}>BIKE</span>
            </div>

            {/* NAVIGATION - usunięto niedziałający Magazyn */}
            <nav className='flex-1 p-4 space-y-1.5'>
                <Link to="/panel" className='block p-3 rounded-lg hover:bg-white/5 transition font-medium'>Dashboard</Link>
                <Link to="/panel/orders" className='block p-3 rounded-lg hover:bg-white/5 transition font-medium'>Zlecenia</Link>
                <Link to="/panel/clients" className='block p-3 rounded-lg hover:bg-white/5 transition font-medium'>Klienci</Link>
            </nav>

            {/* USER PROFILE */}
            <div className='p-4 border-t border-[#E3DBCE]/10 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <div 
                        className='w-10 h-10 rounded-full flex items-center justify-center font-bold uppercase text-sm'
                        style={{ backgroundColor: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
                    >
                        {user?.username ? user.username.substring(0, 2) : '??'}
                    </div>
                    <div>
                        <p className='text-sm font-medium text-white'>
                            {user?.username || 'Ładowanie...'}
                        </p>
                        <p className='text-xs text-[#8C8378]'>
                            {user?.is_staff ? 'Administrator' : 'Serwisant'}
                        </p>
                    </div>
                </div>
                
                <button 
                    onClick={logout} 
                    className="p-2 text-[#8C8378] hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="Wyloguj się"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </aside>
    )
}