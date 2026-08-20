import { createContext, useContext, useState, useEffect } from 'react';
import { fetchMe, loginApi, logoutApi } from '../api/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchMe()
            .then(userData => setUser(userData))
            .catch(() => setUser(null))
            .finally(() => setIsLoading(false));
    }, []);

    const login = async (credentials) => {
        const userData = await loginApi(credentials);
        setUser(userData);
        toast.success(`Witaj, ${userData.username}!`);
    };

    const logout = async () => {
        await logoutApi();
        setUser(null);
        toast.success('Wylogowano pomyślnie');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);