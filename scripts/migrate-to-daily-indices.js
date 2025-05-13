// scripts/migrate-to-daily-indices.js
require('dotenv').config({ path: '../backend/.env' });
const { Client } = require('@opensearch-project/opensearch');

// Helper function to get index name for a date
const getIndexNameForDate = (date) => {
  const d = new Date(date);
  return `logs-${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const migrateData = async () => {
  let client;
  
  try {
    console.log('Starting migration to daily indices...');
    
    // Create OpenSearch client directly from environment variables
    client = new Client({
      node: process.env.OPENSEARCH_HOST || 'http://localhost:9200',
      auth: {
        username: process.env.OPENSEARCH_USERNAME || 'admin',
        password: process.env.OPENSEARCH_PASSWORD || 'admin',
      },
      ssl: {
        rejectUnauthorized: false, // Only for development
      },
    });
    
    console.log('Connected to OpenSearch');
    
    // Get all current logs
    const oldIndices = ['logs-current', 'logs-recent', 'logs-archive'];
    
    for (const oldIndex of oldIndices) {
      // Check if index exists
      const exists = await client.indices.exists({ index: oldIndex });
      if (!exists.body) {
        console.log(`Index ${oldIndex} doesn't exist, skipping...`);
        continue;
      }
      
      console.log(`Migrating data from ${oldIndex}...`);
      
      // Use scroll API to process large datasets
      let response = await client.search({
        index: oldIndex,
        scroll: '1m',
        size: 1000,
        body: {
          query: {
            match_all: {}
          }
        }
      });
      
      let scrollId = response.body._scroll_id;
      let total = response.body.hits.total.value;
      let processed = 0;
      
      console.log(`Found ${total} documents to migrate`);
      
      // Process the first batch
      await processBatch(client, response.body.hits.hits);
      processed += response.body.hits.hits.length;
      console.log(`Processed ${processed}/${total} documents`);
      
      // Process subsequent batches
      while (response.body.hits.hits.length > 0) {
        response = await client.scroll({
          scroll_id: scrollId,
          scroll: '1m'
        });
        
        if (!response.body.hits || !response.body.hits.hits) {
          console.log('No more documents to process');
          break;
        }
        
        scrollId = response.body._scroll_id;
        
        await processBatch(client, response.body.hits.hits);
        processed += response.body.hits.hits.length;
        console.log(`Processed ${processed}/${total} documents`);
      }
      
      // Clear the scroll
      if (scrollId) {
        await client.clearScroll({
          scroll_id: scrollId
        });
      }
      
      console.log(`Migration from ${oldIndex} completed`);
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Error during migration:', error);
  }
};

// Helper to process a batch of documents
async function processBatch(client, documents) {
  if (!documents || documents.length === 0) return;
  
  const bulkOperations = [];
  
  for (const doc of documents) {
    if (!doc._source) continue;
    
    // Determine the appropriate daily index based on timestamp
    const timestamp = doc._source['@timestamp'] || new Date();
    const targetIndex = getIndexNameForDate(new Date(timestamp));
    
    // Add to bulk operations
    bulkOperations.push({
      index: {
        _index: targetIndex,
        _id: doc._id
      }
    });
    
    bulkOperations.push(doc._source);
  }
  
  if (bulkOperations.length > 0) {
    try {
      await client.bulk({
        refresh: false,
        body: bulkOperations
      });
    } catch (error) {
      console.error('Bulk indexing error:', error.message);
      // Continue with the next batch even if this one fails
    }
  }
}

// Run the migration
migrateData().catch(console.error);