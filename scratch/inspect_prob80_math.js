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

function correctDistance(dist) {
  if (dist >= 100) {
    const numDigits = String(Math.floor(dist)).length;
    if (numDigits > 2) {
      return dist / Math.pow(10, numDigits - 2);
    }
  }
  return dist;
}

async function run() {
  const rides = await get("/rest/v1/test_ride_log?select=*&bike_code=ilike.*80*");
  const matching = rides.filter(r => new Date(r.ride_date || r.completion_date) >= new Date('2026-01-01T00:00:00+00:00'));
  
  console.log(`Total matching rides for Prob_80: ${matching.length}`);
  
  const sumRaw = matching.reduce((acc, r) => acc + Number(r.distance_km), 0);
  const sumCorrected = matching.reduce((acc, r) => acc + correctDistance(Number(r.distance_km)), 0);
  
  console.log(`Raw sum: ${sumRaw} km`);
  console.log(`Corrected sum: ${sumCorrected} km`);
  
  const todayRide = matching.find(r => r.ride_date === '2026-05-28');
  console.log("Today's 500km ride entry:", todayRide);
}

run().catch(console.error);
