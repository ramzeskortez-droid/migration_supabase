import { useState, useEffect } from 'react';
import { AppUser } from '../types';
import { SupabaseService } from '../services/supabaseService';

export const useOperatorAuth = (onLog: (msg: string) => void) => {
    const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
    const [isAuthChecking, setIsAuthChecking] = useState(true);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('operatorToken');
            if (token) {
                try {
                    const user = await SupabaseService.loginWithToken(token);
                    if (user && (user.role === 'operator' || user.role === 'admin')) {
                        setCurrentUser(user);
                        onLog(`Восстановлена сессия оператора: ${user.name}`);
                    } else {
                        localStorage.removeItem('operatorToken');
                    }
                } catch (e) {
                    console.error('Auth Check Error:', e);
                }
            }
            setIsAuthChecking(false);
        };
        checkAuth();
    }, [onLog]);

    const login = (user: AppUser) => {
        setCurrentUser(user);
        localStorage.setItem('operatorToken', user.token);
        onLog(`Оператор ${user.name} вошел в систему.`);
    };

    const logout = () => {
        setCurrentUser(null);
        localStorage.removeItem('operatorToken');
    };

    return { currentUser, isAuthChecking, login, logout };
};
