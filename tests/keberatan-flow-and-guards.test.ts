/**
 * Automated Regression & Security Test Suite: Keberatan Flow & Authorization Guards
 * Proyek: PPID Kota Parepare
 * Tiket 3: Remediasi Penuh Alur Layanan Pengajuan Keberatan (Public Portal & Admin Dashboard End-to-End)
 *
 * Test Specifications:
 * - SEC-KEB-SUBMIT-01: submitKeberatan in lib/actions.ts delegates to createKeberatan from @/lib/data/keberatan
 * - SEC-KEB-SUBMIT-02: submitKeberatan eliminates raw direct INSERT with obsolete prototype columns (tanggal, tiket_referensi, status: 'menunggu')
 * - SEC-KEB-SUBMIT-03: submitKeberatan validates inputs (permohonanId presence, min length of alasan)
 * - SEC-KEB-STATUS-01: cekStatusTiket executes relational join permohonan:permohonan_id for keberatan tracking
 * - SEC-KEB-STATUS-02: cekStatusTiket masks applicant name in keberatan response via maskApplicantName
 * - SEC-KEB-STATUS-03: cekStatusTiket returns permohonan.id for valid permohonan to support downstream objection filing
 * - SEC-KEB-ADMIN-01: getKeberatan enforces requireAdmin() and joins permohonan:permohonan_id
 * - SEC-KEB-ADMIN-02: updateKeberatanStatus enforces requireAdmin() and updates status_keberatan
 * - SEC-KEB-UI-01: app/pengajuan-keberatan/page.tsx validates status_proses === 'selesai' before allowing objection submission
 * - SEC-KEB-UI-02: app/pengajuan-keberatan/page.tsx detects citizen auth status and renders login guidance
 * - SEC-KEB-UI-03: app/pengajuan-keberatan/page.tsx eliminates window.alert() and renders official objection ID with copy button
 * - SEC-KEB-DASHBOARD-01: app/dashboard/keberatan/page.tsx maps official database enums (diajukan, diproses, selesai, ditolak)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { CreateKeberatanSchema } from '../lib/validations/keberatan.ts';

describe('Tiket 3 — SEC-KEB-SUBMIT: Keberatan Submission & Delegation Architecture', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-KEB-SUBMIT-01: submitKeberatan delegates to createKeberatan from @/lib/data/keberatan', () => {
    assert.ok(
      actionsContent.includes("from '@/lib/data/keberatan'") ||
      actionsContent.includes("from '@/lib/data/keberatan.ts'") ||
      actionsContent.includes("import('@/lib/data/keberatan')"),
      'lib/actions.ts must import or dynamically import createKeberatan from @/lib/data/keberatan'
    );

    const submitFnRegex = /export\s+async\s+function\s+submitKeberatan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(submitFnRegex);
    assert.ok(match, 'submitKeberatan must be exported from lib/actions.ts');

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('createKeberatan'),
      'submitKeberatan must delegate execution to createKeberatan'
    );
  });

  it('SEC-KEB-SUBMIT-02: submitKeberatan eliminates raw direct INSERT with obsolete prototype columns', () => {
    const submitFnRegex = /export\s+async\s+function\s+submitKeberatan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(submitFnRegex);
    assert.ok(match, 'submitKeberatan must exist');

    const fnBody = match[1];
    // Must NOT contain direct supabase insert
    assert.equal(
      fnBody.includes("supabase.from('keberatan').insert"),
      false,
      'submitKeberatan must NOT perform direct supabase.from("keberatan").insert'
    );
    // Must NOT contain obsolete prototype columns
    assert.equal(
      fnBody.includes("status: 'menunggu'"),
      false,
      'submitKeberatan must not set status to legacy "menunggu"'
    );
    assert.equal(
      fnBody.includes('tiket_referensi:'),
      false,
      'submitKeberatan must not insert non-existent column tiket_referensi'
    );
    assert.equal(
      fnBody.includes("OBJ-"),
      false,
      'submitKeberatan must not generate pseudo OBJ- string IDs'
    );
  });

  it('SEC-KEB-SUBMIT-03: submitKeberatan validates inputs and CreateKeberatanSchema rejects invalid inputs', () => {
    const submitFnRegex = /export\s+async\s+function\s+submitKeberatan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(submitFnRegex);
    assert.ok(match);
    const fnBody = match[1];

    // Static verification that submitKeberatan validates targetPermohonanId and alasan length
    assert.ok(
      fnBody.includes('!targetPermohonanId'),
      'submitKeberatan must guard against missing targetPermohonanId'
    );
    assert.ok(
      fnBody.includes('VALIDATION_ERROR'),
      'submitKeberatan must return VALIDATION_ERROR for invalid inputs'
    );
    assert.ok(
      fnBody.includes('.length < 5'),
      'submitKeberatan must guard against reason shorter than 5 characters'
    );

    // Schema validation testing
    // 1. Missing permohonanId
    assert.throws(
      () => CreateKeberatanSchema.parse({ alasanKeberatan: 'Alasan yang cukup panjang' }),
      /ID permohonan wajib diisi/
    );

    // 2. Non-UUID permohonanId
    assert.throws(
      () => CreateKeberatanSchema.parse({ permohonanId: 'not-a-uuid', alasanKeberatan: 'Alasan yang cukup panjang' }),
      /ID permohonan harus berformat UUID/
    );

    // 3. Too short reason
    assert.throws(
      () => CreateKeberatanSchema.parse({ permohonanId: '123e4567-e89b-12d3-a456-426614174000', alasanKeberatan: 'abc' }),
      /Alasan keberatan minimal 5 karakter/
    );

    // 4. Valid payload
    const valid = CreateKeberatanSchema.parse({
      permohonanId: '123e4567-e89b-12d3-a456-426614174000',
      alasanKeberatan: 'Permohonan ditolak tanpa dasar hukum yang jelas.',
      kasusPosisi: 'Permohonan telah berstatus selesai pada tanggal 10 Oktober 2026.',
    });
    assert.equal(valid.permohonanId, '123e4567-e89b-12d3-a456-426614174000');
    assert.equal(valid.alasanKeberatan, 'Permohonan ditolak tanpa dasar hukum yang jelas.');
  });
});

describe('Tiket 3 — SEC-KEB-STATUS: Keberatan Tracking & Relational Query Integrity', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-KEB-STATUS-01: cekStatusTiket joins permohonan:permohonan_id to eliminate column non-existent errors', () => {
    const fnRegex = /export\s+async\s+function\s+cekStatusTiket\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'cekStatusTiket must exist');

    const fnBody = match[1];
    // Check keberatan query has relation to permohonan
    assert.ok(
      fnBody.includes('permohonan:permohonan_id'),
      'cekStatusTiket must join permohonan via permohonan:permohonan_id'
    );

    // Ensure it does not select non-existent columns directly on keberatan table
    assert.equal(
      fnBody.includes("select('id, nomor_keberatan, nomor_permohonan"),
      false,
      'cekStatusTiket must not select nomor_permohonan directly from keberatan table'
    );
    assert.equal(
      fnBody.includes("nama_pemohon, email_pemohon"),
      false,
      'cekStatusTiket must not select non-existent nama_pemohon or email_pemohon directly from keberatan table'
    );
  });

  it('SEC-KEB-STATUS-02: cekStatusTiket masks applicant name in keberatan response via maskApplicantName', () => {
    const fnRegex = /export\s+async\s+function\s+cekStatusTiket\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('maskApplicantName'),
      'cekStatusTiket must utilize maskApplicantName for privacy'
    );
  });

  it('SEC-KEB-STATUS-03: cekStatusTiket returns permohonan.id for valid permohonan data', () => {
    const fnRegex = /export\s+async\s+function\s+cekStatusTiket\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('id: permohonan.id'),
      'cekStatusTiket must return id: permohonan.id so that downstream forms can link the objection directly'
    );
  });

  it('SEC-KEB-STATUS-04: cekStatusTiket enforces tracking rate limit', () => {
    const fnRegex = /export\s+async\s+function\s+cekStatusTiket\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('checkTrackingRateLimit'),
      'cekStatusTiket must check rate limiting via checkTrackingRateLimit'
    );
  });
});

describe('Tiket 3 — SEC-KEB-ADMIN: Keberatan Admin Operations Security Guard', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-KEB-ADMIN-01: getKeberatan enforces requireAdmin() and joins permohonan:permohonan_id', () => {
    const fnRegex = /export\s+async\s+function\s+getKeberatan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'getKeberatan must be exported');

    const fnBody = match[1];
    assert.ok(fnBody.includes('await requireAdmin()'), 'getKeberatan must call requireAdmin()');
    assert.ok(fnBody.includes('permohonan:permohonan_id'), 'getKeberatan must join permohonan via permohonan:permohonan_id');
    assert.ok(fnBody.includes('nomor_permohonan: perm.nomor_permohonan'), 'getKeberatan must map nomor_permohonan from joined permohonan');
    assert.ok(fnBody.includes('nama_pemohon: perm.nama_pemohon'), 'getKeberatan must map nama_pemohon from joined permohonan');
  });

  it('SEC-KEB-ADMIN-02: updateKeberatanStatus enforces requireAdmin() and updates status_keberatan', () => {
    const fnRegex = /export\s+async\s+function\s+updateKeberatanStatus\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'updateKeberatanStatus must be exported');

    const fnBody = match[1];
    assert.ok(fnBody.includes('await requireAdmin()'), 'updateKeberatanStatus must call requireAdmin()');
    assert.ok(fnBody.includes('status_keberatan'), 'updateKeberatanStatus must update status_keberatan column');
  });
});

describe('Tiket 3 — SEC-KEB-UI: Public Portal & Admin Dashboard Security Audits', () => {
  const publicPagePath = path.join(process.cwd(), 'app/pengajuan-keberatan/page.tsx');
  const adminPagePath = path.join(process.cwd(), 'app/dashboard/keberatan/page.tsx');

  it('SEC-KEB-UI-01: app/pengajuan-keberatan/page.tsx validates status_proses === selesai before submission', () => {
    assert.ok(fs.existsSync(publicPagePath), 'app/pengajuan-keberatan/page.tsx must exist');
    const pageContent = fs.readFileSync(publicPagePath, 'utf-8');

    assert.ok(
      pageContent.includes("status_proses !== 'selesai'") ||
      pageContent.includes("status_proses === 'selesai'"),
      'Public objection form must strictly enforce terminal status (selesai) prerequisite'
    );
  });

  it('SEC-KEB-UI-02: app/pengajuan-keberatan/page.tsx detects citizen auth status and renders login guidance', () => {
    const pageContent = fs.readFileSync(publicPagePath, 'utf-8');

    assert.ok(
      pageContent.includes('supabase.auth.getUser()'),
      'Public objection form must check Supabase client authentication state'
    );
    assert.ok(
      pageContent.includes('isLoggedIn'),
      'Public objection form must track isLoggedIn state'
    );
  });

  it('SEC-KEB-UI-03: app/pengajuan-keberatan/page.tsx eliminates window.alert() and renders official objection ID with copy button', () => {
    const pageContent = fs.readFileSync(publicPagePath, 'utf-8');

    assert.equal(
      pageContent.includes('window.alert('),
      false,
      'app/pengajuan-keberatan/page.tsx must NOT contain raw window.alert() popups'
    );
    assert.ok(
      pageContent.includes('Nomor Registrasi Keberatan'),
      'Public objection form must render Nomor Registrasi Keberatan on success screen'
    );
    assert.ok(
      pageContent.includes('copyToClipboard'),
      'Public objection form must provide copy-to-clipboard functionality'
    );
  });

  it('SEC-KEB-DASHBOARD-01: app/dashboard/keberatan/page.tsx maps official database enums', () => {
    assert.ok(fs.existsSync(adminPagePath), 'app/dashboard/keberatan/page.tsx must exist');
    const adminContent = fs.readFileSync(adminPagePath, 'utf-8');

    assert.ok(
      adminContent.includes('diajukan') &&
      adminContent.includes('diproses') &&
      adminContent.includes('selesai'),
      'Admin keberatan dashboard must handle official database enums: diajukan, diproses, selesai'
    );
  });
});
