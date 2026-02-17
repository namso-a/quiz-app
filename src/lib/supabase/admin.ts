// SERVER-ONLY: This file uses the service role key and bypasses all RLS.
// NEVER import this in Client Components or any file that runs on the client.

import { createClient } from '@supabase/supabase-js'

export const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)
