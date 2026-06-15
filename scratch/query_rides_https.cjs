const https = require('https');
const url = require('url');

const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';
const targetUrl = 'https://vmdbszgsbcaeiznkhcvi.supabase.co/rest/v1/test_ride_log?limit=10&order=completion_date_txt.desc';

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
      const json = JSON.parse(data);
      console.log("Response status:", res.statusCode);
      console.log("Count:", json.length);
      console.log("Sample:", JSON.stringify(json, null, 2));
    } catch (e) {
      console.error("Failed to parse JSON:", data);
    }
  });
}).on('error', (err) => {
  console.error("HTTP error:", err.message);
});
