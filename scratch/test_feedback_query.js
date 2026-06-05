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
      res.on("end", () => resolve(JSON.parse(data)));
    }).on("error", reject);
  });
}

async function run() {
  // Query feedback joined with test_ride_log for Prob_80
  const path = "/rest/v1/test_ride_feedback?select=*,test_ride_log!inner(*)&test_ride_log.bike_code_sanitized=eq.prob_80";
  console.log(`Querying path: ${path}`);
  const res = await get(path);
  console.log("Feedback records fetched:", res.length);
  console.log(JSON.stringify(res, null, 2));
}

run().catch(console.error);
