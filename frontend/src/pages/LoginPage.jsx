import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import toast from 'react-hot-toast';

export default function LoginPage() {
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const formData = new FormData(e.target);
        
        try {
            await login({
                username: formData.get('username'),
                password: formData.get('password')
            });
            navigate('/panel');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
                        SHERIFF <span className="text-[#d96b27]">BIKE</span>
                    </h1>
                    <p className="text-gray-500 text-sm">Zaloguj się do panelu zarządzania warsztatem</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input 
                        name="username" 
                        label="Nazwa użytkownika" 
                        placeholder="Wpisz login..." 
                        required={true} 
                    />
                    
                    <Input 
                        name="password" 
                        label="Hasło" 
                        type="password" 
                        placeholder="••••••••" 
                        required={true} 
                    />

                    {/* Przycisk w kolorze pomarańczowym pasującym do motywu serwisu */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-4 bg-[#d96b27] hover:bg-[#c25d1f] text-white font-semibold rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center cursor-pointer disabled:opacity-50"
                    >
                        {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>
            </div>
        </div>
    );
}