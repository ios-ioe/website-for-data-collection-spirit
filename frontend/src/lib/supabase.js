import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud, early failure beats a confusing blank screen mid-event.
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check your .env / Vercel env."
  );
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
