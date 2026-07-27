import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yqmvyebrytriorgpimby.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlxbXZ5ZWJyeXRyaW9yZ3BpbWJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc0ODc2ODAsImV4cCI6MjA0MzA2MzY4MH0.sample";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
