import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up the URL if it contains /rest/v1/
const cleanUrl = (url: string) => url.replace(/\/rest\/v1\/?$/, '');

const supabaseUrl = envUrl && envUrl.startsWith('http') ? cleanUrl(envUrl) : 'https://xiusucnttvtmwmshgdhh.supabase.co';

// Default to the provided anon key
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpdXN1Y250dHZ0bXdtc2hnZGhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzNzgxNzAsImV4cCI6MjEwMTk1NDE3MH0.LQ5db6CJCrBDk3NO107le43rXWbahGfatzpKnwX3Wlc';
const supabaseAnonKey = envKey && envKey.length > 20 ? envKey : fallbackKey;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
});
