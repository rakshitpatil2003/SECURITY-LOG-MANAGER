// scripts/reindex-opensearch.js
require('dotenv').config({ path: '../backend/.env' });
const { getOpenSearchClient, INDICES, createIndexTemplates } = require('../backend/config/opensearch');
const { transformLog } = require('../backend/utils/logTransformer');

async function reindexData() {
  try {
    console.log('Starting OpenSearch reindexing...');
    const client = await getOpenSearchClient();

    // First backup existing data
    console.log('Backing up existing data...');
    const backupData = {};
    
    for (const index of Object.values(INDICES)) {
      try {
        const exists = await client.indices.exists({ index });
        if (!exists.body) {
          console.log(`Index ${index} doesn't exist, skipping backup`);
          continue;
        }
        
        // Get all documents from the index
        console.log(`Fetching data from ${index}...`);
        const response = await client.search({
          index,
          body: {
            query: { match_all: {} },
            size: 10000 // Adjust as needed
          },
          _source: true
        });
        
        // Store the raw data for reprocessing
        backupData[index] = response.body.hits.hits.map(hit => {
          // First try to use raw_log, if not available, use the entire source
          return hit._source.raw_log || hit._source;
        });
        
        console.log(`Backed up ${backupData[index].length} documents from ${index}`);
      } catch (error) {
        console.error(`Error backing up index ${index}:`, error);
      }
    }
    
    // Delete existing indices
    console.log('Deleting existing indices...');
    for (const index of Object.values(INDICES)) {
      try {
        const exists = await client.indices.exists({ index });
        if (exists.body) {
          await client.indices.delete({ index });
          console.log(`Deleted index ${index}`);
        }
      } catch (error) {
        console.error(`Error deleting index ${index}:`, error);
      }
    }
    
    // Recreate index templates
    console.log('Creating new index templates...');
    await createIndexTemplates();
    
    // Restore data with new mappings
    console.log('Restoring data with new mappings...');
    for (const [index, logs] of Object.entries(backupData)) {
      if (logs.length === 0) continue;
      
      console.log(`Transforming and reindexing ${logs.length} logs to ${index}...`);
      
      // Process in batches
      const batchSize = 100;
      for (let i = 0; i < logs.length; i += batchSize) {
        const batch = logs.slice(i, i + batchSize);
        
        // Prepare bulk operations
        const operations = [];
        for (const log of batch) {
          // Transform each log with the improved transformer
          const transformedLog = transformLog(log);
          
          // Add index operation
          operations.push({
            index: { _index: index, _id: transformedLog.id }
          });
          
          // Add document
          operations.push(transformedLog);
        }
        
        // Execute bulk operation
        if (operations.length > 0) {
          try {
            const bulkResponse = await client.bulk({ body: operations, refresh: true });
            
            // Check for errors
            if (bulkResponse.body.errors) {
              console.error('Bulk indexing had errors. First error:');
              const firstError = bulkResponse.body.items.find(item => item.index?.error);
              console.error(JSON.stringify(firstError, null, 2));
            }
          } catch (error) {
            console.error('Error executing bulk operation:', error);
          }
        }
        
        console.log(`Reindexed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(logs.length/batchSize)}`);
      }
      
      console.log(`Reindexed ${logs.length} logs to ${index}`);
    }
    
    console.log('Reindexing completed successfully!');
  } catch (error) {
    console.error('Error during reindexing:', error);
  }
}

reindexData()
  .then(() => console.log('Reindexing script finished'))
  .catch(err => console.error('Reindexing script failed:', err));