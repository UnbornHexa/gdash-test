import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  name?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to get initial auth state from localStorage
const getInitialAuthState = () => {
  try {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser) as User,
      };
    }
  } catch (error) {
    console.error('Erro ao carregar dados do localStorage:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  return { token: null, user: null };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize state directly from localStorage (synchronously)
  const initialState = getInitialAuthState();
  const [user, setUser] = useState<User | null>(initialState.user);
  const [token, setToken] = useState<string | null>(initialState.token);
  const [isLoading, setIsLoading] = useState(true);

  // Validate token with backend on mount
  useEffect(() => {
    const validateToken = async () => {
      if (token) {
        try {
          // Try to fetch user profile to validate token
          const response = await api.get('/users/profile/me');
          const userData = response.data;
          setUser({
            id: userData._id || userData.id,
            email: userData.email,
            name: userData.name,
            location: userData.location,
          });
          localStorage.setItem('user', JSON.stringify({
            id: userData._id || userData.id,
            email: userData.email,
            name: userData.name,
            location: userData.location,
          }));
        } catch (error) {
          // Token is invalid, clear it
          console.error('Token inválido ou expirado:', error);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      // Always set loading to false after validation check (or if no token)
      setIsLoading(false);
    };

    validateToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user: userData } = response.data;
    
    setToken(access_token);
    setUser(userData);
    localStorage.setItem('token', access_token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const updateUser = async () => {
    try {
      const response = await api.get('/users/profile/me');
      const userData = response.data;
      setUser({
        id: userData._id || userData.id,
        email: userData.email,
        name: userData.name,
        location: userData.location,
      });
      localStorage.setItem('user', JSON.stringify({
        id: userData._id || userData.id,
        email: userData.email,
        name: userData.name,
        location: userData.location,
      }));
    } catch (error) {
      console.error('Erro ao atualizar perfil do usuário:', error);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser,
        isAuthenticated: !!token,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
