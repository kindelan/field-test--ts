const https = require("https");
const { URL } = require("url");

const SUPABASE_URL = "https://vmdbszgsbcaeiznkhcvi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8";

function get(path) {
  return new Promise((resolve, reject) => {
    const urlStr = `${SUPABASE_URL}${path}`;
    const urlObj = new URL(urlStr);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    };
    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: "Failed to parse JSON", status: res.statusCode, body: data });
        }
      });
    }).on("error", reject);
  });
}

async function run() {
  const tables = [
    "field_test",
    "bikes",
    "bike_field_test",
    "test_ride_log",
    "test_ride_feedback",
    "error_tags",
    "bike_errors",
    "bike_component_history"
  ];

  for (const t of tables) {
    console.log(`Checking table: ${t}...`);
    const res = await get(`/rest/v1/${t}?select=*&limit=1`);
    if (res && res.error) {
      console.log(`❌ Error for ${t}:`, res);
    } else if (res && res.code) {
      console.log(`❌ Postgres Code for ${t}:`, res.message || res);
    } else {
      console.log(`✅ Success for ${t}, data length: ${Array.isArray(res) ? res.length : "not array"}`);
    }
  }
}

run().catch(console.error);
