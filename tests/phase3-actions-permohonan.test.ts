/**
 * Phase 3 Workstream 1 — Atomic Tracking Token & Permohonan Action Tests
 *
 * Verifies:
 * - ACT-STATIC-01: Phase 3 migration contains DROP overload, 12 arguments, search_path, grants.
 * - ACT-STATIC-02: createPermohonanAction never imports createAdminClient or @/lib/supabase/admin.
 * - ACT-STATIC-03: createPermohonanAction sanitizes errors and never leaks raw PostgreSQL details.
 * - ACT-SCHEMA-01..05: CreatePermohonanInputSchema bounds, required fields, and format validations.
 * - ACT-ATOM-01: RPC persists tracking_token_hash atomically during creation.
 * - ACT-ATOM-02: RPC defaults tracking_token_hash to NULL when omitted (backward compatibility).
 * - ACT-ATOM-03: Returned tracking token verifies against getPublicTrackingStatus().
 * - ACT-ATOM-05: Malformed tracking_token_hash is rejected by RPC with code 22023.
 * - ACT-ATOM-06: Atomic rollback: failure after allocation rolls back counter, row, and audit log.
 * - ACT-AUTH-01..02: Authorization barriers: anon and admin roles rejected by RPC.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import { CreatePermohonanInputSchema } from '../lib/validations/permohonan.ts';
import {
  generateTrackingToken,
  hashTrackingToken,
  verifyTrackingToken,
} from '../lib/tracking/token.ts';
import { maskApplicantName } from '../types/permohonan.ts';
import {
  serviceClient,
  isConfigured,
  newAnonClient,
  requireStaging,
  createConfirmedUser,
  cleanupTestUsers,
  isNotMigrated,
} from './helpers/gate-a-staging.mjs';

describe('Phase 3 WS1: Static Contract & Security Boundary Verifications', () => {
  const migrationPath = 'db/migrations/20261011000001_phase3_atomic_tracking_token.sql';

  it('ACT-STATIC-01: Migration drops 11-arg overload, adds 12-arg signature with hash, pins search_path, and restricts privileges', () => {
    assert.ok(fs.existsSync(migrationPath), `Migration file ${migrationPath} must exist`);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // 1. Must drop 11-argument function to prevent PostgREST ambiguity
    assert.match(
      sql,
      /DROP FUNCTION IF EXISTS public\.create_permohonan\(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT\);/,
      'Migration must drop legacy 11-argument signature'
    );

    // 2. Must declare 12 parameters with p_tracking_token_hash DEFAULT NULL
    assert.match(
      sql,
      /p_tracking_token_hash TEXT DEFAULT NULL/,
      'Migration must include p_tracking_token_hash parameter'
    );

    // 3. Must check hash format regex
    assert.match(
      sql,
      /\^\[0-9a-f\]\{64\}\$/,
      'Migration must validate hash format via 64-char lowercase hex regex'
    );

    // 4. Must pin search_path
    assert.match(
      sql,
      /SET search_path = pg_catalog, public, pg_temp;/,
      'Migration must pin search_path to pg_catalog, public, pg_temp'
    );

    // 5. Must revoke from public/anon/service_role and grant only to authenticated
    assert.match(
      sql,
      /REVOKE ALL ON FUNCTION public\.create_permohonan\([\s\S]*?\) FROM PUBLIC, anon, service_role;/,
      'Migration must revoke privileges from PUBLIC, anon, and service_role'
    );
    assert.match(
      sql,
      /GRANT EXECUTE ON FUNCTION public\.create_permohonan\([\s\S]*?\) TO authenticated;/,
      'Migration must grant execute only to authenticated'
    );

    // 6. Must verify allocation runs before hash validation to prove rollback order
    const allocIdx = sql.indexOf('public.allocate_nomor_permohonan');
    const hashCheckIdx = sql.indexOf('Invalid tracking_token_hash format');
    assert.ok(allocIdx > 0 && hashCheckIdx > 0, 'Both allocation and hash validation must exist');
    assert.ok(allocIdx < hashCheckIdx, 'Allocation must occur before hash validation for ACT-ATOM-06 rollback semantics');
  });

  it('ACT-STATIC-02: Server Action never imports createAdminClient or @/lib/supabase/admin', () => {
    const actionContent = fs.readFileSync('app/actions/permohonan.ts', 'utf-8');
    assert.equal(actionContent.includes('createAdminClient'), false, 'Server action must not use createAdminClient');
    assert.equal(actionContent.includes('@/lib/supabase/admin'), false, 'Server action must not import admin client');
    assert.ok(actionContent.includes("'use server'"), 'Action must be marked use server');
    assert.ok(actionContent.includes('requireVerifiedUser'), 'Action must enforce verified user');
  });

  it('ACT-STATIC-03: Server Action implements error sanitization mapping', () => {
    const actionContent = fs.readFileSync('app/actions/permohonan.ts', 'utf-8');
    assert.ok(actionContent.includes('mapPostgreSqlError'), 'Action must implement error mapping');
    assert.equal(actionContent.includes('error.message ||'), false, 'Action must not fall back to raw error.message directly in client payload');
  });
});

describe('Phase 3 WS1: Schema Validation (CreatePermohonanInputSchema)', () => {
  it('ACT-SCHEMA-01: Valid input passes schema validation', () => {
    const valid = {
      nama_pemohon: 'Ahmad Dahlan',
      kebutuhan: 'Informasi anggaran BOS Kemenag 2025',
      kategori_pemohon: 'perorangan',
      nik: '1234567890123456',
      instansi: 'Universitas Muhammadiyah',
      alamat: 'Jl. Pemuda No. 12',
      telepon: '081234567890',
      email: 'ahmad@example.com',
      tujuan_penggunaan: 'Riset akademis',
      cara_memperoleh_informasi: 'melihat',
      cara_mendapatkan_salinan: 'email',
    };

    const res = CreatePermohonanInputSchema.safeParse(valid);
    assert.equal(res.success, true);
  });

  it('ACT-SCHEMA-02: Rejects missing or empty nama_pemohon and kebutuhan', () => {
    const res1 = CreatePermohonanInputSchema.safeParse({ kebutuhan: 'Info' });
    assert.equal(res1.success, false);

    const res2 = CreatePermohonanInputSchema.safeParse({ nama_pemohon: '   ', kebutuhan: 'Info' });
    assert.equal(res2.success, false);

    const res3 = CreatePermohonanInputSchema.safeParse({ nama_pemohon: 'Budi', kebutuhan: '' });
    assert.equal(res3.success, false);
  });

  it('ACT-SCHEMA-03: Enforces exact 16-digit regex on nik when provided', () => {
    const shortNik = CreatePermohonanInputSchema.safeParse({
      nama_pemohon: 'Budi',
      kebutuhan: 'Data',
      nik: '12345',
    });
    assert.equal(shortNik.success, false);

    const nonNumericNik = CreatePermohonanInputSchema.safeParse({
      nama_pemohon: 'Budi',
      kebutuhan: 'Data',
      nik: '123456789012345X',
    });
    assert.equal(nonNumericNik.success, false);

    const validNik = CreatePermohonanInputSchema.safeParse({
      nama_pemohon: 'Budi',
      kebutuhan: 'Data',
      nik: '7372010101900001',
    });
    assert.equal(validNik.success, true);
  });

  it('ACT-SCHEMA-04: Rejects invalid kategori_pemohon values', () => {
    const res = CreatePermohonanInputSchema.safeParse({
      nama_pemohon: 'Budi',
      kebutuhan: 'Data',
      kategori_pemohon: 'partai_politik',
    });
    assert.equal(res.success, false);
  });

  it('ACT-SCHEMA-05: Rejects invalid email format when provided', () => {
    const res = CreatePermohonanInputSchema.safeParse({
      nama_pemohon: 'Budi',
      kebutuhan: 'Data',
      email: 'invalid-email-string',
    });
    assert.equal(res.success, false);
  });
});

describe('Phase 3 WS1: Live Staging Atomicity & RPC Integration Tests', () => {
  let applicant: any = null;
  let admin: any = null;
  let isMigrated = false;

  before(async () => {
    if (!isConfigured) return;
    applicant = await createConfirmedUser('user');
    admin = await createConfirmedUser('admin');

    // Probe if Phase 3 migration is applied on staging DB
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token);
    const { error } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Probe Applicant',
      p_kebutuhan: 'Probe Needs',
      p_tracking_token_hash: hash,
    });

    if (error && (error.code === 'PGRST202' || error.message.includes('p_tracking_token_hash'))) {
      isMigrated = false;
    } else {
      isMigrated = true;
    }
  });

  after(async () => {
    await cleanupTestUsers();
  });

  function guard(t: any): boolean {
    if (!isConfigured) {
      requireStaging(t, 'Supabase credentials not configured');
      return false;
    }
    if (!isMigrated) {
      requireStaging(t, 'Phase 3 migration 20261011000001 not yet executed in Supabase Dashboard SQL Editor');
      return false;
    }
    return true;
  }

  it('ACT-AUTH-01: Anon client cannot execute create_permohonan', async (t) => {
    if (!guard(t)) return;
    const anon = newAnonClient();
    const { error } = await anon.rpc('create_permohonan', {
      p_nama_pemohon: 'Anon',
      p_kebutuhan: 'Anon Needs',
    });
    assert.ok(error !== null, 'Anon client executed create_permohonan');
  });

  it('ACT-AUTH-02: Admin role is rejected by create_permohonan (role "user" strictly required)', async (t) => {
    if (!guard(t)) return;
    const { error } = await admin.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Admin',
      p_kebutuhan: 'Admin Needs',
    });
    assert.ok(error !== null, 'Admin role was able to create permohonan');
    assert.match(error!.message, /role user required|42501/i);
  });

  it('ACT-ATOM-01: RPC persists tracking_token_hash atomically during creation', async (t) => {
    if (!guard(t)) return;

    const token = generateTrackingToken();
    const expectedHash = hashTrackingToken(token);

    const { data, error } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Atomic Applicant',
      p_kebutuhan: 'Audit Test Needs',
      p_tracking_token_hash: expectedHash,
    });

    assert.equal(error, null, error?.message);
    const created = Array.isArray(data) ? data[0] : data;
    assert.ok(created?.id, 'Missing created ID');
    assert.match(created.nomor_permohonan, /^PPID-\d{4}-\d{5}$/);

    // Inspect database row directly via serviceClient (verification inspection only)
    const { data: row, error: fetchErr } = await serviceClient!
      .from('permohonan')
      .select('id, nomor_permohonan, pemohon_id, tracking_token_hash, status_proses')
      .eq('id', created.id)
      .single();

    assert.equal(fetchErr, null);
    assert.ok(row, 'Permohonan row must exist');
    assert.equal(row.tracking_token_hash, expectedHash, 'Persisted hash must match expected HMAC-SHA-256');
    assert.equal(row.pemohon_id, applicant.id, 'Row must belong to authenticated applicant');
    assert.equal(row.status_proses, 'diajukan');
  });

  it('ACT-ATOM-02: Omitting tracking_token_hash defaults to NULL (backward compatibility)', async (t) => {
    if (!guard(t)) return;

    const { data, error } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Legacy Caller',
      p_kebutuhan: 'No Hash Needs',
    });

    assert.equal(error, null, error?.message);
    const created = Array.isArray(data) ? data[0] : data;

    const { data: row } = await serviceClient!
      .from('permohonan')
      .select('tracking_token_hash')
      .eq('id', created.id)
      .single();

    assert.ok(row, 'Permohonan row must exist');
    assert.equal(row.tracking_token_hash, null, 'Omitted hash must default to NULL');
  });

  it('ACT-ATOM-03: Returned tracking token verifies against getPublicTrackingStatus() contract', async (t) => {
    if (!guard(t)) return;

    const plaintextToken = generateTrackingToken();
    const hash = hashTrackingToken(plaintextToken);

    const { data, error } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Public Tracking Applicant',
      p_kebutuhan: 'Status Verification Test',
      p_tracking_token_hash: hash,
    });

    assert.equal(error, null);
    const created = Array.isArray(data) ? data[0] : data;

    // Verify token with constant-time verification against persisted hash
    const { data: row } = await serviceClient!
      .from('permohonan')
      .select('nomor_permohonan, status_proses, nama_pemohon, tracking_token_hash')
      .eq('id', created.id)
      .single();

    assert.ok(row, 'Permohonan row must exist');

    // Constant-time verification of plaintext token against stored HMAC-SHA-256 hash
    const isVerified = verifyTrackingToken(plaintextToken, row.tracking_token_hash);
    assert.equal(isVerified, true, 'Plaintext tracking token must verify against stored hash');
    assert.equal(row.status_proses, 'diajukan');
    assert.match(maskApplicantName(row.nama_pemohon), /^P\*\*\*\*/, 'Name must be masked');

    // Verify tracking service contract statically (consistent with Gate B service boundary pattern)
    const serviceContent = fs.readFileSync('lib/tracking/service.ts', 'utf-8');
    assert.ok(serviceContent.includes('export async function getPublicTrackingStatus'));
    assert.ok(serviceContent.includes('verifyTrackingToken(cleanToken, data?.tracking_token_hash)'));
  });

  it('ACT-ATOM-05: Malformed tracking_token_hash format is rejected by RPC with code 22023', async (t) => {
    if (!guard(t)) return;

    const { error: err1 } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Bad Hash 1',
      p_kebutuhan: 'Needs',
      p_tracking_token_hash: 'not-hex-at-all',
    });
    assert.ok(err1 !== null, 'Non-hex hash was accepted');
    assert.match(err1!.message, /22023|Invalid tracking_token_hash format/i);

    const { error: err2 } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Bad Hash 2',
      p_kebutuhan: 'Needs',
      p_tracking_token_hash: '1234abcd', // too short
    });
    assert.ok(err2 !== null, 'Short hash was accepted');
  });

  it('ACT-ATOM-06: Failure after allocation rolls back counter, row, and audit record (atomic rollback)', async (t) => {
    if (!guard(t)) return;

    const currentYear = new Date().getFullYear();

    // 1. Record counter state before test
    const { data: counterBefore } = await serviceClient!
      .from('permohonan_counter')
      .select('nilai_terakhir')
      .eq('year', currentYear)
      .maybeSingle();

    const initialCounter = counterBefore?.nilai_terakhir ?? 0;

    // 2. Invoke RPC with valid fields but invalid hash format that fails AFTER allocation
    const malformedHash = 'invalid_hash_that_triggers_after_allocation_has_run';
    const { error } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Rollback Probe',
      p_kebutuhan: 'Testing atomic rollback',
      p_tracking_token_hash: malformedHash,
    });

    assert.ok(error !== null, 'RPC should fail on malformed hash');

    // 3. Verify counter was rolled back by transaction
    const { data: counterAfter } = await serviceClient!
      .from('permohonan_counter')
      .select('nilai_terakhir')
      .eq('year', currentYear)
      .maybeSingle();

    const finalCounter = counterAfter?.nilai_terakhir ?? 0;
    assert.equal(
      finalCounter,
      initialCounter,
      `Counter advanced despite rollback! Before: ${initialCounter}, After: ${finalCounter}`
    );

    // 4. Verify no orphan row exists in permohonan
    const { data: orphanRows } = await serviceClient!
      .from('permohonan')
      .select('id')
      .eq('nama_pemohon', 'Rollback Probe');

    assert.equal(orphanRows?.length ?? 0, 0, 'Orphan permohonan row found after rollback');

    // 5. Verify no orphan log_aktivitas row exists
    const { data: orphanLogs } = await serviceClient!
      .from('log_aktivitas')
      .select('id')
      .eq('actor_id', applicant.id)
      .eq('action', 'permohonan.create');

    // Should not contain any log referencing this rollback probe
    for (const log of orphanLogs ?? []) {
      const { data: logRow } = await serviceClient!
        .from('log_aktivitas')
        .select('metadata')
        .eq('id', log.id)
        .single();
      assert.ok(logRow, 'Log row must exist');
      assert.notEqual(logRow.metadata?.nama_pemohon, 'Rollback Probe');
    }
  });

  it('ACT-SEC-01: Direct client UPDATE on tracking_token_hash remains strictly rejected', async (t) => {
    if (!guard(t)) return;

    // Create a row
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token);
    const { data } = await applicant.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Owner Immutability Probe',
      p_kebutuhan: 'Immutability Probe Needs',
      p_tracking_token_hash: hash,
    });

    const created = Array.isArray(data) ? data[0] : data;

    // Attempt direct client UPDATE
    const { error } = await applicant.client
      .from('permohonan')
      .update({ tracking_token_hash: 'deadbeef'.repeat(8) })
      .eq('id', created.id);

    assert.ok(error !== null, 'Direct client update on tracking_token_hash was not rejected');
  });
});
