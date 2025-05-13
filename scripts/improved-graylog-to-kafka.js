// scripts/improved-graylog-to-kafka.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');
const { Kafka } = require('kafkajs');

// Graylog configuration
const GRAYLOG_HOST = process.env.GRAYLOG_HOST || '192.168.1.68';
const GRAYLOG_PORT = process.env.GRAYLOG_PORT || '9000';
const GRAYLOG_USERNAME = process.env.GRAYLOG_USERNAME || 'admin';
const GRAYLOG_PASSWORD = process.env.GRAYLOG_PASSWORD || 'Virtual%09';
const GRAYLOG_STREAM_ID = process.env.GRAYLOG_STREAM_ID || '67c7e72cb78cd271d6481222';

// Kafka configuration
const KAFKA_BOOTSTRAP_SERVER = process.env.KAFKA_BOOTSTRAP_SERVERS || '192.168.1.139:29092';
const KAFKA_TOPIC = process.env.KAFKA_LOG_TOPIC || 'security-logs';

// Create Kafka producer
const kafka = new Kafka({
  clientId: 'graylog-importer',
  brokers: [KAFKA_BOOTSTRAP_SERVER]
});

const producer = kafka.producer();

// Reporting function for errors
const handleFetchError = (error) => {
  const errorDetails = {
    message: error.message,
    status: error.response?.status,
    statusText: error.response?.statusText,
    data: error.response?.data,
    timestamp: new Date().toISOString()
  };  
  console.error('Error fetching logs:', errorDetails);
  return errorDetails;
};

// Function to fetch logs from Graylog - Directly adapted from your controller
const fetchLogsFromGraylog = async () => {
  try {
    // Try different Graylog API endpoints based on version
    // First, try the v3.x absolute search endpoint
    try {
      const graylogUrl = `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/search/universal/absolute`;  
      
      // Get logs from the last 30 seconds to ensure we don't miss any
      const from = new Date(Date.now() - 30000);
      const to = new Date();    
      console.log(`Fetching logs from ${from.toISOString()} to ${to.toISOString()}`);
      
      const response = await axios.get(graylogUrl, {
        params: {
          query: '*',
          from: from.toISOString(),
          to: to.toISOString(),
          limit: 100,
          fields: 'timestamp,source,level,message,src_ip,dest_ip,protocol,rule_level,rule_description,event_type,agent_name,manager_name,id,ai_ml_logs'
        },
        auth: {
          username: GRAYLOG_USERNAME,
          password: GRAYLOG_PASSWORD
        },
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.data || !response.data.messages) {
        console.log('No new logs found in this fetch');
        return [];
      }
      
      console.log(`Fetched ${response.data.messages.length} logs from Graylog`);
      return response.data.messages;
    } catch (error) {
      // If v3.x endpoint fails, try v4.x search messages endpoint
      if (error.response && error.response.status === 404) {
        console.log('Falling back to v4.x Graylog API...');
        const graylogUrl = `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/views/search/messages`;  
        
        // Get logs from the last 30 seconds to ensure we don't miss any
        const from = new Date(Date.now() - 30000);
        const to = new Date();    
        
        const response = await axios.post(graylogUrl, {
          timerange: {
            type: 'absolute',
            from: from.toISOString(),
            to: to.toISOString()
          },
          query: {
            type: 'elasticsearch',
            query_string: '*'
          },
          streams: [GRAYLOG_STREAM_ID],
          limit: 100
        }, {
          auth: {
            username: GRAYLOG_USERNAME,
            password: GRAYLOG_PASSWORD
          },
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.data || !response.data.messages) {
          console.log('No new logs found in this fetch');
          return [];
        }
        
        console.log(`Fetched ${response.data.messages.length} logs from Graylog v4.x`);
        // Format the messages to match the expected structure
        return response.data.messages.map(msg => ({ message: msg }));
      }
      throw error;
    }
  } catch (error) {
    handleFetchError(error);
    console.error('Error fetching logs from Graylog:', error.message);
    return [];
  }
};

// Function to send logs to Kafka
async function sendLogsToKafka(logs) {
  try {
    if (!logs.length) {
      console.log('No logs to send to Kafka');
      return;
    }

    const messages = logs.map(log => ({
      value: JSON.stringify(log.message)
    }));

    await producer.send({
      topic: KAFKA_TOPIC,
      messages
    });

    console.log(`Sent ${logs.length} logs to Kafka topic ${KAFKA_TOPIC}`);
  } catch (error) {
    console.error('Error sending logs to Kafka:', error);
  }
}

// Main function
async function main() {
  try {
    // Connect to Kafka
    await producer.connect();
    console.log('Connected to Kafka');

    // Fetch logs and send to Kafka immediately
    const initialLogs = await fetchLogsFromGraylog();
    if (initialLogs.length > 0) {
      await sendLogsToKafka(initialLogs);
    }

    // Then fetch logs every 10 seconds
    setInterval(async () => {
      console.log('Fetching logs from Graylog...');
      const logs = await fetchLogsFromGraylog();
      
      if (logs.length > 0) {
        // Send logs to Kafka
        await sendLogsToKafka(logs);
      } else {
        console.log('No new logs found');
      }
    }, 10000); // 10 seconds
  } catch (error) {
    console.error('Error in main function:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);