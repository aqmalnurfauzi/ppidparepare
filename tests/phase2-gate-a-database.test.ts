import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import {
  serviceClient,
  newAnonClient,
  requireStaging,
  createConfirmedUser,
  cleanupTestUsers,
  isNotMigrated,
} from './helpers/gate-a-staging.mjs';

// service_role client: used here ONLY for constraint/FK fixtures and inspection.
const adminClient = serviceClient;
const anonClient = serviceClient ? newAnonClient() : null;

describe('Phase 2 Gate A — Database Foundation Verifications', () => {
  // Real, email-confirmed pemohon so FK on pemohon_id is satisfied.
  let pemohon: Awaited<ReturnType<typeof createConfirmedUser>> | null = null;

  before(async () => {
    if (serviceClient) pemohon = await createConfirmedUser('user');
  });

  after(async () => {
    await cleanupTestUsers();
  });

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
    if (!pemohon) return requireStaging(t, 'Supabase staging credentials not configured');

    // Allocation is only reachable through the authorized create_permohonan() RPC.
    const N = 5;
    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        pemohon!.client.rpc('create_permohonan', { p_nama_pemohon: `Concurrent ${i}`, p_kebutuhan: 'DB-01' })
      )
    );
    if (isNotMigrated(results[0].error)) return requireStaging(t, 'create_permohonan not migrated (PGRST202)');

    for (const r of results) assert.equal(r.error, null, `RPC error: ${r.error?.message}`);
    const nomors = results.map((r) => (r.data as { nomor_permohonan: string }[])[0].nomor_permohonan);
    assert.equal(new Set(nomors).size, N, `Duplicate nomor under concurrency: ${nomors.join(',')}`);
    for (const n of nomors) assert.match(n, /^PPID-\d{4}-\d{5}$/);
  });

  it('DB-02: Tahun berbeda menghasilkan counter terisolasi', async (t) => {
    if (!pemohon || !adminClient) return requireStaging(t, 'Supabase staging credentials not configured');

    // Seed an isolated far-future year; allocating for the current year must not touch it.
    const isolatedYear = 2099;
    const seed = await adminClient.from('permohonan_counter')
      .upsert({ year: isolatedYear, nilai_terakhir: 41 }, { onConflict: 'year' });
    if (isNotMigrated(seed.error)) return requireStaging(t, 'permohonan_counter not migrated');
    assert.equal(seed.error, null, seed.error?.message);

    const res = await pemohon.client.rpc('create_permohonan', { p_nama_pemohon: 'Year iso', p_kebutuhan: 'DB-02' });
    assert.equal(res.error, null, res.error?.message);
    const nomor = (res.data as { nomor_permohonan: string }[])[0].nomor_permohonan;
    const year = Number(nomor.slice(5, 9));
    assert.notEqual(year, isolatedYear);

    const iso = await adminClient.from('permohonan_counter').select('nilai_terakhir').eq('year', isolatedYear).single();
    const cur = await adminClient.from('permohonan_counter').select('nilai_terakhir').eq('year', year).single();
    assert.equal(iso.data!.nilai_terakhir, 41, 'isolated year counter was modified');
    assert.equal(cur.data!.nilai_terakhir, Number(nomor.slice(10)), 'current-year counter does not match issued nomor');

    await adminClient.from('permohonan_counter').delete().eq('year', isolatedYear);
  });

  it('DB-03: Nomor permohonan unique', async (t) => {
    if (!adminClient || !pemohon) return requireStaging(t, 'Supabase staging credentials not configured');

    // Attempting to insert two records with duplicate nomor_permohonan
    const fakeUserId = pemohon.id;
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

  it('DB-10: anon / user / service_role tidak dapat menjalankan privileged counter operation secara langsung', async (t) => {
    if (!anonClient || !adminClient || !pemohon) return requireStaging(t, 'Supabase staging credentials not configured');

    for (const [label, client] of [['anon', anonClient], ['authenticated', pemohon.client], ['service_role', adminClient]] as const) {
      const res = await client.rpc('allocate_nomor_permohonan', { p_year: 2026 });
      assert.ok(res.error !== null, `${label} was able to call allocate_nomor_permohonan directly!`);
    }
    // Counter table is not client-readable/writable.
    const read = await pemohon.client.from('permohonan_counter').select('*');
    assert.ok(read.error !== null || (read.data ?? []).length === 0, 'authenticated can read counter');
  });
});
