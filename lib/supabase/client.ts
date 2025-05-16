import { createClient } from '@supabase/supabase-js';

// Get these from the PRD or env variables
export const supabaseUrl = 'https://edfcwbtzcnfosiiymbqg.supabase.co';
// Fix: Remove the extra 'e' character at the beginning of the anon key
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MDg3MjQsImV4cCI6MjA2MDE4NDcyNH0.HqpZ3zPl27RSTPTVthZN6Iu5gleg_goIl81FzUd5b7U';
export const supabaseServiceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYwODcyNCwiZXhwIjoyMDYwMTg0NzI0fQ._6i79BguJV2XXnFmDjyJbQhyjyjiDCjhu1KUXJzyJO4';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

// Create a service role client for admin operations (server-side only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});