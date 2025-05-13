// frontend/src/services/auth.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://192.168.1.67:5000/api';

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_URL,
});

// Add interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Login user
export const loginUser = async (username, password) => {
  try {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Get user information
export const getUserInfo = async () => {
  try {
    const response = await api.get('/auth/userinfo');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to get user info');
  }
};

// Update profile
export const updateProfile = async (profileData) => {
  try {
    const response = await api.patch('/auth/profile', profileData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to update profile');
  }
};

// Change password
export const changePassword = async (currentPassword, newPassword) => {
  try {
    const response = await api.post('/auth/change-password', {
      currentPassword,
      newPassword
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Failed to change password');
  }
};

export default api;