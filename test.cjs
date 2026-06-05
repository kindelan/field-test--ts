const { createClient } = require('@supabase/supabase-js');
const client = createClient(
  'https://vmdbszgsbcaeiznkhcvi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8'
);

async function run() {
  const { data: assigned, error: err1 } = await client
    .from('bike_field_test')
    .select('bikes(id, bikecode, motortype, motorcode)')
    .is('end_at', null);

  if (err1) {
    console.error("Error fetching assigned:", err1);
  } else {
    console.log("getBikesAssigned response sample:");
    console.log(JSON.stringify(assigned.slice(0, 3), null, 2));
  }

  const { data: activeAssignments, error: err2 } = await client
    .from('bike_field_test')
    .select('bike_id, field_test_id, field_test(name)')
    .is('end_at', null);

  if (err2) {
    console.error("Error fetching activeAssignments:", err2);
  } else {
    console.log("getActiveAssignments response sample:");
    console.log(JSON.stringify(activeAssignments.slice(0, 3), null, 2));
  }
}

run();
