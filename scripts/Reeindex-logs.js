// scripts/reindex-logs.js
require('dotenv').config({ path: '../backend/.env' });
const { Client } = require('@opensearch-project/opensearch');

const client = new Client({
  node: process.env.OPENSEARCH_HOST,
  auth: {
    username: process.env.OPENSEARCH_USERNAME,
    password: process.env.OPENSEARCH_PASSWORD,
  },
  ssl: {
    rejectUnauthorized: false, // Only for development
  },
  // Increase timeouts for large operations
  requestTimeout: 300000, // 5 minutes
  pingTimeout: 300000
});

async function reindexLogs() {
  try {
    // Get all existing logs-* indices
    console.log('Fetching existing indices...');
    const indicesResponse = await client.cat.indices({
      index: 'logs-*',
      format: 'json'
    });

    // Filter out any *-reindexed indices that might be leftover
    const indices = indicesResponse.body
      .map(index => index.index)
      .filter(indexName => !indexName.endsWith('-reindexed'));
    
    console.log(`Found ${indices.length} log indices:`, indices);

    if (indices.length === 0) {
      console.log('No log indices found. Exiting...');
      return;
    }

    // First, create a new index template with the updated mapping
    console.log('Creating new index template with syscheck mapping...');
    await client.indices.putTemplate({
      name: 'logs-template-updated',
      body: {
        index_patterns: ['logs-*'],
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'id': { type: 'keyword' },
            'agent': {
              properties: {
                'name': { type: 'keyword' },
                'id': { type: 'keyword' },
                'ip': { type: 'ip', ignore_malformed: true }
              }
            },
            'rule': {
              properties: {
                'id': { type: 'keyword' },
                'level': { type: 'integer' },
                'description': { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } },
                'groups': { type: 'keyword' },
                'mitre': {
                  properties: {
                    'id': { type: 'keyword' },
                    'tactic': { type: 'keyword' },
                    'technique': { type: 'keyword' }
                  }
                },
                'gdpr': { type: 'keyword' },
                'hipaa': { type: 'keyword' },
                'gpg13': { type: 'keyword' },
                'nist': { type: 'keyword' },
                'pci_dss': { type: 'keyword' },
                'tsc': { type: 'keyword' }
              }
            },
            'network': {
              properties: {
                'srcIp': { type: 'ip', ignore_malformed: true },
                'destIp': { type: 'ip', ignore_malformed: true },
                'protocol': { type: 'keyword' },
                'srcPort': { type: 'integer' },
                'destPort': { type: 'integer' }
              }
            },
            'data': {
              type: 'object',
              enabled: true
            },
            'syscheck': {
              type: 'object',
              enabled: true,
              properties: {
                'path': { type: 'keyword' },
                'mode': { type: 'keyword' },
                'size_after': { type: 'keyword' },
                'size_before': { type: 'keyword' },
                'uid_after': { type: 'keyword' },
                'uid_before': { type: 'keyword' },
                'gid_after': { type: 'keyword' },
                'gid_before': { type: 'keyword' },
                'md5_after': { type: 'keyword' },
                'md5_before': { type: 'keyword' },
                'sha1_after': { type: 'keyword' },
                'sha1_before': { type: 'keyword' },
                'sha256_after': { type: 'keyword' },
                'sha256_before': { type: 'keyword' },
                'uname_after': { type: 'keyword' },
                'uname_before': { type: 'keyword' },
                'mtime_after': { type: 'date' },
                'mtime_before': { type: 'date' },
                'changed_attributes': { type: 'keyword' },
                'event': { type: 'keyword' },
                'diff': { type: 'text' },
                'attrs_after': { type: 'keyword' },
                'attrs_before': { type: 'keyword' },
                'win_perm_after': {
                  type: 'nested',
                  properties: {
                    'name': { type: 'keyword' },
                    'allowed': { type: 'keyword' }
                  }
                },
                'win_perm_before': {
                  type: 'nested',
                  properties: {
                    'name': { type: 'keyword' },
                    'allowed': { type: 'keyword' }
                  }
                },
                'audit': {
                  properties: {
                    'user': {
                      properties: {
                        'id': { type: 'keyword' },
                        'name': { type: 'keyword' }
                      }
                    },
                    'process': {
                      properties: {
                        'id': { type: 'keyword' },
                        'name': { type: 'keyword' }
                      }
                    }
                  }
                }
              }
            },
            'ai_ml_logs': {
              type: 'object',
              enabled: true
            },
            'raw_log': { type: 'object', enabled: false }
          }
        },
        settings: {
          'index.refresh_interval': '5s',
          'index.number_of_shards': 1,
          'index.number_of_replicas': 0,
          'index.mapping.total_fields.limit': 2000
        }
      }
    });

    // Process indices in order of size (smallest first)
    const indexSizes = await Promise.all(indices.map(async (index) => {
      const stats = await client.indices.stats({ index });
      return {
        name: index,
        size: stats.body.indices[index].primaries.docs.count
      };
    }));

    // Sort by size (smallest first)
    indexSizes.sort((a, b) => a.size - b.size);
    console.log('Indices ordered by size (smallest first):');
    indexSizes.forEach(index => console.log(`  ${index.name}: ${index.size} documents`));

    // Process each index
    for (const indexInfo of indexSizes) {
      const index = indexInfo.name;
      const totalDocs = indexInfo.size;
      console.log(`\nProcessing index: ${index} (${totalDocs} documents)`);
      
      // Skip large indices (optional)
      if (totalDocs > 100000) {
        console.log(`Index ${index} has ${totalDocs} documents, which is over 100,000. Consider using the Wait for Completion: false approach.`);
        console.log(`Skipping for now. Processing with wait_for_completion: false...`);
        
        // Use async reindex for large indices
        await reindexLargeIndex(index, totalDocs);
        continue;
      }

      const tempIndex = `${index}-reindexed`;

      // Check if temp index already exists
      const tempExists = await client.indices.exists({
        index: tempIndex
      });
      
      if (tempExists.body) {
        console.log(`Temporary index ${tempIndex} already exists. Deleting it first...`);
        await client.indices.delete({
          index: tempIndex
        });
      }
      
      // Create the temp index with new mapping
      console.log(`Creating temporary index: ${tempIndex}`);
      await client.indices.create({
        index: tempIndex,
        body: {
          settings: {
            'index.refresh_interval': '30s', // Lower refresh rate for better indexing performance
            'index.number_of_shards': 1,
            'index.number_of_replicas': 0,
            'index.mapping.total_fields.limit': 2000
          }
        }
      });
      
      // Simple reindex with wait_for_completion: true for smaller indices
      console.log(`Reindexing data from ${index} to ${tempIndex}...`);
      const reindexResponse = await client.reindex({
        refresh: true,
        wait_for_completion: true,
        body: {
          source: {
            index: index,
            size: 1000 // Batch size for reindexing
          },
          dest: {
            index: tempIndex
          }
        }
      });

      console.log(`Reindex response:`, {
        total: reindexResponse.body.total,
        created: reindexResponse.body.created,
        updated: reindexResponse.body.updated,
        failures: reindexResponse.body.failures?.length || 0
      });

      // Get document counts to verify reindex worked
      const originalCount = await client.count({ index: index });
      const reindexedCount = await client.count({ index: tempIndex });
      
      console.log(`Original index count: ${originalCount.body.count}`);
      console.log(`Reindexed index count: ${reindexedCount.body.count}`);

      if (reindexedCount.body.count === 0) {
        console.log(`Warning: No documents were reindexed to ${tempIndex}. Skipping further operations.`);
        continue;
      }

      // Delete original and create alias
      console.log(`Deleting original index: ${index}`);
      await client.indices.delete({
        index: index
      });

      console.log(`Creating alias from ${tempIndex} to ${index}`);
      await client.indices.updateAliases({
        body: {
          actions: [
            { add: { index: tempIndex, alias: index } }
          ]
        }
      });

      console.log(`Successfully reindexed: ${index}`);
    }

    console.log('\nReindexing complete for all log indices!');
  } catch (error) {
    console.error('Error during reindexing:', error);
    if (error.meta && error.meta.body) {
      console.error('Error details:', JSON.stringify(error.meta.body, null, 2));
    }
  }
}

// Function to reindex a large index asynchronously
async function reindexLargeIndex(index, totalDocs) {
  try {
    const tempIndex = `${index}-reindexed`;
    
    // Check if temp index already exists
    const tempExists = await client.indices.exists({
      index: tempIndex
    });
    
    if (tempExists.body) {
      console.log(`Temporary index ${tempIndex} already exists. Deleting it first...`);
      await client.indices.delete({
        index: tempIndex
      });
    }
    
    // Create the temp index with optimized settings for bulk indexing
    console.log(`Creating temporary index: ${tempIndex}`);
    await client.indices.create({
      index: tempIndex,
      body: {
        settings: {
          'index.refresh_interval': '-1', // Disable refresh during bulk indexing
          'index.number_of_shards': 1,
          'index.number_of_replicas': 0,
          'index.mapping.total_fields.limit': 2000,
          'index.translog.flush_threshold_size': '2gb' // Increase translog size
        }
      }
    });
    
    // Start async reindex
    console.log(`Starting async reindex for ${index}...`);
    const reindexResponse = await client.reindex({
      wait_for_completion: false, // Don't wait for completion
      body: {
        source: {
          index: index,
          size: 1000 // Batch size
        },
        dest: {
          index: tempIndex
        }
      }
    });
    
    // Get task ID
    const taskId = reindexResponse.body.task;
    console.log(`Reindexing started as task: ${taskId}`);
    console.log(`You can check status with: GET _tasks/${taskId}`);
    console.log(`Once complete, you'll need to manually perform these steps:`);
    console.log(`1. Check document counts to ensure all docs were reindexed`);
    console.log(`2. Update index settings: PUT ${tempIndex}/_settings {"index.refresh_interval":"5s"}`);
    console.log(`3. Refresh the index: POST ${tempIndex}/_refresh`);
    console.log(`4. Delete the original index: DELETE ${index}`);
    console.log(`5. Create an alias: POST _aliases { "actions": [{ "add": { "index": "${tempIndex}", "alias": "${index}" }}]}`);
    
    return taskId;
  } catch (error) {
    console.error(`Error starting async reindex for ${index}:`, error);
    if (error.meta && error.meta.body) {
      console.error('Error details:', JSON.stringify(error.meta.body, null, 2));
    }
    throw error;
  }
}

// Run the reindex function
reindexLogs().catch(error => {
  console.error('Fatal error during reindexing:', error);
  process.exit(1);
});