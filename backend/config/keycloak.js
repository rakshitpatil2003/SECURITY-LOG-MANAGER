// backend/config/keycloak.js
const Keycloak = require('keycloak-connect');
const axios = require('axios');
const session = require('express-session');

let keycloakInstance;
let memoryStore;

// Initialize Keycloak
const setupKeycloak = async (app) => {
  if (keycloakInstance) return keycloakInstance;

  try {
    // Use environment variables directly instead of Vault
    const config = {
      realm: process.env.KEYCLOAK_REALM,
      'auth-server-url': process.env.KEYCLOAK_URL,
      'ssl-required': 'external',
      resource: process.env.KEYCLOAK_CLIENT_ID,
      'confidential-port': 0,
      'bearer-only': true,
    };

    // If we have a client secret
    if (process.env.KEYCLOAK_CLIENT_SECRET) {
      config.credentials = {
        secret: process.env.KEYCLOAK_CLIENT_SECRET
      };
    }

    // Set up session for Keycloak
    memoryStore = new session.MemoryStore();
    
    app.use(session({
      secret: 'some secret',
      resave: false,
      saveUninitialized: true,
      store: memoryStore
    }));

    console.log('Creating Keycloak instance with config:', JSON.stringify(config, null, 2));

    keycloakInstance = new Keycloak({ store: memoryStore }, config);
    
    // Register Keycloak middleware
    app.use(keycloakInstance.middleware());

    console.log('Keycloak setup completed successfully');
    
    return keycloakInstance;
  } catch (error) {
    console.error('Error setting up Keycloak:', error);
    console.log('Running in development mode without Keycloak');
    return null;
  }
};

// Validate token with Keycloak
const validateToken = async (token) => {
  try {
    const realmName = process.env.KEYCLOAK_REALM;
    const keycloakUrl = process.env.KEYCLOAK_URL;
    
    const response = await axios.get(
      `${keycloakUrl}/realms/${realmName}/protocol/openid-connect/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error validating token with Keycloak:', error);
    throw error;
  }
};

// Get admin token to interact with Keycloak admin API
const getKeycloakAdminToken = async () => {
  try {
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const adminUser = process.env.KEYCLOAK_ADMIN_USER || 'admin';
    const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
    
    // Remove /auth prefix if it exists (for compatibility with different Keycloak versions)
    const baseUrl = keycloakUrl.replace(/\/auth$/, '');
    
    try {
      // Try the modern path (Keycloak 17+)
      const response = await axios.post(
        `${baseUrl}/realms/master/protocol/openid-connect/token`,
        new URLSearchParams({
          grant_type: 'password',
          client_id: 'admin-cli',
          username: adminUser,
          password: adminPassword,
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      
      return response.data.access_token;
    } catch (error) {
      // If that fails, try with /auth prefix (Keycloak 16 and earlier)
      if (error.response && error.response.status === 404) {
        console.log('Trying older Keycloak path with /auth prefix');
        const response = await axios.post(
          `${baseUrl}/auth/realms/master/protocol/openid-connect/token`,
          new URLSearchParams({
            grant_type: 'password',
            client_id: 'admin-cli',
            username: adminUser,
            password: adminPassword,
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        );
        
        return response.data.access_token;
      }
      throw error;
    }
  } catch (error) {
    console.error('Error getting Keycloak admin token:', error);
    throw error;
  }
};

// Custom middleware for Keycloak authentication with fallback
const keycloakMiddleware = (req, res, next) => {
  if (!keycloakInstance) {
    // If Keycloak is not initialized, allow in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode: Bypassing Keycloak authentication');
      
      // Set mock user in request
      req.user = {
        id: 'admin-id',
        username: 'admin',
        roles: ['admin'],
        email: 'admin@example.com',
        name: 'Administrator'
      };
      
      return next();
    }
    
    return res.status(500).json({ message: 'Authentication service not available' });
  }
  
  // Use Keycloak for authentication
  keycloakInstance.protect()(req, res, next);
};

module.exports = {
  setupKeycloak,
  keycloakMiddleware,
  validateToken,
  getKeycloakAdminToken
};