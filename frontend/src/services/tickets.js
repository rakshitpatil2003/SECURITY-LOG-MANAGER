import api from './auth';

// Get tickets with pagination and filtering
export const getTickets = async (params = {}) => {
  try {
    const response = await api.get('/tickets', { params });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch tickets');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get ticket by ID
export const getTicketById = async (id) => {
  try {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch ticket details');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Update ticket status
export const updateTicketStatus = async (id, status, description) => {
  try {
    const response = await api.patch(`/tickets/${id}/status`, { status, description });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to update ticket status');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Assign ticket to user
export const assignTicket = async (id, assignedToId) => {
  try {
    const response = await api.patch(`/tickets/${id}/assign`, { assignedToId });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to assign ticket');
    }
    throw new Error('Network error. Please try again.');
  }
};