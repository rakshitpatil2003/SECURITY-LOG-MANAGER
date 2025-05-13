const vault = require('node-vault');

let vaultClient;

// Initialize Vault client
const getVaultClient = () => {
  if (vaultClient) return vaultClient;

  vaultClient = vault({
    apiVersion: 'v1',
    endpoint: process.env.VAULT_ADDR,
    token: process.env.VAULT_TOKEN,
  });

  return vaultClient;
};

// Initialize Vault with necessary secrets
const initializeVault = async () => {
  try {
    const client = getVaultClient();

    // Check if Vault is initialized
    const status = await client.initialized();
    if (!status.initialized) {
      console.error('Vault is not initialized. Please initialize Vault');
      throw new Error('Vault not initialized');
    }

    // Check if secrets engine exists
    try {
      await client.mounts();
    } catch (error) {
      // Mount the KV secrets engine if needed
      await client.mount({
        mount_point: 'secret',
        type: 'kv',
        options: {
          version: '2',
        },
      });
    }

    // Create or update secrets
    const secrets = {
      'opensearch': {
        host: process.env.OPENSEARCH_HOST,
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD,
      },
      'kafka': {
        brokers: process.env.KAFKA_BOOTSTRAP_SERVERS,
        clientId: process.env.KAFKA_CLIENT_ID,
        consumerGroupId: process.env.KAFKA_CONSUMER_GROUP_ID,
      },
      'graylog': {
        host: process.env.GRAYLOG_HOST,
        port: process.env.GRAYLOG_PORT,
        username: process.env.GRAYLOG_USERNAME,
        password: process.env.GRAYLOG_PASSWORD,
        streamId: process.env.GRAYLOG_STREAM_ID,
      },
      'jumpserver': {
        host: process.env.JUMP_SERVER_HOST,
        port: process.env.JUMP_SERVER_PORT,
        username: process.env.JUMP_SERVER_USER,
        password: process.env.JUMP_SERVER_PASSWORD,
      },
      'app': {
        jwtSecret: 'security-log-manager-secret',
        adminUsername: 'admin',
        adminPassword: 'admin',
      }
    };

    // Store all secrets in Vault
    for (const [key, value] of Object.entries(secrets)) {
      try {
        await client.write(`secret/data/${key}`, { data: value });
        console.log(`Secret '${key}' stored in Vault`);
      } catch (error) {
        console.error(`Error storing secret '${key}' in Vault:`, error);
      }
    }

    console.log('Vault initialized with all necessary secrets');
    
    return client;
  } catch (error) {
    console.error('Error initializing Vault:', error);
    
    // Fallback mechanism when Vault is not available
    console.warn('Using environment variables as fallback instead of Vault...');
    return null;
  }
};

// Get a secret from Vault
const getSecret = async (path) => {
  try {
    const client = getVaultClient();
    const result = await client.read(`secret/data/${path}`);
    return result.data.data;
  } catch (error) {
    console.error(`Error retrieving secret '${path}' from Vault:`, error);
    throw error;
  }
};

// Store a secret in Vault
const storeSecret = async (path, data) => {
  try {
    const client = getVaultClient();
    await client.write(`secret/data/${path}`, { data });
  } catch (error) {
    console.error(`Error storing secret '${path}' in Vault:`, error);
    throw error;
  }
};

module.exports = {
  getVaultClient,
  initializeVault,
  getSecret,
  storeSecret,
};