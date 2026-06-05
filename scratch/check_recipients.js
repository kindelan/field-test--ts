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
        } catch(e) {
          resolve(data);
        }
      });
    }).on("error", reject);
  });
}

async function run() {
  console.log("=== CHECKING notification_recipients ===");
  const recipients = await get("/rest/v1/notification_recipients?select=*");
  console.log("Recipients:", JSON.stringify(recipients, null, 2));
}

run().catch(console.error);
