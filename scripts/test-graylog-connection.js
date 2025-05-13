// scripts/test-graylog-connection.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');

const GRAYLOG_HOST = process.env.GRAYLOG_HOST || '192.168.1.68';
const GRAYLOG_PORT = process.env.GRAYLOG_PORT || '9000';
const GRAYLOG_USERNAME = process.env.GRAYLOG_USERNAME || 'admin';
const GRAYLOG_PASSWORD = process.env.GRAYLOG_PASSWORD || 'Virtual%09';
const GRAYLOG_STREAM_ID = process.env.GRAYLOG_STREAM_ID || '67c7e72cb78cd271d6481222';

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`Testing ${name}...`);
    const response = await axios.get(url, {
      auth: {
        username: GRAYLOG_USERNAME,
        password: GRAYLOG_PASSWORD
      },
      headers: {
        'Accept': 'application/json'
      },
      timeout: 5000,
      ...options
    });
    
    console.log(`✅ ${name} SUCCESS`);
    console.log(`Status: ${response.status}`);
    console.log('Response data preview:', 
      typeof response.data === 'object' 
        ? JSON.stringify(response.data).substring(0, 200) + '...' 
        : response.data.substring(0, 200) + '...');
    return true;
  } catch (error) {
    console.error(`❌ ${name} FAILED: ${error.message}`);
    if (error.response) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Data:`, error.response.data);
    }
    return false;
  }
}

async function testGraylogConnections() {
  console.log('=== Graylog API Connection Tests ===');
  console.log(`Testing connection to Graylog at http://${GRAYLOG_HOST}:${GRAYLOG_PORT}\n`);

  // Test 1: System API
  await testEndpoint(
    'System API',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/system`
  );
  console.log('\n----------------------------\n');

  // Test 2: System Overview (old endpoint in v3.x)
  await testEndpoint(
    'System Overview (v3.x)',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/system/overview`
  );
  console.log('\n----------------------------\n');
  
  // Test 3: System Overview (new endpoint in v4.x)
  await testEndpoint(
    'System Overview (v4.x)',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/system/cluster/nodes`
  );
  console.log('\n----------------------------\n');

  // Test 4: Streams
  await testEndpoint(
    'Streams API',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/streams`
  );
  console.log('\n----------------------------\n');

  // Test 5: Specific Stream
  await testEndpoint(
    'Specific Stream',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/streams/${GRAYLOG_STREAM_ID}`
  );
  console.log('\n----------------------------\n');

  // Test 6: Search Absolute (v3.x)
  const from = new Date(Date.now() - 300000); // Last 5 minutes
  const to = new Date();
  await testEndpoint(
    'Search Absolute (v3.x)',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/search/universal/absolute`,
    {
      params: {
        query: '*',
        from: from.toISOString(),
        to: to.toISOString(),
        limit: 1
      }
    }
  );
  console.log('\n----------------------------\n');

  // Test 7: Search Absolute (v4.x)
  await testEndpoint(
    'Search Absolute (v4.x)',
    `http://${GRAYLOG_HOST}:${GRAYLOG_PORT}/api/views/search/messages`,
    {
      method: 'POST',
      data: {
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
        limit: 1
      }
    }
  );
  console.log('\n----------------------------\n');

  console.log('Testing complete.');
}

testGraylogConnections().catch(console.error);