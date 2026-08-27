import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from "../components/Sidebar";

export default function MainLayout() {
    const { user, isLoading } = useAuth();

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
        <div className="flex h-screen overflow-hidden bg-gray-100">    
            <Sidebar />

            <main className="flex-1 overflow-y-auto">
                <Outlet />
            </main>
        </div>
    );
}