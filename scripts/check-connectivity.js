// scripts/check-connectivity.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');
const { Kafka } = require('kafkajs');
const { Client } = require('@opensearch-project/opensearch');
const net = require('net');

const OPENSEARCH_HOST = process.env.OPENSEARCH_HOST || 'http://192.168.1.139:9200';
const KAFKA_BOOTSTRAP_SERVER = process.env.KAFKA_BOOTSTRAP_SERVERS || '192.168.1.139:29092';
const GRAYLOG_HOST = process.env.GRAYLOG_HOST || '192.168.1.68';
const GRAYLOG_PORT = process.env.GRAYLOG_PORT || '9000';
const GRAYLOG_USERNAME = process.env.GRAYLOG_USERNAME || 'admin';
const GRAYLOG_PASSWORD = process.env.GRAYLOG_PASSWORD || 'Virtual%09';

// Check if a port is open
const checkPort = (host, port) => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);
    
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    
    socket.connect(port, host);
  });
};

// Check Kafka connectivity
const checkKafka = async () => {
  try {
    console.log('Checking Kafka connection...');
    
    const [host, port] = KAFKA_BOOTSTRAP_SERVER.split(':');
    const isPortOpen = await checkPort(host, port);
    
    if (!isPortOpen) {
      console.error(`❌ Kafka port ${port} is not reachable on ${host}`);
      return false;
    }
    
    const kafka = new Kafka({
      clientId: 'connectivity-checker',
      brokers: [KAFKA_BOOTSTRAP_SERVER],
      connectionTimeout: 3000
    });
    
    const admin = kafka.admin();
    await admin.connect();
    
    const topics = await admin.listTopics();
    console.log('✅ Kafka connection successful');
    console.log('Available topics:', topics);
    
    await admin.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Kafka connection failed:', error.message);
    return false;
  }
};

// Check OpenSearch connectivity
const checkOpenSearch = async () => {
  try {
    console.log('Checking OpenSearch connection...');
    
    const client = new Client({
      node: OPENSEARCH_HOST,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    const response = await client.cluster.health();
    
    console.log('✅ OpenSearch connection successful');
    console.log('Cluster status:', response.body.status);
    console.log('Cluster name:', response.body.cluster_name);
    
    // Get indices
    const indicesResponse = await client.cat.indices({ format: 'json' });
    console.log('Indices:', indicesResponse.body.map(idx => idx.index));
    
    return true;
  } catch (error) {
    console.error('❌ OpenSearch connection failed:', error.message);
    return false;
  }
};

// Check Graylog connectivity
const checkGraylog = async () => {
  try {
    console.log('Checking Graylog connection...');
    
    const [host, port] = [GRAYLOG_HOST, GRAYLOG_PORT];
    const isPortOpen = await checkPort(host, port);
    
    if (!isPortOpen) {
      console.error(`❌ Graylog port ${port} is not reachable on ${host}`);
      return false;
    }
    
    // Try to query the Graylog API
    const response = await axios.get(
      `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/system/overview`,
      {
        auth: {
          username: GRAYLOG_USERNAME,
          password: GRAYLOG_PASSWORD
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 5000
      }
    );
    
    console.log('✅ Graylog connection successful');
    console.log('Graylog version:', response.data.version);
    
    return true;
  } catch (error) {
    console.error('❌ Graylog connection failed:', error.message);
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', error.response.data);
    }
    return false;
  }
};

// Run all checks
async function runAllChecks() {
  console.log('=== Connectivity Checker ===');
  console.log('Checking connections to all services...\n');
  
  const kafkaStatus = await checkKafka();
  console.log('\n----------------------------\n');
  
  const opensearchStatus = await checkOpenSearch();
  console.log('\n----------------------------\n');
  
  const graylogStatus = await checkGraylog();
  console.log('\n----------------------------\n');
  
  console.log('=== Summary ===');
  console.log('Kafka:', kafkaStatus ? '✅ Connected' : '❌ Failed');
  console.log('OpenSearch:', opensearchStatus ? '✅ Connected' : '❌ Failed');
  console.log('Graylog:', graylogStatus ? '✅ Connected' : '❌ Failed');
  
  if (!kafkaStatus || !opensearchStatus || !graylogStatus) {
    console.log('\n⚠️ Some connections failed. Please check the logs above for details.');
  } else {
    console.log('\n✅ All connections successful!');
  }
}

runAllChecks().catch(console.error);