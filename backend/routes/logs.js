const express = require('express');
const router = express.Router();
const { getOpenSearchClient, getIndexNameForDate, getIndexPatternForDateRange } = require('../config/opensearch');
//const { keycloakMiddleware } = require('../config/keycloak');
const { ApiError } = require('../utils/errorHandler');
const { authenticate, hasRole } = require('../middleware/authMiddleware');

// Apply Keycloak authentication middleware to all routes
//router.use(keycloakMiddleware);
router.use(authenticate);

// Utility function to parse time range parameters
const parseTimeRange = (timeRange = '24h') => {
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  
  // Parse timeRange
  if (timeRange.startsWith('custom:')) {
    // Custom absolute timerange
    const parts = timeRange.split(':');
    if (parts.length === 3) {
      startDate = new Date(parts[1]);
      endDate = new Date(parts[2]);
    }
  } else {
    // Relative timerange
    switch (timeRange) {
      case '15m':
        startDate.setMinutes(startDate.getMinutes() - 15);
        break;
      case '1h':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '4h':
        startDate.setHours(startDate.getHours() - 4);
        break;
      case '12h':
        startDate.setHours(startDate.getHours() - 12);
        break;
      case '3d':
        startDate.setDate(startDate.getDate() - 3);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '15d':
        startDate.setDate(startDate.getDate() - 15);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '24h':
      default:
        startDate.setDate(startDate.getDate() - 1);
        break;
    }
  }
  
  return { startDate, endDate };
};

router.get('/major', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h'
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get all existing indices with logs-* pattern
    const indicesResponse = await client.cat.indices({ 
      index: 'logs-*', 
      format: 'json' 
    });
    
    let indices = [];
    
    if (indicesResponse.body && indicesResponse.body.length > 0) {
      indices = indicesResponse.body.map(index => index.index);
    }
    
    // If no indices found, return empty result
    if (indices.length === 0) {
      return res.json({
        logs: [],
        stats: {
          total: 0,
          byLevel: [],
          byAgent: [],
          byTimeInterval: [],
          mitreCategories: {
            tactics: [],
            techniques: [],
            ids: []
          },
          ruleGroups: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // Build main query for logs with rule level >= 12
    const majorLogsQuery = {
      bool: {
        must: [
          {
            range: {
              '@timestamp': {
                gte: startDate.toISOString(),
                lte: endDate.toISOString()
              }
            }
          },
          {
            range: {
              'rule.level': {
                gte: 12
              }
            }
          }
        ]
      }
    };

    if (search) {
      majorLogsQuery.bool.must.push({
        match: {
          'raw_log.message': {
            query: search,
            operator: 'or'
          }
        }
      });
    }

    // Get paginated major logs
    const logsResponse = await client.search({
      index: indices.join(','),
      body: {
        from,
        size: pageSize,
        query: majorLogsQuery,
        sort: [
          {
            [sortBy]: {
              order: sortOrder
            }
          }
        ]
      }
    });

    // Get statistics for major logs in parallel
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        query: majorLogsQuery,
        aggs: {
          // Severity distribution (by rule level)
          level_distribution: {
            terms: {
              field: 'rule.level',
              size: 10
            }
          },
          // Agent distribution
          agent_distribution: {
            terms: {
              field: 'agent.name',
              size: 20
            }
          },
          // Time trend
          time_trend: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // MITRE ATT&CK Tactics
          mitre_tactics: {
            nested: {
              path: 'rule.mitre.tactic'
            },
            aggs: {
              tactics: {
                terms: {
                  field: 'rule.mitre.tactic',
                  size: 20
                }
              }
            }
          },
          // MITRE ATT&CK Techniques
          mitre_techniques: {
            nested: {
              path: 'rule.mitre.technique'
            },
            aggs: {
              techniques: {
                terms: {
                  field: 'rule.mitre.technique',
                  size: 20
                }
              }
            }
          },
          // MITRE ATT&CK IDs
          mitre_ids: {
            nested: {
              path: 'rule.mitre.id'
            },
            aggs: {
              ids: {
                terms: {
                  field: 'rule.mitre.id',
                  size: 20
                }
              }
            }
          },
          // Rule groups
          rule_groups: {
            terms: {
              field: 'rule.groups',
              size: 20
            }
          }
        }
      }
    });

    // Process and format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Process statistics
    const aggregations = statsResponse.body.aggregations;
    const stats = {
      total: logsResponse.body.hits.total.value,
      byLevel: aggregations.level_distribution.buckets.map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: aggregations.agent_distribution.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byTimeInterval: aggregations.time_trend.buckets.map(bucket => ({
        timestamp: bucket.key_as_string,
        count: bucket.doc_count
      })),
      mitreCategories: {
        tactics: aggregations.mitre_tactics?.tactics?.buckets || [],
        techniques: aggregations.mitre_techniques?.techniques?.buckets || [],
        ids: aggregations.mitre_ids?.ids?.buckets || []
      },
      ruleGroups: aggregations.rule_groups.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      }))
    };

    // Return results
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: logsResponse.body.hits.total.value,
        pages: Math.ceil(logsResponse.body.hits.total.value / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get logs with MITRE ATT&CK information
router.get('/mitre', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h'
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have MITRE ATT&CK information
    const query = {
      bool: {
        must: [
          // Time range filter
          {
            range: {
              '@timestamp': {
                gte: startDate.toISOString(),
                lte: endDate.toISOString()
              }
            }
          },
          // Ensure rule.mitre exists
          {
            exists: {
              field: 'rule.mitre'
            }
          }
        ]
      }
    };

    // Add search if provided
    if (search && search.trim() !== '') {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: [
            'rule.description^3',
            'rule.mitre.tactic^2',
            'rule.mitre.technique^2',
            'rule.mitre.id^2',
            'agent.name',
            "id"
          ]
        }
      });
    }

    // Get all existing indices with logs-* pattern
    const indicesResponse = await client.cat.indices({ 
      index: 'logs-*', 
      format: 'json' 
    });
    
    let indices = [];
    
    if (indicesResponse.body && indicesResponse.body.length > 0) {
      indices = indicesResponse.body.map(index => index.index);
    }
    
    // If no indices found, return empty result
    if (indices.length === 0) {
      console.log('No indices found');
      return res.json({
        logs: [],
        stats: {
          total: 0,
          byRuleLevel: [],
          byAgent: [],
          byTactic: [],
          byTechnique: [],
          byMitreId: [],
          timeDistribution: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // Execute search query
    const response = await client.search({
      index: indices.join(','),
      body: {
        from,
        size: pageSize,
        query,
        sort: [
          {
            [sortBy]: {
              order: sortOrder
            }
          }
        ],
        // Add aggregations for statistics
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 10
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 20
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // MITRE ATT&CK Tactics
          mitre_tactics: {
            terms: {
              field: 'rule.mitre.tactic',
              size: 20
            }
          },
          // MITRE ATT&CK Techniques
          mitre_techniques: {
            terms: {
              field: 'rule.mitre.technique',
              size: 20
            }
          },
          // MITRE ATT&CK IDs
          mitre_ids: {
            terms: {
              field: 'rule.mitre.id',
              size: 30
            }
          }
        }
      }
    });

    // Format the logs
    const logs = response.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = response.body.aggregations;

    // Format the statistics
    const stats = {
      total: response.body.hits.total.value,
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byTactic: (aggs.mitre_tactics?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byTechnique: (aggs.mitre_techniques?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byMitreId: (aggs.mitre_ids?.buckets || []).map(bucket => ({
        id: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }))
    };

    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: response.body.hits.total.value,
        pages: Math.ceil(response.body.hits.total.value / pageSize)
      }
    });
  } catch (error) {
    console.error('Error in MITRE logs route:', error);
    next(error);
  }
});
// Get logs with pagination, filtering and sorting
// Update in backend/routes/logs.js to improve search in raw_log.message

// Get logs with pagination, filtering and sorting
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      logType = 'all',
      ruleLevel = 'all',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h'
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const from = (currentPage - 1) * pageSize;

    // Use the utility function to parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query
    const query = {
      bool: {
        must: []
      }
    };

    // Add search term if provided - IMPROVED SEARCH FUNCTIONALITY
    if (search && search.trim() !== '') {
      console.log(`Searching for: "${search}"`);
      
      // Multi-match query to search in multiple fields including raw_log.message
      query.bool.must.push({
        bool: {
          should: [
            // Search in raw_log.message field with high boost
            { 
              query_string: {
                query: `*${search}*`,
                fields: ["raw_log.message^3"],
                analyze_wildcard: true
              }
            },
            // Search in rule description
            { 
              query_string: {
                query: `*${search}*`, 
                fields: ["rule.description^2"],
                analyze_wildcard: true
              }
            },
            // Search in other common fields
            { 
              multi_match: {
                query: search,
                fields: [
                  "agent.name",
                  "data.app",
                  "data.msg",
                  "id"
                ],
                type: "best_fields",
                fuzziness: "AUTO"
              } 
            }
          ],
          minimum_should_match: 1
        }
      });
    }

    // Filter by log type
    if (logType !== 'all') {
      // Your existing log type filter logic
      // (keeping this unchanged as it works correctly)
      if (logType === 'firewall') {
        query.bool.must.push({
          bool: {
            should: [
              { match: { 'rule.groups': 'Firewall' } }
            ],
            minimum_should_match: 1
          }
        });
      } else if (logType === 'ids') {
        query.bool.must.push({
          bool: {
            should: [
              { match: { 'rule.groups': 'ids' } },
              { match: { 'rule.groups': 'ips' } },
              { match: { 'rule.groups': 'IDS/IPS' } }
            ],
            minimum_should_match: 1
          }
        });
      } else if (logType === 'windows') {
        query.bool.must.push({
          bool: {
            should: [
              { match: { 'rule.groups': 'windows' } },
              { match: { 'agent.name': 'windows' } }
            ],
            minimum_should_match: 1
          }
        });
      } else if (logType === 'linux') {
        query.bool.must.push({
          bool: {
            should: [
              { match: { 'rule.groups': 'linux' } },
              { match: { 'rule.groups': 'linuxkernel' } }             
            ],
            minimum_should_match: 1
          }
        });
      }
    }

    // Filter by rule level if provided
    if (ruleLevel !== 'all') {
      const levelNum = parseInt(ruleLevel, 10);
      query.bool.must.push({
        range: {
          'rule.level': {
            gte: levelNum
          }
        }
      });
    }

    // Add date range filter
    query.bool.must.push({
      range: {
        '@timestamp': {
          gte: startDate.toISOString(),
          lte: endDate.toISOString()
        }
      }
    });

    // Get all existing indices with logs-* pattern
    const indicesResponse = await client.cat.indices({ 
      index: 'logs-*', 
      format: 'json' 
    });
    
    let indices = [];
    
    if (indicesResponse.body && indicesResponse.body.length > 0) {
      indices = indicesResponse.body.map(index => index.index);
    }
    
    // If no indices found, return empty result
    if (indices.length === 0) {
      console.log('No indices found');
      return res.json({
        logs: [],
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: totalCount,
          pages: totalPages
        }
      });
    }

    console.log(`Searching in indices: ${indices.join(', ')}`);
    console.log(`From: ${from}, size: ${pageSize}`);
    console.log(`Query:`, JSON.stringify(query, null, 2));

    // Execute search query
    const response = await client.search({
      index: indices.join(','),
      body: {
        from,
        size: pageSize,
        query,
        sort: [
          {
            [sortBy]: {
              order: sortOrder
            }
          }
        ],
        _source: {
          excludes: ['raw_log.command', 'raw_log.script'] // Exclude potentially large binary fields
        },
        // Add highlight feature for search terms
        ...(search && search.trim() !== '' ? {
          highlight: {
            fields: {
              "raw_log.message": {},
              "rule.description": {}
            },
            pre_tags: ["<strong>"],
            post_tags: ["</strong>"]
          }
        } : {})
      }
    });

    console.log(`Search response: found ${response.body.hits.total.value} logs`);

    // Format the response
    const logs = response.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id, // Use id instead of _id to match DataGrid expectations
      _score: hit._score,
      // Add highlight information if available
      _highlights: hit.highlight
    }));

    res.json({
      logs,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: response.body.hits.total.value,
        pages: Math.ceil(response.body.hits.total.value / pageSize)
      }
    });
  } catch (error) {
    console.error('Error in logs route:', error);
    next(error);
  }
});

// Get major logs (rule level >= 12) with statistics


// Get log by ID
router.get('/:id', hasRole(['admin', 'analyst-l1', 'analyst-l2', 'analyst-l3']), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get all indices with logs-* pattern to search across all daily indices
    const indicesResponse = await client.cat.indices({ 
      index: 'logs-*', 
      format: 'json' 
    });
    
    const indices = indicesResponse.body.map(index => index.index).join(',');

    // Search for the log across all indices
    const response = await client.search({
      index: indices,
      body: {
        query: {
          ids: {
            values: [id]
          }
        }
      }
    });

    // Check if log found
    if (response.body.hits.total.value === 0) {
      throw new ApiError(404, 'Log not found');
    }

    // Return the log
    const log = response.body.hits.hits[0]._source;
    log._id = response.body.hits.hits[0]._id;

    res.json(log);
  } catch (error) {
    next(error);
  }
});

// Get log statistics for dashboard
// Get log statistics for dashboard
router.get('/stats/overview', async (req, res, next) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get all existing indices with logs-* pattern
    const indicesResponse = await client.cat.indices({ 
      index: 'logs-*', 
      format: 'json' 
    });
    
    let indices = [];
    
    if (indicesResponse.body && indicesResponse.body.length > 0) {
      indices = indicesResponse.body.map(index => index.index);
    }
    
    // If no indices found, return empty result
    if (indices.length === 0) {
      return res.json({
        total: 0,
        major: 0,
        normal: 0,
        ruleLevels: [],
        dailyLogs: []
      });
    }

    // Execute search query for total logs
    const totalResponse = await client.count({
      index: indices.join(','),
      body: {
        query: {
          range: {
            '@timestamp': {
              gte: startDate.toISOString(),
              lte: endDate.toISOString()
            }
          }
        }
      }
    });

    // Execute search query for major logs (rule level >= 12)
    const majorResponse = await client.count({
      index: indices.join(','),
      body: {
        query: {
          bool: {
            must: [
              {
                range: {
                  '@timestamp': {
                    gte: startDate.toISOString(),
                    lte: endDate.toISOString()
                  }
                }
              },
              {
                range: {
                  'rule.level': {
                    gte: 12
                  }
                }
              }
            ]
          }
        }
      }
    });

    // Execute aggregation for logs by rule level
    const levelAggResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        query: {
          range: {
            '@timestamp': {
              gte: startDate.toISOString(),
              lte: endDate.toISOString()
            }
          }
        },
        aggs: {
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 10
            }
          },
          daily_logs: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          }
        }
      }
    });

    // Format the response
    const stats = {
      total: totalResponse.body.count,
      major: majorResponse.body.count,
      normal: totalResponse.body.count - majorResponse.body.count,
      ruleLevels: levelAggResponse.body.aggregations.rule_levels.buckets.map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      dailyLogs: levelAggResponse.body.aggregations.daily_logs.buckets.map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }))
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});



module.exports = router;

