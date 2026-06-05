const https = require('https');
const urlParser = require('url');

const SUPABASE_URL = 'https://vmdbszgsbcaeiznkhcvi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${SUPABASE_URL}/${path}`;
    const parsed = urlParser.parse(fullUrl);
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`POST Status: ${res.statusCode}, Body: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${SUPABASE_URL}/${path}`;
    const parsed = urlParser.parse(fullUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${token}`
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`GET Status: ${res.statusCode}, Body: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  const email = 'test_agent_mahle@mahle.com';
  const password = 'Password123!';

  console.log('Attempting to sign in via REST...');
  let token;
  try {
    const authData = await post('auth/v1/token?grant_type=password', { email, password });
    token = authData.access_token;
    console.log('Login successful.');
  } catch (err) {
    console.log('Login failed, attempting signup...');
    try {
      await post('auth/v1/signup', { email, password });
      console.log('Signup successful. Checking login again...');
      const authData = await post('auth/v1/token?grant_type=password', { email, password });
      token = authData.access_token;
      console.log('Login successful.');
    } catch (signUpErr) {
      console.error('Signup failed:', signUpErr.message);
      return;
    }
  }

  if (token) {
    console.log('Querying bikes with user token...');
    try {
      const bikes = await get('rest/v1/bikes?select=id,bikecode', token);
      console.log('Query successful! Bikes returned:', bikes.length);
      console.log('Bikes list:', bikes);
    } catch (queryErr) {
      console.error('Query failed:', queryErr.message);
    }
  }
}

run();
