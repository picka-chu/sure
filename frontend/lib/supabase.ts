import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yqmvyebrytriorgpimby.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2dXphYmRkbm9veGphZWthYm1xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQzNTk1NjQsImV4cCI6MjA5OTkzNTU2NH0.YzKwC1lUjZp_-w_X9F5AJUjXO-A9GEB2u8PCVY1qKl8";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
