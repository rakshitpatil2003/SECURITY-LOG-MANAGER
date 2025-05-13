// scripts/explore-opensearch.js
require('dotenv').config({ path: '../backend/.env' });
const { Client } = require('@opensearch-project/opensearch');

// Create a client with the OpenSearch configuration
const client = new Client({
  node: process.env.OPENSEARCH_HOST || 'http://192.168.1.139:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin'
  },
  ssl: {
    rejectUnauthorized: false // Only for development
  }
});

// Function to explore OpenSearch
async function exploreOpenSearch() {
  console.log('=== OpenSearch Explorer ===');
  
  try {
    // Check cluster health
    console.log('\n1. Checking cluster health...');
    const healthResponse = await client.cluster.health();
    console.log(`Cluster status: ${healthResponse.body.status}`);
    console.log(`Number of nodes: ${healthResponse.body.number_of_nodes}`);
    console.log(`Active shards: ${healthResponse.body.active_shards}`);
    
    // List all indices
    console.log('\n2. Listing all indices...');
    const indicesResponse = await client.cat.indices({ format: 'json' });
    console.log('Indices:');
    indicesResponse.body.forEach(index => {
      console.log(`- ${index.index} | Docs: ${index.docs?.count || 'N/A'} | Size: ${index.store?.size || 'N/A'}`);
    });
    
    // Get logs count
    console.log('\n3. Getting log counts...');
    const indices = ['logs-current', 'logs-recent', 'logs-archive'];
    
    for (const index of indices) {
      try {
        const countResponse = await client.count({ index });
        console.log(`${index} contains ${countResponse.body.count} documents`);
      } catch (error) {
        console.log(`${index} not found or error: ${error.message}`);
      }
    }
    
    // Get a sample of logs
    console.log('\n4. Getting a sample of logs...');
    try {
      const searchResponse = await client.search({
        index: 'logs-current',
        body: {
          size: 5,
          sort: [
            { '@timestamp': { order: 'desc' } }
          ]
        }
      });
      
      console.log(`Found ${searchResponse.body.hits.total.value} logs in total`);
      console.log('Latest logs:');
      
      searchResponse.body.hits.hits.forEach((hit, i) => {
        const log = hit._source;
        console.log(`\nLog ${i+1} (ID: ${hit._id}):`);
        console.log(`- Timestamp: ${log['@timestamp']}`);
        console.log(`- Agent: ${log.agent?.name || 'N/A'}`);
        console.log(`- Rule Level: ${log.rule?.level || 'N/A'}`);
        console.log(`- Rule Description: ${log.rule?.description || 'N/A'}`);
      });
      
      // Get log fields
      if (searchResponse.body.hits.hits.length > 0) {
        const sampleLog = searchResponse.body.hits.hits[0]._source;
        console.log('\nAvailable fields in a sample log:');
        logFields(sampleLog);
      }
    } catch (error) {
      console.log(`Error getting sample logs: ${error.message}`);
    }
    
    // Search example
    console.log('\n5. Example search (logs with rule level >= 12)...');
    try {
      const searchResponse = await client.search({
        index: 'logs-current',
        body: {
          query: {
            range: {
              'rule.level': {
                gte: 12
              }
            }
          },
          size: 3,
          sort: [
            { '@timestamp': { order: 'desc' } }
          ]
        }
      });
      
      console.log(`Found ${searchResponse.body.hits.total.value} high severity logs`);
      
      searchResponse.body.hits.hits.forEach((hit, i) => {
        const log = hit._source;
        console.log(`\nHigh Severity Log ${i+1} (ID: ${hit._id}):`);
        console.log(`- Timestamp: ${log['@timestamp']}`);
        console.log(`- Agent: ${log.agent?.name || 'N/A'}`);
        console.log(`- Rule Level: ${log.rule?.level || 'N/A'}`);
        console.log(`- Rule Description: ${log.rule?.description || 'N/A'}`);
      });
    } catch (error) {
      console.log(`Error searching high severity logs: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error exploring OpenSearch:', error);
  }
}

// Helper function to recursively print object fields
function logFields(obj, prefix = '') {
  if (!obj) return;
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    
    if (value === null || value === undefined) {
      console.log(`${prefix}${key}: null`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      console.log(`${prefix}${key}: {object}`);
      logFields(value, `${prefix}${key}.`);
    } else if (Array.isArray(value)) {
      console.log(`${prefix}${key}: [array] with ${value.length} items`);
      if (value.length > 0 && typeof value[0] === 'object') {
        logFields(value[0], `${prefix}${key}[0].`);
      }
    } else {
      const displayValue = typeof value === 'string' && value.length > 50
        ? `${value.substring(0, 50)}...`
        : value;
      console.log(`${prefix}${key}: ${displayValue}`);
    }
  });
}

// Run the explorer
exploreOpenSearch().catch(console.error);