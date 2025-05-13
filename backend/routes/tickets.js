const express = require('express');
const router = express.Router();
const { getOpenSearchClient } = require('../config/opensearch');
const { ApiError } = require('../utils/errorHandler');
const { authenticate, hasRole } = require('../middleware/authMiddleware');

// Apply authentication middleware to all routes
router.use(authenticate);

// Create ticket index if it doesn't exist
const createTicketIndex = async () => {
  try {
    const client = await getOpenSearchClient();

    // Check if index exists
    const indexExists = await client.indices.exists({
      index: 'tickets'
    });

    if (!indexExists.body) {
      // Create index with mapping
      await client.indices.create({
        index: 'tickets',
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
                  agentName: { type: 'keyword' },
                  agentId: { type: 'keyword' },
                  agentIp: { type: 'ip' },
                  ruleId: { type: 'keyword' },
                  ruleLevel: { type: 'integer' },
                  ruleDescription: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 256 } } }
                }
              },
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

    // Create or check ticket counter
    const counterIndex = await client.indices.exists({ index: 'tickets_counter' });

    if (!counterIndex.body) {
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
  } catch (error) {
    console.error('Error creating tickets index:', error);
    throw error;
  }
};

// Create a ticket
router.post('/', async (req, res, next) => {
  try {
    // Create ticket index if it doesn't exist
    await createTicketIndex();

    const { logData, description, assignedToId } = req.body;

    if (!logData || !description) {
      throw new ApiError(400, 'Log data and description are required');
    }

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get next ticket number
    const counterResponse = await client.update({
      index: 'tickets_counter',
      id: 'counter',
      body: {
        script: {
          source: 'ctx._source.seq += 1',
          lang: 'painless'
        },
        upsert: {
          seq: 1
        }
      },
      refresh: true
    });


    let seq;
    if (counterResponse.body._source && counterResponse.body._source.seq) {
      seq = counterResponse.body._source.seq;
    } else if (counterResponse.body.get && counterResponse.body.get._source) {
      seq = counterResponse.body.get._source.seq;
    } else {
      // Fallback: fetch the current counter value
      const currentCounter = await client.get({
        index: 'tickets_counter',
        id: 'counter'
      });
      seq = currentCounter.body._source.seq;
    }
    const ticketId = `TICKET-${String(seq).padStart(6, '0')}`;

    // Format the ticket data
    const ticketData = {
      ticketId,
      creator: {
        id: req.user.id,
        username: req.user.username,
        name: req.user.fullName || req.user.username
      },
      logSummary: {
        originalLogId: logData._id || logData.id || 'unknown',
        timestamp: logData['@timestamp'] || new Date().toISOString(),
        agentName: logData.agent?.name || 'unknown',
        agentId: logData.agent?.id || 'unknown',
        agentIp: logData.agent?.ip || 'unknown',
        ruleId: logData.rule?.id || 'unknown',
        ruleLevel: parseInt(logData.rule?.level || '0', 10),
        ruleDescription: logData.rule?.description || 'No description'
      },
      // Store the entire log
      originalLog: logData,
      status: 'Open',
      description,
      statusHistory: [{
        status: 'Open',
        changedBy: {
          id: req.user.id,
          username: req.user.username
        },
        description: 'Ticket created',
        timestamp: new Date().toISOString()
      }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add assignedTo if provided
    if (assignedToId) {
      // Fetch the assigned user's details
      try {
        const userResponse = await client.get({
          index: 'users',
          id: assignedToId
        });

        ticketData.assignedTo = {
          id: assignedToId,
          username: userResponse.body._source.username,
          name: userResponse.body._source.fullName || userResponse.body._source.username
        };
      } catch (error) {
        console.error('Error fetching assigned user:', error);
        // Continue with basic assignedTo info if user fetch fails
        ticketData.assignedTo = {
          id: assignedToId,
          username: 'assigned_user',
          name: 'Assigned User'
        };
      }
    }

    // Create the ticket
    const response = await client.index({
      index: 'tickets',
      body: ticketData,
      refresh: true
    });

    // Return the created ticket
    res.status(201).json({
      success: true,
      ticket: {
        ...ticketData,
        id: response.body._id
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get all tickets
router.get('/', async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      assignedToId,
      creatorId
    } = req.query;

    // Calculate pagination values
    const currentPage = parseInt(page, 10);
    const pageSize = parseInt(limit, 10);
    const from = (currentPage - 1) * pageSize;

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Build query
    const query = {
      bool: {
        must: []
      }
    };

    // Filter by status if provided
    if (status) {
      query.bool.must.push({
        term: {
          status: status
        }
      });
    }

    // Filter by assignedTo if provided
    if (assignedToId) {
      query.bool.must.push({
        term: {
          'assignedTo.id': assignedToId
        }
      });
    }

    // Filter by creator if provided
    if (creatorId) {
      query.bool.must.push({
        term: {
          'creator.id': creatorId
        }
      });
    }

    // Execute search query
    const response = await client.search({
      index: 'tickets',
      body: {
        from,
        size: pageSize,
        query,
        sort: [
          {
            createdAt: {
              order: 'desc'
            }
          }
        ]
      }
    });

    // Format the response
    const tickets = response.body.hits.hits.map(hit => ({
      ...hit._source,
      id: hit._id
    }));

    res.json({
      tickets,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: response.body.hits.total.value,
        pages: Math.ceil(response.body.hits.total.value / pageSize)
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get ticket by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get ticket
    const response = await client.get({
      index: 'tickets',
      id
    });

    // Return the ticket
    res.json({
      ...response.body._source,
      id: response.body._id
    });
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return next(new ApiError(404, 'Ticket not found'));
    }
    next(error);
  }
});

// Update ticket status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, description } = req.body;

    if (!status) {
      throw new ApiError(400, 'Status is required');
    }

    // Validate status
    const validStatuses = ['Open', 'In Review', 'Closed', 'Reopened'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, `Status must be one of: ${validStatuses.join(', ')}`);
    }

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Get current ticket
    const getResponse = await client.get({
      index: 'tickets',
      id
    });

    const ticket = getResponse.body._source;

    // Create status history entry
    const statusEntry = {
      status,
      changedBy: {
        id: req.user.id,
        username: req.user.username
      },
      description: description || `Status changed to ${status}`,
      timestamp: new Date().toISOString()
    };

    // Update ticket
    const updateResponse = await client.update({
      index: 'tickets',
      id,
      body: {
        script: {
          source: `
            ctx._source.status = params.status;
            ctx._source.statusHistory.add(params.statusEntry);
            ctx._source.updatedAt = params.updatedAt;
          `,
          params: {
            status,
            statusEntry,
            updatedAt: new Date().toISOString()
          }
        }
      },
      refresh: true
    });

    // Get updated ticket
    const updatedResponse = await client.get({
      index: 'tickets',
      id
    });

    // Return the updated ticket
    res.json({
      ...updatedResponse.body._source,
      id: updatedResponse.body._id
    });
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return next(new ApiError(404, 'Ticket not found'));
    }
    next(error);
  }
});

// Assign ticket to user
router.patch('/:id/assign', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignedToId } = req.body;

    if (!assignedToId) {
      throw new ApiError(400, 'assignedToId is required');
    }

    // Get OpenSearch client
    const client = await getOpenSearchClient();

    // Fetch the assigned user's details
    let assignedTo;
    try {
      const userResponse = await client.get({
        index: 'users',
        id: assignedToId
      });

      assignedTo = {
        id: assignedToId,
        username: userResponse.body._source.username,
        name: userResponse.body._source.fullName || userResponse.body._source.username
      };
    } catch (error) {
      console.error('Error fetching assigned user:', error);
      // Use default info if user fetch fails
      assignedTo = {
        id: assignedToId,
        username: 'assigned_user',
        name: 'Assigned User'
      };
    }

    // Update ticket
    const updateResponse = await client.update({
      index: 'tickets',
      id,
      body: {
        script: {
          source: `
            ctx._source.assignedTo = params.assignedTo;
            ctx._source.updatedAt = params.updatedAt;
            
            // Add status history entry
            Map statusEntry = new HashMap();
            statusEntry.status = ctx._source.status;
            statusEntry.changedBy = params.changedBy;
            statusEntry.description = params.description;
            statusEntry.timestamp = params.updatedAt;
            
            ctx._source.statusHistory.add(statusEntry);
          `,
          params: {
            assignedTo,
            updatedAt: new Date().toISOString(),
            changedBy: {
              id: req.user.id,
              username: req.user.username
            },
            description: `Ticket assigned to ${assignedTo.name || assignedTo.username}`
          }
        }
      },
      refresh: true
    });

    // Get updated ticket
    const updatedResponse = await client.get({
      index: 'tickets',
      id
    });

    // Return the updated ticket
    res.json({
      ...updatedResponse.body._source,
      id: updatedResponse.body._id
    });
  } catch (error) {
    if (error.meta && error.meta.statusCode === 404) {
      return next(new ApiError(404, 'Ticket not found'));
    }
    next(error);
  }
});

module.exports = router;