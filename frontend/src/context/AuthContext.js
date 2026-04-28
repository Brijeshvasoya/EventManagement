import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { LOGOUT } from '@/features/events/graphql/queries';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const client = useApolloClient();
  const [logoutMutation] = useMutation(LOGOUT);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 < Date.now()) throw new Error('Token expired');
        setUser({ id: decoded.id, role: decoded.role, name: decoded.name, email: decoded.email, createdAt: decoded.createdAt, isPlanPurchased: decoded.isPlanPurchased, planId: decoded.planId });
      } catch (e) {
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  const login = (token, returnUrl = '/') => {
    localStorage.setItem('token', token);
    const decoded = jwtDecode(token);
    setUser({ id: decoded.id, role: decoded.role, name: decoded.name, email: decoded.email, createdAt: decoded.createdAt, isPlanPurchased: decoded.isPlanPurchased, planId: decoded.planId });
    router.push(returnUrl);
  };

  const logout = async () => {
    try {
      await logoutMutation();
    } catch (e) {
      console.error("Logout mutation failed", e);
    }
    localStorage.removeItem('token');
    await client.clearStore();
    setUser(null);
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
