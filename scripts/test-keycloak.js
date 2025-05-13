// scripts/test-keycloak.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || 'http://192.168.1.139:8080';
const REALM = process.env.KEYCLOAK_REALM || 'security-log-manager';
const CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'backend-service';
const CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET;
const USERNAME = 'admin';
const PASSWORD = 'admin';

// Remove /auth prefix if it exists
const baseUrl = KEYCLOAK_URL.replace(/\/auth$/, '');

async function testKeycloakPaths() {
  console.log('=== Keycloak Connectivity Test ===');
  console.log(`Testing connection to Keycloak at ${KEYCLOAK_URL}`);
  console.log(`Realm: ${REALM}`);
  console.log(`Client ID: ${CLIENT_ID}`);
  console.log('-------------------------------');

  // Test paths that might be used
  const paths = [
    { name: 'Root URL', url: KEYCLOAK_URL },
    { name: 'Base URL without auth', url: baseUrl },
    { name: 'Modern realm path', url: `${baseUrl}/realms/${REALM}` },
    { name: 'Legacy realm path', url: `${baseUrl}/auth/realms/${REALM}` },
    { name: 'Modern well-known config', url: `${baseUrl}/realms/${REALM}/.well-known/openid-configuration` },
    { name: 'Legacy well-known config', url: `${baseUrl}/auth/realms/${REALM}/.well-known/openid-configuration` }
  ];

  for (const path of paths) {
    try {
      console.log(`Testing ${path.name}: ${path.url}`);
      const response = await axios.get(path.url, {
        validateStatus: status => true // Accept any status to see what's returned
      });
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  ✓ Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
    }
    console.log('-------------------------------');
  }

  // Test authentication with both paths
  console.log('\n=== Testing Authentication ===');
  
  // Test modern path
  try {
    console.log('Testing modern authentication path');
    const response = await axios.post(
      `${baseUrl}/realms/${REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username: USERNAME,
        password: PASSWORD,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: status => true // Accept any status
      }
    );
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log('-------------------------------');
  
  // Test legacy path
  try {
    console.log('Testing legacy authentication path');
    const response = await axios.post(
      `${baseUrl}/auth/realms/${REALM}/protocol/openid-connect/token`,
      new URLSearchParams({
        grant_type: 'password',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        username: USERNAME,
        password: PASSWORD,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: status => true // Accept any status
      }
    );
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data).substring(0, 200)}...`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  console.log('-------------------------------');

  console.log('\n=== Keycloak Test Complete ===');
}

testKeycloakPaths().catch(console.error);