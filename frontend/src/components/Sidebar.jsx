import { Link } from 'react-router-dom';

export default function Sidebar() {
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
            <div className='p-4 border-t border-gray-700 flex items-center gap-3'>
                <div className='w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center font-bold'>
                    DT
                </div>
                <div>
                    <p className='text-sm font-medium'>Donald Jr. Trump</p>
                    <p className='text-xs text-gray-400'>Administrator</p>
                </div>
            </div>
        </aside>
    )
}