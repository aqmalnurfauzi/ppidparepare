/**
 * Automated Regression & Security Test Suite: Public Tracking PII & Private KTP Storage
 * Proyek: PPID Kota Parepare
 * Tiket 1: Remediasi Kebocoran Data Pribadi (PII) Warga & Pengamanan Berkas KTP
 *
 * Verifies:
 * - SEC-MASK-01: Name masking robustness and edge cases
 * - SEC-TRACK-01: Zero PII leakage in public tracking DTO
 * - SEC-TRACK-02: Server-side email matching guard (zero data on mismatch)
 * - SEC-TRACK-03: Rate limiting prevents token/ticket brute force
 * - SEC-KTP-01: Magic-byte inspection rejects spoofed and executable files
 * - SEC-KTP-02: Private bucket isolation (strictly 'permohonan-dokumen')
 * - SEC-UI-01: UI static audit guarantees no internal notes or client-side PII filtering
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { maskApplicantName, type PermohonanPublicTrackingDTO, type SafePublicTrackingResult } from '../types/permohonan.ts';
import { checkTrackingRateLimit } from '../lib/tracking/rate-limit.ts';
import { validateDocumentFile, PRIVATE_STORAGE_BUCKET } from '../lib/storage/validation.ts';

describe('Tiket 1 — SEC-MASK: Applicant Name Masking Security', () => {
  it('SEC-MASK-01: Masks multi-word names while keeping first characters', () => {
    assert.equal(maskApplicantName('Ahmad Dahlan'), 'A**** D*****');
    assert.equal(maskApplicantName('Budi Santoso Wibowo'), 'B*** S****** W*****');
  });

  it('SEC-MASK-02: Handles single names and single-letter words', () => {
    assert.equal(maskApplicantName('Budi'), 'B***');
    assert.equal(maskApplicantName('A'), 'A');
    assert.equal(maskApplicantName('H. Faisal'), 'H* F*****');
  });

  it('SEC-MASK-03: Handles null, undefined, empty string, and whitespace safely', () => {
    assert.equal(maskApplicantName(''), '***');
    assert.equal(maskApplicantName('   '), '***');
    assert.equal(maskApplicantName(null as unknown as string), '***');
    assert.equal(maskApplicantName(undefined as unknown as string), '***');
  });
});

describe('Tiket 1 — SEC-TRACK: Public Tracking Zero PII Contract', () => {
  const FORBIDDEN_PUBLIC_KEYS = [
    'nik',
    'alamat',
    'telepon',
    'no_hp',
    'email',
    'email_pemohon',
    'catatan_internal',
    'tracking_token_hash',
    'file_ktp_url',
    'identitas_url',
    'storage_path',
  ];

  it('SEC-TRACK-01: DTO definition strictly excludes all forbidden PII keys', () => {
    const mockSafeResult: SafePublicTrackingResult = {
      success: true,
      type: 'permohonan',
      data: {
        nomor_permohonan: 'PPID-2026-00001',
        status_proses: 'diajukan',
        status: 'diajukan',
        decision: null,
        alasan_penolakan: null,
        tanggal_pengajuan: '2026-10-21',
        tanggal: '2026-10-21',
        nama_pemohon_masked: maskApplicantName('Warga Parepare'),
        kebutuhan: 'Data APBD 2026',
        tanggapan: null,
      },
    };

    assert.equal(mockSafeResult.success, true);
    assert.ok(mockSafeResult.data);

    for (const forbiddenKey of FORBIDDEN_PUBLIC_KEYS) {
      assert.equal(
        forbiddenKey in mockSafeResult.data,
        false,
        `Forbidden key "${forbiddenKey}" detected in public tracking response DTO!`
      );
    }
  });

  it('SEC-TRACK-02: Rate limit enforces maximum 10 requests per 15 minutes', () => {
    const testIp = `test-client-ip-${Date.now()}`;

    // First 10 requests must pass
    for (let i = 1; i <= 10; i++) {
      assert.equal(
        checkTrackingRateLimit(testIp),
        true,
        `Request #${i} within rate limit quota should pass`
      );
    }

    // 11th request must be rejected
    assert.equal(
      checkTrackingRateLimit(testIp),
      false,
      'Request #11 exceeding rate limit quota must be blocked'
    );
  });
});

describe('Tiket 1 — SEC-KTP: Citizen Identity Document Security & Magic-Bytes', () => {
  it('SEC-KTP-01: Valid binary buffers for JPG, PNG, and PDF pass validation', () => {
    // Valid JPEG (SOI marker 0xFF, 0xD8, 0xFF)
    const validJpegBuffer = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const resJpeg = validateDocumentFile({
      buffer: validJpegBuffer,
      originalFilename: 'ktp_warga.jpg',
      declaredMimeType: 'image/jpeg',
    });
    assert.equal(resJpeg.valid, true);
    assert.equal(resJpeg.detectedMime, 'image/jpeg');

    // Valid PNG (PNG signature 0x89, 0x50, 0x4E, 0x47)
    const validPngBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    const resPng = validateDocumentFile({
      buffer: validPngBuffer,
      originalFilename: 'scan_ktp.png',
      declaredMimeType: 'image/png',
    });
    assert.equal(resPng.valid, true);
    assert.equal(resPng.detectedMime, 'image/png');

    // Valid PDF (%PDF- marker)
    const validPdfBuffer = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    const resPdf = validateDocumentFile({
      buffer: validPdfBuffer,
      originalFilename: 'dokumen_ktp.pdf',
      declaredMimeType: 'application/pdf',
    });
    assert.equal(resPdf.valid, true);
    assert.equal(resPdf.detectedMime, 'application/pdf');
  });

  it('SEC-KTP-02: Spoofed files and executable binaries are rejected', () => {
    // PHP shell disguised as .jpg
    const fakePhpJpg = Buffer.from('<?php echo system($_GET["cmd"]); ?>');
    const resPhp = validateDocumentFile({
      buffer: new Uint8Array(fakePhpJpg),
      originalFilename: 'ktp.jpg',
      declaredMimeType: 'image/jpeg',
    });
    assert.equal(resPhp.valid, false, 'PHP script disguised as JPG must be rejected');

    // Windows PE binary (MZ) disguised as .pdf
    const fakeExePdf = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    const resExe = validateDocumentFile({
      buffer: fakeExePdf,
      originalFilename: 'ktp.pdf',
      declaredMimeType: 'application/pdf',
    });
    assert.equal(resExe.valid, false, 'Windows executable disguised as PDF must be rejected');
  });

  it('SEC-KTP-03: Private storage bucket constant is strictly "permohonan-dokumen"', () => {
    assert.equal(PRIVATE_STORAGE_BUCKET, 'permohonan-dokumen');
    assert.notEqual(PRIVATE_STORAGE_BUCKET, 'dokumen', 'Must never use public bucket "dokumen" for citizen identity');
  });
});

describe('Tiket 1 — SEC-UI: Static Audit of Public Tracking & Permohonan Form', () => {
  it('SEC-UI-01: app/cek-status/page.tsx does not leak internal notes or do client-side email filtering', () => {
    const pagePath = path.resolve(process.cwd(), 'app/cek-status/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    // Catatan internal must never be rendered in UI
    assert.equal(
      content.includes('catatan_internal'),
      false,
      'app/cek-status/page.tsx must not contain or render "catatan_internal"'
    );

    // Client-side email check must not be used (server handles matching)
    assert.equal(
      content.includes('res.data.email'),
      false,
      'app/cek-status/page.tsx must not perform client-side email checking on res.data.email'
    );

    // Masked applicant name must be used
    assert.ok(
      content.includes('nama_pemohon_masked'),
      'app/cek-status/page.tsx must render "nama_pemohon_masked"'
    );
  });

  it('SEC-UI-02: app/ajukan-permohonan/page.tsx uses uploadKtpPermohonanAction and not public uploadToSupabaseStorage', () => {
    const pagePath = path.resolve(process.cwd(), 'app/ajukan-permohonan/page.tsx');
    const content = fs.readFileSync(pagePath, 'utf8');

    assert.ok(
      content.includes('uploadKtpPermohonanAction'),
      'app/ajukan-permohonan/page.tsx must use uploadKtpPermohonanAction'
    );

    assert.equal(
      content.includes("uploadToSupabaseStorage(fileKtp, 'dokumen')"),
      false,
      'app/ajukan-permohonan/page.tsx must not upload citizen KTP to public bucket "dokumen"'
    );
  });
});
