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
    console.log('Querying app_admins as anon...');
    const data = await request('app_admins?select=*');
    console.log('Success! Result length:', data.length);
    console.log('Data:', data);
  } catch (err) {
    console.error('FAILED:', err.message);
  }
}

run();
