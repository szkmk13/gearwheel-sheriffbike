import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; 

export default function Sidebar() {
    const { user, logout } = useAuth();

    return (
        <aside className="w-64 bg-gray-800 text-white min-h-screen flex flex-col">
            {/* LOGO */}
            <div className='p-6 text-xl font-bold border-b border-gray-700'>
                Sheriff Bike
            </div>

            {/* NAVIGATION */}
            <nav className='flex-1 p-4 space-y-2'>
                <Link to="/panel" className='block p-3 rounded hover:bg-gray-700 transition'>Dashboard</Link>
                <Link to="/panel/orders" className='block p-3 rounded hover:bg-gray-700 transition'>Zlecenia</Link>
                <Link to="/panel/inventory" className='block p-3 rounded hover:bg-gray-700 transition'>Magazyn</Link>
                <Link to="/panel/clients" className='block p-3 rounded hover:bg-gray-700 transition'>Klienci</Link>
            </nav>

            {/* USER PROFILE */}
            <div className='p-4 border-t border-gray-700 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                    <div className='w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold uppercase'>
                        {user?.username ? user.username.substring(0, 2) : '??'}
                    </div>
                    <div>
                        <p className='text-sm font-medium'>
                            {user?.username || 'Ładowanie...'}
                        </p>
                        <p className='text-xs text-gray-400'>
                            {user?.is_staff ? 'Administrator' : 'Serwisant'}
                        </p>
                    </div>
                </div>
                
                {/* Przycisk wylogowania */}
                <button 
                    onClick={logout} 
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
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