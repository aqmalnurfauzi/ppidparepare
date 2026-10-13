/**
 * Phase 3 Workstream 2 — Private Document Upload & Storage Pipeline Tests
 *
 * Verifies:
 * - ACT-DOC-STATIC-01: Server Action exports 'use server', uses requireAuth/requireVerifiedUser, has safe projection.
 * - ACT-DOC-STATIC-02: User DTO and projection strictly exclude storage_path (confidentiality invariant).
 * - ACT-DOC-STATIC-03: Signed URL TTL is strictly 60 seconds (ephemeral access).
 * - ACT-DOC-STATIC-04: Error sanitization in Server Action normalizes PostgreSQL and storage errors.
 * - ACT-DOC-STATIC-05: Phase 2 Gate B migration 000005 invariants (private bucket, partial unique index, triggers).
 * - ACT-DOC-VAL-01..03: Binary magic-byte validation for PDF, JPEG, and PNG.
 * - ACT-DOC-VAL-04: Spoofed MIME types and text disguises are rejected.
 * - ACT-DOC-VAL-05: Dangerous executables (Windows PE MZ, Linux ELF) are rejected.
 * - ACT-DOC-VAL-06: Shell scripts, PHP scripts, and HTML script tags are rejected.
 * - ACT-DOC-VAL-07: Oversized files exceeding 10 MB limit are rejected.
 * - ACT-DOC-VAL-08: Path traversal in filenames is sanitized to safe basename.
 * - ACT-DOC-SCHEMA-01..04: Zod schemas validate UUIDs and enforce role-based category boundaries.
 * - ACT-DOC-LIVE-01: Anon client cannot access private bucket or insert into dokumen_permohonan.
 * - ACT-DOC-LIVE-02: Authenticated applicant can insert document to their own permohonan.
 * - ACT-DOC-LIVE-03: Cross-user violation rejected (User B cannot insert into User A's permohonan).
 * - ACT-DOC-LIVE-04: KTP quota barrier: partial unique index blocks duplicate KTP per permohonan.
 * - ACT-DOC-LIVE-05: Category barrier: non-admin user cannot upload admin categories.
 * - ACT-DOC-LIVE-06: Immutability trigger guards storage_path and permohonan_id against tampering.
 * - ACT-DOC-LIVE-07: Projections query excludes storage_path in database results.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  DokumenIdSchema,
  DocumentCategorySchema,
  UserDocumentCategorySchema,
  AdminDocumentCategorySchema,
  UploadDokumenInputSchema,
} from '../lib/validations/dokumen.ts';

import {
  detectMagicBytes,
  containsDangerousSignatures,
  sanitizeFilename,
  validateDocumentFile,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_USER_CATEGORIES,
  ALLOWED_ADMIN_CATEGORIES,
  ALL_DOCUMENT_CATEGORIES,
} from '../lib/storage/validation.ts';

import {
  DOKUMEN_USER_COLUMNS,
  DOKUMEN_USER_PROJECTION,
  type DokumenDTO,
  type DokumenSignedUrlDTO,
  type DokumenQuotaStatusDTO,
} from '../types/dokumen.ts';

import {
  serviceClient,
  isConfigured,
  newAnonClient,
  requireStaging,
  createConfirmedUser,
  cleanupTestUsers,
  isNotMigrated,
} from './helpers/gate-a-staging.mjs';

describe('Phase 3 WS2: Static Contracts & Security Boundary Verifications', () => {
  it('ACT-DOC-STATIC-01: Server Action exports use server, authenticates callers, and exposes safe actions', () => {
    assert.ok(fs.existsSync('app/actions/dokumen.ts'), 'app/actions/dokumen.ts must exist');
    const content = fs.readFileSync('app/actions/dokumen.ts', 'utf-8');

    assert.ok(content.startsWith("'use server'"), "File must start with 'use server' directive");
    assert.ok(content.includes('requireAuth'), 'Must import requireAuth');
    assert.ok(content.includes('requireVerifiedUser'), 'Must enforce requireVerifiedUser');
    assert.ok(content.includes('export async function uploadDokumenAction'), 'Must export uploadDokumenAction');
    assert.ok(content.includes('export async function getDokumenSignedUrlAction'), 'Must export getDokumenSignedUrlAction');
    assert.ok(content.includes('export async function listDokumenAction'), 'Must export listDokumenAction');
    assert.ok(content.includes('export async function getDokumenQuotaStatusAction'), 'Must export getDokumenQuotaStatusAction');
  });

  it('ACT-DOC-STATIC-02: Document User DTO strictly excludes storage_path (confidentiality invariant)', () => {
    const userCols = DOKUMEN_USER_COLUMNS as readonly string[];
    assert.equal(userCols.includes('storage_path'), false, 'storage_path must NOT be in DOKUMEN_USER_COLUMNS');
    assert.equal(DOKUMEN_USER_PROJECTION.includes('storage_path'), false, 'storage_path must NOT be in DOKUMEN_USER_PROJECTION');
    assert.equal(DOKUMEN_USER_PROJECTION.includes('*'), false, 'Wildcard (*) is strictly forbidden in projection');
  });

  it('ACT-DOC-STATIC-03: Signed URL TTL is strictly 60 seconds (ephemeral access)', () => {
    const docService = fs.readFileSync('lib/storage/documents.ts', 'utf-8');
    assert.ok(docService.includes('SIGNED_URL_TTL_SECONDS = 60'), 'Signed URL TTL must be 60 seconds');
    assert.ok(docService.includes("PRIVATE_STORAGE_BUCKET = 'permohonan-dokumen'"), 'Must use permohonan-dokumen bucket');
  });

  it('ACT-DOC-STATIC-04: Error sanitization in Server Action maps raw PostgreSQL errors', () => {
    const content = fs.readFileSync('app/actions/dokumen.ts', 'utf-8');
    assert.ok(content.includes('function mapDokumenError'), 'Must define mapDokumenError sanitizer');
    assert.ok(content.includes('QUOTA_EXCEEDED'), 'Must handle QUOTA_EXCEEDED');
    assert.ok(content.includes('INVALID_FILE_TYPE'), 'Must handle INVALID_FILE_TYPE');
    assert.ok(content.includes('FORBIDDEN'), 'Must handle FORBIDDEN');
    assert.ok(content.includes('INTERNAL_ERROR'), 'Must handle INTERNAL_ERROR');
    assert.ok(
      content.includes('Terjadi kesalahan sistem saat memproses dokumen'),
      'Must provide generic safe fallback message'
    );
  });

  it('ACT-DOC-STATIC-05: Phase 2 Gate B migration 000005 invariants (private bucket, partial unique index, triggers, service_role support)', () => {
    const sql = fs.readFileSync(
      'db/migrations/20261007000005_phase2_gate_b_authorization_and_storage.sql',
      'utf-8'
    );
    assert.match(sql, /permohonan-dokumen/);
    assert.match(sql, /public\s*=\s*false/i);
    assert.match(sql, /uq_dokumen_ktp_per_permohonan/);
    assert.match(sql, /check_dokumen_quota_and_role/);
    assert.match(sql, /guard_dokumen_immutable_columns/);
    assert.match(sql, /v_caller_role\s*=\s*'service_role'/);
    assert.match(sql, /v_is_adm\s*:=\s*\(v_caller_role\s*=\s*'service_role'\)\s*OR\s*public\.is_admin\(\)/);
    assert.match(sql, /AS RESTRICTIVE FOR INSERT/);
    assert.match(sql, /AS RESTRICTIVE FOR UPDATE/);
    assert.match(sql, /AS RESTRICTIVE FOR DELETE/);
    assert.match(sql, /AS RESTRICTIVE FOR SELECT/);
    assert.match(sql, /Restrict read access to permohonan-dokumen/);
    assert.match(sql, /PERFORM 1 FROM public\.permohonan WHERE id = NEW\.permohonan_id FOR NO KEY UPDATE;/);
    assert.match(sql, /DROP POLICY IF EXISTS "Users can insert own dokumen or admin insert" ON public\.dokumen_permohonan;/);
    assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.dokumen_permohonan FROM anon, authenticated/);
  });
});

describe('Phase 3 WS2: Binary Inspection & Validation Engine', () => {
  it('ACT-DOC-VAL-01: Valid PDF binary buffer correctly detected and validated', () => {
    const pdfHeader = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35, 0x0a]);
    const detected = detectMagicBytes(pdfHeader);
    assert.equal(detected, 'application/pdf');

    const res = validateDocumentFile({
      buffer: pdfHeader,
      originalFilename: 'ktp_pemohon.pdf',
      declaredMimeType: 'application/pdf',
    });
    assert.equal(res.valid, true);
    assert.equal(res.detectedMime, 'application/pdf');
    assert.equal(res.sanitizedFilename, 'ktp_pemohon.pdf');
  });

  it('ACT-DOC-VAL-02: Valid JPEG binary buffer correctly detected and validated', () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const detected = detectMagicBytes(jpegHeader);
    assert.equal(detected, 'image/jpeg');

    const res = validateDocumentFile({
      buffer: jpegHeader,
      originalFilename: 'foto_ktp.jpg',
      declaredMimeType: 'image/jpeg',
    });
    assert.equal(res.valid, true);
    assert.equal(res.detectedMime, 'image/jpeg');
  });

  it('ACT-DOC-VAL-03: Valid PNG binary buffer correctly detected and validated', () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const detected = detectMagicBytes(pngHeader);
    assert.equal(detected, 'image/png');

    const res = validateDocumentFile({
      buffer: pngHeader,
      originalFilename: 'scan_ktp.png',
      declaredMimeType: 'image/png',
    });
    assert.equal(res.valid, true);
    assert.equal(res.detectedMime, 'image/png');
  });

  it('ACT-DOC-VAL-04: Spoofed file (text renamed to .pdf) fails validation', () => {
    const textBuffer = new TextEncoder().encode('Fake PDF content disguise');
    const detected = detectMagicBytes(textBuffer);
    assert.equal(detected, null, 'Plain text must not match PDF/image binary signature');

    const res = validateDocumentFile({
      buffer: textBuffer,
      originalFilename: 'fake_ktp.pdf',
      declaredMimeType: 'application/pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /magic bytes tidak valid/i);
  });

  it('ACT-DOC-VAL-05: Dangerous executables (Windows PE MZ, Linux ELF) are rejected', () => {
    const exeBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    assert.equal(containsDangerousSignatures(exeBuffer), true);

    const elfBuffer = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    assert.equal(containsDangerousSignatures(elfBuffer), true);

    const res = validateDocumentFile({
      buffer: exeBuffer,
      originalFilename: 'trojan.pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /berbahaya/i);
  });

  it('ACT-DOC-VAL-06: Shell scripts, PHP scripts, and HTML script tags are rejected', () => {
    const scriptBuffer = new TextEncoder().encode('#!/bin/bash\nrm -rf /');
    assert.equal(containsDangerousSignatures(scriptBuffer), true);

    const phpBuffer = new TextEncoder().encode('<?php echo "evil"; ?>');
    assert.equal(containsDangerousSignatures(phpBuffer), true);

    const htmlBuffer = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    assert.equal(containsDangerousSignatures(htmlBuffer), true);
  });

  it('ACT-DOC-VAL-07: Oversized file exceeding 10 MB limit is rejected', () => {
    const oversizedBuffer = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    oversizedBuffer.set([0x25, 0x50, 0x44, 0x46]); // %PDF

    const res = validateDocumentFile({
      buffer: oversizedBuffer,
      originalFilename: 'huge_scan.pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /10 MB/i);
  });

  it('ACT-DOC-VAL-08: Path traversal in filenames is sanitized to safe basename', () => {
    assert.equal(sanitizeFilename('../../../etc/passwd'), 'passwd');
    assert.equal(sanitizeFilename('..\\..\\windows\\cmd.exe'), 'cmd.exe');
    assert.equal(sanitizeFilename('ktp user (1) [scan].pdf'), 'ktp_user__1___scan_.pdf');
  });

  it('ACT-DOC-SCHEMA-01: Zod schema validates UUID parameters', () => {
    const validUuid = '11111111-2222-4111-8111-111111111111';
    assert.equal(DokumenIdSchema.safeParse(validUuid).success, true);
    assert.equal(DokumenIdSchema.safeParse('not-a-uuid').success, false);
    assert.equal(DokumenIdSchema.safeParse('').success, false);
  });

  it('ACT-DOC-SCHEMA-02: Zod schema distinguishes applicant categories vs admin categories', () => {
    assert.equal(UserDocumentCategorySchema.safeParse('identitas_ktp').success, true);
    assert.equal(UserDocumentCategorySchema.safeParse('surat_kuasa').success, true);
    assert.equal(UserDocumentCategorySchema.safeParse('akta_organisasi').success, true);
    assert.equal(UserDocumentCategorySchema.safeParse('dokumen_pendukung').success, true);

    // Admin categories rejected by UserDocumentCategorySchema
    assert.equal(UserDocumentCategorySchema.safeParse('bukti_penerimaan').success, false);
    assert.equal(UserDocumentCategorySchema.safeParse('dokumen_jawaban').success, false);

    // Admin schema accepts admin categories
    assert.equal(AdminDocumentCategorySchema.safeParse('bukti_penerimaan').success, true);
    assert.equal(AdminDocumentCategorySchema.safeParse('dokumen_jawaban').success, true);
    assert.equal(AdminDocumentCategorySchema.safeParse('identitas_ktp').success, false);
  });

  it('ACT-DOC-SCHEMA-03: UploadDokumenInputSchema enforces permohonanId and kategori bounds', () => {
    const validPayload = {
      permohonanId: '11111111-2222-4111-8111-111111111111',
      kategori: 'identitas_ktp',
    };
    assert.equal(UploadDokumenInputSchema.safeParse(validPayload).success, true);

    const invalidCategory = {
      permohonanId: '11111111-2222-4111-8111-111111111111',
      kategori: 'hacked_category',
    };
    assert.equal(UploadDokumenInputSchema.safeParse(invalidCategory).success, false);
  });
});

describe('Phase 3 WS2: Live Staging Private Storage & Security Barrier Tests', () => {
  let applicantA: any = null;
  let applicantB: any = null;
  let adminUser: any = null;
  let permohonanAId: string | null = null;
  let isMigrated000005 = false;

  before(async () => {
    if (!isConfigured) return;

    applicantA = await createConfirmedUser('user');
    applicantB = await createConfirmedUser('user');
    adminUser = await createConfirmedUser('admin');

    // Create a permohonan for applicant A via RPC
    const { data: permA, error: permErr } = await applicantA.client.rpc('create_permohonan', {
      p_nama_pemohon: 'Applicant Document Test A',
      p_kebutuhan: 'Document Upload Testing Permohonan',
    });

    if (!permErr && permA) {
      const created = Array.isArray(permA) ? permA[0] : permA;
      permohonanAId = created.id;
    }

    // Probe whether migration 000005 triggers / partial unique index are active on staging DB
    if (permohonanAId) {
      const probePath = `${permohonanAId}/probe_${Date.now()}.pdf`;
      const { error: probeErr } = await applicantA.client.from('dokumen_permohonan').insert({
        permohonan_id: permohonanAId,
        kategori_dokumen: 'bukti_penerimaan', // admin category - blocked by trigger in 000005
        storage_path: probePath,
        original_filename: 'probe.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 1024,
      });

      if (!probeErr) {
        // Migration 000005 trigger is not installed on staging database
        isMigrated000005 = false;
        await serviceClient?.from('dokumen_permohonan').delete().eq('storage_path', probePath);
      } else {
        isMigrated000005 = true;
      }
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
    if (!permohonanAId) {
      requireStaging(t, 'Permohonan fixture could not be created on staging DB');
      return false;
    }
    return true;
  }

  function guardMigration000005(t: any): boolean {
    if (!guard(t)) return false;
    if (!isMigrated000005) {
      requireStaging(
        t,
        'Migration 20261007000005_phase2_gate_b_authorization_and_storage.sql not yet executed in Supabase Dashboard SQL Editor'
      );
      return false;
    }
    return true;
  }

  it('ACT-DOC-LIVE-01: Anon client cannot access private bucket or insert into dokumen_permohonan', async (t) => {
    if (!guard(t)) return;
    const anon = newAnonClient();

    // 1. Direct storage upload attempt
    const { error: storageErr } = await anon.storage
      .from('permohonan-dokumen')
      .upload('unauthorized.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46]));
    assert.ok(storageErr !== null, 'Anon client was able to upload to private storage bucket!');

    // 2. Direct database insert attempt
    const { error: dbErr } = await anon.from('dokumen_permohonan').insert({
      permohonan_id: permohonanAId,
      kategori_dokumen: 'identitas_ktp',
      storage_path: 'anon/test.pdf',
      original_filename: 'anon.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024,
    });
    assert.ok(dbErr !== null, 'Anon client was able to insert into dokumen_permohonan!');
  });

  it('ACT-DOC-LIVE-02: Direct client insert by authenticated applicant is blocked by DCL, fixture created via serviceClient', async (t) => {
    if (!guard(t)) return;

    // 1. Verify direct client insert by authenticated applicant is rejected with 42501
    const { error: directErr } = await applicantA.client
      .from('dokumen_permohonan')
      .insert({
        permohonan_id: permohonanAId,
        kategori_dokumen: 'identitas_ktp',
        storage_path: `${permohonanAId}/ktp_test.pdf`,
        original_filename: 'ktp_applicant_a.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 2048,
      });

    assert.ok(directErr !== null, 'Direct client insert should be denied by table privileges');
    assert.equal(directErr.code, '42501', `Expected 42501 permission denied, got: ${directErr.code}`);
    assert.match(directErr.message.toLowerCase(), /permission denied for table dokumen_permohonan/);

    // 2. Upload physical file fixture to private storage bucket via serviceClient
    await serviceClient?.storage
      .from('permohonan-dokumen')
      .upload(`${permohonanAId}/ktp_test.pdf`, new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
        contentType: 'application/pdf',
        upsert: true,
      });

    // 3. Insert valid document fixture via serviceClient (representing backend Server Action mediation)
    const { data: fixtureData, error: fixtureErr } = await serviceClient!
      .from('dokumen_permohonan')
      .insert({
        permohonan_id: permohonanAId,
        kategori_dokumen: 'identitas_ktp',
        storage_path: `${permohonanAId}/ktp_test.pdf`,
        original_filename: 'ktp_applicant_a.pdf',
        mime_type: 'application/pdf',
        file_size_bytes: 2048,
      })
      .select(DOKUMEN_USER_PROJECTION)
      .single();

    assert.equal(fixtureErr, null, fixtureErr?.message);
    assert.ok(fixtureData, 'Document fixture data must be returned');
    const created = fixtureData as Record<string, any>;
    assert.ok(created.id, 'Document ID must be generated');
    assert.equal(created.kategori_dokumen, 'identitas_ktp');
  });

  it('ACT-DOC-LIVE-03: Cross-user violation rejected (User B cannot insert into User A permohonan)', async (t) => {
    if (!guard(t)) return;

    const { error } = await applicantB.client.from('dokumen_permohonan').insert({
      permohonan_id: permohonanAId, // belongs to applicant A!
      kategori_dokumen: 'dokumen_pendukung',
      storage_path: `${permohonanAId}/idor_attack.pdf`,
      original_filename: 'idor.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024,
    });

    assert.ok(error !== null, 'IDOR: User B was able to insert document into User A permohonan!');
    assert.equal(error!.code, '42501', `Expected 42501 permission denied, got ${error!.code}`);
    assert.match(error!.message.toLowerCase(), /permission denied for table dokumen_permohonan/);
  });

  it('ACT-DOC-LIVE-04: KTP quota barrier: partial unique index blocks second KTP per permohonan', async (t) => {
    if (!guardMigration000005(t)) return;

    // Applicant A already has one KTP inserted in ACT-DOC-LIVE-02.
    // Attempting a second KTP on the same permohonan via backend serviceClient
    // must trigger uq_dokumen_ktp_per_permohonan regardless of caller privilege.
    const { error } = await serviceClient!.from('dokumen_permohonan').insert({
      permohonan_id: permohonanAId,
      kategori_dokumen: 'identitas_ktp',
      storage_path: `${permohonanAId}/ktp_duplicate.pdf`,
      original_filename: 'second_ktp.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024,
    });

    assert.ok(error !== null, 'Duplicate KTP was accepted!');
    assert.equal(error!.code, '23505', `Expected 23505 unique constraint violation, got ${error!.code}`);
    assert.match(
      error!.message.toLowerCase(),
      /uq_dokumen_ktp_per_permohonan|unique constraint|duplicate key/
    );
  });

  it('ACT-DOC-LIVE-05: Category barrier: non-admin user cannot upload admin categories', async (t) => {
    if (!guardMigration000005(t)) return;

    // 1. Verify direct client insert of admin category is blocked by DCL table privileges (42501)
    const { error } = await applicantA.client.from('dokumen_permohonan').insert({
      permohonan_id: permohonanAId,
      kategori_dokumen: 'bukti_penerimaan', // admin category!
      storage_path: `${permohonanAId}/spoofed_bukti.pdf`,
      original_filename: 'bukti.pdf',
      mime_type: 'application/pdf',
      file_size_bytes: 1024,
    });

    assert.ok(error !== null, 'Non-admin user was able to insert admin document category!');
    assert.equal(error!.code, '42501', `Expected 42501 permission denied, got ${error!.code}`);
    assert.match(error!.message.toLowerCase(), /permission denied for table dokumen_permohonan/);
  });

  it('ACT-DOC-LIVE-06: Immutability trigger guards storage_path and permohonan_id against tampering', async (t) => {
    if (!guardMigration000005(t)) return;

    // Fetch existing doc of applicant A
    const { data: doc } = await applicantA.client
      .from('dokumen_permohonan')
      .select('id')
      .eq('permohonan_id', permohonanAId)
      .limit(1)
      .single();

    assert.ok(doc, 'Existing document row required');
    assert.ok(doc.id, 'Existing document row ID required');

    // 1. Attempt direct UPDATE by authenticated client (blocked by REVOKE UPDATE)
    const { error: clientUpdateErr } = await applicantA.client
      .from('dokumen_permohonan')
      .update({ storage_path: 'tampered/new_path.pdf' })
      .eq('id', doc.id);

    assert.ok(clientUpdateErr !== null, 'Tampering with storage_path by client was permitted!');
    assert.equal(clientUpdateErr.code, '42501');

    // 2. Attempt UPDATE by serviceClient (triggers trg_guard_dokumen_immutable)
    const { error: serviceUpdateErr } = await serviceClient!
      .from('dokumen_permohonan')
      .update({ storage_path: 'tampered/service_path.pdf' })
      .eq('id', doc.id);

    assert.ok(serviceUpdateErr !== null, 'Tampering with storage_path via serviceClient was permitted!');
    assert.match(
      serviceUpdateErr.message,
      /storage_path pada dokumen_permohonan bersifat immutable/
    );
  });

  it('ACT-DOC-LIVE-07: Projections query excludes storage_path in database results', async (t) => {
    if (!guard(t)) return;

    const { data, error } = await applicantA.client
      .from('dokumen_permohonan')
      .select(DOKUMEN_USER_PROJECTION)
      .eq('permohonan_id', permohonanAId);

    assert.equal(error, null);
    assert.ok(Array.isArray(data) && data.length > 0, 'Must return at least one document');

    const firstDoc = data[0] as Record<string, unknown>;
    assert.equal(
      'storage_path' in firstDoc,
      false,
      'CRITICAL LEAK: storage_path returned in query results!'
    );
    assert.ok(firstDoc.id, 'Document ID present');
    assert.ok(firstDoc.original_filename, 'Original filename present');
    assert.ok(firstDoc.mime_type, 'MIME type present');
    assert.ok(firstDoc.created_at, 'Created at present');
  });

  it('ACT-DOC-LIVE-08: Storage RLS barrier: cross-user download of permohonan-dokumen objects is rejected', async (t) => {
    if (!guardMigration000005(t)) return;

    // Applicant B attempts to download an object belonging to Applicant A directly from private storage
    const { data, error } = await applicantB.client.storage
      .from('permohonan-dokumen')
      .download(`${permohonanAId}/ktp_test.pdf`);

    assert.ok(error !== null || !data, 'Cross-user storage download must be blocked by RLS');
  });
});
