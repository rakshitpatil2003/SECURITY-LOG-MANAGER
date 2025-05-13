// scripts/test-userinfo.js
require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');

// Replace this with an actual token from your login process
const TOKEN = 'your-actual-token-from-login-or-dev-fallback';

async function testUserInfo() {
  console.log('=== Testing UserInfo Endpoint ===');
  
  // 1. Test Keycloak userinfo endpoint directly
  try {
    console.log('Testing Keycloak userinfo endpoint...');
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realmName = process.env.KEYCLOAK_REALM;
    
    const response = await axios.get(
      `${keycloakUrl}/realms/${realmName}/protocol/openid-connect/userinfo`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        validateStatus: status => true
      }
    );
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  
  // 2. Test your backend userinfo endpoint
  try {
    console.log('\nTesting your API userinfo endpoint...');
    const backendUrl = 'http://192.168.1.67:5000';
    
    const response = await axios.get(
      `${backendUrl}/api/auth/userinfo`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        validateStatus: status => true
      }
    );
    
    console.log(`  Status: ${response.status}`);
    console.log(`  Response: ${JSON.stringify(response.data)}`);
  } catch (error) {
    console.log(`  Error: ${error.message}`);
  }
  
  console.log('\n=== Test Complete ===');
}

testUserInfo().catch(console.error);