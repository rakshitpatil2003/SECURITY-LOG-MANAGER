import api from './auth';

// Get all users
export const getUsers = async () => {
  try {
    const response = await api.get('/users');
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch users');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get user by ID
export const getUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch user details');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Create user
export const createUser = async (userData) => {
  try {
    const response = await api.post('/users', userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to create user');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Update user
export const updateUser = async (id, userData) => {
  try {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to update user');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Reset user password
export const resetPassword = async (id, password, temporary = false) => {
  try {
    const response = await api.post(`/users/${id}/reset-password`, { password, temporary });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to reset password');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Delete user
export const deleteUser = async (id) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to delete user');
    }
    throw new Error('Network error. Please try again.');
  }
};