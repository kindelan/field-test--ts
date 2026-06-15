const https = require('https');
const url = require('url');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const targetUrl = 'https://vmdbszgsbcaeiznkhcvi.supabase.co/rest/v1/' + path;
    const parsed = url.parse(targetUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      }
    };

    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error("Failed to parse JSON: " + data));
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function run() {
  try {
    const openapi = await makeRequest('');
    if (openapi && openapi.definitions && openapi.definitions.test_ride_log && openapi.definitions.test_ride_log.properties) {
      console.log("test_ride_log fields:", Object.keys(openapi.definitions.test_ride_log.properties));
    } else {
      console.log("Could not find test_ride_log definition. Available definitions:", Object.keys((openapi && openapi.definitions) || {}));
    }
  } catch (err) {
    console.error("Error checking schema:", err.message);
  }
}

run();
