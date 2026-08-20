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
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Sheriff Bike</h1>
                    <p className="text-gray-500">Zaloguj się do panelu zarządzania warsztatem</p>
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

                    <Button 
                        type="submit" 
                        className="w-full justify-center py-3 text-base" 
                        disabled={isLoading}
                    >
                        {isLoading ? 'Logowanie...' : 'Zaloguj się'}
                    </Button>
                </form>
            </div>
        </div>
    );
}