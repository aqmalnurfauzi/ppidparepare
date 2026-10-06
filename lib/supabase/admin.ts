import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Privileged Admin Client
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for internal server-side operations
 * (e.g., admin invitations, genesis admin provisioning, audit logging).
 * STRICTLY SERVER-ONLY - NEVER EXPOSE TO CLIENT BUNDLE.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role configuration in server environment.');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
