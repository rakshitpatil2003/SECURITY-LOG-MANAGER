const { subscribeToTopic } = require('../config/kafka');
const { getOpenSearchClient, getIndexNameForDate, createIndexTemplates } = require('../config/opensearch');
const { transformLog } = require('../utils/logTransformer');

// Start log ingestion from Kafka to OpenSearch
const startLogIngestion = async () => {
  try {
    // Create index templates first
    await createIndexTemplates();
    
    // Get the OpenSearch client
    const client = await getOpenSearchClient();
    
    // Subscribe to the Kafka topic
    const consumer = await subscribeToTopic(process.env.KAFKA_LOG_TOPIC, false);
    
    // Process incoming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          // Parse the message value
          const rawLog = JSON.parse(message.value.toString());
          
          // Transform the log (extract important fields, etc.)
          const transformedLog = transformLog(rawLog);
          
          // Determine the appropriate index based on timestamp
          const timestamp = transformedLog['@timestamp'] || new Date();
          const index = getIndexNameForDate(new Date(timestamp));
          
          // Store the log in OpenSearch
          try {
            await client.index({
              index,
              body: transformedLog,
              id: transformedLog.id,
              refresh: false
            });
            
            console.log(`Successfully indexed log with ID ${transformedLog.id} to ${index}`);
          } catch (indexError) {
            console.error(`Error indexing log ${transformedLog.id}:`, indexError.message);
            
            // Try to create a "sanitized" version without problematic fields
            try {
              // Create a safe copy without IP fields if there's a mapper error
              if (indexError.message.includes('mapper_parsing_exception')) {
                const safeLog = { ...transformedLog };
                
                // Set IP fields to null
                if (safeLog.agent) safeLog.agent.ip = null;
                if (safeLog.network) {
                  safeLog.network.srcIp = null;
                  safeLog.network.destIp = null;
                }
                
                await client.index({
                  index,
                  body: safeLog,
                  id: safeLog.id,
                  refresh: false
                });
                
                console.log(`Successfully indexed sanitized log with ID ${safeLog.id} to ${index}`);
              }
            } catch (fallbackError) {
              console.error('Failed to index sanitized log:', fallbackError.message);
            }
          }
        } catch (error) {
          console.error('Error processing log message:', error);
        }
      },
    });
    
    console.log('Log ingestion service started successfully');
    
    // Set up a daily task to create new indices
    const runAtMidnight = async () => {
      // Create tomorrow's index in advance
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowIndex = getIndexNameForDate(tomorrow);
      
      const exists = await client.indices.exists({ index: tomorrowIndex });
      if (!exists.body) {
        await client.indices.create({ index: tomorrowIndex });
        console.log(`Created index for tomorrow: ${tomorrowIndex}`);
      }
      
      // Also run cleanup for old indices
      await deleteOldIndices();
      
      // Schedule the next run
      const now = new Date();
      const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1, // tomorrow
        0, 0, 0 // midnight
      );
      const msToMidnight = night.getTime() - now.getTime();
      
      setTimeout(runAtMidnight, msToMidnight);
    };
    
    // Initial scheduling
    const now = new Date();
    const night = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      0, 0, 0 // midnight
    );
    const msToMidnight = night.getTime() - now.getTime();
    
    setTimeout(runAtMidnight, msToMidnight);
    console.log(`Next index creation scheduled in ${Math.round(msToMidnight/1000/60)} minutes`);
    
    // Return the consumer for cleanup purposes
    return consumer;
  } catch (error) {
    console.error('Error starting log ingestion service:', error);
    throw error;
  }
};

// Stop log ingestion
const stopLogIngestion = async (consumer) => {
  if (consumer) {
    await consumer.disconnect();
    console.log('Log ingestion service stopped');
  }
};

module.exports = {
  startLogIngestion,
  stopLogIngestion,
};