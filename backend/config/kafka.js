const { Kafka } = require('kafkajs');
const { getSecret } = require('./vault');

let kafka;
let producer;
let consumer;

// Initialize Kafka client
const getKafkaClient = async () => {
  if (kafka) return kafka;

  try {
    // Try to get Kafka config from Vault
    const kafkaConfig = await getSecret('kafka');
    
    // Use credentials from Vault if available
    const brokers = kafkaConfig.brokers 
      ? kafkaConfig.brokers.split(',') 
      : [process.env.KAFKA_BOOTSTRAP_SERVERS];
    
    const clientId = kafkaConfig.clientId || process.env.KAFKA_CLIENT_ID;

    kafka = new Kafka({
      clientId,
      brokers,
    });

    return kafka;
  } catch (error) {
    console.error('Error getting Kafka configuration from Vault:', error);
    
    // Fallback to environment variables
    kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID,
      brokers: [process.env.KAFKA_BOOTSTRAP_SERVERS],
    });

    return kafka;
  }
};

// Get Kafka producer
const getProducer = async () => {
  if (producer) return producer;

  const kafka = await getKafkaClient();
  producer = kafka.producer();
  await producer.connect();
  return producer;
};

// Get Kafka consumer
const getConsumer = async () => {
  if (consumer) return consumer;

  const kafka = await getKafkaClient();
  consumer = kafka.consumer({ 
    groupId: process.env.KAFKA_CONSUMER_GROUP_ID 
  });
  await consumer.connect();
  return consumer;
};

// Subscribe to a topic
const subscribeToTopic = async (topic, fromBeginning = false) => {
  const consumer = await getConsumer();
  await consumer.subscribe({ topic, fromBeginning });
  return consumer;
};

// Send a message to Kafka topic
const sendMessage = async (topic, message) => {
  const producer = await getProducer();
  await producer.send({
    topic,
    messages: [
      { value: typeof message === 'string' ? message : JSON.stringify(message) }
    ],
  });
};

// Clean up Kafka connections
const disconnectKafka = async () => {
  if (producer) {
    await producer.disconnect();
    producer = null;
  }
  
  if (consumer) {
    await consumer.disconnect();
    consumer = null;
  }
};

module.exports = {
  getKafkaClient,
  getProducer,
  getConsumer,
  subscribeToTopic,
  sendMessage,
  disconnectKafka,
};