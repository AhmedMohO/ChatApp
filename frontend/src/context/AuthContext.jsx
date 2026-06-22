import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const API_URL = '/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('wa_token') || null);
  const [loading, setLoading] = useState(true);

  // Set default auth headers for axios
  if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common['Authorization'];
  }

  useEffect(() => {
    const verifyUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/auth/me`);
        setUser(res.data.user);
      } catch (err) {
        console.error('Failed to verify token', err);
        logout();
      } finally {
        setLoading(false);
      }
    };
    verifyUser();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/auth/login`, { email, password });
      const { token: receivedToken, user: loggedUser } = res.data;
      
      localStorage.setItem('wa_token', receivedToken);
      setToken(receivedToken);
      setUser(loggedUser);
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
      const { token: receivedToken, user: registeredUser } = res.data;

      localStorage.setItem('wa_token', receivedToken);
      setToken(receivedToken);
      setUser(registeredUser);
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
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
