// scripts/debug-token.js
require('dotenv').config({ path: '../backend/.env' });
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Replace with an actual token from your login process
const TOKEN = 'YOUR_ACTUAL_TOKEN';

async function debugToken() {
  console.log('=== Token Debugging ===');
  
  // 1. Decode token (without verification)
  try {
    console.log('Decoding token...');
    const decoded = jwt.decode(TOKEN);
    console.log('Token claims:');
    console.log('- Subject:', decoded.sub);
    console.log('- Username:', decoded.preferred_username);
    console.log('- Client:', decoded.azp);
    console.log('- Issuer:', decoded.iss);
    console.log('- Resource Access:', JSON.stringify(decoded.resource_access, null, 2));
    console.log('- Expires:', new Date(decoded.exp * 1000).toLocaleString());
  } catch (error) {
    console.log('Decode Error:', error.message);
  }
  
  // 2. Verify with Keycloak
  try {
    console.log('\nValidating with Keycloak userinfo endpoint...');
    const keycloakUrl = process.env.KEYCLOAK_URL;
    const realmName = process.env.KEYCLOAK_REALM;
    
    const response = await axios.get(
      `${keycloakUrl}/realms/${realmName}/protocol/openid-connect/userinfo`,
      {
        headers: { Authorization: `Bearer ${TOKEN}` },
        validateStatus: status => true
      }
    );
    
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('Keycloak Error:', error.message);
  }
  
  console.log('\n=== Debug Complete ===');
}

debugToken().catch(console.error);