const https = require('https');
const urlParser = require('url');

const SUPABASE_URL = 'https://vmdbszgsbcaeiznkhcvi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';

function request(path) {
  return new Promise((resolve, reject) => {
    const fullUrl = `${SUPABASE_URL}/rest/v1/${path}`;
    const parsed = urlParser.parse(fullUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.path,
      method: 'GET',
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`
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
          reject(new Error(`Status: ${res.statusCode}, Body: ${data}`));
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  try {
    console.log('--- FIELD TESTS ---');
    const fts = await request('field_test?select=*');
    console.log(JSON.stringify(fts, null, 2));

    console.log('\n--- ACTIVE BIKE FIELD TEST ASSIGNMENTS ---');
    const assignments = await request('bike_field_test?select=*,bikes(*)&end_at=is.null');
    console.log(JSON.stringify(assignments, null, 2));

    console.log('\n--- ALL BIKES ---');
    const bikes = await request('bikes?select=*&limit=5');
    console.log(JSON.stringify(bikes, null, 2));

  } catch (err) {
    console.error(err);
  }
}

run();
