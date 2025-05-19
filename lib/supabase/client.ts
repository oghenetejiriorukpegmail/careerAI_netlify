import { createClient } from '@supabase/supabase-js';

// Default values for local development - DO NOT use these in production
const DEFAULT_SUPABASE_URL = 'https://edfcwbtzcnfosiiymbqg.supabase.co';
const DEFAULT_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MDg3MjQsImV4cCI6MjA2MDE4NDcyNH0.HqpZ3zPl27RSTPTVthZN6Iu5gleg_goIl81FzUd5b7U';
const DEFAULT_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDYwODcyNCwiZXhwIjoyMDYwMTg0NzI0fQ._6i79BguJV2XXnFmDjyJbQhyjyjiDCjhu1KUXJzyJO4';

// Get these from environment variables, fallback to defaults for local development
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_ANON_KEY;
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SERVICE_KEY;

// Log environment variable status (for development debugging only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Supabase config:', {
    url: supabaseUrl,
    anonKey: supabaseAnonKey ? '✓ present' : '✗ missing',
    serviceKey: supabaseServiceRoleKey ? '✓ present' : '✗ missing'
  });
}

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