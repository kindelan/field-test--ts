const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vmdbszgsbcaeiznkhcvi.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtZGJzemdzYmNhZWl6bmtoY3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NDU0OTIsImV4cCI6MjA4ODMyMTQ5Mn0.hK0C4GQSY2xhZPJQEBfN85WyRsljcYEDEo25te4WpF8';

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: false
  }
});

async function run() {
  const email = 'test_agent_mahle@mahle.com';
  const password = 'Password123!';

  console.log('Attempting to sign in...');
  let loginRes = await supabase.auth.signInWithPassword({ email, password });

  if (loginRes.error) {
    console.log('Sign in failed, attempting to sign up...');
    const signUpRes = await supabase.auth.signUp({ email, password });
    if (signUpRes.error) {
      console.error('Sign up failed:', signUpRes.error.message);
      return;
    }
    console.log('Sign up successful (may require confirmation if not auto-confirmed).');
    console.log('Attempting sign in again...');
    loginRes = await supabase.auth.signInWithPassword({ email, password });
    if (loginRes.error) {
      console.error('Sign in after sign up failed:', loginRes.error.message);
      return;
    }
  }

  console.log('Sign in successful. User ID:', loginRes.data.user.id);
  console.log('User Email:', loginRes.data.user.email);

  console.log('Querying bikes from database...');
  const { data: bikes, error: queryError } = await supabase
    .from('bikes')
    .select('id, bikecode');

  if (queryError) {
    console.error('Query error:', queryError.message);
  } else {
    console.log('Query successful! Bikes returned:', bikes.length);
    console.log(bikes);
  }

  await supabase.auth.signOut();
}

run();
