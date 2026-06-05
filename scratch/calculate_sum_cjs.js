const https = require("https");
const { URL } = require("url");

const SUPABASE_URL = "https://vmdbszgsbcaeiznkhcvi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8";

function getPaged(path, startRange = 0) {
  return new Promise((resolve, reject) => {
    const urlStr = `${SUPABASE_URL}${path}`;
    const urlObj = new URL(urlStr);
    
    const endRange = startRange + 999;
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Range: `${startRange}-${endRange}`,
        Prefer: "count=exact"
      }
    };

    https.get(options, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        const total = res.headers["content-range"] ? res.headers["content-range"].split("/")[1] : null;
        try {
          resolve({ data: JSON.parse(data), total: total ? parseInt(total, 10) : null });
        } catch (e) {
          resolve({ data, total: null });
        }
      });
    }).on("error", reject);
  });
}

async function fetchAllRides() {
  let all = [];
  let start = 0;
  while (true) {
    const res = await getPaged("/rest/v1/test_ride_log?select=*", start);
    all = all.concat(res.data);
    if (res.data.length < 1000 || all.length >= (res.total || 0)) {
      break;
    }
    start += 1000;
  }
  return all;
}

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

function pad2(n) {
  const clean = String(parseInt(n, 10));
  return clean.padStart(2, "0");
}

function sanitizeBikeCode(raw) {
  if (!raw) return null;
  let s = String(raw).toUpperCase().trim();
  s = s.replace(/\(.*?\)/g, "");
  s = s.replace(/\b(COLOR|NEGRO|NEGRA|BLANCO|BLANCA|PLATA|DIGITAL|PROC|PRO|BICI|CON|SUSPENSION|DELANTERA|LLEVAR|EN|VEZ|DE|LA)\b/g, "");
  s = s.replace(/[_\-\.]+/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s || null;
}

function normalizeBikeCode(raw) {
  const s = sanitizeBikeCode(raw);
  if (!s) return null;
  const prob = s.match(/\bPROB\s*(\d{1,3})\b/);
  if (prob) return `Prob_${pad2(prob[1])}`;
  const onlyNum = s.match(/^0*(\d{1,3})$/);
  if (onlyNum) return `Prob_${pad2(onlyNum[1])}`;
  const x20 = s.match(/^X\s*20\s*(\d{1,2})?$/);
  if (x20) return x20[1] ? `X20_${pad2(x20[1])}` : "X20";
  const x30 = s.match(/^X\s*30\s*(\d{1,2})?$/);
  if (x30) return x30[1] ? `X30_${pad2(x30[1])}` : "X30";
  const familyNum = s.match(/^(XS|PF|PB)\s*(\d{1,3})$/);
  if (familyNum) return `${familyNum[1]}_${pad2(familyNum[2])}`;
  return s.replace(/\s+/g, "_");
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
  const ftId = "da1ae47d-931e-4ae6-91ae-947b35815e54"; // M40 - sys
  
  console.log("Fetching assignments...");
  const assignments = await get(`/rest/v1/bike_field_test?select=*,bikes(*)&field_test_id=eq.${ftId}`);
  
  console.log("Fetching rides...");
  const rides = await fetchAllRides();
  
  console.log(`Assignments count: ${assignments.length}`);
  console.log(`Rides count: ${rides.length}`);
  
  const bikeSums = new Map();
  
  assignments.forEach(a => {
    const bike = a.bikes;
    if (!bike) return;
    
    const bikeCodeNorm = normalizeBikeCode(bike.bikecode);
    if (!bikeCodeNorm) return;
    
    const start = new Date(a.start_at);
    const end = a.end_at ? new Date(a.end_at) : null;
    
    // Find matching rides
    const matchingRides = rides.filter(r => {
      const rNorm = normalizeBikeCode(r.bike_code);
      if (!rNorm || rNorm.toLowerCase() !== bikeCodeNorm.toLowerCase()) {
        return false;
      }
      
      const dateStr = r.ride_date || r.completion_date;
      if (!dateStr) return false;
      const rDate = new Date(dateStr);
      
      return rDate >= start && (!end || rDate <= end);
    });
    
    const assignmentSum = matchingRides.reduce((sum, r) => {
      const dist = Number(r.distance_km || 0);
      const corrected = correctDistance(dist);
      return sum + corrected;
    }, 0);
    
    console.log(`Bike: ${bikeCodeNorm} | Assigned matching rides: ${matchingRides.length} | Sum: ${assignmentSum}`);
    
    bikeSums.set(bikeCodeNorm, (bikeSums.get(bikeCodeNorm) || 0) + assignmentSum);
  });
}

run().catch(console.error);
