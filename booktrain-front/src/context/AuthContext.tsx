import {
    createContext, useState,
    useEffect, useCallback, type ReactNode
} from "react";
import { authApi } from "../api/auth";


interface User {
    id: number;
    email: string;
    fullName: string;
    phoneNumber?: string;
    dateOfBirth?: string; 
    avatarUrl?: string;
    accountType?: string;
    status?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        fullName: string;
        phoneNumber?: string;
        dateOfBirth?: string;
    }) => Promise<void>;
    logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }, []);

    useEffect(() => {
        if (!token) {
            setIsLoading(false);
            return;
        }
        authApi.getMe()
            .then((res) => {
                // Backend trả thẳng object User, không có wrapper success/data
                console.log("getMe response:", res.data);
                if (res.data.id) setUser(res.data);
                else logout();
            })
            .catch(() => logout())
            .finally(() => setIsLoading(false));
    }, [token, logout]);

    async function login(identifier: string, password: string) {
        const res = await authApi.login(identifier, password);
        console.log("Response từ backend:", res.data); 
        if (!res.data.token) throw new Error(res.data.message || "Đăng nhập thất bại!");
        const { token: t, ...userData } = res.data;
        console.log("userData set vào user:", userData); 
        localStorage.setItem("token", t);
        setToken(t);
        setUser(userData);
    }

    async function register(data: {
        email: string;
        password: string;
        fullName: string;
        phoneNumber?: string;
        dateOfBirth?: string;
    }) {
        const res = await authApi.register(data);
        if (!res.data.success) throw new Error(res.data.message);
        // Đăng ký xong → tự động login luôn
        await login(data.email, data.password);
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!user,
            isLoading,
            login,
            register,
            logout,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

