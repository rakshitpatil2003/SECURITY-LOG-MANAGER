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

// Get HIPAA logs
export const getHipaaLogs = async (params = {}) => {
  try {
    console.log('Fetching HIPAA logs with params:', params);
    
    const response = await api.get('/logs/hipaa', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} HIPAA logs out of ${response.data.pagination?.total}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching HIPAA logs:', error);
    if (error.response) {
      throw new Error(error.response.data.message || 'Failed to fetch HIPAA logs');
    }
    throw new Error('Network error. Please try again.');
  }
};

// Update the service function error handling:
export const getGdprLogs = async (params = {}) => {
  try {
    console.log('Fetching GDPR logs with params:', params);
    
    const response = await api.get('/logs/gdpr', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} GDPR logs out of ${response.data.pagination?.total}`);
    
    return response.data;
  } catch (error) {
    console.error('Error fetching GDPR logs:', error);
    
    // Detailed error handling
    if (error.response) {
      console.error('Error details:', error.response.data);
      
      // Handle specific field data errors
      if (error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('field data')) {
        throw new Error('The server encountered an issue with country field aggregations. Some visualizations may not display correctly.');
      }
      
      throw new Error(error.response.data.message || 'Failed to fetch GDPR logs');
    }
    
    throw new Error('Network error. Please try again.');
  }
};

// Get NIST logs
export const getNistLogs = async (params = {}) => {
  try {
    console.log('Fetching NIST logs with params:', params);
    
    const response = await api.get('/logs/nist', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} NIST logs out of ${response.data.pagination?.total}`);
    
    // Log first few results to verify pagination works
    if (params.page && params.page > 1 && response.data.logs?.length > 0) {
      console.log('Page number requested:', params.page);
      console.log('First few log IDs on this page:', 
        response.data.logs.slice(0, 3).map(log => log.id || log._id));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching NIST logs:', error);
    
    // Detailed error handling
    if (error.response) {
      console.error('Error details:', error.response.data);
      
      // Handle specific field data errors
      if (error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('field data')) {
        throw new Error('The server encountered an issue with field aggregations. Some visualizations may not display correctly.');
      }
      
      throw new Error(error.response.data.message || 'Failed to fetch NIST logs');
    }
    
    throw new Error('Network error. Please try again.');
  }
};

// Get PCI DSS logs
export const getPciDssLogs = async (params = {}) => {
  try {
    console.log('Fetching PCI DSS logs with params:', params);
    
    const response = await api.get('/logs/pcidss', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} PCI DSS logs out of ${response.data.pagination?.total}`);
    
    // Log first few results to verify pagination works
    if (params.page && params.page > 1 && response.data.logs?.length > 0) {
      console.log('Page number requested:', params.page);
      console.log('First few log IDs on this page:', 
        response.data.logs.slice(0, 3).map(log => log.id || log._id));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching PCI DSS logs:', error);
    
    // Detailed error handling
    if (error.response) {
      console.error('Error details:', error.response.data);
      
      // Handle specific field data errors
      if (error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('field data')) {
        throw new Error('The server encountered an issue with field aggregations. Some visualizations may not display correctly.');
      }
      
      throw new Error(error.response.data.message || 'Failed to fetch PCI DSS logs');
    }
    
    throw new Error('Network error. Please try again.');
  }
};
// Add this function to your services/logs.js file

// Get TSC logs
export const getTscLogs = async (params = {}) => {
  try {
    console.log('Fetching TSC logs with params:', params);
    
    const response = await api.get('/logs/tsc', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} TSC logs out of ${response.data.pagination?.total}`);
    
    // Log first few results to verify pagination works
    if (params.page && params.page > 1 && response.data.logs?.length > 0) {
      console.log('Page number requested:', params.page);
      console.log('First few log IDs on this page:', 
        response.data.logs.slice(0, 3).map(log => log.id || log._id));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching TSC logs:', error);
    
    // Detailed error handling
    if (error.response) {
      console.error('Error details:', error.response.data);
      
      // Handle specific field data errors
      if (error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('field data')) {
        throw new Error('The server encountered an issue with field aggregations. Some visualizations may not display correctly.');
      }
      
      throw new Error(error.response.data.message || 'Failed to fetch TSC logs');
    }
    
    throw new Error('Network error. Please try again.');
  }
};
// Get vulnerability logs 
export const getVulnerabilityLogs = async (params = {}) => {
  try {
    console.log('Fetching vulnerability logs with params:', params);
    
    const response = await api.get('/logs/vulnerability', { params });
    
    if (!response.data || !response.data.logs) {
      throw new Error('Invalid response format from server');
    }
    
    console.log(`Received ${response.data.logs.length} vulnerability logs out of ${response.data.pagination?.total}`);
    
    // Log first few results to verify pagination works
    if (params.page && params.page > 1 && response.data.logs?.length > 0) {
      console.log('Page number requested:', params.page);
      console.log('First few log IDs on this page:', 
        response.data.logs.slice(0, 3).map(log => log.id || log._id));
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching vulnerability logs:', error);
    
    // Detailed error handling
    if (error.response) {
      console.error('Error details:', error.response.data);
      
      // Handle specific field data errors
      if (error.response.data && 
          error.response.data.message && 
          error.response.data.message.includes('field data')) {
        throw new Error('The server encountered an issue with field aggregations. Some visualizations may not display correctly.');
      }
      
      throw new Error(error.response.data.message || 'Failed to fetch vulnerability logs');
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