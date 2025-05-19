// scripts/high-volume-graylog-to-kafka.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');
const { Kafka } = require('kafkajs');
const { setTimeout } = require('timers/promises');
const fs = require('fs');
const path = require('path');

// Graylog configuration
const GRAYLOG_HOST = process.env.GRAYLOG_HOST || '192.168.1.68';
const GRAYLOG_PORT = process.env.GRAYLOG_PORT || '9000';
const GRAYLOG_USERNAME = process.env.GRAYLOG_USERNAME || 'admin';
const GRAYLOG_PASSWORD = process.env.GRAYLOG_PASSWORD || 'Virtual%09';
const GRAYLOG_STREAM_ID = process.env.GRAYLOG_STREAM_ID || '67c7e72cb78cd271d6481222';

// Kafka configuration
const KAFKA_BOOTSTRAP_SERVER = process.env.KAFKA_BOOTSTRAP_SERVERS || '192.168.1.139:29092';
const KAFKA_TOPIC = process.env.KAFKA_LOG_TOPIC || 'security-logs';

// Improved limits and configurations
const MAX_LOGS_PER_FETCH = 1000; // Reduced to avoid overwhelming the system
const POLLING_INTERVAL_MS = 5000; // Keep at 5 seconds
const MAX_BATCH_SIZE = 100; // Ensure batches are manageable
const CONCURRENT_REQUESTS = 2; // Limit concurrent API requests
const RETRY_ATTEMPTS = 5; // Increased retry attempts
const RETRY_DELAY_MS = 1000; // Delay between retry attempts
const CONNECTION_REFRESH_INTERVAL = 30 * 60 * 1000; // Refresh connections every 30 minutes
const CHECKPOINT_INTERVAL = 5 * 60 * 1000; // Save checkpoint every 5 minutes
const CHECKPOINT_FILE = path.join(__dirname, 'graylog_checkpoint.json');

// Create Kafka producer with improved error handling
const kafka = new Kafka({
  clientId: 'graylog-importer',
  brokers: [KAFKA_BOOTSTRAP_SERVER],
  connectionTimeout: 5000,
  requestTimeout: 30000,
  retry: {
    retries: 10,
    initialRetryTime: 300,
    maxRetryTime: 60000
  }
});

let producer;
let lastTimestamp = null;
let isRunning = true;
let lastConnectionRefresh = Date.now();
let lastCheckpointSave = Date.now();
let consecutiveEmptyFetches = 0;
const MAX_CONSECUTIVE_EMPTY = 10; // After this many empty fetches, force timestamp reset

// Improved error handling function with detailed logging
const handleError = (error, context) => {
  const errorDetails = {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    timestamp: new Date().toISOString(),
    context
  };
  
  console.error(`Error in ${context}:`, errorDetails);
  
  // Log to file for persistent debugging
  try {
    fs.appendFileSync(
      path.join(__dirname, 'graylog_errors.log'), 
      `[${new Date().toISOString()}] ${context}: ${JSON.stringify(errorDetails)}\n`
    );
  } catch (e) {
    // Silent catch if logging fails
  }
  
  return errorDetails;
};

// Save checkpoint to allow restarts from where we left off
const saveCheckpoint = async () => {
  try {
    const checkpoint = {
      lastTimestamp: lastTimestamp,
      savedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2));
    console.log(`Checkpoint saved: ${lastTimestamp}`);
    
    lastCheckpointSave = Date.now();
  } catch (error) {
    handleError(error, 'saveCheckpoint');
  }
};

// Load checkpoint if exists
const loadCheckpoint = () => {
  try {
    if (fs.existsSync(CHECKPOINT_FILE)) {
      const checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_FILE, 'utf8'));
      console.log(`Loaded checkpoint from ${checkpoint.savedAt}`);
      return checkpoint.lastTimestamp;
    }
  } catch (error) {
    handleError(error, 'loadCheckpoint');
  }
  return null;
};

// Function to fetch logs from Graylog with improved retry and timeout
const fetchLogsFromGraylog = async (sinceTimestamp = null, attempt = 1) => {
  try {
    // Determine time range
    const from = sinceTimestamp ? new Date(sinceTimestamp) : new Date(Date.now() - POLLING_INTERVAL_MS);
    const to = new Date();
    
    // Ensure 'from' is always before 'to' and valid timestamps
    if (from >= to || isNaN(from.getTime()) || isNaN(to.getTime())) {
      console.log(`Invalid time range detected. Resetting to last ${POLLING_INTERVAL_MS}ms`);
      const newFrom = new Date(Date.now() - POLLING_INTERVAL_MS);
      return fetchLogsFromGraylog(newFrom.toISOString(), attempt);
    }
    
    console.log(`Fetching logs from ${from.toISOString()} to ${to.toISOString()}`);
    
    const graylogUrl = `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/search/universal/absolute`;
    
    const response = await axios.get(graylogUrl, {
      params: {
        query: '*',
        from: from.toISOString(),
        to: to.toISOString(),
        limit: MAX_LOGS_PER_FETCH,
        fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol,rule_level,rule_description,event_type,agent_name,manager_name,id,raw_log,rule,agent,network,data',
        timeout: 60000  // Increased timeout to handle larger result sets
      },
      auth: {
        username: GRAYLOG_USERNAME,
        password: GRAYLOG_PASSWORD
      },
      headers: {
        'Accept': 'application/json',
        'X-Requested-By': 'XMLHttpRequest' // Some Graylog instances need this header
      },
      timeout: 60000  // Increased axios timeout
    });

    if (!response.data || !response.data.messages) {
      console.log('No logs found in this fetch');
      consecutiveEmptyFetches++;
      
      if (consecutiveEmptyFetches >= MAX_CONSECUTIVE_EMPTY) {
        console.log(`${MAX_CONSECUTIVE_EMPTY} consecutive empty fetches. Resetting timestamp...`);
        consecutiveEmptyFetches = 0;
        // Reset to short time ago to avoid missing logs
        const resetTo = new Date(Date.now() - (5 * 60 * 1000)); // 5 minutes ago
        return {
          messages: [],
          lastFetchTimestamp: resetTo.toISOString()
        };
      }
      
      return { messages: [], lastFetchTimestamp: to };
    }
    
    // Reset counter when we successfully get logs
    consecutiveEmptyFetches = 0;
    
    console.log(`Fetched ${response.data.messages.length} logs from Graylog`);
    
    // Return the last timestamp for the next fetch
    return {
      messages: response.data.messages,
      lastFetchTimestamp: to
    };
  } catch (error) {
    handleError(error, 'fetchLogsFromGraylog');
    
    // Special handling for common Graylog issues
    if (error.response && error.response.status === 400) {
      console.log('Bad request error. Possible timestamp issue. Resetting time window...');
      const resetTo = new Date(Date.now() - (5 * 60 * 1000)); // 5 minutes ago
      return {
        messages: [],
        lastFetchTimestamp: resetTo.toISOString()
      };
    }

    // More aggressive retry for network issues
    if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      console.log(`Network error: ${error.code}. Waiting longer before retry...`);
      await setTimeout(RETRY_DELAY_MS * 3); // Wait 3x longer for network issues
    }
    
    // Retry logic with exponential backoff
    if (attempt < RETRY_ATTEMPTS) {
      const backoffDelay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`Retry attempt ${attempt} after ${backoffDelay}ms...`);
      await setTimeout(backoffDelay);
      return fetchLogsFromGraylog(sinceTimestamp, attempt + 1);
    }
    
    // If all retries fail, return empty but don't break the polling loop
    console.log(`All ${RETRY_ATTEMPTS} retry attempts failed. Continuing with next poll...`);
    return { messages: [], lastFetchTimestamp: sinceTimestamp || new Date().toISOString() };
  }
};

// Improved Kafka sending function with better error handling and batching
const sendLogsToKafka = async (logs) => {
  try {
    if (!logs || logs.length === 0) {
      console.log('No logs to send to Kafka');
      return { success: true, processed: 0 };
    }

    console.log(`Preparing to send ${logs.length} logs to Kafka...`);

    // Process logs in smaller batches
    const batches = [];
    for (let i = 0; i < logs.length; i += MAX_BATCH_SIZE) {
      batches.push(logs.slice(i, i + MAX_BATCH_SIZE));
    }

    console.log(`Split into ${batches.length} batches of up to ${MAX_BATCH_SIZE} logs each`);

    let totalSent = 0;
    let failed = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const messages = batch.map((log, idx) => ({
        value: JSON.stringify(log.message),
        key: `${Date.now()}-${i}-${idx}`, // Unique key for each message
        timestamp: new Date().getTime() // Explicitly set timestamp
      }));

      try {
        await producer.send({
          topic: KAFKA_TOPIC,
          messages,
          acks: -1, // Wait for all replicas to acknowledge
          timeout: 30000
        });

        totalSent += batch.length;
        console.log(`Batch ${i+1}/${batches.length}: Sent ${batch.length} logs to Kafka (Total: ${totalSent}/${logs.length})`);
        
        // Small delay between batches to prevent overwhelming Kafka
        if (i < batches.length - 1) {
          await setTimeout(100);
        }
      } catch (error) {
        failed += batch.length;
        handleError(error, `sending batch ${i+1}`);
        
        // Check for specific Kafka errors that might require reconnection
        if (error.name === 'KafkaJSConnectionError' || 
            error.name === 'KafkaJSRequestTimeoutError' ||
            error.name === 'KafkaJSBrokerNotFound') {
          console.log('Kafka connection issue detected. Will refresh producer connection...');
          // Force a connection refresh on next iteration
          lastConnectionRefresh = 0;
          break; // Exit the loop to trigger reconnection
        }
        
        // Continue with next batch instead of failing entire process
        console.log(`Continuing with next batch...`);
        await setTimeout(1000); // Wait a second before retrying next batch
      }
    }

    return {
      success: true,
      processed: totalSent,
      failed: failed
    };
  } catch (error) {
    handleError(error, 'sendLogsToKafka');
    return {
      success: false,
      processed: 0,
      failed: logs ? logs.length : 0,
      error: error.message
    };
  }
};

// Connect to Kafka with improved retry
const connectToKafka = async () => {
  let connected = false;
  let connectionAttempts = 0;
  
  while (!connected && connectionAttempts < RETRY_ATTEMPTS) {
    try {
      // Create a fresh producer to ensure clean connection
      producer = kafka.producer({
        allowAutoTopicCreation: true,
        maxInFlightRequests: 1,
        idempotent: true
      });
      
      await producer.connect();
      connected = true;
      console.log(`Connected to Kafka at ${new Date().toISOString()}`);
    } catch (error) {
      connectionAttempts++;
      handleError(error, `Kafka connection attempt ${connectionAttempts}`);
      
      if (connectionAttempts < RETRY_ATTEMPTS) {
        const backoffDelay = RETRY_DELAY_MS * Math.pow(2, connectionAttempts - 1);
        console.log(`Will retry in ${backoffDelay}ms...`);
        await setTimeout(backoffDelay);
      }
    }
  }
  
  return connected;
};

// Disconnect from Kafka
const disconnectFromKafka = async () => {
  if (producer) {
    try {
      await producer.disconnect();
      console.log('Disconnected from Kafka');
    } catch (error) {
      handleError(error, 'disconnectFromKafka');
    }
  }
};

// Improved main function with better error recovery, connection refresh, and checkpoints
async function main() {
  // Load last checkpoint if available
  const savedTimestamp = loadCheckpoint();
  if (savedTimestamp) {
    lastTimestamp = savedTimestamp;
    console.log(`Resuming from checkpoint: ${lastTimestamp}`);
  } else {
    // Default to 1 hour ago if no checkpoint
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    lastTimestamp = oneHourAgo.toISOString();
    console.log(`No checkpoint found. Starting from 1 hour ago: ${lastTimestamp}`);
  }
  
  try {
    // Initial Kafka connection
    const connected = await connectToKafka();
    
    if (!connected) {
      throw new Error('Failed to connect to Kafka after multiple attempts');
    }
    
    console.log(`Starting Graylog to Kafka importer...`);
    console.log(`Configuration: MAX_LOGS_PER_FETCH=${MAX_LOGS_PER_FETCH}, POLLING_INTERVAL_MS=${POLLING_INTERVAL_MS}ms, MAX_BATCH_SIZE=${MAX_BATCH_SIZE}`);
    console.log(`Kafka topic: ${KAFKA_TOPIC}, Graylog host: ${GRAYLOG_HOST}:${GRAYLOG_PORT}`);

    // Main polling loop
    while (isRunning) {
      try {
        // Check if we should refresh connections
        const currentTime = Date.now();
        if (currentTime - lastConnectionRefresh > CONNECTION_REFRESH_INTERVAL) {
          console.log('Refreshing Kafka connection...');
          await disconnectFromKafka();
          if (!await connectToKafka()) {
            throw new Error('Failed to refresh Kafka connection');
          }
          lastConnectionRefresh = currentTime;
        }
        
        // Check if we should save checkpoint
        if (currentTime - lastCheckpointSave > CHECKPOINT_INTERVAL) {
          await saveCheckpoint();
        }
        
        console.log(`\n[${new Date().toISOString()}] Polling for new logs...`);
        
        const result = await fetchLogsFromGraylog(lastTimestamp);
        
        if (result.messages.length > 0) {
          const sendResult = await sendLogsToKafka(result.messages);
          
          // Update timestamp even if some sends failed, to avoid reprocessing
          lastTimestamp = result.lastFetchTimestamp;
          
          console.log(`Polling completed. Sent: ${sendResult.processed}, Failed: ${sendResult.failed}`);
          
          // Save checkpoint after successful batch
          if (sendResult.processed > 0) {
            await saveCheckpoint();
          }
        } else {
          console.log('No new logs found');
          
          // Still update the timestamp to move forward
          lastTimestamp = result.lastFetchTimestamp;
        }
        
        // Wait before next poll
        await setTimeout(POLLING_INTERVAL_MS);
      } catch (error) {
        handleError(error, 'main polling loop');
        
        // Wait a bit longer after errors
        console.log('Error in main loop, waiting before retry...');
        await setTimeout(POLLING_INTERVAL_MS * 2);
      }
    }
  } catch (error) {
    handleError(error, 'main');
    // Save checkpoint before exiting to avoid data loss
    await saveCheckpoint();
    process.exit(1);
  } finally {
    // Final cleanup
    await saveCheckpoint();
    await disconnectFromKafka();
  }
}

// Graceful shutdown handling with checkpoint saving
const handleShutdown = async (signal) => {
  console.log(`\n${signal} received. Saving checkpoint and cleaning up...`);
  isRunning = false;
  try {
    await saveCheckpoint();
    await disconnectFromKafka();
    console.log('Cleanup complete. Exiting gracefully.');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('uncaughtException', async (error) => {
  console.error('Uncaught exception:', error);
  await handleShutdown('UNCAUGHT_EXCEPTION');
});

// Run the main function
main().catch(async error => {
  handleError(error, 'startup');
  await saveCheckpoint();
  process.exit(1);
});