// @ts-check
/**
 * Shared staging helpers for Phase 2 Gate A tests (plain ESM so it runs under
 * `node --test` without a TS loader and still type-checks via allowJs).
 *
 * Set GATE_A_STRICT=1 to turn "not configured / not migrated" skips into FAILURES
 * (required when producing Gate A acceptance evidence).
 *
 * Service role is used ONLY for test fixtures (create/cleanup users) and inspection,
 * never as the actor under test.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import { randomUUID } from 'crypto';

let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf-8');
  supabaseUrl = supabaseUrl || env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
  anonKey = anonKey || env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
  serviceKey = serviceKey || env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || '';
}

export const STRICT = process.env.GATE_A_STRICT === '1';
export const isConfigured = Boolean(supabaseUrl && anonKey && serviceKey);

const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

export const serviceClient = isConfigured ? createClient(supabaseUrl, serviceKey, noSession) : null;

export function newAnonClient() {
  return createClient(supabaseUrl, anonKey, noSession);
}

/**
 * Skip (or throw in strict mode) when staging is unavailable / not migrated.
 * @param {{ skip: (msg?: string) => void }} t
 * @param {string} reason
 */
export function requireStaging(t, reason) {
  if (STRICT) throw new Error(`GATE_A_STRICT: ${reason}`);
  t.skip(reason);
}

/** @type {string[]} */
const createdUserIds = [];

/** @param {boolean} emailConfirm */
export async function createAuthUser(emailConfirm) {
  if (!serviceClient) throw new Error('service client not configured');
  const email = `gate-a-${randomUUID()}@example.test`;
  const password = `Gx!${randomUUID()}`;
  const { data, error } = await serviceClient.auth.admin.createUser({ email, password, email_confirm: emailConfirm });
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`);
  createdUserIds.push(data.user.id);
  return { id: data.user.id, email, password };
}

/**
 * Creates an email-confirmed user and returns a client signed in as that user.
 * @param {'user' | 'admin'} [role]
 */
export async function createConfirmedUser(role = 'user') {
  if (!serviceClient) throw new Error('service client not configured');
  const u = await createAuthUser(true);

  if (role === 'admin') {
    const { error } = await serviceClient.from('user_profiles').update({ role: 'admin' }).eq('id', u.id);
    if (error) throw new Error(`promote admin failed: ${error.message}`);
  }

  const client = newAnonClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email: u.email, password: u.password });
  if (signInError) throw new Error(`signIn failed: ${signInError.message}`);
  return { ...u, client };
}

/** Removes test data created by these suites. */
export async function cleanupTestUsers() {
  if (!serviceClient) return;
  for (const id of createdUserIds.splice(0)) {
    const { data: rows } = await serviceClient.from('permohonan').select('id').eq('pemohon_id', id);
    const ids = (rows ?? []).map((/** @type {{ id: string }} */ r) => r.id);
    if (ids.length) {
      await serviceClient.from('keberatan').delete().in('permohonan_id', ids);
      await serviceClient.from('dokumen_permohonan').delete().in('permohonan_id', ids);
      await serviceClient.from('permohonan').delete().in('id', ids);
    }
    await serviceClient.auth.admin.deleteUser(id);
  }
}

/** @param {{ code?: string } | null} error */
export function isNotMigrated(error) {
  return !!error && (error.code === 'PGRST202' || error.code === 'PGRST205');
}
