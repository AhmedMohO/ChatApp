import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '../hooks/queries/useUser';

const AuthContext = createContext(null);

export const API_URL = '/api';

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('wa_token') || null);
  const queryClient = useQueryClient();

  // Set default auth headers for axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  // Manage user query with React Query
  const { data: user, isLoading: userLoading, error } = useUser(token);

  const loading = token ? userLoading : false;

  useEffect(() => {
    if (error && token) {
      console.error('Failed to verify token', error);
      logout();
    }
  }, [error, token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: receivedToken, user: loggedUser } = res.data.data;
      
      localStorage.setItem('wa_token', receivedToken);
      setToken(receivedToken);
      queryClient.setQueryData(['user', 'me'], loggedUser);
      return { success: true };
    } catch (err) {
      console.error('Login error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Login failed. Please try again.' 
      };
    }
  };

  const register = async (username, email, password, avatar) => {
    try {
      const res = await axios.post(`${API_URL}/auth/register`, { username, email, password, avatar });
      const { token: receivedToken, user: registeredUser } = res.data.data;

      localStorage.setItem('wa_token', receivedToken);
      setToken(receivedToken);
      queryClient.setQueryData(['user', 'me'], registeredUser);
      return { success: true };
    } catch (err) {
      console.error('Registration error:', err);
      return { 
        success: false, 
        message: err.response?.data?.message || 'Registration failed.' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('wa_token');
    setToken(null);
    queryClient.setQueryData(['user', 'me'], null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
