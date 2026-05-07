import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { jwtDecode } from 'jwt-decode';
import { useApolloClient, useMutation } from '@apollo/client/react';
import { LOGOUT } from '@/features/events/graphql/mutations';
import { GET_ME } from '@/features/events/graphql/queries';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const client = useApolloClient();
  const [logoutMutation] = useMutation(LOGOUT);

  const fetchUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // 1. Try to get fresh user data from server (handles plan sync)
      const { data } = await client.query({
        query: GET_ME,
        fetchPolicy: 'network-only'
      });

      if (data?.me) {
        setUser(data.me);
      } else {
        throw new Error('User not found');
      }
    } catch (e) {
      console.warn("Auth: Server sync failed, falling back to token", e.message);
      try {
        const decoded = jwtDecode(token);
        if (decoded.exp * 1000 > Date.now()) {
          setUser({
            id: decoded.id,
            role: decoded.role,
            name: decoded.name,
            email: decoded.email,
            isPlanPurchased: decoded.isPlanPurchased,
            planId: decoded.planId,
            planExpiresAt: decoded.planExpiresAt
          });
        } else {
          localStorage.removeItem('token');
          setUser(null);
        }
      } catch (tokenErr) {
        localStorage.removeItem('token');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = (token, returnUrl = '/') => {
    localStorage.setItem('token', token);
    fetchUser().then(() => {
      router.push(returnUrl);
    });
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
    <AuthContext.Provider value={{ user, loading, login, logout, setUser, refreshUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
