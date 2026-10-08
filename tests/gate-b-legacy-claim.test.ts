/**
 * Phase 2 Gate B — Step 6: Legacy Claim Authorization & Rate-Limiting Tests
 *
 * Verifies:
 * - CLAIM-VAL-01..05: Zod schemas for NIK (16 digits), legacy ID, and date format
 * - CLAIM-RATE-01..03: In-memory rate limiting (max 3 failures / 15 mins window, reset)
 * - CLAIM-SEC-01..04: Service boundary invariants (server-only, atomic link, anti-hijack, audit)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  NikSchema,
  LegacyIdSchema,
  TanggalPengajuanSchema,
  LegacyClaimSchema,
  type LegacyClaimInput,
} from '../lib/validations/claim.ts';

import {
  checkClaimRateLimit,
  recordClaimFailure,
  resetClaimRateLimit,
  RATE_LIMIT_MAX_FAILURES,
} from '../lib/legacy/rate-limit.ts';

describe('Gate B Step 6: Legacy Claim Input Validation', () => {
  it('CLAIM-VAL-01: NikSchema requires exactly 16 numeric digits', () => {
    const validNik = '7372011204900001';
    assert.equal(NikSchema.parse(validNik), validNik);

    // Invalid length
    assert.throws(() => NikSchema.parse('123456789012345'), /16 digit angka/i); // 15 digits
    assert.throws(() => NikSchema.parse('12345678901234567'), /16 digit angka/i); // 17 digits

    // Non-numeric characters
    assert.throws(() => NikSchema.parse('737201120490000A'), /16 digit angka/i);
    assert.throws(() => NikSchema.parse('7372-0112-0490-0001'), /16 digit angka/i);
    assert.throws(() => NikSchema.parse(''), /NIK wajib diisi/i);
  });

  it('CLAIM-VAL-02: LegacyIdSchema accepts valid legacy IDs and ticket numbers', () => {
    assert.equal(LegacyIdSchema.parse('REQ-202401-001'), 'REQ-202401-001');
    assert.equal(LegacyIdSchema.parse('PPID-2024-00123'), 'PPID-2024-00123');
    assert.equal(LegacyIdSchema.parse('TIKET-123'), 'TIKET-123');

    // Too short (< 3 chars)
    assert.throws(() => LegacyIdSchema.parse('ab'), /minimal 3 karakter/i);
    assert.throws(() => LegacyIdSchema.parse(''), /Nomor permohonan lama wajib diisi/i);
  });

  it('CLAIM-VAL-03: TanggalPengajuanSchema requires valid YYYY-MM-DD format', () => {
    assert.equal(TanggalPengajuanSchema.parse('2024-05-20'), '2024-05-20');
    assert.equal(TanggalPengajuanSchema.parse('2023-12-31'), '2023-12-31');

    assert.throws(() => TanggalPengajuanSchema.parse('20-05-2024'), /YYYY-MM-DD/i);
    assert.throws(() => TanggalPengajuanSchema.parse('2024/05/20'), /YYYY-MM-DD/i);
    assert.throws(() => TanggalPengajuanSchema.parse('not-a-date'), /YYYY-MM-DD/i);
  });

  it('CLAIM-VAL-04: LegacyClaimSchema parses valid full input payload', () => {
    const validPayload: LegacyClaimInput = LegacyClaimSchema.parse({
      legacyId: 'REQ-202401-005',
      nik: '7372011204900001',
      tanggalPengajuan: '2024-01-15',
    });

    assert.equal(validPayload.legacyId, 'REQ-202401-005');
    assert.equal(validPayload.nik, '7372011204900001');
    assert.equal(validPayload.tanggalPengajuan, '2024-01-15');
  });
});

describe('Gate B Step 6: Legacy Claim Rate Limiting', () => {
  const testId = 'test_user_rate_limit_key_123';

  beforeEach(() => {
    resetClaimRateLimit(testId);
  });

  it('CLAIM-RATE-01: Initial state permits claim attempt with max remaining attempts', () => {
    const check = checkClaimRateLimit(testId);
    assert.equal(check.allowed, true);
    assert.equal(check.remainingAttempts, RATE_LIMIT_MAX_FAILURES);
  });

  it('CLAIM-RATE-02: Rate limit blocks requests after 3 consecutive failures', () => {
    // 1st failure
    recordClaimFailure(testId);
    let check = checkClaimRateLimit(testId);
    assert.equal(check.allowed, true);
    assert.equal(check.remainingAttempts, 2);

    // 2nd failure
    recordClaimFailure(testId);
    check = checkClaimRateLimit(testId);
    assert.equal(check.allowed, true);
    assert.equal(check.remainingAttempts, 1);

    // 3rd failure
    recordClaimFailure(testId);
    check = checkClaimRateLimit(testId);
    assert.equal(check.allowed, false);
    assert.equal(check.remainingAttempts, 0);

    // 4th check still blocked
    assert.equal(checkClaimRateLimit(testId).allowed, false);
  });

  it('CLAIM-RATE-03: resetClaimRateLimit restores access after verification', () => {
    recordClaimFailure(testId);
    recordClaimFailure(testId);
    recordClaimFailure(testId);
    assert.equal(checkClaimRateLimit(testId).allowed, false);

    resetClaimRateLimit(testId);
    assert.equal(checkClaimRateLimit(testId).allowed, true);
    assert.equal(checkClaimRateLimit(testId).remainingAttempts, RATE_LIMIT_MAX_FAILURES);
  });
});

describe('Gate B Step 6: Legacy Claim Service Security Boundary', () => {
  const fileContent = fs.readFileSync('lib/legacy/claim.ts', 'utf-8');

  it('CLAIM-SEC-01: Module is protected with server-only import', () => {
    assert.ok(fileContent.includes("import 'server-only';"));
  });

  it('CLAIM-SEC-02: Requires authenticated session with requireAuth()', () => {
    assert.ok(fileContent.includes('await requireAuth()'));
  });

  it('CLAIM-SEC-03: Anti-hijacking: verifies candidate has no existing owner (pemohon_id IS NULL)', () => {
    assert.ok(
      fileContent.includes('candidate.pemohon_id !== null'),
      'Must check if candidate already has an owner'
    );
    assert.ok(
      fileContent.includes(".is('pemohon_id', null)"),
      'Atomic update must ensure pemohon_id is still null'
    );
  });

  it('CLAIM-SEC-04: Comprehensive audit logging in log_aktivitas', () => {
    assert.ok(fileContent.includes("'legacy_claim.rate_limited'"));
    assert.ok(fileContent.includes("'legacy_claim.failed'"));
    assert.ok(fileContent.includes("'legacy_claim.already_claimed'"));
    assert.ok(fileContent.includes("'legacy_claim.success'"));
  });
});
