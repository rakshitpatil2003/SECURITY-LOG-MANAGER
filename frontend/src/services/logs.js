// src/services/logs.js - Updated service file for better search and pagination
import api from './auth';

// Get logs with pagination, filtering and sorting
// In src/services/logs.js, update the getLogs function to add more detailed logging:
export const getLogs = async (params = {}) => {
  try {
    console.log('LOGS SERVICE: Request params:', params);
    
    const response = await api.get('/logs', { params });
    
    console.log('LOGS SERVICE: Response pagination:', response.data.pagination);
    console.log(`LOGS SERVICE: Got ${response.data.logs?.length} logs out of ${response.data.pagination?.total} total`);
    
    // Verify response has expected structure
    if (!response.data.logs || !Array.isArray(response.data.logs)) {
      console.error('LOGS SERVICE: Invalid response format:', response.data);
    }
    
    // If this is not page 1, log some IDs to confirm they're different
    if (params.page && params.page > 1 && response.data.logs?.length > 0) {
      console.log('LOGS SERVICE: First few IDs on this page:', 
        response.data.logs.slice(0, 3).map(log => log.id || log._id));
    }
    
    return response.data;
  } catch (error) {
    console.error('LOGS SERVICE: Error fetching logs:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch logs');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get MITRE ATT&CK logs
export const getMitreLogs = async (params = {}) => {
  try {
    console.log('Fetching MITRE logs with params:', params);
    
    const response = await api.get('/logs/mitre', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} MITRE logs out of ${response.data.pagination?.total}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching MITRE logs:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch MITRE logs');
    }
    throw new Error('Network error. Please try again.');
  }
};
// Get log by ID
export const getLogById = async (id) => {
  try {
    const response = await api.get(`/logs/${id}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch log details');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Get dashboard statistics
export const getLogStats = async (timeRange = '24h') => {
  try {
    const response = await api.get('/logs/stats/overview', { 
      params: { timeRange } 
    });
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch log statistics');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Generate ticket for a log
export const generateTicket = async (logData, description, assignedToId = null) => {
  try {
    const payload = {
      logData,
      description,
      includeFullLog: true
    };
    
    if (assignedToId) {
      payload.assignedToId = assignedToId;
    }
    
    const response = await api.post('/tickets', payload);
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to generate ticket');
    }
    throw new Error('Network error. Please try again.');
  }
};