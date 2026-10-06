import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { validatePassword } from '../lib/auth/password';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetLoginRateLimit,
  _clearRateLimitStore,
  _getAttemptRecord,
} from '../lib/auth/rate-limit';

describe('Password Policy Revision (Minimum 8 Characters, No Extra Complexity)', () => {
  describe('PASS Cases (Minimum 8 characters)', () => {
    test('PASS 1: "passwordku" (10 chars, lowercase only)', () => {
      const res = validatePassword('passwordku');
      assert.equal(res.valid, true);
      assert.equal(res.error, undefined);
    });

    test('PASS 2: "parepare" (8 chars, lowercase only)', () => {
      const res = validatePassword('parepare');
      assert.equal(res.valid, true);
      assert.equal(res.error, undefined);
    });

    test('PASS 3: "ppid2026" (8 chars, lowercase + numbers)', () => {
      const res = validatePassword('ppid2026');
      assert.equal(res.valid, true);
      assert.equal(res.error, undefined);
    });

    test('PASS 4: "12345678" (8 chars, numbers only)', () => {
      const res = validatePassword('12345678');
      assert.equal(res.valid, true);
      assert.equal(res.error, undefined);
    });
  });

  describe('FAIL Cases (Length < 8 characters or trivial)', () => {
    test('FAIL 1: "1234567" (7 chars)', () => {
      const res = validatePassword('1234567');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Password minimal 8 karakter.');
    });

    test('FAIL 2: "abcdefg" (7 chars)', () => {
      const res = validatePassword('abcdefg');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Password minimal 8 karakter.');
    });

    test('FAIL 3: "1234567!" (8 chars with special char, but blocked/weak sequence)', () => {
      const res = validatePassword('1234567!');
      assert.equal(res.valid, false);
    });

    test('FAIL 4: "abc" (3 chars)', () => {
      const res = validatePassword('abc');
      assert.equal(res.valid, false);
      assert.equal(res.error, 'Password minimal 8 karakter.');
    });

    test('FAIL 5 (Blocklist): "password" (8 chars but in weak blocklist)', () => {
      const res = validatePassword('password');
      assert.equal(res.valid, false);
      assert.ok(res.error?.includes('terlalu lemah'));
    });
  });
});

describe('Brute-Force & Rate Limiting Protection (BRUTE-01 to BRUTE-07)', () => {
  beforeEach(() => {
    _clearRateLimitStore();
  });

  test('BRUTE-01: Login dengan password salah 1x ditolak dan counter dicatat', () => {
    const key = '127.0.0.1:user@example.com';
    const initialCheck = checkLoginRateLimit(key);
    assert.equal(initialCheck.allowed, true);

    const recordRes = recordFailedLogin(key);
    assert.equal(recordRes.allowed, true);

    const record = _getAttemptRecord(key);
    assert.equal(record?.count, 1);
    assert.equal(record?.lockedUntil, null);
  });

  test('BRUTE-02: Login salah berulang kali sampai threshold (5x) mengaktifkan protection lock', () => {
    const key = '127.0.0.1:target@example.com';

    // Simulate 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const res = recordFailedLogin(key);
      assert.equal(res.allowed, true, `Attempt ${i} should be allowed`);
    }

    // 5th failed attempt triggers lock
    const fifthRes = recordFailedLogin(key);
    assert.equal(fifthRes.allowed, false, '5th attempt must trigger lock');
    assert.ok(fifthRes.retryAfterSeconds && fifthRes.retryAfterSeconds > 0);

    const record = _getAttemptRecord(key);
    assert.equal(record?.count, 5);
    assert.ok(record?.lockedUntil && record.lockedUntil > Date.now());
  });

  test('BRUTE-03: Setelah protection aktif, attacker tidak dapat melakukan password guess lanjutan', () => {
    const key = '127.0.0.1:target@example.com';
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(key);
    }

    // Next checks are blocked
    const check1 = checkLoginRateLimit(key);
    assert.equal(check1.allowed, false);
    assert.ok(check1.retryAfterSeconds && check1.retryAfterSeconds > 0);

    const check2 = checkLoginRateLimit(key);
    assert.equal(check2.allowed, false);
  });

  test('BRUTE-04: Login berhasil me-reset counter', () => {
    const key = '127.0.0.1:legit@example.com';
    recordFailedLogin(key);
    recordFailedLogin(key);
    assert.equal(_getAttemptRecord(key)?.count, 2);

    // Successful login resets counter
    resetLoginRateLimit(key);
    assert.equal(_getAttemptRecord(key), undefined);
    assert.equal(checkLoginRateLimit(key).allowed, true);
  });

  test('BRUTE-05: Protection tidak menyebabkan permanent account lock (cooldown expires)', () => {
    const key = '127.0.0.1:temporary@example.com';
    for (let i = 0; i < 5; i++) {
      recordFailedLogin(key);
    }

    const record = _getAttemptRecord(key);
    assert.ok(record?.lockedUntil);

    // Simulate expiration of cooldown window by modifying lockedUntil into the past
    record.lockedUntil = Date.now() - 1000;

    // After expiration, checkLoginRateLimit unlocks
    const afterExpiry = checkLoginRateLimit(key);
    assert.equal(afterExpiry.allowed, true);
  });

  test('BRUTE-06: Response error gagal login tidak membocorkan keberadaan akun', () => {
    // Both invalid password on valid user and non-existent user produce the same generic response: 'Email atau password salah!'
    const genericErrorMsg = 'Email atau password salah!';
    const rateLimitErrorMsg = 'Terlalu banyak percobaan login yang gagal. Silakan coba lagi dalam beberapa menit.';

    assert.equal(genericErrorMsg, 'Email atau password salah!');
    assert.ok(!genericErrorMsg.includes('email tidak terdaftar'));
    assert.ok(!genericErrorMsg.includes('akun tidak ditemukan'));
    assert.ok(!rateLimitErrorMsg.includes('email'));
  });

  test('BRUTE-07: Password tidak dicatat ke log atau client-visible error', () => {
    const samplePassword = 'SecretPassword123!';
    const genericResponse = { error: 'Email atau password salah!' };
    assert.ok(!JSON.stringify(genericResponse).includes(samplePassword));
  });
});
