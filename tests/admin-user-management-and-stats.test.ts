/**
 * Automated Regression & Security Test Suite: Admin User Management, Stats & Audit Log
 * Proyek: PPID Kota Parepare
 * Tiket 4: Remediasi Penuh Manajemen Akun Pengguna (user_profiles & auth.users), Statistik Dashboard Utama, dan Audit Trail Log Aktivitas
 *
 * Test Specifications:
 * - SEC-USER-GET-01: getPengguna enforces requireAdmin(), uses createAdminClient, and joins user_profiles with auth.admin.listUsers
 * - SEC-USER-CREATE-01: createPengguna enforces requireAdmin() and calls adminClient.auth.admin.createUser
 * - SEC-USER-UPDATE-01: updatePengguna enforces requireAdmin(), guards against self-demotion/deactivation, and guards against last-admin removal
 * - SEC-USER-DELETE-01: deletePengguna enforces requireAdmin(), blocks self-deletion, and blocks deleting the last active administrator
 * - SEC-STATS-GUARD-01: getDashboardStats enforces requireAdmin() and uses createAdminClient
 * - SEC-STATS-QUERY-01: getDashboardStats queries real database columns and enums (status_proses, status_keberatan, user_profiles)
 * - SEC-STATS-QUERY-02: getDashboardStats eliminates obsolete queries to prototype table "pengguna" and pseudo status "pending" / "menunggu"
 * - SEC-LOG-DTO-01: getLogAktivitas maps database columns to safe UI properties (waktu, user, aksi, detail, ip_address)
 * - SEC-LAPORAN-GUARD-01: getLaporanData enforces requireAdmin(), uses createAdminClient, and maps columns for CSV export
 * - SEC-UI-PENGGUNA-01: app/dashboard/pengguna/page.tsx eliminates window.confirm() and alert(), and provides delete confirmation modal
 * - SEC-UI-LOG-01: app/dashboard/log/page.tsx uses safe fallback strings on search filter to eliminate TypeErrors
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Tiket 4 — SEC-USER: Admin User Management & Auth Synchronization', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-USER-GET-01: getPengguna enforces requireAdmin() and joins user_profiles with auth users', () => {
    const fnRegex = /export\s+async\s+function\s+getPengguna\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'getPengguna must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'getPengguna must call requireAdmin()');
    assert.ok(fnBody.includes('createAdminClient()'), 'getPengguna must use createAdminClient()');
    assert.ok(fnBody.includes("from('user_profiles')"), 'getPengguna must query user_profiles');
    assert.ok(fnBody.includes('auth.admin.listUsers'), 'getPengguna must retrieve auth users for email synchronization');
  });

  it('SEC-USER-CREATE-01: createPengguna enforces requireAdmin() and calls auth.admin.createUser', () => {
    const fnRegex = /export\s+async\s+function\s+createPengguna\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'createPengguna must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'createPengguna must call requireAdmin()');
    assert.ok(fnBody.includes('auth.admin.createUser'), 'createPengguna must invoke auth.admin.createUser to register identity in auth.users');
    assert.ok(fnBody.includes("from('user_profiles')"), 'createPengguna must update or upsert user_profiles');
    assert.equal(
      fnBody.includes("from('user_profiles').insert([data])"),
      false,
      'createPengguna must not blindly insert unvalidated raw payload with non-existent columns'
    );
  });

  it('SEC-USER-UPDATE-01: updatePengguna enforces requireAdmin() and protects against self-demotion and last-admin removal', () => {
    const fnRegex = /export\s+async\s+function\s+updatePengguna\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'updatePengguna must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'updatePengguna must call requireAdmin()');
    assert.ok(fnBody.includes('currentAdmin.id === id'), 'updatePengguna must guard self-modifications');
    assert.ok(fnBody.includes('otherAdminCount'), 'updatePengguna must verify other active administrators exist before demotion/deactivation');
  });

  it('SEC-USER-DELETE-01: deletePengguna enforces requireAdmin(), blocks self-deletion, and guards last admin', () => {
    const fnRegex = /export\s+async\s+function\s+deletePengguna\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'deletePengguna must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'deletePengguna must call requireAdmin()');
    assert.ok(fnBody.includes('currentAdmin.id === id'), 'deletePengguna must block self-deletion');
    assert.ok(fnBody.includes('otherAdminCount'), 'deletePengguna must protect the last active administrator');
    assert.ok(fnBody.includes('auth.admin.deleteUser'), 'deletePengguna must delete user from Supabase Auth');
  });
});

describe('Tiket 4 — SEC-STATS: Main Admin Dashboard Statistics Security & Query Integrity', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-STATS-GUARD-01: getDashboardStats enforces requireAdmin() and uses createAdminClient', () => {
    const fnRegex = /export\s+async\s+function\s+getDashboardStats\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'getDashboardStats must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'getDashboardStats must enforce requireAdmin()');
    assert.ok(fnBody.includes('createAdminClient()'), 'getDashboardStats must use createAdminClient() to query under RLS');
  });

  it('SEC-STATS-QUERY-01: getDashboardStats queries real database columns and enums', () => {
    const fnRegex = /export\s+async\s+function\s+getDashboardStats\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      fnBody.includes("eq('status_proses', 'diajukan')"),
      'getDashboardStats must query permohonan with official column status_proses and enum diajukan'
    );
    assert.ok(
      fnBody.includes("eq('status_keberatan', 'diajukan')"),
      'getDashboardStats must query keberatan with official column status_keberatan and enum diajukan'
    );
    assert.ok(
      fnBody.includes("from('user_profiles')"),
      'getDashboardStats must query official table user_profiles'
    );
  });

  it('SEC-STATS-QUERY-02: getDashboardStats eliminates obsolete prototype tables and columns', () => {
    const fnRegex = /export\s+async\s+function\s+getDashboardStats\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.equal(
      fnBody.includes("from('pengguna')"),
      false,
      'getDashboardStats must NOT query obsolete prototype table "pengguna"'
    );
    assert.equal(
      fnBody.includes("eq('status', 'pending')"),
      false,
      'getDashboardStats must NOT filter non-existent column "status" with pseudo value "pending"'
    );
    assert.equal(
      fnBody.includes("eq('status', 'menunggu')"),
      false,
      'getDashboardStats must NOT filter non-existent column "status" with pseudo value "menunggu"'
    );
  });
});

describe('Tiket 4 — SEC-LOG-LAPORAN: Audit Log Normalization & Export Data', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-LOG-DTO-01: getLogAktivitas maps database columns to safe UI properties (waktu, user, aksi, detail)', () => {
    const fnRegex = /export\s+async\s+function\s+getLogAktivitas\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'getLogAktivitas must exist');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'getLogAktivitas must enforce requireAdmin()');
    assert.ok(fnBody.includes('waktu:'), 'getLogAktivitas must map waktu property for UI');
    assert.ok(fnBody.includes('user:'), 'getLogAktivitas must map user property for UI');
    assert.ok(fnBody.includes('aksi:'), 'getLogAktivitas must map aksi property for UI');
    assert.ok(fnBody.includes('detail:'), 'getLogAktivitas must map detail property for UI');
  });

  it('SEC-LAPORAN-GUARD-01: getLaporanData enforces requireAdmin(), uses createAdminClient, and maps columns for CSV export', () => {
    const fnRegex = /export\s+async\s+function\s+getLaporanData\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'getLaporanData must exist');

    const fnBody = match[1];
    assert.ok(fnBody.includes('requireAdmin()'), 'getLaporanData must enforce requireAdmin()');
    assert.ok(fnBody.includes('createAdminClient()'), 'getLaporanData must use createAdminClient()');
    assert.ok(fnBody.includes('nama:'), 'getLaporanData must map nama property from nama_pemohon');
    assert.ok(fnBody.includes('tanggal:'), 'getLaporanData must map tanggal property from created_at');
    assert.ok(fnBody.includes('status:'), 'getLaporanData must map status property from status_proses');
  });
});

describe('Tiket 4 — SEC-UI-AUDIT: Admin UI Resilience & Sanitization', () => {
  const penggunaPagePath = path.join(process.cwd(), 'app/dashboard/pengguna/page.tsx');
  const logPagePath = path.join(process.cwd(), 'app/dashboard/log/page.tsx');

  it('SEC-UI-PENGGUNA-01: app/dashboard/pengguna/page.tsx eliminates window.confirm() and alert()', () => {
    assert.ok(fs.existsSync(penggunaPagePath));
    const content = fs.readFileSync(penggunaPagePath, 'utf-8');

    assert.equal(
      content.includes('window.confirm('),
      false,
      'app/dashboard/pengguna/page.tsx must NOT contain raw window.confirm()'
    );
    assert.equal(
      content.includes('alert('),
      false,
      'app/dashboard/pengguna/page.tsx must NOT contain raw alert()'
    );
    assert.ok(
      content.includes('deleteTarget'),
      'app/dashboard/pengguna/page.tsx must use dedicated interactive delete confirmation state'
    );
  });

  it('SEC-UI-LOG-01: app/dashboard/log/page.tsx uses safe fallback strings on search filter', () => {
    assert.ok(fs.existsSync(logPagePath));
    const content = fs.readFileSync(logPagePath, 'utf-8');

    assert.ok(
      content.includes("(item.user || '')") ||
      content.includes('item.user?.toLowerCase()'),
      'app/dashboard/log/page.tsx must guard against undefined properties during search filtering'
    );
  });
});
