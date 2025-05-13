const { Client } = require('@opensearch-project/opensearch');
const { getSecret } = require('./vault');
const { hashPassword, createDefaultAdmin } = require('../utils/auth');

// OpenSearch indices for time-based sharding
const INDICES = {
  USERS: 'users',
  TICKETS: 'tickets'
};

// Dynamic indices based on date
const getIndexNameForDate = (date) => {
  const d = new Date(date);
  return `logs-${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

// Get today's index name
const getTodayIndexName = () => {
  return getIndexNameForDate(new Date());
};

const checkOpenSearchStatus = async () => {
  try {
    const client = await getOpenSearchClient();

    // Check cluster health
    const health = await client.cluster.health();
    console.log('Cluster health:', health.body.status);

    // Check indices
    const indices = await client.cat.indices({ format: 'json' });
    console.log('Indices:', indices.body.map(idx =>
      `${idx.index}: docs=${idx.docs?.count || 0}, size=${idx.store?.size || '0'}`
    ).join(', '));

    // Check shards
    const shards = await client.cat.shards({ format: 'json' });
    const unassignedShards = shards.body.filter(s => s.state === 'UNASSIGNED');
    if (unassignedShards.length > 0) {
      console.error('Warning: Unassigned shards detected!', unassignedShards.length);
    }
  } catch (error) {
    console.error('Error checking OpenSearch status:', error);
  }
};

// Initialize OpenSearch client
let client;

const getOpenSearchClient = async () => {
  if (client) return client;

  try {
    // Try to get credentials from Vault
    const opensearchConfig = await getSecret('opensearch');

    // If successful, use credentials from Vault
    const node = opensearchConfig.host || process.env.OPENSEARCH_HOST;
    const username = opensearchConfig.username || process.env.OPENSEARCH_USERNAME;
    const password = opensearchConfig.password || process.env.OPENSEARCH_PASSWORD;

    // Create client
    client = new Client({
      node,
      auth: {
        username,
        password,
      },
      ssl: {
        rejectUnauthorized: false, // Only for development
      },
    });

    return client;
  } catch (error) {
    console.error('Error getting OpenSearch credentials from Vault:', error);

    // Fallback to environment variables
    client = new Client({
      node: process.env.OPENSEARCH_HOST,
      auth: {
        username: process.env.OPENSEARCH_USERNAME,
        password: process.env.OPENSEARCH_PASSWORD,
      },
      ssl: {
        rejectUnauthorized: false, // Only for development
      },
    });

    return client;
  }
};

// Get index pattern for a date range
const getIndexPatternForDateRange = (startDate, endDate) => {
  if (!startDate) {
    // Default to last 7 days if no start date provided
    startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
  }

  if (!endDate) {
    endDate = new Date();
  }

  const indices = [];
  const currentDate = new Date(startDate);

  // Loop through each day in the range
  while (currentDate <= endDate) {
    indices.push(getIndexNameForDate(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return indices.join(',');
};

// Delete indices older than retention period (90 days)
const deleteOldIndices = async () => {
  try {
    const client = await getOpenSearchClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days retention

    // Get all indices starting with logs-
    const indices = await client.cat.indices({
      index: 'logs-*',
      format: 'json'
    });

    for (const index of indices.body) {
      // Extract date from index name (logs-YYYY-MM-DD)
      const indexDate = index.index.replace('logs-', '');
      const [year, month, day] = indexDate.split('-').map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        continue; // Skip if not in expected format
      }

      const indexDateObj = new Date(year, month - 1, day);

      // Delete if older than retention period
      if (indexDateObj < cutoffDate) {
        console.log(`Deleting old index: ${index.index}`);
        await client.indices.delete({ index: index.index });
      }
    }
  } catch (error) {
    console.error('Error pruning old indices:', error);
  }
};

// Create the index templates for time-based sharding
const createIndexTemplates = async () => {
  try {
    const client = await getOpenSearchClient();

    // Create template for logs
    await client.indices.putTemplate({
      name: 'logs-template',
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
                'ip': { type: 'ip', ignore_malformed: true }  // Add ignore_malformed: true
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
                'destPort': { type: 'integer' },
                'flow': {
                  properties: {
                    'state': { type: 'keyword' },
                    'pktsToServer': { type: 'long' },
                    'bytesToServer': { type: 'long' },
                    'pktsToClient': { type: 'long' },
                    'bytesToClient': { type: 'long' }
                  }
                }
              }
            },
            'data': {
              type: 'object',
              enabled: true,
              // Index important nested fields
              properties: {
                'win': { type: 'object', enabled: true },
                'action': { type: 'keyword' },
                'app': { type: 'keyword' },
                'appcat': { type: 'keyword' }
              }
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
              enabled: true,
              properties: {
                'timestamp': { type: 'date' },
                'log_analysis': { type: 'keyword' },
                'anomaly_detected': { type: 'boolean' },
                'anomaly_score': { type: 'integer' },
                'original_log_id': { type: 'keyword' },
                'original_source': { type: 'keyword' },
                'analysis_timestamp': { type: 'date' },
                'correlation': {
                  properties: {
                    'source': { type: 'keyword' },
                    'destination': { type: 'keyword' },
                    'path': { type: 'keyword' },
                    'description': { type: 'text' }
                  }
                },
                'log_summary': { type: 'text' },
                'categories': {
                  properties: {
                    'score_category': { type: 'keyword' },
                    'severity_category': { type: 'keyword' },
                    'combined_risk': { type: 'keyword' }
                  }
                },
                'hybrid_score': { type: 'float' },
                'anomaly_reason': { type: 'text' },
                'cluster_info': {
                  properties: {
                    'cluster_id': { type: 'integer' },
                    'is_outlier': { type: 'boolean' },
                    'is_in_small_cluster': { type: 'boolean' }
                  }
                },
                'score_explanation': { type: 'object', enabled: false }
              }
            },
            'raw_log': {
              type: 'object',
              enabled: false, // Keep this as false to prevent indexing all fields
              properties: {
                'message': {
                  type: 'text',  // Add this specific field for searching
                  fields: {
                    'keyword': { type: 'keyword' }
                  }
                }
              }
            }
          }
        },
        settings: {
          'index.refresh_interval': '5s',
          'index.number_of_shards': 1,
          'index.number_of_replicas': 0,
          'index.mapping.total_fields.limit': 2000 // Increase field limit
        }
      }
    });

    console.log('OpenSearch logs template created successfully');

    // Verify if template was created correctly
    try {
      const templateCheck = await client.indices.getTemplate({
        name: 'logs-template'
      });
      console.log('Template exists:', templateCheck.body ? 'Yes' : 'No');
    } catch (error) {
      console.error('Error checking template:', error.message);
    }

    // Create today's index if it doesn't exist
    const todayIndex = getTodayIndexName();
    const indexExists = await client.indices.exists({ index: todayIndex });

    if (!indexExists.body) {
      await client.indices.create({ index: todayIndex });
      console.log(`Created today's index: ${todayIndex}`);
    } else {
      console.log(`Today's index already exists: ${todayIndex}`);
    }

    // Keep the existing user and ticket index creation logic
    // This is your original code for creating users and tickets indices
    const userIndex = INDICES.USERS;
    const userExists = await client.indices.exists({ index: userIndex });

    if (!userExists.body) {
      await client.indices.create({
        index: userIndex,
        body: {
          mappings: {
            properties: {
              username: { type: 'keyword' },
              password: { type: 'keyword' },
              fullName: { type: 'text' },
              email: { type: 'keyword' },
              phone: { type: 'keyword' },
              department: { type: 'keyword' },
              role: { type: 'keyword' },
              plan: { type: 'keyword' },
              authority: { type: 'keyword' },
              planExpiryDate: { type: 'date' },
              active: { type: 'boolean' },
              lastLogin: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });

      console.log('Users index created');
      await createDefaultAdmin(client);
    }

    // Create tickets index if needed
    const ticketsIndex = INDICES.TICKETS;
    const ticketsExists = await client.indices.exists({ index: ticketsIndex });

    if (!ticketsExists.body) {
      await client.indices.create({
        index: ticketsIndex,
        body: {
          mappings: {
            properties: {
              ticketId: { type: 'keyword' },
              creator: {
                properties: {
                  id: { type: 'keyword' },
                  username: { type: 'keyword' },
                  name: { type: 'text' }
                }
              },
              assignedTo: {
                properties: {
                  id: { type: 'keyword' },
                  username: { type: 'keyword' },
                  name: { type: 'text' }
                }
              },
              logSummary: {
                properties: {
                  originalLogId: { type: 'keyword' },
                  timestamp: { type: 'date' },
                  // Other log fields...
                }
              },
              originalLog: { type: 'object', enabled: false },
              status: { type: 'keyword' },
              description: { type: 'text' },
              statusHistory: {
                type: 'nested',
                properties: {
                  status: { type: 'keyword' },
                  changedBy: {
                    properties: {
                      id: { type: 'keyword' },
                      username: { type: 'keyword' }
                    }
                  },
                  description: { type: 'text' },
                  timestamp: { type: 'date' }
                }
              },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' }
            }
          }
        }
      });
      console.log('Tickets index created');
    }

    // Create tickets_counter index if needed
    const counterExists = await client.indices.exists({ index: 'tickets_counter' });

    if (!counterExists.body) {
      await client.indices.create({ index: 'tickets_counter' });
      await client.index({
        index: 'tickets_counter',
        id: 'counter',
        body: {
          seq: 0
        },
        refresh: true
      });
      console.log('Tickets counter created');
    }

    // Schedule daily index cleanup
    deleteOldIndices();



    return client;
  } catch (error) {
    console.error('Error creating OpenSearch index templates:', error);
    throw error;
  }
};

module.exports = {
  getOpenSearchClient,
  createIndexTemplates,
  getIndexNameForDate,
  getTodayIndexName,
  getIndexPatternForDateRange,
  deleteOldIndices,
  checkOpenSearchStatus,
  INDICES
};