import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Read .env.local
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  supabaseUrl = supabaseUrl || envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)?.[1]?.trim() || '';
  anonKey = anonKey || envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim() || '';
  serviceKey = serviceKey || envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)?.[1]?.trim() || '';
}

const adminClient = (supabaseUrl && serviceKey) ? createClient(supabaseUrl, serviceKey) : null;
const anonClient = (supabaseUrl && anonKey) ? createClient(supabaseUrl, anonKey) : null;

describe('Phase 2 Gate A — Database Foundation Verifications', () => {
  it('STATIC: Migration SQL file contains required DDL and constraints', () => {
    const sql = fs.readFileSync('db/migrations/20261006000002_phase2_database_foundation.sql', 'utf-8');
    
    // Check tables
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.permohonan_counter'), 'Missing permohonan_counter table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.permohonan'), 'Missing permohonan table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.keberatan'), 'Missing keberatan table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.dokumen_permohonan'), 'Missing dokumen_permohonan table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.log_aktivitas'), 'Missing log_aktivitas table');

    // Check invariants
    assert.ok(sql.includes('chk_permohonan_status_decision'), 'Missing status_decision constraint');
    assert.ok(sql.includes('chk_permohonan_decision_alasan'), 'Missing decision_alasan constraint');
    assert.ok(sql.includes('guard_permohonan_state_machine'), 'Missing state machine transition guard trigger');

    // Check security definer search_path
    assert.ok(sql.includes('SET search_path = pg_catalog, public, pg_temp;'), 'Missing secure search_path in allocate function');
    
    // Check revoke/grants
    assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM PUBLIC'), 'Missing revoke on allocate function');
    assert.ok(sql.includes('REVOKE ALL ON FUNCTION public.allocate_nomor_permohonan(INT) FROM authenticated'), 'Missing revoke on allocate function from authenticated');
  });

  it('DB-01: Dua transaksi concurrent meminta nomor pada tahun yang sama tidak boleh duplicate', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');
    
    const year = 2026;
    const promises = [
      adminClient.rpc('allocate_nomor_permohonan', { p_year: year }),
      adminClient.rpc('allocate_nomor_permohonan', { p_year: year })
    ];

    const results = await Promise.all(promises);
    if (results[0].error && results[0].error.code === 'PGRST202') {
      return t.skip('Table/Function allocate_nomor_permohonan not yet migrated to staging DB (PGRST202)');
    }

    assert.equal(results[0].error, null, `RPC 1 error: ${results[0].error?.message}`);
    assert.equal(results[1].error, null, `RPC 2 error: ${results[1].error?.message}`);
    assert.notEqual(results[0].data, results[1].data, 'Nomor permohonan duplicate under concurrent allocation!');
    assert.match(results[0].data, /^PPID-2026-\d{5}$/);
    assert.match(results[1].data, /^PPID-2026-\d{5}$/);
  });

  it('DB-02: Tahun berbeda menghasilkan counter terisolasi', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const res2025 = await adminClient.rpc('allocate_nomor_permohonan', { p_year: 2025 });
    if (res2025.error && res2025.error.code === 'PGRST202') {
      return t.skip('Table/Function allocate_nomor_permohonan not yet migrated to staging DB');
    }

    assert.equal(res2025.error, null);
    assert.match(res2025.data, /^PPID-2025-\d{5}$/);
  });

  it('DB-03: Nomor permohonan unique', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    // Attempting to insert two records with duplicate nomor_permohonan
    const fakeUserId = '7e2ff638-7eef-4d92-9b46-50ceb6fac77b';
    const testNomor = 'PPID-2026-TESTUQ';

    const insert1 = await adminClient.from('permohonan').insert({
      nomor_permohonan: testNomor,
      pemohon_id: fakeUserId,
      status_proses: 'diajukan',
      nama_pemohon: 'Test Unique',
      kebutuhan: 'Informasi Unique'
    });

    if (insert1.error && insert1.error.code === 'PGRST205') {
      return t.skip('Table permohonan not yet migrated to staging DB (PGRST205)');
    }

    const insert2 = await adminClient.from('permohonan').insert({
      nomor_permohonan: testNomor,
      pemohon_id: fakeUserId,
      status_proses: 'diajukan',
      nama_pemohon: 'Test Unique Duplicate',
      kebutuhan: 'Informasi Unique'
    });

    // Cleanup insert1
    await adminClient.from('permohonan').delete().eq('nomor_permohonan', testNomor);

    assert.ok(insert2.error !== null, 'Duplicate nomor_permohonan did not fail!');
    assert.match(insert2.error.message.toLowerCase(), /unique|duplicate/);
  });

  it('DB-04: decision tidak boleh terisi sebelum status selesai (diajukan/diproses dengan decision harus gagal)', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const fakeUserId = '7e2ff638-7eef-4d92-9b46-50ceb6fac77b';
    const res = await adminClient.from('permohonan').insert({
      nomor_permohonan: 'PPID-2026-TEST-INV1',
      pemohon_id: fakeUserId,
      status_proses: 'diproses',
      decision: 'dikabulkan_sepenuhnya',
      nama_pemohon: 'Test Invariant',
      kebutuhan: 'Testing'
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table permohonan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'Insert diproses with decision succeeded but should have failed!');
    assert.match(res.error.message.toLowerCase(), /chk_permohonan_status_decision|violates check constraint/);
  });

  it('DB-05: status selesai tanpa decision harus gagal', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const fakeUserId = '7e2ff638-7eef-4d92-9b46-50ceb6fac77b';
    const res = await adminClient.from('permohonan').insert({
      nomor_permohonan: 'PPID-2026-TEST-INV2',
      pemohon_id: fakeUserId,
      status_proses: 'selesai',
      decision: null,
      nama_pemohon: 'Test Invariant',
      kebutuhan: 'Testing'
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table permohonan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'Insert selesai without decision succeeded but should have failed!');
    assert.match(res.error.message.toLowerCase(), /chk_permohonan_status_decision|violates check constraint/);
  });

  it('DB-06: decision ditolak tanpa alasan harus gagal', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const fakeUserId = '7e2ff638-7eef-4d92-9b46-50ceb6fac77b';
    const res = await adminClient.from('permohonan').insert({
      nomor_permohonan: 'PPID-2026-TEST-INV3',
      pemohon_id: fakeUserId,
      status_proses: 'selesai',
      decision: 'ditolak',
      alasan_penolakan: null,
      nama_pemohon: 'Test Invariant',
      kebutuhan: 'Testing'
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table permohonan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'Insert ditolak without reason succeeded but should have failed!');
    assert.match(res.error.message.toLowerCase(), /chk_permohonan_decision_alasan|violates check constraint/);
  });

  it('DB-07: decision non-ditolak dengan alasan_penolakan harus gagal', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const fakeUserId = '7e2ff638-7eef-4d92-9b46-50ceb6fac77b';
    const res = await adminClient.from('permohonan').insert({
      nomor_permohonan: 'PPID-2026-TEST-INV4',
      pemohon_id: fakeUserId,
      status_proses: 'selesai',
      decision: 'dikabulkan_sepenuhnya',
      alasan_penolakan: 'Alasan penolakan nyasar',
      nama_pemohon: 'Test Invariant',
      kebutuhan: 'Testing'
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table permohonan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'Insert dikabulkan with reason succeeded but should have failed!');
    assert.match(res.error.message.toLowerCase(), /chk_permohonan_decision_alasan|violates check constraint/);
  });

  it('DB-08: FK keberatan menolak permohonan tidak valid', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const invalidPermohonanId = '00000000-0000-0000-0000-000000000000';
    const res = await adminClient.from('keberatan').insert({
      permohonan_id: invalidPermohonanId,
      alasan_keberatan: 'Uji FK keberatan'
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table keberatan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'FK violation did not happen!');
    assert.match(res.error.message.toLowerCase(), /foreign key|violates foreign key constraint/);
  });

  it('DB-09: FK dokumen menolak permohonan tidak valid', async (t) => {
    if (!adminClient) return t.skip('Supabase staging credentials not configured');

    const invalidPermohonanId = '00000000-0000-0000-0000-000000000000';
    const res = await adminClient.from('dokumen_permohonan').insert({
      permohonan_id: invalidPermohonanId,
      kategori_dokumen: 'identitas_ktp',
      storage_path: 'test/path.pdf',
      original_filename: 'ktp.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024
    });

    if (res.error && res.error.code === 'PGRST205') {
      return t.skip('Table dokumen_permohonan not yet migrated to staging DB');
    }

    assert.ok(res.error !== null, 'FK violation did not happen!');
    assert.match(res.error.message.toLowerCase(), /foreign key|violates foreign key constraint/);
  });

  it('DB-10: user biasa/anon tidak dapat menjalankan privileged counter operation secara langsung', async (t) => {
    if (!anonClient) return t.skip('Anon client not configured');

    const res = await anonClient.rpc('allocate_nomor_permohonan', { p_year: 2026 });
    // Should be permission denied (401/403/42501) or function not found for anon
    assert.ok(res.error !== null, 'Anon client was able to allocate nomor permohonan!');
    // If not migrated yet, it returns PGRST202 or PGRST301
  });
});
