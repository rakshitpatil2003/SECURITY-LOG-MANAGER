// scripts/high-volume-graylog-to-kafka.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');
const { Kafka } = require('kafkajs');
const { setTimeout } = require('timers/promises');

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
const MAX_LOGS_PER_FETCH = 2000; // Reduced from 10000 to avoid timeout issues
//const POLLING_INTERVAL_MS = 5000; // Reduced to 5 seconds
const POLLING_INTERVAL_MS = 5000; // Reduce from 5000 to 2000 ms (2 seconds)
const MAX_BATCH_SIZE = 200; // Better batch size for reliability
const CONCURRENT_REQUESTS = 3; // Limit concurrent API requests
const RETRY_ATTEMPTS = 3; // Number of retry attempts for failed requests
const RETRY_DELAY_MS = 1000; // Delay between retry attempts

// Create Kafka producer with better error handling
const kafka = new Kafka({
  clientId: 'graylog-importer',
  brokers: [KAFKA_BOOTSTRAP_SERVER],
  connectionTimeout: 3000,
  requestTimeout: 25000,
  retry: {
    retries: 8,
    initialRetryTime: 300,
    maxRetryTime: 60000
  }
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  maxInFlightRequests: 1,
  idempotent: true
});

// Improved error handling function
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
  return errorDetails;
};

// Function to fetch logs from Graylog with retries
const fetchLogsFromGraylog = async (sinceTimestamp = null, attempt = 1) => {
  try {
    const from = sinceTimestamp || new Date(Date.now() - POLLING_INTERVAL_MS);
    const to = new Date();
    
    console.log(`Fetching logs from ${from.toISOString()} to ${to.toISOString()}`);
    
    const graylogUrl = `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/search/universal/absolute`;
    
    const response = await axios.get(graylogUrl, {
      params: {
        query: '*',
        from: from.toISOString(),
        to: to.toISOString(),
        limit: MAX_LOGS_PER_FETCH,
        fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol,rule_level,rule_description,event_type,agent_name,manager_name,id,raw_log,rule,agent,network,data',
        timeout: 30000
      },
      auth: {
        username: GRAYLOG_USERNAME,
        password: GRAYLOG_PASSWORD
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 30000
    });

    if (!response.data || !response.data.messages) {
      console.log('No new logs found in this fetch');
      return { messages: [], lastFetchTimestamp: to };
    }
    
    console.log(`Fetched ${response.data.messages.length} logs from Graylog`);
    
    // Return the last timestamp for the next fetch
    return {
      messages: response.data.messages,
      lastFetchTimestamp: to
    };
  } catch (error) {
    handleError(error, 'fetchLogsFromGraylog');
    
    // Retry logic
    if (attempt < RETRY_ATTEMPTS) {
      console.log(`Retry attempt ${attempt} after ${RETRY_DELAY_MS}ms...`);
      await setTimeout(RETRY_DELAY_MS);
      return fetchLogsFromGraylog(sinceTimestamp, attempt + 1);
    }
    
    return { messages: [], lastFetchTimestamp: sinceTimestamp || new Date() };
  }
};

// Improved Kafka sending function with better error handling
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
        key: `${Date.now()}-${i}-${idx}` // Unique key for each message
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
        
        // Continue with next batch instead of failing entire process
        console.log(`Continuing with next batch...`);
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
      failed: logs ? logs.length : 0
    };
  }
};

// Improved main function with better error recovery
async function main() {
  let lastTimestamp = null;
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;
  
  try {
    // Connect to Kafka with retry
    let connected = false;
    let connectionAttempts = 0;
    
    while (!connected && connectionAttempts < RETRY_ATTEMPTS) {
      try {
        await producer.connect();
        connected = true;
        console.log('Connected to Kafka');
      } catch (error) {
        connectionAttempts++;
        console.error(`Kafka connection attempt ${connectionAttempts} failed:`, error.message);
        if (connectionAttempts < RETRY_ATTEMPTS) {
          await setTimeout(RETRY_DELAY_MS * connectionAttempts);
        }
      }
    }
    
    if (!connected) {
      throw new Error('Failed to connect to Kafka after multiple attempts');
    }
    
    console.log(`Starting Graylog to Kafka importer...`);
    console.log(`Configuration: MAX_LOGS_PER_FETCH=${MAX_LOGS_PER_FETCH}, POLLING_INTERVAL_MS=${POLLING_INTERVAL_MS}ms, MAX_BATCH_SIZE=${MAX_BATCH_SIZE}`);

    // Initial fetch
    console.log('Starting initial fetch...');
    const initialResult = await fetchLogsFromGraylog();
    
    if (initialResult.messages.length > 0) {
      const sendResult = await sendLogsToKafka(initialResult.messages);
      console.log(`Initial fetch completed. Sent: ${sendResult.processed}, Failed: ${sendResult.failed}`);
    }
    
    lastTimestamp = initialResult.lastFetchTimestamp;

    // Continuous polling with error recovery
    while (true) {
      try {
        console.log(`\n[${new Date().toISOString()}] Polling for new logs...`);
        
        const result = await fetchLogsFromGraylog(lastTimestamp);
        
        if (result.messages.length > 0) {
          const sendResult = await sendLogsToKafka(result.messages);
          
          if (sendResult.success && sendResult.failed === 0) {
            consecutiveErrors = 0;
          } else if (sendResult.failed > 0) {
            consecutiveErrors++;
          }
          
          console.log(`Polling completed. Sent: ${sendResult.processed}, Failed: ${sendResult.failed}`);
        } else {
          consecutiveErrors = 0;
          console.log('No new logs found');
        }
        
        lastTimestamp = result.lastFetchTimestamp;
        
        // Check for consecutive errors
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          throw new Error(`Too many consecutive errors (${consecutiveErrors}). Stopping...`);
        }
        
        // Wait before next poll
        await setTimeout(POLLING_INTERVAL_MS);
        
      } catch (error) {
        consecutiveErrors++;
        handleError(error, 'main loop');
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.error('Maximum consecutive errors reached. Exiting...');
          break;
        }
        
        // Exponential backoff on error
        const backoffTime = Math.min(RETRY_DELAY_MS * Math.pow(2, consecutiveErrors - 1), 30000);
        console.log(`Waiting ${backoffTime}ms before retry...`);
        await setTimeout(backoffTime);
      }
    }
  } catch (error) {
    handleError(error, 'main');
    process.exit(1);
  } finally {
    // Cleanup
    try {
      await producer.disconnect();
      console.log('Disconnected from Kafka');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error.message);
    }
  }
}

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('\nShutdown requested. Closing connections...');
  try {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nTermination requested. Closing connections...');
  try {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  } catch (error) {
    console.error('Error during shutdown:', error.message);
  }
  process.exit(0);
});

// Run the main function
main().catch(error => {
  handleError(error, 'startup');
  process.exit(1);
});