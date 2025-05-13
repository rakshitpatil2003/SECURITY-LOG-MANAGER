// Transform raw logs to a structured format for storing in OpenSearch
const { getOpenSearchClient, getIndexNameForDate } = require('../config/opensearch');
// Transform a log from raw format to a structured format
const transformLog = (rawLog) => {
  try {
    // Make sure rawLog is an object
    if (typeof rawLog === 'string') {
      try {
        rawLog = JSON.parse(rawLog);
      } catch (error) {
        console.error('Error parsing log string:', error);
        return createEmptyLogStructure();
      }
    }

    // If rawLog is null or not an object, return an empty structure
    if (!rawLog || typeof rawLog !== 'object') {
      return createEmptyLogStructure();
    }

    // Extract timestamp
    let timestamp = extractTimestamp(rawLog);

    // Extract structured data from message field if it exists
    let messageData = {};
    if (rawLog.message && typeof rawLog.message === 'string' && rawLog.message.startsWith('{')) {
      try {
        messageData = JSON.parse(rawLog.message);
      } catch (error) {
        console.error('Error parsing message JSON:', error);
      }
    }

    // Create structured log
    const structuredLog = {
      '@timestamp': timestamp,
      'id': rawLog.id || extractId(rawLog),
      'agent': extractAgent(rawLog, messageData),
      'rule': extractRule(rawLog, messageData),
      'network': extractNetwork(rawLog, messageData),
      'data': extractData(rawLog, messageData),
      'syscheck': extractSyscheck(rawLog, messageData),
      'ai_ml_logs': extractAiMlLogs(rawLog),
      'raw_log': rawLog // Store the original raw log
    };

    return structuredLog;
  } catch (error) {
    console.error('Error transforming log:', error);
    return {
      '@timestamp': new Date().toISOString(),
      'id': `error-${Date.now()}`,
      'error': 'Failed to transform log',
      'error_message': error.message,
      'raw_log': rawLog
    };
  }
};

// Create an empty log structure
const createEmptyLogStructure = () => {
  return {
    '@timestamp': new Date().toISOString(),
    'id': `unknown-${Date.now()}`,
    'agent': {
      'name': 'unknown',
      'id': 'unknown',
      'ip': 'unknown'
    },
    'rule': {
      'id': 'unknown',
      'level': 0,
      'description': 'Unknown log format',
      'groups': [],
      'mitre': {
        'id': [],
        'tactic': [],
        'technique': []
      },
      'gdpr': [],
      'hipaa': [],
      'gpg13': [],
      'nist': [],
      'pci_dss': [],
      'tsc': []
    },
    'network': {
      'srcIp': 'unknown',
      'destIp': 'unknown',
      'protocol': 'unknown',
      'srcPort': null,
      'destPort': null
    },
    'data': {},
    'syscheck': {  // Add this syscheck structure
      'path': null,
      'mode': null,
      'event': null,
      'changed_attributes': []
    },
    'ai_ml_logs': {},
    'raw_log': {}
  };
};

setTimeout(async () => {
  try {
    const client = await getOpenSearchClient();
    const todayIndex = getIndexNameForDate(new Date());
    await client.indices.refresh({ index: todayIndex });
    console.log(`Refreshed index: ${todayIndex}`);
  } catch (error) {
    console.error('Error refreshing index:', error);
  }
}, 10000); // Refresh every 10 seconds

// Extract timestamp from the log
const extractTimestamp = (log) => {
  // Try different timestamp fields that might be in the log
  const timestampFields = [
    'timestamp', '@timestamp', 'time', 'date',
    'Timestamp', 'TimeStamp', 'TIMESTAMP',
    'created_at', 'createdAt'
  ];

  for (const field of timestampFields) {
    if (log[field]) {
      // Try to parse timestamp
      try {
        // If it's already a date, convert to ISO string
        if (log[field] instanceof Date) {
          return log[field].toISOString();
        }

        // If it's a number (Unix timestamp in seconds or milliseconds)
        if (typeof log[field] === 'number') {
          // If seconds (10 digits), convert to milliseconds
          if (log[field] < 10000000000) {
            return new Date(log[field] * 1000).toISOString();
          }
          // If milliseconds (13 digits)
          return new Date(log[field]).toISOString();
        }

        // If it's a string, try to parse it
        return new Date(log[field]).toISOString();
      } catch (error) {
        console.warn(`Failed to parse timestamp ${field}:`, log[field]);
      }
    }
  }

  // If no valid timestamp found, use current time
  return new Date().toISOString();
};

// Extract ID from the log
const extractId = (log) => {
  // Try different ID fields
  const idFields = ['id', '_id', 'ID', 'Id', 'log_id', 'logId', 'uniqueIdentifier'];

  for (const field of idFields) {
    if (log[field]) {
      return String(log[field]);
    }
  }

  // If no ID found, generate one based on timestamp and random value
  return `gen-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

// Extract agent information from the log
const extractAgent = (log, messageData) => {
  const agent = {
    name: 'unknown',
    id: 'unknown',
    ip: null  // Changed from 'unknown' to null
  };

  // Extract from top-level fields
  if (log.agent_name) agent.name = log.agent_name;
  
  // Check if agent object exists directly in log
  if (log.agent) {
    agent.name = log.agent.name || log.agent.agent_name || agent.name;
    agent.id = log.agent.id || log.agent.agent_id || agent.id;
    
    // Only set IP if it's a valid IP address
    if (log.agent.ip && isValidIP(log.agent.ip)) {
      agent.ip = log.agent.ip;
    }
  }

  // Extract from message data if available
  if (messageData && messageData.agent) {
    if (messageData.agent.name) agent.name = messageData.agent.name;
    if (messageData.agent.id) agent.id = messageData.agent.id;
    if (messageData.agent.ip && isValidIP(messageData.agent.ip)) {
      agent.ip = messageData.agent.ip;
    }
  }

  return agent;
};

// Add a helper function to validate IP addresses
const isValidIP = (ip) => {
  // Simple regex for IPv4
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  
  // If it's not a string or it's "unknown", it's not valid
  if (typeof ip !== 'string' || ip === 'unknown') {
    return false;
  }
  
  // Check if it matches IPv4 format
  if (ipv4Regex.test(ip)) {
    // Make sure each octet is between 0-255
    return ip.split('.').every(octet => {
      const num = parseInt(octet, 10);
      return num >= 0 && num <= 255;
    });
  }
  
  // Add IPv6 validation if needed
  
  return false;
};

const parseFortigateLog = (logString) => {
  // Initialize result object
  const result = {};
  
  try {
    // Remove date and time prefix if present
    const logContent = logString.replace(/^date=\d{4}-\d{2}-\d{2} time=\d{2}:\d{2}:\d{2} /, '');
    
    // Find all key="value" or key=value patterns
    const pattern = /([a-zA-Z0-9_]+)=(?:"([^"]*)"|([^ ]*))/g;
    let match;
    
    while ((match = pattern.exec(logContent)) !== null) {
      const key = match[1];
      const value = match[2] !== undefined ? match[2] : match[3];
      result[key] = value;
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing Fortigate log:', error);
    return null;
  }
};

// Extract rule information from the log
const extractRule = (log, messageData) => {
  const rule = {
    id: 'unknown',
    level: 0, // Default numeric value
    description: 'No description',
    groups: [],
    mitre: {
      id: [],
      tactic: [],
      technique: []
    },
    gdpr: [],
    hipaa: [],
    gpg13: [],
    nist: [],
    pci_dss: [],
    tsc: []
  };

  // Extract from top-level fields
  if (log.rule_id) rule.id = log.rule_id;
  if (log.rule_level) rule.level = parseInt(log.rule_level, 10);
  if (log.rule_description) rule.description = log.rule_description;

  // Extract from rule object if it exists in log
  if (log.rule) {
    if (log.rule.id) rule.id = log.rule.id;
    if (log.rule.level) rule.level = parseInt(log.rule.level, 10);
    if (log.rule.description) rule.description = log.rule.description;
    
    // Extract groups
    if (log.rule.groups && Array.isArray(log.rule.groups)) {
      rule.groups = log.rule.groups;
    }
    
    // Extract compliance frameworks
    if (log.rule.gdpr) rule.gdpr = Array.isArray(log.rule.gdpr) ? log.rule.gdpr : [log.rule.gdpr];
    if (log.rule.hipaa) rule.hipaa = Array.isArray(log.rule.hipaa) ? log.rule.hipaa : [log.rule.hipaa];
    if (log.rule.gpg13) rule.gpg13 = Array.isArray(log.rule.gpg13) ? log.rule.gpg13 : [log.rule.gpg13];
    if (log.rule.nist_800_53) rule.nist = Array.isArray(log.rule.nist_800_53) ? log.rule.nist_800_53 : [log.rule.nist_800_53];
    if (log.rule.pci_dss) rule.pci_dss = Array.isArray(log.rule.pci_dss) ? log.rule.pci_dss : [log.rule.pci_dss];
    if (log.rule.tsc) rule.tsc = Array.isArray(log.rule.tsc) ? log.rule.tsc : [log.rule.tsc];
    
    // Extract MITRE ATT&CK info - Handle both string and object formats
    if (log.rule.mitre) {
      if (typeof log.rule.mitre === 'object' && !Array.isArray(log.rule.mitre)) {
        // Object format with id, tactic, technique fields
        if (log.rule.mitre.id) {
          rule.mitre.id = Array.isArray(log.rule.mitre.id) ? log.rule.mitre.id : [log.rule.mitre.id];
        }
        if (log.rule.mitre.tactic) {
          rule.mitre.tactic = Array.isArray(log.rule.mitre.tactic) ? log.rule.mitre.tactic : [log.rule.mitre.tactic];
        }
        if (log.rule.mitre.technique) {
          rule.mitre.technique = Array.isArray(log.rule.mitre.technique) ? log.rule.mitre.technique : [log.rule.mitre.technique];
        }
      } else if (Array.isArray(log.rule.mitre)) {
        // Array format (usually just IDs)
        rule.mitre.id = log.rule.mitre;
      } else if (typeof log.rule.mitre === 'string') {
        // String format (single ID)
        rule.mitre.id = [log.rule.mitre];
      }
    }
  }

  // Extract from message data if available
  if (messageData && messageData.rule) {
    if (messageData.rule.id) rule.id = messageData.rule.id;
    if (messageData.rule.level) rule.level = parseInt(messageData.rule.level, 10);
    if (messageData.rule.description) rule.description = messageData.rule.description;
    
    // Extract groups
    if (messageData.rule.groups && Array.isArray(messageData.rule.groups)) {
      rule.groups = messageData.rule.groups;
    }
    
    // Extract compliance frameworks
    if (messageData.rule.gdpr) rule.gdpr = Array.isArray(messageData.rule.gdpr) ? messageData.rule.gdpr : [messageData.rule.gdpr];
    if (messageData.rule.hipaa) rule.hipaa = Array.isArray(messageData.rule.hipaa) ? messageData.rule.hipaa : [messageData.rule.hipaa];
    if (messageData.rule.gpg13) rule.gpg13 = Array.isArray(messageData.rule.gpg13) ? messageData.rule.gpg13 : [messageData.rule.gpg13];
    if (messageData.rule.nist_800_53) rule.nist = Array.isArray(messageData.rule.nist_800_53) ? messageData.rule.nist_800_53 : [messageData.rule.nist_800_53];
    if (messageData.rule.pci_dss) rule.pci_dss = Array.isArray(messageData.rule.pci_dss) ? messageData.rule.pci_dss : [messageData.rule.pci_dss];
    if (messageData.rule.tsc) rule.tsc = Array.isArray(messageData.rule.tsc) ? messageData.rule.tsc : [messageData.rule.tsc];
    
    // Extract MITRE ATT&CK info from message data
    if (messageData.rule.mitre) {
      if (typeof messageData.rule.mitre === 'object' && !Array.isArray(messageData.rule.mitre)) {
        // Object format with id, tactic, technique fields
        if (messageData.rule.mitre.id) {
          rule.mitre.id = Array.isArray(messageData.rule.mitre.id) ? 
            messageData.rule.mitre.id : [messageData.rule.mitre.id];
        }
        if (messageData.rule.mitre.tactic) {
          rule.mitre.tactic = Array.isArray(messageData.rule.mitre.tactic) ? 
            messageData.rule.mitre.tactic : [messageData.rule.mitre.tactic];
        }
        if (messageData.rule.mitre.technique) {
          rule.mitre.technique = Array.isArray(messageData.rule.mitre.technique) ? 
            messageData.rule.mitre.technique : [messageData.rule.mitre.technique];
        }
      } else if (Array.isArray(messageData.rule.mitre)) {
        rule.mitre.id = messageData.rule.mitre;
      } else if (typeof messageData.rule.mitre === 'string') {
        rule.mitre.id = [messageData.rule.mitre];
      }
    }
  }

  return rule;
};

// Extract network information from the log
const extractNetwork = (log, messageData) => {
  const network = {
    srcIp: 'unknown',
    destIp: 'unknown',
    protocol: 'unknown',
    srcPort: null,
    destPort: null
  };

  // Extract from top-level fields
  if (log.src_ip) network.srcIp = log.src_ip;
  if (log.dest_ip) network.destIp = log.dest_ip;
  
  // Check for data field with network info
  if (log.data) {
    if (log.data.srcip) network.srcIp = log.data.srcip;
    if (log.data.src_ip) network.srcIp = log.data.src_ip;
    if (log.data.dstip) network.destIp = log.data.dstip;
    if (log.data.dst_ip) network.destIp = log.data.dst_ip;
    if (log.data.proto) network.protocol = log.data.proto;
    if (log.data.srcport) network.srcPort = log.data.srcport;
    if (log.data.dstport) network.destPort = log.data.dstport;
  }

  // Extract from message data if available
  if (messageData && messageData.data) {
    if (messageData.data.srcip) network.srcIp = messageData.data.srcip;
    if (messageData.data.src_ip) network.srcIp = messageData.data.src_ip;
    if (messageData.data.dstip) network.destIp = messageData.data.dstip;
    if (messageData.data.dst_ip) network.destIp = messageData.data.dst_ip;
    if (messageData.data.proto) network.protocol = messageData.data.proto;
    if (messageData.data.srcport) network.srcPort = messageData.data.srcport;
    if (messageData.data.dstport) network.destPort = messageData.data.dstport;
  }

  return network;
};

// Extract data field from the log
const extractData = (log, messageData) => {
  // If data doesn't exist in log, check messageData
  if (!log.data && messageData && messageData.data) {
    return messageData.data;
  }

  // Return data as is to preserve its structure
  return log.data || {};
};

// Add this function to logTransformer.js alongside your other extract functions

// Extract syscheck information from the log
const extractSyscheck = (log, messageData) => {
  const syscheck = {
    path: null,
    mode: null,
    size_after: null,
    size_before: null,
    uid_after: null,
    uid_before: null,
    gid_after: null,
    gid_before: null,
    md5_after: null,
    md5_before: null,
    sha1_after: null,
    sha1_before: null,
    sha256_after: null,
    sha256_before: null,
    uname_after: null,
    uname_before: null,
    mtime_after: null,
    mtime_before: null,
    changed_attributes: [],
    event: null,
    diff: null,
    attrs_after: [],
    attrs_before: [],
    win_perm_after: [],
    win_perm_before: [],
    audit: {
      user: {
        id: null,
        name: null
      },
      process: {
        id: null,
        name: null
      }
    }
  };

  // Check if syscheck object exists directly in log
  if (log.syscheck && typeof log.syscheck === 'object') {
    Object.assign(syscheck, log.syscheck);
    
    // Ensure arrays are arrays
    if (syscheck.changed_attributes && !Array.isArray(syscheck.changed_attributes)) {
      syscheck.changed_attributes = [syscheck.changed_attributes];
    }
    if (syscheck.attrs_after && !Array.isArray(syscheck.attrs_after)) {
      syscheck.attrs_after = [syscheck.attrs_after];
    }
    if (syscheck.attrs_before && !Array.isArray(syscheck.attrs_before)) {
      syscheck.attrs_before = [syscheck.attrs_before];
    }
    
    // Convert date strings to ISO format
    if (syscheck.mtime_after && typeof syscheck.mtime_after === 'string') {
      try {
        syscheck.mtime_after = new Date(syscheck.mtime_after).toISOString();
      } catch (error) {
        console.warn('Could not parse mtime_after:', syscheck.mtime_after);
      }
    }
    if (syscheck.mtime_before && typeof syscheck.mtime_before === 'string') {
      try {
        syscheck.mtime_before = new Date(syscheck.mtime_before).toISOString();
      } catch (error) {
        console.warn('Could not parse mtime_before:', syscheck.mtime_before);
      }
    }
  }

  // Check in message data if exists and syscheck wasn't found in log
  if (messageData && messageData.syscheck && typeof messageData.syscheck === 'object') {
    Object.assign(syscheck, messageData.syscheck);
    
    // Same processing as above
    if (syscheck.changed_attributes && !Array.isArray(syscheck.changed_attributes)) {
      syscheck.changed_attributes = [syscheck.changed_attributes];
    }
    if (syscheck.attrs_after && !Array.isArray(syscheck.attrs_after)) {
      syscheck.attrs_after = [syscheck.attrs_after];
    }
    if (syscheck.attrs_before && !Array.isArray(syscheck.attrs_before)) {
      syscheck.attrs_before = [syscheck.attrs_before];
    }
    
    // Convert date strings to ISO format
    if (syscheck.mtime_after && typeof syscheck.mtime_after === 'string') {
      try {
        syscheck.mtime_after = new Date(syscheck.mtime_after).toISOString();
      } catch (error) {
        console.warn('Could not parse mtime_after:', syscheck.mtime_after);
      }
    }
    if (syscheck.mtime_before && typeof syscheck.mtime_before === 'string') {
      try {
        syscheck.mtime_before = new Date(syscheck.mtime_before).toISOString();
      } catch (error) {
        console.warn('Could not parse mtime_before:', syscheck.mtime_before);
      }
    }
  }

  // Check for nested syscheck in raw_log if it exists
  if (log.raw_log && log.raw_log.message) {
    try {
      // Sometimes syscheck data might be in the raw log message
      if (typeof log.raw_log.message === 'string' && log.raw_log.message.includes('syscheck')) {
        const parsedMessage = JSON.parse(log.raw_log.message);
        if (parsedMessage.syscheck && typeof parsedMessage.syscheck === 'object') {
          Object.assign(syscheck, parsedMessage.syscheck);
          
          // Process arrays and dates as above
          if (syscheck.changed_attributes && !Array.isArray(syscheck.changed_attributes)) {
            syscheck.changed_attributes = [syscheck.changed_attributes];
          }
          if (syscheck.attrs_after && !Array.isArray(syscheck.attrs_after)) {
            syscheck.attrs_after = [syscheck.attrs_after];
          }
          if (syscheck.attrs_before && !Array.isArray(syscheck.attrs_before)) {
            syscheck.attrs_before = [syscheck.attrs_before];
          }
          
          // Convert date strings to ISO format
          if (syscheck.mtime_after && typeof syscheck.mtime_after === 'string') {
            try {
              syscheck.mtime_after = new Date(syscheck.mtime_after).toISOString();
            } catch (error) {
              console.warn('Could not parse mtime_after:', syscheck.mtime_after);
            }
          }
          if (syscheck.mtime_before && typeof syscheck.mtime_before === 'string') {
            try {
              syscheck.mtime_before = new Date(syscheck.mtime_before).toISOString();
            } catch (error) {
              console.warn('Could not parse mtime_before:', syscheck.mtime_before);
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error parsing raw_log.message for syscheck data:', error.message);
    }
  }

  return syscheck;
};

// Extract AI/ML data from the log
const extractAiMlLogs = (log, messageData) => {
  // First, check for ai_ml_logs field directly in log
  if (log.ai_ml_logs && typeof log.ai_ml_logs === 'object') {
    return log.ai_ml_logs;
  }
  
  // Check in messageData
  if (messageData && messageData.ai_ml_logs && typeof messageData.ai_ml_logs === 'object') {
    return messageData.ai_ml_logs;
  }
  
  // Check for AI_response inside data (alternate format)
  if (log.data && log.data.AI_response) {
    return {
      ai_response: log.data.AI_response,
      timestamp: log.timestamp || new Date().toISOString()
    };
  }
  
  // Check for AI_response in messageData.data
  if (messageData && messageData.data && messageData.data.AI_response) {
    return {
      ai_response: messageData.data.AI_response,
      timestamp: messageData.timestamp || new Date().toISOString()
    };
  }
  
  // Return empty object if no AI/ML data found
  return {};
};

// Process a log batch for bulk insertion
const processLogBatch = (logs) => {
  // Ensure logs is an array
  if (!Array.isArray(logs)) {
    logs = [logs];
  }

  // Process each log
  const processedLogs = logs.map(log => transformLog(log));
  
  // Prepare bulk operations
  const bulkOps = [];
  for (const log of processedLogs) {
    // Add index operation
    bulkOps.push({
      index: {
        _id: log.id
      }
    });
    
    // Add document
    bulkOps.push(log);
  }

  return bulkOps;
};

module.exports = {
  transformLog,
  processLogBatch,
  extractSyscheck  // Add this line
};