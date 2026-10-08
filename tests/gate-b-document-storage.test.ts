/**
 * Phase 2 Gate B — Step 2: Document Authorization, Quota & Private Storage Tests
 *
 * Verifies:
 * - DOC-VAL-01..08: Magic-byte inspection, file size bounds, dangerous signature blocking
 * - DOC-QUOTA-01..03: KTP quota (1) and supporting document quota (5) enforcement
 * - DOC-AUTHZ-01..04: Role categories, ownership validation, signed URL 60s TTL
 * - DOC-DB-01..05: Migration 000005 SQL invariants (private bucket, unique partial index, triggers)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

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

describe('Gate B Step 2: Document Magic-Byte & Security Validation', () => {
  it('DOC-VAL-01: Valid PDF binary buffer correctly detected and validated', () => {
    // Standard PDF header %PDF-1.5
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

  it('DOC-VAL-02: Valid JPEG binary buffer correctly detected and validated', () => {
    // Standard JPEG header FF D8 FF E0
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

  it('DOC-VAL-03: Valid PNG binary buffer correctly detected and validated', () => {
    // Standard PNG header 89 50 4E 47 0D 0A 1A 0A
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

  it('DOC-VAL-04: Spoofed file (text file renamed to .pdf) fails validation', () => {
    const textBuffer = new TextEncoder().encode('This is just a text file claiming to be pdf');
    const detected = detectMagicBytes(textBuffer);
    assert.equal(detected, null, 'Plain text should not match any binary image/pdf signature');

    const res = validateDocumentFile({
      buffer: textBuffer,
      originalFilename: 'fake_document.pdf',
      declaredMimeType: 'application/pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /magic bytes tidak valid/i);
  });

  it('DOC-VAL-05: Windows PE (MZ) and Linux ELF binaries are rejected', () => {
    // MZ header
    const exeBuffer = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00]);
    assert.equal(containsDangerousSignatures(exeBuffer), true);

    // ELF header
    const elfBuffer = new Uint8Array([0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01]);
    assert.equal(containsDangerousSignatures(elfBuffer), true);

    const res = validateDocumentFile({
      buffer: exeBuffer,
      originalFilename: 'malware.pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /berbahaya/i);
  });

  it('DOC-VAL-06: Shell scripts and embedded script tags are rejected', () => {
    const scriptBuffer = new TextEncoder().encode('#!/bin/bash\nrm -rf /');
    assert.equal(containsDangerousSignatures(scriptBuffer), true);

    const htmlScriptBuffer = new TextEncoder().encode('<html><script>alert("xss")</script></html>');
    assert.equal(containsDangerousSignatures(htmlScriptBuffer), true);
  });

  it('DOC-VAL-07: File exceeding 10 MB limit is rejected', () => {
    // Fake buffer representation of size
    const oversizedBuffer = new Uint8Array(MAX_FILE_SIZE_BYTES + 1);
    oversizedBuffer.set([0x25, 0x50, 0x44, 0x46]); // starts with %PDF

    const res = validateDocumentFile({
      buffer: oversizedBuffer,
      originalFilename: 'huge.pdf',
    });
    assert.equal(res.valid, false);
    assert.match(res.error || '', /10 MB/i);
  });

  it('DOC-VAL-08: Path traversal in filenames is sanitized', () => {
    assert.equal(sanitizeFilename('../../../etc/passwd'), 'passwd');
    assert.equal(sanitizeFilename('..\\..\\windows\\system32\\cmd.exe'), 'cmd.exe');
    assert.equal(sanitizeFilename('my file (1) [copy].pdf'), 'my_file__1___copy_.pdf');
  });
});

describe('Gate B Step 2: Quota & Category Invariants', () => {
  it('DOC-QUOTA-01: Category allowlists match security requirements', () => {
    assert.deepEqual([...ALLOWED_USER_CATEGORIES].sort(), [
      'akta_organisasi',
      'dokumen_pendukung',
      'identitas_ktp',
      'surat_kuasa',
    ]);
    assert.deepEqual([...ALLOWED_ADMIN_CATEGORIES].sort(), [
      'bukti_penerimaan',
      'dokumen_jawaban',
    ]);
    assert.equal(ALL_DOCUMENT_CATEGORIES.length, 6);
  });

  it('DOC-QUOTA-02: Document User DTO strictly excludes storage_path', () => {
    const userCols = DOKUMEN_USER_COLUMNS as readonly string[];
    assert.equal(
      userCols.includes('storage_path'),
      false,
      'CRITICAL LEAK: storage_path must NOT be in DOKUMEN_USER_COLUMNS'
    );
    assert.equal(
      DOKUMEN_USER_PROJECTION.includes('storage_path'),
      false,
      'CRITICAL LEAK: storage_path present in DOKUMEN_USER_PROJECTION'
    );
    assert.equal(
      DOKUMEN_USER_PROJECTION.includes('*'),
      false,
      'Wildcard (*) is forbidden in DOKUMEN_USER_PROJECTION'
    );
  });

  it('DOC-QUOTA-03: Signed URL TTL is strictly 60 seconds', async () => {
    const fs = await import('node:fs');
    const content = fs.readFileSync('lib/storage/documents.ts', 'utf-8');
    assert.ok(content.includes('SIGNED_URL_TTL_SECONDS = 60'));
    assert.ok(content.includes("import 'server-only';"));
  });
});

describe('Gate B Step 2: Migration 000005 SQL Static Inspection', () => {
  const sql = fs.readFileSync(
    'db/migrations/20261007000005_phase2_gate_b_authorization_and_storage.sql',
    'utf-8'
  );

  it('DOC-DB-01: Storage bucket permohonan-dokumen is private with 10MB limit', () => {
    assert.match(sql, /permohonan-dokumen/);
    assert.match(sql, /public\s*=\s*false/i);
    assert.match(sql, /10485760/);
    assert.match(sql, /application\/pdf/);
    assert.match(sql, /image\/jpeg/);
    assert.match(sql, /image\/png/);
  });

  it('DOC-DB-02: Legacy bucket dokumen is restricted to private', () => {
    assert.match(sql, /UPDATE storage\.buckets\s+SET public\s*=\s*false\s+WHERE id\s*=\s*'dokumen'/);
  });

  it('DOC-DB-03: Partial unique index enforces max 1 KTP per permohonan', () => {
    assert.match(
      sql,
      /CREATE UNIQUE INDEX IF NOT EXISTS uq_dokumen_ktp_per_permohonan\s+ON public\.dokumen_permohonan\(permohonan_id\)\s+WHERE\s+\(kategori_dokumen\s*=\s*'identitas_ktp'\)/
    );
  });

  it('DOC-DB-04: Trigger trg_check_dokumen_quota enforces 5 supporting docs and admin categories', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.check_dokumen_quota_and_role\(\)/);
    assert.match(sql, /v_supporting_count\s*>=\s*5/);
    assert.match(sql, /Batas kuota dokumen pendukung terlampaui/);
    assert.match(sql, /kategori_dokumen IN \('bukti_penerimaan', 'dokumen_jawaban'\) AND NOT v_is_adm/);
  });

  it('DOC-DB-05: Immutability trigger protects permohonan_id and storage_path', () => {
    assert.match(sql, /CREATE OR REPLACE FUNCTION public\.guard_dokumen_immutable_columns\(\)/);
    assert.match(sql, /permohonan_id pada dokumen_permohonan bersifat immutable/);
    assert.match(sql, /storage_path pada dokumen_permohonan bersifat immutable/);
    assert.match(sql, /REVOKE UPDATE, DELETE, TRUNCATE ON public\.dokumen_permohonan FROM anon, authenticated/);
  });
});
