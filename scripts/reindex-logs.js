require('dotenv').config({ path: '../backend/.env' });
const { getOpenSearchClient, INDICES, createIndexTemplates } = require('../backend/config/opensearch');

const reindexLogs = async () => {
  try {
    console.log('Starting reindexing process...');
    const client = await getOpenSearchClient();

    // Delete existing indices
    for (const index of Object.values(INDICES)) {
      try {
        const exists = await client.indices.exists({ index });
        if (exists.body) {
          await client.indices.delete({ index });
          console.log(`Deleted index ${index}`);
        }
      } catch (error) {
        console.error(`Error deleting index ${index}:`, error);
        // Continue with other indices
      }
    }

    // Recreate index templates
    await createIndexTemplates();
    console.log('Created index templates');
    
    console.log('Reindexing completed. The log ingestor will now repopulate the indices.');
  } catch (error) {
    console.error('Error reindexing logs:', error);
  }
};

reindexLogs()
  .then(() => console.log('Reindexing script completed'))
  .catch((error) => console.error('Reindexing script error:', error));