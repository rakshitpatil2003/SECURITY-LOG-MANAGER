// frontend/src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, getUserInfo } from '../services/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          const userInfo = await getUserInfo();
          setCurrentUser(userInfo);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    
    initializeAuth();
  }, []);

  const handleLogin = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await loginUser(username, password);
      
      localStorage.setItem('token', response.token);
      setCurrentUser(response.user);
      
      return response.user;
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      
      localStorage.removeItem('token');
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    loading,
    error,
    login: handleLogin,
    logout: handleLogout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;