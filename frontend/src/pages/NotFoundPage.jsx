import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-orange-100 text-center">
                
                <div className="inline-block px-4 py-1.5 mb-6 bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-bold text-sm rounded-full tracking-wider uppercase">
                    Błąd 404
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Strona spadła z rowerka!</h1>
                <p className="text-gray-500 text-sm mb-8">
                    Szukany adres nie istnieje.
                </p>

                <Button 
                    onClick={() => navigate('/')}
                    className="w-full justify-center"
                >
                    Powrót
                </Button>
            </div>
        </div>
    );
}