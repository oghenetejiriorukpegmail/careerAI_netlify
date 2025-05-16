import { createClient } from '@supabase/supabase-js';

// Get these from the PRD or env variables
export const supabaseUrl = 'https://edfcwbtzcnfosiiymbqg.supabase.co';
export const supabaseAnonKey = 'eeyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkZmN3YnR6Y25mb3NpaXltYnFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MDg3MjQsImV4cCI6MjA2MDE4NDcyNH0.HqpZ3zPl27RSTPTVthZN6Iu5gleg_goIl81FzUd5b7U';

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);