const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://vmdbszgsbcaeiznkhcvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8'
);

async function run() {
  const { data, error } = await client
    .from('test_ride_log')
    .select('*')
    .order('completion_date_txt', { ascending: false })
    .limit(10);

  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Rides count:", data.length);
    console.log("Sample records:", JSON.stringify(data, null, 2));
  }
}

run();
