const axios = require('axios');
const { sendMessage } = require('../config/kafka');
const { getSecret } = require('../config/vault');

// Default configuration
const DEFAULT_POLL_INTERVAL = 10000; // 10 seconds
const DEFAULT_BATCH_SIZE = 100;

let isRunning = false;
let lastTimestamp = null;
let pollInterval = DEFAULT_POLL_INTERVAL;
let batchSize = DEFAULT_BATCH_SIZE;

// Get Graylog configuration
const getGraylogConfig = async () => {
  try {
    // Try to get from Vault
    const config = await getSecret('graylog');
    return {
      host: config.host || process.env.GRAYLOG_HOST,
      port: config.port || process.env.GRAYLOG_PORT,
      username: config.username || process.env.GRAYLOG_USERNAME,
      password: config.password || process.env.GRAYLOG_PASSWORD,
      streamId: config.streamId || process.env.GRAYLOG_STREAM_ID
    };
  } catch (error) {
    console.error('Error getting Graylog config from Vault:', error);
    // Fallback to environment variables
    return {
      host: process.env.GRAYLOG_HOST,
      port: process.env.GRAYLOG_PORT,
      username: process.env.GRAYLOG_USERNAME,
      password: process.env.GRAYLOG_PASSWORD,
      streamId: process.env.GRAYLOG_STREAM_ID
    };
  }
};

// Create Graylog API client
const createGraylogClient = async () => {
  const config = await getGraylogConfig();
  
  // Create base64 encoded credentials
  const credentials = Buffer.from(`${config.username}:${config.password}`).toString('base64');
  
  return {
    baseURL: `http://${config.host}:${config.port}`,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    streamId: config.streamId
  };
};

// Get logs from Graylog
const getLogsFromGraylog = async (since, limit) => {
  try {
    const client = await createGraylogClient();
    
    // Build query
    let query = {};
    
    if (since) {
      // Convert timestamp to Graylog range format
      const timestamp = new Date(since).toISOString();
      query.range = `timestamp:>${timestamp}`;
    }
    
    // Make API request to Graylog
    const response = await axios.get(
      `${client.baseURL}/api/search/universal/relative`, 
      {
        params: {
          query: query.range || '',
          limit: limit || batchSize,
          offset: 0,
          filter: `streams:${client.streamId}`,
          fields: '*',
          sort: 'timestamp:asc'
        },
        headers: client.headers
      }
    );
    
    return response.data.messages.map(m => m.message);
  } catch (error) {
    console.error('Error fetching logs from Graylog:', error);
    return [];
  }
};

// Poll Graylog for new logs and push to Kafka
const pollGraylog = async () => {
  if (!isRunning) return;
  
  try {
    // Get logs since last timestamp
    const logs = await getLogsFromGraylog(lastTimestamp, batchSize);
    
    if (logs.length > 0) {
      // Update last timestamp to the timestamp of the latest log
      const latestLog = logs[logs.length - 1];
      // Make sure we're using the correct timestamp format that Graylog expects
      lastTimestamp = latestLog.timestamp || new Date().toISOString();
      
      console.log(`Fetched ${logs.length} logs from Graylog. Latest timestamp: ${lastTimestamp}`);
      
      // Send logs to Kafka
      for (const log of logs) {
        await sendMessage(process.env.KAFKA_LOG_TOPIC, log);
      }
    } else {
      console.log('No new logs from Graylog');
    }
  } catch (error) {
    console.error('Error polling Graylog:', error);
  }
  
  // Schedule next poll
  if (isRunning) {
    setTimeout(pollGraylog, pollInterval);
  }
};

// Start polling Graylog
const startGraylogPolling = async (options = {}) => {
  // Set options
  pollInterval = options.pollInterval || DEFAULT_POLL_INTERVAL;
  batchSize = options.batchSize || DEFAULT_BATCH_SIZE;
  
  // If no specific timestamp is provided, go back 1 hour
  if (!options.since) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    lastTimestamp = oneHourAgo.toISOString();
  } else {
    lastTimestamp = options.since;
  }
  
  // Start polling
  console.log(`Starting Graylog polling service (since: ${lastTimestamp})`);
  isRunning = true;
  await pollGraylog();
  
  return { isRunning };
};

// Stop polling Graylog
const stopGraylogPolling = () => {
  console.log('Stopping Graylog polling service');
  isRunning = false;
  
  return { isRunning };
};

module.exports = {
  startGraylogPolling,
  stopGraylogPolling
};