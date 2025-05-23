const express = require('express');
const router = express.Router();
const { getOpenSearchClient, getIndexNameForDate, getIndexPatternForDateRange } = require('../config/opensearch');
const { ApiError } = require('../utils/errorHandler');
const { authenticate, hasRole } = require('../middleware/authMiddleware');

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

router.get('/advanced-analytics', async (req, res, next) => {
  try {
    const { timeRange = '7d' } = req.query;
    
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
        summary: {
          total: 0,
          warnings: 0,
          critical: 0,
          normal: 0
        },
        timeline: [],
        ruleLevels: [],
        ruleDescriptions: [],
        topAgents: [],
        topProtocols: [],
        networkFlows: []
      });
    }

    // Multiple queries in parallel for better performance
    const [summaryResponse, timelineResponse, detailsResponse, networkResponse] = await Promise.all([
      // Query 1: Get summary counts
      client.search({
        index: indices.join(','),
        body: {
          size: 0,
          track_total_hits: true,
          query: {
            range: {
              '@timestamp': {
                gte: startDate.toISOString(),
                lte: endDate.toISOString()
              }
            }
          },
          aggs: {
            critical_events: {
              filter: {
                range: {
                  'rule.level': {
                    gte: 12
                  }
                }
              }
            },
            warning_events: {
              filter: {
                range: {
                  'rule.level': {
                    gte: 9,
                    lt: 12
                  }
                }
              }
            }
          }
        }
      }),
      
      // Query 2: Get timeline data
      client.search({
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
            events_over_time: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: 'day'
              },
              aggs: {
                critical_events: {
                  filter: {
                    range: {
                      'rule.level': {
                        gte: 12
                      }
                    }
                  }
                },
                warning_events: {
                  filter: {
                    range: {
                      'rule.level': {
                        gte: 9,
                        lt: 12
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }),
      
      // Query 3: Get rule levels and descriptions
      client.search({
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
                size: 20
              }
            },
            top_agents: {
              terms: {
                field: 'agent.name',
                size: 20
              }
            },
            rule_descriptions: {
              terms: {
                field: 'rule.description.keyword',
                size: 50
              }
            }
          }
        }
      }),
      
      // Query 4: Get network data
      client.search({
        index: indices.join(','),
        body: {
          size: 0,
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
                  exists: {
                    field: 'network.srcIp'
                  }
                },
                {
                  exists: {
                    field: 'network.destIp'
                  }
                }
              ]
            }
          },
          aggs: {
            protocols: {
              terms: {
                field: 'network.protocol',
                size: 20
              }
            },
            network_flows: {
              composite: {
                size: 100,
                sources: [
                  { srcIp: { terms: { field: 'network.srcIp' } } },
                  { destIp: { terms: { field: 'network.destIp' } } }
                ]
              }
            }
          }
        }
      })
    ]);

    // Process summary results
    const totalEvents = summaryResponse.body.hits.total.value;
    const criticalEvents = summaryResponse.body.aggregations.critical_events.doc_count;
    const warningEvents = summaryResponse.body.aggregations.warning_events.doc_count;
    const normalEvents = totalEvents - criticalEvents - warningEvents;

    // Process timeline results
    const timelineBuckets = timelineResponse.body.aggregations.events_over_time.buckets;
    const timeline = timelineBuckets.map(bucket => ({
      timestamp: bucket.key_as_string,
      total: bucket.doc_count,
      critical: bucket.critical_events.doc_count,
      warning: bucket.warning_events.doc_count
    }));

    // Process rule details
    const ruleLevels = detailsResponse.body.aggregations.rule_levels.buckets.map(bucket => ({
      level: bucket.key,
      count: bucket.doc_count
    }));

    const topAgents = detailsResponse.body.aggregations.top_agents.buckets.map(bucket => ({
      name: bucket.key,
      count: bucket.doc_count
    }));

    const ruleDescriptions = detailsResponse.body.aggregations.rule_descriptions.buckets.map(bucket => ({
      description: bucket.key,
      count: bucket.doc_count
    }));

    // Process network data
    const topProtocols = networkResponse.body.aggregations.protocols.buckets.map(bucket => ({
      name: bucket.key || 'unknown',
      count: bucket.doc_count
    }));

    // Create network flows for Sankey diagram
    const networkFlows = [];
    if (networkResponse.body.aggregations.network_flows && 
        networkResponse.body.aggregations.network_flows.buckets) {
      
      networkResponse.body.aggregations.network_flows.buckets.forEach(bucket => {
        // Only include if source != destination (to avoid cycles)
        if (bucket.key.srcIp !== bucket.key.destIp) {
          networkFlows.push({
            source: bucket.key.srcIp,
            target: bucket.key.destIp,
            value: bucket.doc_count
          });
        }
      });
    }

    // Return results
    res.json({
      summary: {
        total: totalEvents,
        warnings: warningEvents,
        critical: criticalEvents,
        normal: normalEvents
      },
      timeline,
      ruleLevels,
      ruleDescriptions,
      topAgents,
      topProtocols,
      networkFlows
    });
  } catch (error) {
    console.error('Error in advanced analytics endpoint:', error);
    next(error);
  }
});

// Get endpoint-specific analytics
router.get('/endpoint-analytics/:endpoint', async (req, res, next) => {
  try {
    const { endpoint } = req.params;
    const { timeRange = '7d' } = req.query;
    
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint parameter is required' });
    }
    
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
        ruleLevels: [],
        ruleGroups: [],
        ruleDescriptions: [],
        timeline: []
      });
    }

    // Base query with time range and endpoint filter
    const baseQuery = {
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
            term: {
              'agent.name': endpoint
            }
          }
        ]
      }
    };

    // Multiple queries in parallel for better performance
    const [ruleLevelsResponse, ruleDetailsResponse, timelineResponse] = await Promise.all([
      // Query 1: Get rule levels
      client.search({
        index: indices.join(','),
        body: {
          size: 0,
          query: baseQuery,
          aggs: {
            rule_levels: {
              terms: {
                field: 'rule.level',
                size: 20
              }
            }
          }
        }
      }),
      
      // Query 2: Get rule groups and descriptions
      client.search({
        index: indices.join(','),
        body: {
          size: 0,
          query: baseQuery,
          aggs: {
            rule_groups: {
              terms: {
                field: 'rule.groups',
                size: 20
              }
            },
            rule_descriptions: {
              terms: {
                field: 'rule.description.keyword',
                size: 30
              }
            }
          }
        }
      }),
      
      // Query 3: Get timeline
      client.search({
        index: indices.join(','),
        body: {
          size: 0,
          query: baseQuery,
          aggs: {
            events_over_time: {
              date_histogram: {
                field: '@timestamp',
                calendar_interval: 'day'
              }
            }
          }
        }
      })
    ]);

    // Process results
    const ruleLevels = ruleLevelsResponse.body.aggregations.rule_levels.buckets.map(bucket => ({
      level: bucket.key,
      count: bucket.doc_count
    }));

    const ruleGroups = ruleDetailsResponse.body.aggregations.rule_groups.buckets.map(bucket => ({
      name: bucket.key,
      count: bucket.doc_count
    }));

    const ruleDescriptions = ruleDetailsResponse.body.aggregations.rule_descriptions.buckets.map(bucket => ({
      description: bucket.key,
      count: bucket.doc_count
    }));

    const timeline = timelineResponse.body.aggregations.events_over_time.buckets.map(bucket => ({
      timestamp: bucket.key_as_string,
      count: bucket.doc_count
    }));

    // Return results
    res.json({
      ruleLevels,
      ruleGroups,
      ruleDescriptions,
      timeline
    });
  } catch (error) {
    console.error('Error in endpoint analytics endpoint:', error);
    next(error);
  }
});



// Get logs with FIM information (files added, modified, deleted)
router.get('/fim', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      eventType = ''
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 10000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 10000, capping at 10000`);
      pageSize = 10000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have FIM events (syscheck.event exists)
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
          // Ensure syscheck.event exists
          {
            exists: {
              field: 'syscheck.event'
            }
          }
        ]
      }
    };
    
    // Add event type filter if specified
    if (eventType) {
      const eventTypes = eventType.split(',').filter(Boolean);
      if (eventTypes.length > 0) {
        query.bool.must.push({
          terms: {
            'syscheck.event': eventTypes
          }
        });
      }
    }

    // Add search if provided
    if (search && search.trim() !== '') {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: [
            'syscheck.path^3',
            'agent.name^2',
            'rule.description^2',
            'syscheck.event',
            'syscheck.diff',
            'syscheck.mode',
            'rule.id',
            'id',
            'raw_log.message'
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
          byEvent: [],
          byAgent: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Event type distribution
          events: {
            terms: {
              field: 'syscheck.event',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution with event breakdown
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            },
            aggs: {
              events: {
                filters: {
                  filters: {
                    'added': { term: { 'syscheck.event': 'added' } },
                    'modified': { term: { 'syscheck.event': 'modified' } },
                    'deleted': { term: { 'syscheck.event': 'deleted' } }
                  }
                }
              }
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with FIM events`);
    console.log(`Event types found: ${statsResponse.body.aggregations.events.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Process time distribution to include events breakdown
    const timeDistribution = aggs.time_distribution.buckets.map(bucket => {
      const eventBuckets = bucket.events.buckets;
      return {
        date: bucket.key_as_string,
        count: bucket.doc_count,
        events: {
          added: eventBuckets.added.doc_count,
          modified: eventBuckets.modified.doc_count,
          deleted: eventBuckets.deleted.doc_count
        }
      };
    });

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byEvent: aggs.events.buckets.map(bucket => ({
        event: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: aggs.agents.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in FIM logs route:', error);
    next(error);
  }
});

// Get logs with SCA information
router.get('/sca', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      result = '' // For filtering by result (passed, failed, not applicable)
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs with SCA information
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
          // Filter for logs with 'sca' in rule.groups
          {
            term: {
              'rule.groups': 'sca'
            }
          }
        ]
      }
    };

    // Add result filter if provided
    if (result) {
      const resultTypes = result.split(',').filter(Boolean);
      if (resultTypes.length > 0) {
        // Filter by specified results (passed, failed, not applicable)
        query.bool.must.push({
          terms: {
            'data.sca.check.result': resultTypes
          }
        });
      }
    }

    // Add search if provided
    if (search && search.trim() !== '') {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: [
            'rule.description^3',
            'data.sca.policy^2',
            'data.sca.check.title^2',
            'agent.name',
            'data.sca.check.id',
            'raw_log.message'
          ],
          type: "best_fields",
          fuzziness: "AUTO"
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
          byResult: [],
          byAgent: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Result distribution
          results: {
            terms: {
              field: 'data.sca.check.result.keyword',
              size: 20,
              missing: "No Result" // Handle logs that don't have this field
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution with result breakdown
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            },
            aggs: {
              results: {
                terms: {
                  field: 'data.sca.check.result.keyword',
                  size: 20,
                  missing: "No Result"
                }
              }
            }
          },
          // Policy distribution
          policies: {
            terms: {
              field: 'data.sca.policy.keyword',
              size: 50
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    console.log(`Found ${totalCount} total logs with SCA information`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Process time distribution to include results breakdown
    const timeDistribution = aggs.time_distribution.buckets.map(bucket => {
      // Get result buckets or empty array if not available
      const resultBuckets = bucket.results?.buckets || [];
      
      // Create a result map for easier access
      const resultMap = {};
      resultBuckets.forEach(rb => {
        resultMap[rb.key] = rb.doc_count;
      });
      
      return {
        date: bucket.key_as_string,
        count: bucket.doc_count,
        results: {
          passed: resultMap.passed || 0,
          failed: resultMap.failed || 0,
          'not applicable': resultMap['not applicable'] || 0,
          'No Result': resultMap['No Result'] || 0
        }
      };
    });

    // Format the statistics
    const stats = {
      total: totalCount,
      byResult: aggs.results.buckets.map(bucket => ({
        result: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: aggs.agents.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byPolicy: aggs.policies.buckets.map(bucket => ({
        policy: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in SCA logs route:', error);
    next(error);
  }
});

// Get logs with authentication sessions information
router.get('/sessions', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      authResult = '', // For filtering by authentication_success or authentication_failed
      deviceType = '' // For filtering by device type (firewall, windows, linux, mac)
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs with authentication_success or authentication_failed
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
          // Filter for logs with authentication_success or authentication_failed in rule.groups
          {
            bool: {
              should: [
                {
                  term: {
                    'rule.groups': 'authentication_success'
                  }
                },
                {
                  term: {
                    'rule.groups': 'authentication_failed'
                  }
                }
              ],
              minimum_should_match: 1
            }
          }
        ]
      }
    };

    // Add device type filter if provided
    if (deviceType) {
      const deviceFilters = deviceType.split(',').filter(Boolean);
      if (deviceFilters.length > 0) {
        const deviceFilterQuery = {
          bool: {
            should: []
          }
        };

        // Add filters for each device type
        deviceFilters.forEach(type => {
          switch (type.toLowerCase()) {
            case 'firewall':
              deviceFilterQuery.bool.should.push({
                term: {
                  'rule.groups': 'Firewall'
                }
              });
              break;
            case 'windows':
              deviceFilterQuery.bool.should.push({
                term: {
                  'rule.groups': 'windows'
                }
              });
              break;
            case 'linux':
              // Syslog but NOT Firewall
              deviceFilterQuery.bool.should.push({
                bool: {
                  must: [
                    {
                      term: {
                        'rule.groups': 'syslog'
                      }
                    },
                    {
                      bool: {
                        must_not: {
                          term: {
                            'rule.groups': 'Firewall'
                          }
                        }
                      }
                    }
                  ]
                }
              });
              break;
            case 'mac':
              // Either 'mac' or 'apple'
              deviceFilterQuery.bool.should.push({
                bool: {
                  should: [
                    {
                      term: {
                        'rule.groups': 'macOS'
                      }
                    },
                    {
                      term: {
                        'rule.groups': 'apple'
                      }
                    }
                  ],
                  minimum_should_match: 1
                }
              });
              break;
          }
        });

        deviceFilterQuery.bool.minimum_should_match = 1;
        query.bool.must.push(deviceFilterQuery);
      }
    }

    // Add authentication result filter if provided
    if (authResult) {
      const authFilters = authResult.split(',').filter(Boolean);
      if (authFilters.length > 0) {
        const authFilterQuery = {
          bool: {
            should: []
          }
        };

        // Add filters for each auth result
        authFilters.forEach(result => {
          switch (result.toLowerCase()) {
            case 'success':
              authFilterQuery.bool.should.push({
                term: {
                  'rule.groups': 'authentication_success'
                }
              });
              break;
            case 'failed':
              authFilterQuery.bool.should.push({
                term: {
                  'rule.groups': 'authentication_failed'
                }
              });
              break;
          }
        });

        authFilterQuery.bool.minimum_should_match = 1;
        query.bool.must.push(authFilterQuery);
      }
    }

    // Add search if provided
    if (search && search.trim() !== '') {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: [
            'rule.description^3',
            'agent.name^2',
            'data.dstuser',
            'data.srcuser',
            'data.user',
            'data.win.eventdata.targetUserName',
            'raw_log.message'
          ],
          type: "best_fields",
          fuzziness: "AUTO"
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
          byAuthResult: [],
          byDeviceType: [],
          byAgent: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Authentication result distribution (success/failed)
          auth_results: {
            filters: {
              filters: {
                success: {
                  term: {
                    'rule.groups': 'authentication_success'
                  }
                },
                failed: {
                  term: {
                    'rule.groups': 'authentication_failed'
                  }
                }
              }
            }
          },
          
          // Device type distribution based on rule groups
          device_types: {
            filters: {
              filters: {
                firewall: {
                  term: {
                    'rule.groups': 'Firewall'
                  }
                },
                windows: {
                  term: {
                    'rule.groups': 'windows'
                  }
                },
                linux: {
                  bool: {
                    must: [
                      {
                        term: {
                          'rule.groups': 'syslog'
                        }
                      },
                      {
                        bool: {
                          must_not: {
                            term: {
                              'rule.groups': 'Firewall'
                            }
                          }
                        }
                      }
                    ]
                  }
                },
                mac: {
                  bool: {
                    should: [
                      {
                        term: {
                          'rule.groups': 'macOS'
                        }
                      },
                      {
                        term: {
                          'rule.groups': 'apple'
                        }
                      }
                    ],
                    minimum_should_match: 1
                  }
                }
              }
            }
          },
          
          // Authentication results by device type (for more detailed stats)
          auth_by_device: {
            filters: {
              filters: {
                firewall_success: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'Firewall' } },
                      { term: { 'rule.groups': 'authentication_success' } }
                    ]
                  }
                },
                firewall_failed: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'Firewall' } },
                      { term: { 'rule.groups': 'authentication_failed' } }
                    ]
                  }
                },
                windows_success: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'windows' } },
                      { term: { 'rule.groups': 'authentication_success' } }
                    ]
                  }
                },
                windows_failed: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'windows' } },
                      { term: { 'rule.groups': 'authentication_failed' } }
                    ]
                  }
                },
                linux_success: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'syslog' } },
                      { term: { 'rule.groups': 'authentication_success' } },
                      {
                        bool: {
                          must_not: {
                            term: { 'rule.groups': 'Firewall' }
                          }
                        }
                      }
                    ]
                  }
                },
                linux_failed: {
                  bool: {
                    must: [
                      { term: { 'rule.groups': 'syslog' } },
                      { term: { 'rule.groups': 'authentication_failed' } },
                      {
                        bool: {
                          must_not: {
                            term: { 'rule.groups': 'Firewall' }
                          }
                        }
                      }
                    ]
                  }
                },
                mac_success: {
                  bool: {
                    must: [
                      {
                        bool: {
                          should: [
                            { term: { 'rule.groups': 'macOS' } },
                            { term: { 'rule.groups': 'apple' } }
                          ],
                          minimum_should_match: 1
                        }
                      },
                      { term: { 'rule.groups': 'authentication_success' } }
                    ]
                  }
                },
                mac_failed: {
                  bool: {
                    must: [
                      {
                        bool: {
                          should: [
                            { term: { 'rule.groups': 'macOS' } },
                            { term: { 'rule.groups': 'apple' } }
                          ],
                          minimum_should_match: 1
                        }
                      },
                      { term: { 'rule.groups': 'authentication_failed' } }
                    ]
                  }
                }
              }
            }
          },
          
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          
          // Time distribution with auth result breakdown
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            },
            aggs: {
              success: {
                filter: {
                  term: { 'rule.groups': 'authentication_success' }
                }
              },
              failed: {
                filter: {
                  term: { 'rule.groups': 'authentication_failed' }
                }
              }
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    console.log(`Found ${totalCount} total logs with authentication sessions`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Process time distribution to include auth results
    const timeDistribution = aggs.time_distribution.buckets.map(bucket => {
      return {
        date: bucket.key_as_string,
        count: bucket.doc_count,
        results: {
          success: bucket.success.doc_count || 0,
          failed: bucket.failed.doc_count || 0
        }
      };
    });

    // Format the statistics
    const stats = {
      total: totalCount,
      byAuthResult: {
        success: aggs.auth_results.buckets.success.doc_count || 0,
        failed: aggs.auth_results.buckets.failed.doc_count || 0
      },
      byDeviceType: {
        firewall: aggs.device_types.buckets.firewall.doc_count || 0,
        windows: aggs.device_types.buckets.windows.doc_count || 0,
        linux: aggs.device_types.buckets.linux.doc_count || 0,
        mac: aggs.device_types.buckets.mac.doc_count || 0
      },
      byAuthAndDevice: {
        firewall: {
          success: aggs.auth_by_device.buckets.firewall_success.doc_count || 0,
          failed: aggs.auth_by_device.buckets.firewall_failed.doc_count || 0
        },
        windows: {
          success: aggs.auth_by_device.buckets.windows_success.doc_count || 0,
          failed: aggs.auth_by_device.buckets.windows_failed.doc_count || 0
        },
        linux: {
          success: aggs.auth_by_device.buckets.linux_success.doc_count || 0,
          failed: aggs.auth_by_device.buckets.linux_failed.doc_count || 0
        },
        mac: {
          success: aggs.auth_by_device.buckets.mac_success.doc_count || 0,
          failed: aggs.auth_by_device.buckets.mac_failed.doc_count || 0
        }
      },
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in session logs route:', error);
    next(error);
  }
});

router.get('/malware', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      sourceType = '' // For filtering by source type (VirusScanner, SentinelAI, rootcheck)
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for malware-related logs
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
          // Filter for logs with VirusScanner, SentinelAI, or rootcheck in rule.groups
          {
            bool: {
              should: [
                { term: { 'rule.groups': 'VirusScanner' } },
                { term: { 'rule.groups': 'SentinelAI' } },
                { term: { 'rule.groups': 'rootcheck' } }
              ],
              minimum_should_match: 1
            }
          }
        ]
      }
    };

    // Add source type filter if provided
    if (sourceType) {
      const sourceTypes = sourceType.split(',').filter(Boolean);
      if (sourceTypes.length > 0) {
        // Replace the existing should clause with filtered source types
        query.bool.must[1] = {
          bool: {
            should: sourceTypes.map(type => ({
              term: { 'rule.groups': type }
            })),
            minimum_should_match: 1
          }
        };
      }
    }

    // Add search if provided
    if (search && search.trim() !== '') {
      query.bool.must.push({
        multi_match: {
          query: search,
          fields: [
            'rule.description^3',
            'agent.name^2',
            'rule.level',
            'rule.groups',
            'raw_log.message'
          ],
          type: "best_fields",
          fuzziness: "AUTO"
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
          bySourceType: [],
          byAgent: [],
          byDescription: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Source type distribution (VirusScanner, SentinelAI, rootcheck)
          source_types: {
            terms: {
              field: 'rule.groups',
              size: 10,
              include: ['VirusScanner', 'SentinelAI', 'rootcheck']
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Top descriptions
          descriptions: {
            terms: {
              field: 'rule.description.keyword',
              size: 7
            }
          },
          // Time distribution with source type breakdown
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            },
            aggs: {
              source_types: {
                terms: {
                  field: 'rule.groups',
                  size: 10,
                  include: ['VirusScanner', 'SentinelAI', 'rootcheck']
                }
              }
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    console.log(`Found ${totalCount} total logs with malware information`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Process time distribution to include source type breakdown
    const timeDistribution = aggs.time_distribution.buckets.map(bucket => {
      // Get source type buckets or empty array if not available
      const sourceTypeBuckets = bucket.source_types?.buckets || [];
      
      // Create a source type map for easier access
      const sourceTypeMap = {};
      sourceTypeBuckets.forEach(stb => {
        sourceTypeMap[stb.key] = stb.doc_count;
      });
      
      return {
        date: bucket.key_as_string,
        count: bucket.doc_count,
        sourceTypes: {
          VirusScanner: sourceTypeMap.VirusScanner || 0,
          SentinelAI: sourceTypeMap.SentinelAI || 0,
          rootcheck: sourceTypeMap.rootcheck || 0
        }
      };
    });

    // Format the statistics
    const stats = {
      total: totalCount,
      bySourceType: aggs.source_types.buckets.map(bucket => ({
        type: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: aggs.agents.buckets.map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byDescription: aggs.descriptions.buckets.map(bucket => ({
        description: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in malware logs route:', error);
    next(error);
  }
});

// Get logs with Sentinel AI response data
router.get('/sentinel-ai', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h'
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 10000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 10000, capping at 10000`);
      pageSize = 10000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have AI_response data
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
          // Ensure data.AI_response exists
          {
            exists: {
              field: 'data.AI_response'
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
            'data.AI_response^3',
            'rule.description^2',
            'agent.name^2',
            'agent.ip',
            'rule.id',
            'rule.level',
            'id',
            'raw_log.message'
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
        ]
      }
    });

    // Format the logs
    const logs = response.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
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
    console.error('Error in Sentinel AI logs route:', error);
    next(error);
  }
});

// Get logs with ML Analysis data
router.get('/ml-analysis', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h'
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size
    if (pageSize > 10000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 10000, capping at 10000`);
      pageSize = 10000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have ML_logs.anomaly_score data
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
          // Ensure data.ML_logs.anomaly_score exists
          {
            exists: {
              field: 'data.ML_logs.anomaly_score'
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
            'data.ML_logs.ai_ml_logs^3',
            'data.ML_logs.severity^2',
            'rule.description^2',
            'agent.name^2',
            'agent.ip',
            'rule.id',
            'rule.level',
            'id',
            'raw_log.message'
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
        ]
      }
    });

    // Format the logs
    const logs = response.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
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
    console.error('Error in ML Analysis logs route:', error);
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

// Get logs with HIPAA information
router.get('/hipaa', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // New parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have HIPAA information
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
          // Ensure rule.hipaa exists
          {
            exists: {
              field: 'rule.hipaa'
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
            'rule.hipaa^2',
            'agent.name',
            "id",
            "raw_log.message"
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
          byHipaa: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting even with large result sets
        query: query,
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 20 // Increased from 10 to get more complete data
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50 // Increased from 20 to get more complete data
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // HIPAA controls
          hipaa_controls: {
            terms: {
              field: 'rule.hipaa',
              size: 100 // Increased from 30 to get more complete data
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with HIPAA information`);
    console.log(`Rule levels found: ${statsResponse.body.aggregations.rule_levels.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);
    console.log(`HIPAA controls found: ${statsResponse.body.aggregations.hipaa_controls.buckets.length}`);

    // Now get the specific page of logs for pagination
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byHipaa: (aggs.hipaa_controls?.buckets || []).map(bucket => ({
        control: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages based on the accurate total count
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in HIPAA logs route:', error);
    next(error);
  }
});

// Get logs with GDPR information
router.get('/gdpr', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have GDPR information
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
          // Ensure rule.gdpr exists
          {
            exists: {
              field: 'rule.gdpr'
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
            'rule.gdpr^2',
            'rule.level',
            'agent.name',
            "id",
            "raw_log.message",
            "data.srccountry",
            "data.dstcountry"
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
          byGdpr: [],
          timeDistribution: [],
          bySrcCountry: [],
          byDstCountry: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // GDPR controls
          gdpr_controls: {
            terms: {
              field: 'rule.gdpr',
              size: 100
            }
          },
          // Source countries
          src_countries: {
            terms: {
              field: 'data.srccountry.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          },
          // Destination countries
          dst_countries: {
            terms: {
              field: 'data.dstcountry.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with GDPR information`);
    console.log(`Rule levels found: ${statsResponse.body.aggregations.rule_levels.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);
    console.log(`GDPR controls found: ${statsResponse.body.aggregations.gdpr_controls.buckets.length}`);
    console.log(`Source countries found: ${statsResponse.body.aggregations.src_countries.buckets.length}`);
    console.log(`Destination countries found: ${statsResponse.body.aggregations.dst_countries.buckets.length}`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byGdpr: (aggs.gdpr_controls?.buckets || []).map(bucket => ({
        control: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      })),
      bySrcCountry: (aggs.src_countries?.buckets || []).map(bucket => ({
        country: bucket.key,
        count: bucket.doc_count
      })),
      byDstCountry: (aggs.dst_countries?.buckets || []).map(bucket => ({
        country: bucket.key,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in GDPR logs route:', error);
    next(error);
  }
});

// Add this endpoint to your routes/logs.js file

// Get logs with NIST information
router.get('/nist', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have NIST information
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
          // Ensure rule.nist exists
          {
            exists: {
              field: 'rule.nist'
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
            'rule.nist^2',
            'rule.level',
            'agent.name',
            "id",
            "raw_log.message",
            "data.hostname",
            "data.service"
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
          byNist: [],
          timeDistribution: [],
          byHostname: [],
          byService: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // NIST controls
          nist_controls: {
            terms: {
              field: 'rule.nist',
              size: 100
            }
          },
          // Hostname distribution
          hostnames: {
            terms: {
              field: 'data.hostname.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          },
          // Service distribution
          services: {
            terms: {
              field: 'data.service.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with NIST information`);
    console.log(`Rule levels found: ${statsResponse.body.aggregations.rule_levels.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);
    console.log(`NIST controls found: ${statsResponse.body.aggregations.nist_controls.buckets.length}`);
    console.log(`Hostnames found: ${statsResponse.body.aggregations.hostnames.buckets.length}`);
    console.log(`Services found: ${statsResponse.body.aggregations.services.buckets.length}`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byNist: (aggs.nist_controls?.buckets || []).map(bucket => ({
        control: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      })),
      byHostname: (aggs.hostnames?.buckets || []).map(bucket => ({
        hostname: bucket.key,
        count: bucket.doc_count
      })),
      byService: (aggs.services?.buckets || []).map(bucket => ({
        service: bucket.key,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in NIST logs route:', error);
    next(error);
  }
});

// Get logs with PCI DSS information
router.get('/pcidss', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have PCI DSS information
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
          // Ensure rule.pci_dss exists
          {
            exists: {
              field: 'rule.pci_dss'
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
            'rule.pci_dss^2',
            'rule.level',
            'agent.name',
            "id",
            "raw_log.message",
            "data.msg",
            "data.applist"
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
          byPciDss: [],
          timeDistribution: [],
          byMessage: [],
          byApplist: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // PCI DSS controls
          pci_dss_controls: {
            terms: {
              field: 'rule.pci_dss',
              size: 100
            }
          },
          // Message distribution
          messages: {
            terms: {
              field: 'data.msg.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          },
          // Applist distribution
          applists: {
            terms: {
              field: 'data.applist.keyword',
              size: 50,
              missing: 'Unknown'  // Handle missing values
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with PCI DSS information`);
    console.log(`Rule levels found: ${statsResponse.body.aggregations.rule_levels.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);
    console.log(`PCI DSS controls found: ${statsResponse.body.aggregations.pci_dss_controls.buckets.length}`);
    console.log(`Messages found: ${statsResponse.body.aggregations.messages.buckets.length}`);
    console.log(`Applists found: ${statsResponse.body.aggregations.applists.buckets.length}`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byPciDss: (aggs.pci_dss_controls?.buckets || []).map(bucket => ({
        control: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      })),
      byMessage: (aggs.messages?.buckets || []).map(bucket => ({
        message: bucket.key,
        count: bucket.doc_count
      })),
      byApplist: (aggs.applists?.buckets || []).map(bucket => ({
        applist: bucket.key,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in PCI DSS logs route:', error);
    next(error);
  }
});
// Get logs with TSC information
router.get('/tsc', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have TSC information
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
          // Ensure rule.tsc exists
          {
            exists: {
              field: 'rule.tsc'
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
            'rule.tsc^2',
            'rule.level',
            'agent.name',
            "id",
            "raw_log.message",
            "rule.groups",
            "rule.description"
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
          byTsc: [],
          timeDistribution: [],
          byDescription: [],
          byGroups: []
        },
        pagination: {
          page: currentPage,
          limit: pageSize,
          total: 0,
          pages: 0
        }
      });
    }

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Rule level distribution
          rule_levels: {
            terms: {
              field: 'rule.level',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          },
          // TSC controls
          tsc_controls: {
            terms: {
              field: 'rule.tsc',
              size: 100
            }
          },
          // Description distribution - trimmed to prevent too large aggregations
          descriptions: {
            terms: {
              field: 'rule.description.keyword',
              size: 50
            }
          },
          // Groups distribution
          groups: {
            terms: {
              field: 'rule.groups',
              size: 50
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with TSC information`);
    console.log(`Rule levels found: ${statsResponse.body.aggregations.rule_levels.buckets.length}`);
    console.log(`Agents found: ${statsResponse.body.aggregations.agents.buckets.length}`);
    console.log(`TSC controls found: ${statsResponse.body.aggregations.tsc_controls.buckets.length}`);
    console.log(`Descriptions found: ${statsResponse.body.aggregations.descriptions.buckets.length}`);
    console.log(`Groups found: ${statsResponse.body.aggregations.groups.buckets.length}`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byRuleLevel: (aggs.rule_levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byTsc: (aggs.tsc_controls?.buckets || []).map(bucket => ({
        control: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      })),
      byDescription: (aggs.descriptions?.buckets || []).map(bucket => ({
        description: bucket.key,
        count: bucket.doc_count
      })),
      byGroups: (aggs.groups?.buckets || []).map(bucket => ({
        group: bucket.key,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in TSC logs route:', error);
    next(error);
  }
});

// Get logs with vulnerability information
router.get('/vulnerability', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have vulnerability information
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
          // Ensure data.vulnerability.cve exists
          {
            exists: {
              field: 'data.vulnerability.cve'
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
            'data.vulnerability.cve^2',
            'data.vulnerability.title^2',
            'data.vulnerability.severity.keyword',
            'data.vulnerability.package.name.keyword',
            'agent.name',
            "id",
            "raw_log.message"
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
          bySeverity: [],
          byAgent: [],
          byCve: [],
          byPackage: [],
          byScore: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Severity distribution - Use .keyword for text fields
          severities: {
            terms: {
              field: 'data.vulnerability.severity.keyword',
              size: 20
            }
          },
          // Agent distribution
          agents: {
            terms: {
              field: 'agent.name',
              size: 50
            }
          },
          // CVE distribution - Use .keyword for text fields
          cves: {
            terms: {
              field: 'data.vulnerability.cve.keyword',
              size: 50
            }
          },
          // Package name distribution - Use .keyword for text fields
          packages: {
            terms: {
              field: 'data.vulnerability.package.name.keyword',
              size: 100
            }
          },
          // Score distribution
          scores: {
            terms: {
              field: 'data.vulnerability.score.base.keyword',
              size: 20
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          }
        }
      }
    });

    // Log the aggregation results for debugging
    console.log("Aggregation buckets:", {
      severity: statsResponse.body.aggregations?.severities?.buckets?.length || 0,
      agents: statsResponse.body.aggregations?.agents?.buckets?.length || 0,
      cves: statsResponse.body.aggregations?.cves?.buckets?.length || 0,
      packages: statsResponse.body.aggregations?.packages?.buckets?.length || 0,
      scores: statsResponse.body.aggregations?.scores?.buckets?.length || 0,
      time: statsResponse.body.aggregations?.time_distribution?.buckets?.length || 0
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with vulnerability information`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      bySeverity: (aggs.severities?.buckets || []).map(bucket => ({
        severity: bucket.key,
        count: bucket.doc_count
      })),
      byAgent: (aggs.agents?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byCve: (aggs.cves?.buckets || []).map(bucket => ({
        cve: bucket.key,
        count: bucket.doc_count
      })),
      byPackage: (aggs.packages?.buckets || []).map(bucket => ({
        name: bucket.key,
        count: bucket.doc_count
      })),
      byScore: (aggs.scores?.buckets || []).map(bucket => ({
        score: bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in vulnerability logs route:', error);
    next(error);
  }
});

// Get logs with threat hunting information
router.get('/threathunting', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 100,
      search = '',
      sortBy = '@timestamp',
      sortOrder = 'desc',
      timeRange = '24h',
      fullStats = false // Parameter for full stats
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    let pageSize = parseInt(limit, 10);
    
    // Cap the maximum page size at 100,000
    if (pageSize > 100000) {
      console.warn(`Requested size ${pageSize} exceeds max limit of 100000, capping at 100000`);
      pageSize = 100000;
    }
    
    const from = (currentPage - 1) * pageSize;

    // Parse time range
    const { startDate, endDate } = parseTimeRange(timeRange);
    
    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query for logs that have data.action
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
          // Ensure data.action exists
          {
            exists: {
              field: 'data.action'
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
            'data.action^2',
            'data.msg^2',
            'data.direction',
            'data.app',
            'data.applist',
            'data.apprisk',
            'data.srccountry',
            'data.dstcountry',
            'agent.name',
            "id",
            "raw_log.message"
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
          byAction: [],
          byDirection: [],
          byMessage: [],
          byAppList: [],
          byAppRisk: [],
          byLevel: [],
          bySrcCountry: [],
          byDstCountry: [],
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

    // First get total count and stats with a size 0 query for accuracy
    const statsResponse = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        track_total_hits: true, // Ensure accurate counting for large result sets
        query: query,
        aggs: {
          // Action distribution
          actions: {
            terms: {
              field: 'data.action',
              size: 20
            }
          },
          // Direction distribution
          directions: {
            terms: {
              field: 'data.direction.keyword',
              size: 20
            }
          },
          // Message distribution
          messages: {
            terms: {
              field: 'data.msg.keyword',
              size: 50
            }
          },
          // App list distribution
          applists: {
            terms: {
              field: 'data.applist.keyword',
              size: 30
            }
          },
          // App risk distribution
          apprisks: {
            terms: {
              field: 'data.apprisk.keyword',
              size: 20
            }
          },
          // Level distribution
          levels: {
            terms: {
              field: 'data.level.keyword',
              size: 20
            }
          },
          // Source country distribution
          src_countries: {
            terms: {
              field: 'data.srccountry.keyword',
              size: 50,
              missing: 'Unknown'
            }
          },
          // Destination country distribution
          dst_countries: {
            terms: {
              field: 'data.dstcountry.keyword',
              size: 50,
              missing: 'Unknown'
            }
          },
          // Time distribution
          time_distribution: {
            date_histogram: {
              field: '@timestamp',
              calendar_interval: 'day'
            }
          }
        }
      }
    });

    // Get the total count from the stats query
    const totalCount = statsResponse.body.hits.total.value;
    
    // Log the stats found
    console.log(`Found ${totalCount} total logs with threat hunting information`);

    // Now get the specific page of logs
    const logsResponse = await client.search({
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
        ]
      }
    });

    // Format the logs
    const logs = logsResponse.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id,
      _score: hit._score
    }));

    // Extract aggregation results
    const aggs = statsResponse.body.aggregations;

    // Format the statistics
    const stats = {
      total: totalCount, // Use the accurate total from the stats query
      byAction: (aggs.actions?.buckets || []).map(bucket => ({
        action: bucket.key,
        count: bucket.doc_count
      })),
      byDirection: (aggs.directions?.buckets || []).map(bucket => ({
        direction: bucket.key,
        count: bucket.doc_count
      })),
      byMessage: (aggs.messages?.buckets || []).map(bucket => ({
        message: bucket.key,
        count: bucket.doc_count
      })),
      byAppList: (aggs.applists?.buckets || []).map(bucket => ({
        applist: bucket.key,
        count: bucket.doc_count
      })),
      byAppRisk: (aggs.apprisks?.buckets || []).map(bucket => ({
        risk: bucket.key,
        count: bucket.doc_count
      })),
      byLevel: (aggs.levels?.buckets || []).map(bucket => ({
        level: bucket.key,
        count: bucket.doc_count
      })),
      bySrcCountry: (aggs.src_countries?.buckets || []).map(bucket => ({
        country: bucket.key === 'Reserved' ? 'Server' : bucket.key,
        count: bucket.doc_count
      })),
      byDstCountry: (aggs.dst_countries?.buckets || []).map(bucket => ({
        country: bucket.key === 'Reserved' ? 'Server' : bucket.key,
        count: bucket.doc_count
      })),
      timeDistribution: (aggs.time_distribution?.buckets || []).map(bucket => ({
        date: bucket.key_as_string,
        count: bucket.doc_count
      }))
    };

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / pageSize);

    // Return results with pagination
    res.json({
      logs,
      stats,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: totalCount,
        pages: totalPages
      }
    });
  } catch (error) {
    console.error('Error in threat hunting logs route:', error);
    next(error);
  }
});

// Get connection data for the world map
router.get('/connections', async (req, res, next) => {
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
        connections: []
      });
    }

    // Build query for logs with srccountry and dstcountry
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
          // Ensure data.srccountry exists
          {
            exists: {
              field: 'data.srccountry'
            }
          },
          // Ensure data.dstcountry exists
          {
            exists: {
              field: 'data.dstcountry'
            }
          }
        ]
      }
    };

    // Execute aggregation query
    const response = await client.search({
      index: indices.join(','),
      body: {
        size: 0,
        query: query,
        aggs: {
          connections: {
            composite: {
              sources: [
                { source: { terms: { field: 'data.srccountry.keyword' } } },
                { destination: { terms: { field: 'data.dstcountry.keyword' } } }
              ],
              size: 100  // Limit to top 100 connections
            }
          }
        }
      }
    });

    // Process the results
    const connections = [];
    
    if (response.body.aggregations && response.body.aggregations.connections) {
      const buckets = response.body.aggregations.connections.buckets || [];
      
      buckets.forEach(bucket => {
        // Skip if "Unknown" is either source or destination
        if (bucket.key.source === 'Unknown' || bucket.key.destination === 'Unknown') {
          return;
        }
        
        connections.push({
          source: bucket.key.source,
          destination: bucket.key.destination,
          count: bucket.doc_count
        });
      });
    }

    // Sort by count in descending order and limit to top 50 connections
    connections.sort((a, b) => b.count - a.count);
    const topConnections = connections.slice(0, 50);

    res.json({
      connections: topConnections
    });
  } catch (error) {
    console.error('Error getting connections data:', error);
    next(error);
  }
});

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

