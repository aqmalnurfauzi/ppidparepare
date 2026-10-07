/**
 * Phase 2 Gate A — Authorization & Numbering Boundary Tests
 *
 * AUTHZ-DB-01..05 : owner cannot mutate workflow / identity columns of own permohonan.
 * AUTHZ-NUM-01..08: create_permohonan() boundary (auth + email verified + active profile
 *                   + server-derived pemohon_id + atomic allocation/insert/audit).
 * AUTHZ-ADM-01..02: admin workflow RPC is admin-only and works for admin.
 *
 * Run (strict, for acceptance evidence):
 *   GATE_A_STRICT=1 node --test --experimental-strip-types tests/phase2-gate-a-authz.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import {
  serviceClient,
  isConfigured,
  newAnonClient,
  requireStaging,
  createAuthUser,
  createConfirmedUser,
  cleanupTestUsers,
  isNotMigrated,
} from './helpers/gate-a-staging.mjs';

type Created = { id: string; nomor_permohonan: string };

const SQL = fs.readFileSync('db/migrations/20261006000003_phase2_gate_a_authz_corrections.sql', 'utf-8');
const SQL_000004 = fs.readFileSync('db/migrations/20261006000004_fix_profile_guard_service_role.sql', 'utf-8');

describe('Phase 2 Gate A — Authorization (static)', () => {
  it('STATIC-AUTHZ: client write privileges/policies removed, trigger + RPC boundary present', () => {
    assert.match(SQL, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public\.permohonan FROM PUBLIC, anon, authenticated/);
    assert.match(SQL, /DROP POLICY IF EXISTS "Users can update own diajukan permohonan or admin update"/);
    assert.match(SQL, /DROP POLICY IF EXISTS "Users can insert own permohonan or admin insert"/);
    assert.match(SQL, /current_user IN \('anon', 'authenticated'\)/);
    assert.match(SQL, /REVOKE ALL ON FUNCTION public\.allocate_nomor_permohonan\(INT\) FROM PUBLIC, anon, authenticated, service_role/);
    // create_permohonan must not accept pemohon_id from client
    const sig = SQL.match(/CREATE OR REPLACE FUNCTION public\.create_permohonan\(([\s\S]*?)\)\s*RETURNS/)?.[1] ?? '';
    assert.ok(sig.length > 0, 'create_permohonan signature not found');
    assert.ok(!/pemohon_id|status_proses|decision|nomor|tracking|catatan|tiket/i.test(sig), 'create_permohonan exposes privileged params');
    // every SECURITY DEFINER function in this migration pins search_path
    const definers = SQL.match(/LANGUAGE plpgsql[^;]*SECURITY DEFINER[^;]*;/g) ?? [];
    assert.ok(definers.length >= 4);
    for (const d of definers) assert.match(d, /SET search_path = pg_catalog, public, pg_temp;/);
    // email verification + active profile checked in authorization helper
    assert.match(SQL, /email_confirmed_at/);
    assert.match(SQL, /v_active IS NOT TRUE/);
    assert.match(SQL, /LEGACY ONLY/);

    // Migration 000004: robust service_role detection & security invariants
    assert.match(SQL_000004, /CREATE OR REPLACE FUNCTION public\.guard_user_profile_updates\(\)/);
    assert.match(SQL_000004, /SECURITY DEFINER/);
    assert.match(SQL_000004, /SET search_path = pg_catalog, public, pg_temp;/);
    assert.match(SQL_000004, /request\.jwt\.claims/);
    assert.match(SQL_000004, /auth\.role\(\)/);
    assert.match(SQL_000004, /Cannot demote or deactivate the last active administrator/);
    assert.match(SQL_000004, /Admins cannot demote or deactivate their own account/);
    assert.match(SQL_000004, /Only active administrators can modify role or account status/);
  });
});

describe('Phase 2 Gate A — Authorization (staging)', () => {
  let owner: Awaited<ReturnType<typeof createConfirmedUser>> | null = null;
  let created: Created | null = null;
  let migrated = false;

  before(async () => {
    if (!isConfigured) return;
    owner = await createConfirmedUser('user');
    const { data, error } = await owner.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Gate A Owner',
      p_kebutuhan: 'Uji otorisasi',
    });
    if (isNotMigrated(error)) return;
    if (error) throw new Error(`create_permohonan failed: ${error.message}`);
    created = (data as Created[])[0];
    migrated = true;
  });

  after(async () => {
    await cleanupTestUsers();
  });

  async function readRow() {
    const { data, error } = await serviceClient!.from('permohonan').select('*').eq('id', created!.id).single();
    if (error) throw error;
    return data;
  }

  async function assertOwnerUpdateRejected(patch: Record<string, unknown>, column: string) {
    const before = await readRow();
    const { data, error } = await owner!.client.from('permohonan').update(patch).eq('id', created!.id).select();
    const after = await readRow();
    // Either explicit permission error, or zero rows affected — and the row must be unchanged.
    assert.ok(error !== null || (Array.isArray(data) && data.length === 0), `owner update of ${column} was not rejected`);
    assert.deepEqual(after[column], before[column], `${column} changed by owner!`);
    assert.equal(after.updated_at, before.updated_at, 'row was touched by owner update');
  }

  function guard(t: { skip: (m?: string) => void }): boolean {
    if (!isConfigured) { requireStaging(t, 'Supabase staging credentials not configured'); return false; }
    if (!migrated) { requireStaging(t, 'create_permohonan not migrated on staging'); return false; }
    return true;
  }

  it('AUTHZ-DB-01: user tidak dapat mengubah status permohonan sendiri', async (t) => {
    if (!guard(t)) return;
    await assertOwnerUpdateRejected({ status_proses: 'diproses' }, 'status_proses');
  });

  it('AUTHZ-DB-02: user tidak dapat mengubah decision sendiri', async (t) => {
    if (!guard(t)) return;
    await assertOwnerUpdateRejected({ status_proses: 'selesai', decision: 'dikabulkan_sepenuhnya' }, 'decision');
  });

  it('AUTHZ-DB-03: user tidak dapat mengubah alasan penolakan sendiri', async (t) => {
    if (!guard(t)) return;
    await assertOwnerUpdateRejected({ alasan_penolakan: 'diubah user' }, 'alasan_penolakan');
  });

  it('AUTHZ-DB-04: user tidak dapat mengubah tracking_token_hash', async (t) => {
    if (!guard(t)) return;
    await assertOwnerUpdateRejected({ tracking_token_hash: 'deadbeef' }, 'tracking_token_hash');
  });

  it('AUTHZ-DB-05: user tidak dapat mengubah nomor permohonan', async (t) => {
    if (!guard(t)) return;
    await assertOwnerUpdateRejected({ nomor_permohonan: 'PPID-2026-99999' }, 'nomor_permohonan');
  });

  it('AUTHZ-DB-06: user tidak dapat mengubah pemohon_id / catatan_internal / menghapus', async (t) => {
    if (!guard(t)) return;
    const other = await createConfirmedUser('user');
    await assertOwnerUpdateRejected({ pemohon_id: other.id }, 'pemohon_id');
    await assertOwnerUpdateRejected({ catatan_internal: 'x' }, 'catatan_internal');
    await owner!.client.from('permohonan').delete().eq('id', created!.id);
    assert.ok(await readRow(), 'owner deleted own permohonan!');
  });

  it('AUTHZ-NUM-01: user terverifikasi & aktif membuat permohonan; nomor + pemohon_id + default workflow diset server', async (t) => {
    if (!guard(t)) return;
    const row = await readRow();
    assert.match(created!.nomor_permohonan, /^PPID-\d{4}-\d{5}$/);
    assert.equal(row.nomor_permohonan, created!.nomor_permohonan);
    assert.equal(row.pemohon_id, owner!.id);
    assert.equal(row.status_proses, 'diajukan');
    assert.equal(row.decision, null);
    assert.equal(row.p_tiket_id, null);
  });

  it('AUTHZ-NUM-02: audit log ditulis dalam transaksi yang sama', async (t) => {
    if (!guard(t)) return;
    const { data, error } = await serviceClient!
      .from('log_aktivitas').select('*')
      .eq('target_entity', 'permohonan').eq('target_id', created!.id).eq('action', 'permohonan.create');
    assert.equal(error, null);
    assert.equal(data!.length, 1);
    assert.equal(data![0].actor_id, owner!.id);
    assert.equal(data![0].metadata.nomor_permohonan, created!.nomor_permohonan);
  });

  it('AUTHZ-NUM-03: anon tidak dapat memanggil create_permohonan', async (t) => {
    if (!guard(t)) return;
    const { error } = await newAnonClient().rpc('create_permohonan', { p_nama_pemohon: 'x', p_kebutuhan: 'y' });
    assert.ok(error !== null, 'anon created permohonan!');
  });

  it('AUTHZ-NUM-04: pemohon_id dari client ditolak (tidak ada parameter tersebut)', async (t) => {
    if (!guard(t)) return;
    const victim = await createConfirmedUser('user');
    const { error } = await owner!.client.rpc('create_permohonan', {
      p_nama_pemohon: 'spoof', p_kebutuhan: 'spoof', p_pemohon_id: victim.id,
    });
    assert.ok(error !== null, 'RPC accepted client-supplied pemohon_id');
    const { data } = await serviceClient!.from('permohonan').select('id').eq('pemohon_id', victim.id);
    assert.equal(data!.length, 0);
  });

  it('AUTHZ-NUM-05: INSERT langsung ke permohonan oleh user ditolak (termasuk workflow columns)', async (t) => {
    if (!guard(t)) return;
    const { error } = await owner!.client.from('permohonan').insert({
      pemohon_id: owner!.id, nama_pemohon: 'direct', kebutuhan: 'direct',
      status_proses: 'selesai', decision: 'dikabulkan_sepenuhnya', nomor_permohonan: 'PPID-2026-00000',
    });
    assert.ok(error !== null, 'direct insert succeeded');
  });

  it('AUTHZ-NUM-06: profile nonaktif ditolak sebelum alokasi nomor (counter tidak bergerak)', async (t) => {
    if (!guard(t)) return;
    const u = await createConfirmedUser('user');
    const { error: deactErr } = await serviceClient!.from('user_profiles').update({ is_active: false }).eq('id', u.id);
    assert.equal(deactErr, null, `fixture: cannot deactivate profile: ${deactErr?.message}`);
    const year = Number(created!.nomor_permohonan.slice(5, 9));
    const c0 = await serviceClient!.from('permohonan_counter').select('nilai_terakhir').eq('year', year).single();
    const { error } = await u.client.rpc('create_permohonan', { p_nama_pemohon: 'x', p_kebutuhan: 'y' });
    const c1 = await serviceClient!.from('permohonan_counter').select('nilai_terakhir').eq('year', year).single();
    assert.ok(error !== null, 'inactive profile created permohonan');
    assert.match(error!.message, /inactive|Unauthorized/i);
    assert.equal(c1.data!.nilai_terakhir, c0.data!.nilai_terakhir, 'counter advanced on rejected request');
  });

  it('AUTHZ-NUM-07: email belum terverifikasi tidak dapat membuat permohonan', async (t) => {
    if (!guard(t)) return;
    const u = await createAuthUser(false);
    const client = newAnonClient();
    const signIn = await client.auth.signInWithPassword({ email: u.email, password: u.password });
    if (signIn.error) {
      // Auth layer blocks unverified login; DB layer check is covered by STATIC-AUTHZ.
      assert.match(signIn.error.message, /confirm|verif/i);
      return;
    }
    const { error } = await client.rpc('create_permohonan', { p_nama_pemohon: 'x', p_kebutuhan: 'y' });
    assert.ok(error !== null, 'unverified user created permohonan');
    assert.match(error!.message, /email not verified/i);
  });

  it('AUTHZ-NUM-08: admin tidak dapat membuat permohonan via create_permohonan (role user wajib)', async (t) => {
    if (!guard(t)) return;
    const admin = await createConfirmedUser('admin');
    const { error } = await admin.client.rpc('create_permohonan', { p_nama_pemohon: 'x', p_kebutuhan: 'y' });
    assert.ok(error !== null);
  });

  it('AUTHZ-ADM-01: user biasa tidak dapat memanggil admin_update_permohonan_workflow', async (t) => {
    if (!guard(t)) return;
    const { error } = await owner!.client.rpc('admin_update_permohonan_workflow', {
      p_permohonan_id: created!.id, p_status_proses: 'diproses',
    });
    assert.ok(error !== null, 'non-admin executed workflow RPC');
    assert.equal((await readRow()).status_proses, 'diajukan');
  });

  it('AUTHZ-ADM-02: admin aktif dapat memproses workflow via RPC + audit', async (t) => {
    if (!guard(t)) return;
    const admin = await createConfirmedUser('admin');
    const r1 = await admin.client.rpc('admin_update_permohonan_workflow', { p_permohonan_id: created!.id, p_status_proses: 'diproses' });
    assert.equal(r1.error, null, r1.error?.message);
    const r2 = await admin.client.rpc('admin_update_permohonan_workflow', {
      p_permohonan_id: created!.id, p_status_proses: 'selesai', p_decision: 'ditolak', p_alasan_penolakan: 'Dikecualikan',
    });
    assert.equal(r2.error, null, r2.error?.message);
    const row = await readRow();
    assert.equal(row.status_proses, 'selesai');
    assert.equal(row.decision, 'ditolak');
    const { data } = await serviceClient!.from('log_aktivitas').select('id')
      .eq('target_id', created!.id).eq('action', 'permohonan.workflow_update');
    assert.equal(data!.length, 2);
  });

  it('PROFILE-GUARD-01: service-role dapat melakukan controlled role update melalui serviceClient', async (t) => {
    if (!guard(t)) return;
    const testUser = await createConfirmedUser('user');
    const { error } = await serviceClient!
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', testUser.id);
    assert.equal(error, null, `service_role failed to update role: ${error?.message}`);
    const { data } = await serviceClient!
      .from('user_profiles')
      .select('role')
      .eq('id', testUser.id)
      .single();
    assert.equal(data?.role, 'admin');
  });

  it('PROFILE-GUARD-02: service-role dapat melakukan controlled is_active update melalui serviceClient', async (t) => {
    if (!guard(t)) return;
    const testUser = await createConfirmedUser('user');
    const { error: deactErr } = await serviceClient!
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', testUser.id);
    assert.equal(deactErr, null, `service_role failed to deactivate: ${deactErr?.message}`);
    const { data: d1 } = await serviceClient!
      .from('user_profiles')
      .select('is_active')
      .eq('id', testUser.id)
      .single();
    assert.equal(d1?.is_active, false);

    const { error: reactErr } = await serviceClient!
      .from('user_profiles')
      .update({ is_active: true })
      .eq('id', testUser.id);
    assert.equal(reactErr, null, `service_role failed to reactivate: ${reactErr?.message}`);
    const { data: d2 } = await serviceClient!
      .from('user_profiles')
      .select('is_active')
      .eq('id', testUser.id)
      .single();
    assert.equal(d2?.is_active, true);
  });

  it('PROFILE-GUARD-03: authenticated user biasa tetap tidak dapat role/is_active update', async (t) => {
    if (!guard(t)) return;
    const testUser = await createConfirmedUser('user');
    const { error: roleErr } = await testUser.client
      .from('user_profiles')
      .update({ role: 'admin' })
      .eq('id', testUser.id);
    assert.ok(roleErr !== null, 'regular user was able to self-promote to admin');
    assert.match(roleErr.message, /Only active administrators|Unauthorized/i);

    const { error: activeErr } = await testUser.client
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', testUser.id);
    assert.ok(activeErr !== null, 'regular user was able to change account status');
    assert.match(activeErr.message, /Only active administrators|Unauthorized/i);
  });

  it('PROFILE-GUARD-04: admin tidak dapat self-demote', async (t) => {
    if (!guard(t)) return;
    const adminUser = await createConfirmedUser('admin');
    const { error } = await adminUser.client
      .from('user_profiles')
      .update({ role: 'user' })
      .eq('id', adminUser.id);
    assert.ok(error !== null, 'admin was able to self-demote');
    assert.match(error.message, /Admins cannot demote or deactivate their own account/i);
  });

  it('PROFILE-GUARD-05: admin tidak dapat self-deactivate', async (t) => {
    if (!guard(t)) return;
    const adminUser = await createConfirmedUser('admin');
    const { error } = await adminUser.client
      .from('user_profiles')
      .update({ is_active: false })
      .eq('id', adminUser.id);
    assert.ok(error !== null, 'admin was able to self-deactivate');
    assert.match(error.message, /Admins cannot demote or deactivate their own account/i);
  });

  it('PROFILE-GUARD-06: last active admin tidak dapat di-demote/deactivate', async (t) => {
    if (!guard(t)) return;
    const { data: admins, error: fetchErr } = await serviceClient!
      .from('user_profiles')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true);
    assert.equal(fetchErr, null, fetchErr?.message);

    let soleAdminId: string;
    const temporaryDeactivated: string[] = [];
    if (!admins || admins.length === 0) {
      const newAdmin = await createConfirmedUser('admin');
      soleAdminId = newAdmin.id;
    } else if (admins.length === 1) {
      soleAdminId = admins[0].id;
    } else {
      soleAdminId = admins[0].id;
      for (let i = 1; i < admins.length; i++) {
        await serviceClient!.from('user_profiles').update({ is_active: false }).eq('id', admins[i].id);
        temporaryDeactivated.push(admins[i].id);
      }
    }

    try {
      const { error: deactErr } = await serviceClient!
        .from('user_profiles')
        .update({ is_active: false })
        .eq('id', soleAdminId);
      assert.ok(deactErr !== null, 'Last active admin was deactivated!');
      assert.match(deactErr.message, /Cannot demote or deactivate the last active administrator/i);

      const { error: demoteErr } = await serviceClient!
        .from('user_profiles')
        .update({ role: 'user' })
        .eq('id', soleAdminId);
      assert.ok(demoteErr !== null, 'Last active admin was demoted!');
      assert.match(demoteErr.message, /Cannot demote or deactivate the last active administrator/i);
    } finally {
      for (const id of temporaryDeactivated) {
        await serviceClient!.from('user_profiles').update({ is_active: true }).eq('id', id);
      }
    }
  });
});
