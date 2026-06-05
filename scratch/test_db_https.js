const url = require('url');
const https = require('https');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';
const SUPABASE_URL = 'https://vmdbszgsbcaeiznkhcvi.supabase.co';

function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const parsed = url.parse(`${SUPABASE_URL}/rest/v1/${path}`);
    const options = {
      hostname: parsed.hostname,
      path: parsed.path,
      method: 'GET',
      headers: {
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      }
    };
    https.get(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data.slice(0, 100)}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('Querying test_ride_log range 0-5...');
    const rides = await makeRequest('test_ride_log?select=id,bike_code,distance_km,ride_date&limit=5');
    console.log('Rides sample:', rides);
  } catch (err) {
    console.error('CRASH QUERYING test_ride_log:', err);
  }
}

run();
