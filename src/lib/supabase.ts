import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean up the URL if it contains /rest/v1/
const cleanUrl = (url: string) => url.replace(/\/rest\/v1\/?$/, '');

const supabaseUrl = envUrl && envUrl.startsWith('http') ? cleanUrl(envUrl) : 'https://shbhahjjdgkccdougxit.supabase.co';

// Default to the provided anon key
const fallbackKey = 'sb_publishable_X8vOik0n-eX-vHcucCBqgg_cs-Usl3O';
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
