import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-domain.supabase.co';
// Strip trailing slash and /rest/v1 suffix if present
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const getSupabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY is not defined. Admin actions will fail.");
  }
  return createClient(supabaseUrl, serviceKey || 'placeholder-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};
