/**
 * Automated Regression & Security Test Suite: Public FOI Open Registration & Ticket Tracking
 * Proyek: PPID Kota Parepare
 * Layanan Permohonan Informasi Publik Terbuka & Pelacakan Tiket (Tanpa Hambatan Login Warga)
 *
 * Test Specifications:
 * - SEC-FOI-GATEWAY-01: lib/auth/guest-gateway.ts exports getGuestApplicantClient with role='user'
 * - SEC-FOI-PERMOHONAN-01: app/actions/permohonan.ts falls back to guest applicant gateway for unauthenticated citizens
 * - SEC-FOI-PERMOHONAN-02: createPermohonanAction generates CSPRNG tracking token & invokes create_permohonan RPC
 * - SEC-FOI-PERMOHONAN-03: createPermohonanAction links KTP via attachKtpDokumen with proper actor ID/role
 * - SEC-FOI-KEBERATAN-01: lib/data/keberatan.ts createKeberatan supports unauthenticated guest objections
 * - SEC-FOI-KEBERATAN-02: createKeberatan strictly requires status_proses === 'selesai' before allowing objection
 * - SEC-FOI-TRACKING-01: lib/actions.ts cekStatusTiket queries dokumen_jawaban and generates signed URLs
 * - SEC-FOI-TRACKING-02: cekStatusTiket masks applicant name using maskApplicantName
 * - SEC-FOI-TOKEN-01: generateTrackingToken, hashTrackingToken, and verifyTrackingToken integrity
 * - SEC-FOI-UI-AJUKAN-01: app/ajukan-permohonan/page.tsx renders open public registration banner without login barrier
 * - SEC-FOI-UI-STATUS-01: app/cek-status/page.tsx supports token/email tracking and renders document downloads
 * - SEC-FOI-UI-KEBERATAN-01: app/pengajuan-keberatan/page.tsx removes login requirement for citizens
 * - SEC-FOI-UI-LOGIN-01: app/login/page.tsx is branded as Portal Petugas & Admin with public citizen guidance
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { maskApplicantName } from '../types/permohonan.ts';
import { generateTrackingToken, hashTrackingToken, verifyTrackingToken } from '../lib/tracking/token.ts';

describe('PPID Open Flow — Group 1: Public Applicant Gateway & Server Actions Architecture', () => {
  const gatewayPath = path.join(process.cwd(), 'lib/auth/guest-gateway.ts');
  const permohonanActionPath = path.join(process.cwd(), 'app/actions/permohonan.ts');
  const keberatanDataPath = path.join(process.cwd(), 'lib/data/keberatan.ts');
  const actionsPath = path.join(process.cwd(), 'lib/actions.ts');

  it('SEC-FOI-GATEWAY-01: lib/auth/guest-gateway.ts exports getGuestApplicantClient with role "user"', () => {
    assert.ok(fs.existsSync(gatewayPath), 'lib/auth/guest-gateway.ts must exist');
    const content = fs.readFileSync(gatewayPath, 'utf-8');

    assert.ok(content.includes('export async function getGuestApplicantClient'), 'Must export getGuestApplicantClient');
    assert.ok(content.includes('signInWithPassword'), 'Must authenticate guest applicant via signInWithPassword');
    assert.ok(content.includes("role: 'user'"), 'Guest profile must have role user');
    assert.ok(content.includes('GUEST_APPLICANT_EMAIL'), 'Must reference guest applicant email');
    assert.ok(content.includes('GUEST_APPLICANT_PASSWORD'), 'Must reference guest applicant password');
  });

  it('SEC-FOI-PERMOHONAN-01: app/actions/permohonan.ts falls back to guest gateway for unauthenticated citizens', () => {
    assert.ok(fs.existsSync(permohonanActionPath), 'app/actions/permohonan.ts must exist');
    const content = fs.readFileSync(permohonanActionPath, 'utf-8');

    assert.ok(content.includes('getGuestApplicantClient'), 'createPermohonanAction must import and use getGuestApplicantClient');
    assert.ok(content.includes('callerSupabase'), 'Must use callerSupabase for RPC execution');
    assert.ok(content.includes("callerSupabase.rpc('create_permohonan'"), 'Must call create_permohonan RPC on caller client');
  });

  it('SEC-FOI-PERMOHONAN-02: createPermohonanAction generates CSPRNG tracking token & returns official format', () => {
    const content = fs.readFileSync(permohonanActionPath, 'utf-8');

    assert.ok(content.includes('generateTrackingToken'), 'Must generate CSPRNG tracking token');
    assert.ok(content.includes('hashTrackingToken'), 'Must generate HMAC-SHA-256 hash of token');
    assert.ok(content.includes('tracking_token: trackingToken'), 'Must return plaintext tracking_token once to caller');
    assert.ok(content.includes('nomor_permohonan: result.nomor_permohonan'), 'Must return official nomor_permohonan');
  });

  it('SEC-FOI-PERMOHONAN-03: createPermohonanAction links KTP via attachKtpDokumen with actorId and actorRole', () => {
    const content = fs.readFileSync(permohonanActionPath, 'utf-8');

    assert.ok(content.includes('attachKtpDokumen'), 'Must call attachKtpDokumen when ktp_storage_path is provided');
    assert.ok(content.includes('actorId'), 'Must pass actorId to attachKtpDokumen');
    assert.ok(content.includes('actorRole'), 'Must pass actorRole to attachKtpDokumen');
  });

  it('SEC-FOI-KEBERATAN-01: lib/data/keberatan.ts supports unauthenticated guest objections', () => {
    assert.ok(fs.existsSync(keberatanDataPath), 'lib/data/keberatan.ts must exist');
    const content = fs.readFileSync(keberatanDataPath, 'utf-8');

    assert.ok(content.includes('export async function createKeberatan'), 'Must export createKeberatan');
    assert.ok(content.includes('requireAuth()'), 'Must attempt requireAuth() for authenticated users');
    assert.ok(content.includes('guest-applicant'), 'Must provide fallback for guest applicants');
    assert.ok(content.includes('clientToUse'), 'Must use clientToUse to insert objection');
  });

  it('SEC-FOI-KEBERATAN-02: createKeberatan strictly requires status_proses === "selesai"', () => {
    const content = fs.readFileSync(keberatanDataPath, 'utf-8');

    assert.ok(
      content.includes("permohonan.status_proses !== 'selesai'"),
      'Must guard that objections can only be filed against completed permohonan'
    );
  });

  it('SEC-FOI-TRACKING-01: lib/actions.ts cekStatusTiket queries dokumen_jawaban and generates signed URLs', () => {
    assert.ok(fs.existsSync(actionsPath), 'lib/actions.ts must exist');
    const content = fs.readFileSync(actionsPath, 'utf-8');

    assert.ok(content.includes('dokumen_jawaban'), 'cekStatusTiket must handle dokumen_jawaban');
    assert.ok(content.includes('createSignedUrl'), 'cekStatusTiket must generate signed URLs for documents');
    assert.ok(content.includes('dokumen_permohonan'), 'cekStatusTiket must query dokumen_permohonan table');
    assert.ok(content.includes('dokumen_jawaban: dokumenJawabanList'), 'cekStatusTiket must return dokumen_jawaban in response DTO');
  });

  it('SEC-FOI-TRACKING-02: cekStatusTiket masks applicant name for public privacy', () => {
    const content = fs.readFileSync(actionsPath, 'utf-8');

    assert.ok(content.includes('maskApplicantName'), 'cekStatusTiket must use maskApplicantName');
    assert.ok(content.includes('nama_pemohon_masked'), 'cekStatusTiket must return nama_pemohon_masked');
  });
});

describe('PPID Open Flow — Group 2: Tracking Token & Privacy Cryptographic Primitives', () => {
  it('SEC-FOI-TOKEN-01: generateTrackingToken generates Base62 CSPRNG token', () => {
    const token1 = generateTrackingToken();
    const token2 = generateTrackingToken();

    assert.equal(typeof token1, 'string');
    assert.equal(token1.length, 43);
    assert.ok(/^[0-9A-Za-z]{43}$/.test(token1), 'Token must be valid Base62 string');
    assert.notEqual(token1, token2, 'Two generated tokens must be cryptographically distinct');
  });

  it('SEC-FOI-TOKEN-02: hashTrackingToken generates deterministic HMAC-SHA-256 hash', () => {
    const token = generateTrackingToken();
    const hash1 = hashTrackingToken(token);
    const hash2 = hashTrackingToken(token);

    assert.equal(hash1, hash2, 'Hash must be deterministic for identical token');
    assert.equal(hash1.length, 64, 'HMAC hash must be 64-character hex');
  });

  it('SEC-FOI-TOKEN-03: verifyTrackingToken accurately validates correct and incorrect tokens', () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token);

    assert.equal(verifyTrackingToken(token, hash), true, 'Valid token must match its hash');
    assert.equal(verifyTrackingToken('wrong-token-value', hash), false, 'Incorrect token must be rejected');
    assert.equal(verifyTrackingToken(token, 'wrong-hash-value'), false, 'Mismatched hash must be rejected');
  });

  it('SEC-FOI-TOKEN-04: maskApplicantName masks multi-word citizen names for public tracking', () => {
    assert.equal(maskApplicantName('Ahmad Dahlan'), 'A**** D*****');
    assert.equal(maskApplicantName('Siti Nurhaliza'), 'S*** N********');
    assert.equal(maskApplicantName('Budi'), 'B***');
    assert.equal(maskApplicantName(''), '***');
    assert.equal(maskApplicantName(null as unknown as string), '***');
  });
});

describe('PPID Open Flow — Group 3: Public UI Registration, Tracking & Portal Branding Audits', () => {
  it('SEC-FOI-UI-AJUKAN-01: app/ajukan-permohonan/page.tsx renders open public registration banner without login buttons', () => {
    const pagePath = path.join(process.cwd(), 'app/ajukan-permohonan/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes('Layanan Permohonan Informasi Publik Terbuka') || content.includes('Pendaftaran Permohonan Informasi Publik'),
      'ajukan-permohonan page must inform citizens that registration is open without login barrier'
    );
    assert.equal(
      content.includes('(Tanpa Wajib Login)'),
      false,
      'ajukan-permohonan page must eliminate redundant (Tanpa Wajib Login) phrase'
    );
    assert.equal(
      content.includes('Perhatian: Wajib Masuk Akun'),
      false,
      'ajukan-permohonan page must eliminate the restrictive "Wajib Masuk Akun" warning'
    );
    assert.equal(
      content.includes('href="/login"'),
      false,
      'ajukan-permohonan page must strictly NOT contain any login links or Portal Petugas buttons'
    );
    assert.equal(
      content.includes('Portal Petugas'),
      false,
      'ajukan-permohonan page must not contain Portal Petugas button'
    );
  });

  it('SEC-FOI-UI-STATUS-01: app/cek-status/page.tsx supports token/email tracking and renders document downloads', () => {
    const pagePath = path.join(process.cwd(), 'app/cek-status/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes('Token Akses') || content.includes('Kode Rahasia Pelacakan'),
      'cek-status page must support inputting token or email'
    );
    assert.ok(
      content.includes('Dokumen Jawaban & Berkas Laporan Resmi PPID'),
      'cek-status page must render official response document card'
    );
    assert.ok(
      content.includes('Unduh Berkas'),
      'cek-status page must provide download links for official documents'
    );
    assert.ok(
      content.includes('Ajukan Keberatan'),
      'cek-status page must offer direct link to file objection when status is selesai'
    );
  });

  it('SEC-FOI-UI-KEBERATAN-01: app/pengajuan-keberatan/page.tsx removes login requirement for citizens and eliminates login buttons', () => {
    const pagePath = path.join(process.cwd(), 'app/pengajuan-keberatan/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes('Layanan Pengajuan Keberatan Informasi Publik') || content.includes('Pengajuan Keberatan Informasi Publik'),
      'pengajuan-keberatan page must inform citizens that objection is open without login barrier'
    );
    assert.equal(
      content.includes('(Tanpa Wajib Login)'),
      false,
      'pengajuan-keberatan page must eliminate redundant (Tanpa Wajib Login) phrase'
    );
    assert.equal(
      content.includes('Perhatian: Wajib Masuk Akun'),
      false,
      'pengajuan-keberatan page must eliminate the restrictive "Wajib Masuk Akun" warning'
    );
    assert.equal(
      content.includes('href="/login"'),
      false,
      'pengajuan-keberatan page must strictly NOT contain any login links or Portal Petugas buttons'
    );
    assert.equal(
      content.includes('Portal Petugas'),
      false,
      'pengajuan-keberatan page must not contain Portal Petugas button'
    );
    assert.ok(content.includes('status_proses !== \'selesai\''), 'Must enforce terminal status check');
  });

  it('SEC-FOI-UI-REGISTER-01: app/register/page.tsx redirects directly to /ajukan-permohonan', () => {
    const pagePath = path.join(process.cwd(), 'app/register/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes("redirect('/ajukan-permohonan')"),
      'register page must redirect directly to /ajukan-permohonan'
    );
  });

  it('SEC-FOI-UI-LOGIN-01: app/login/page.tsx is branded as Portal Petugas & Admin with public citizen guidance', () => {
    const pagePath = path.join(process.cwd(), 'app/login/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf-8');

    assert.ok(
      content.includes('Portal Petugas & Admin PPID'),
      'Login page must be clearly branded for staff/admin'
    );
    assert.ok(
      content.includes('Warga / Pemohon Informasi Publik?'),
      'Login page must guide public citizens that they do not need to log in'
    );
    assert.ok(
      content.includes('/ajukan-permohonan') && content.includes('/cek-status'),
      'Login page must link directly to public permohonan and cek-status pages'
    );
  });
});
