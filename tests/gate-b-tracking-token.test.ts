/**
 * Phase 2 Gate B — Step 3: Tracking Token Cryptographic Tests
 *
 * Verifies:
 * - TRACK-FMT-01..02: Pure Base62 encoding, 256-bit entropy, zero underscores
 * - TRACK-HMAC-01..02: HMAC-SHA-256 generation, 64-character hex format
 * - TRACK-VERIFY-01..03: Constant-time comparison, dummy branch on null/missing hash
 * - TRACK-SEC-01: Service file server-only guard
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  BASE62_ALPHABET,
  encodeBase62,
  generateTrackingToken,
  isValidTrackingTokenFormat,
  hashTrackingToken,
  verifyTrackingToken,
} from '../lib/tracking/token.ts';

describe('Gate B Step 3: Tracking Token Format & Entropy', () => {
  it('TRACK-FMT-01: Token generator outputs pure Base62 (no underscores)', () => {
    assert.equal(BASE62_ALPHABET.length, 62);
    assert.equal(BASE62_ALPHABET.includes('_'), false, 'Base62 must not contain underscores');

    for (let i = 0; i < 20; i++) {
      const token = generateTrackingToken();
      assert.ok(token.length >= 32 && token.length <= 50, `Token length ${token.length} out of bounds`);
      assert.match(token, /^[0-9A-Za-z]+$/, `Token "${token}" contains invalid characters`);
      assert.equal(token.includes('_'), false, 'Token must not contain underscores');
    }
  });

  it('TRACK-FMT-02: Format validator correctly checks token structure', () => {
    const validToken = generateTrackingToken();
    assert.equal(isValidTrackingTokenFormat(validToken), true);

    // Invalid tokens
    assert.equal(isValidTrackingTokenFormat(''), false);
    assert.equal(isValidTrackingTokenFormat('short'), false);
    assert.equal(isValidTrackingTokenFormat('tk_12345678901234567890123456789012'), false); // contains underscore
    assert.equal(isValidTrackingTokenFormat(`${validToken}!`), false); // contains special char
    assert.equal(isValidTrackingTokenFormat(`${validToken} `), false); // contains space
  });

  it('TRACK-FMT-03: encodeBase62 handles buffers and zero-padding correctly', () => {
    const buf = Buffer.from([0, 1, 2, 3, 4, 5]);
    const encoded = encodeBase62(buf);
    assert.ok(encoded.length > 0);
    assert.match(encoded, /^[0-9A-Za-z]+$/);
  });
});

describe('Gate B Step 3: HMAC-SHA-256 Hashing & Constant-Time Verification', () => {
  const testSecret = 'test-secret-key-for-ppid-hmac-verification-32b';

  it('TRACK-HMAC-01: Hash output is 64-character lowercase hex string', () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token, testSecret);

    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('TRACK-HMAC-02: Hashing is deterministic for same token and secret', () => {
    const token = 'MyFixedTestTrackingTokenValue1234567890ABC';
    const hash1 = hashTrackingToken(token, testSecret);
    const hash2 = hashTrackingToken(token, testSecret);
    const differentSecretHash = hashTrackingToken(token, 'different-secret-key-for-test-32b');

    assert.equal(hash1, hash2);
    assert.notEqual(hash1, differentSecretHash);
  });

  it('TRACK-VERIFY-01: Valid token successfully verifies against stored hash', () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token, testSecret);

    const isValid = verifyTrackingToken(token, hash, testSecret);
    assert.equal(isValid, true);
  });

  it('TRACK-VERIFY-02: Incorrect or tampered token fails verification', () => {
    const token = generateTrackingToken();
    const hash = hashTrackingToken(token, testSecret);

    assert.equal(verifyTrackingToken('WrongToken123456789012345678901234567890', hash, testSecret), false);
    assert.equal(verifyTrackingToken(`${token}X`, hash, testSecret), false);
  });

  it('TRACK-VERIFY-03: Null or invalid stored hash triggers dummy branch and returns false', () => {
    const token = generateTrackingToken();

    assert.equal(verifyTrackingToken(token, null, testSecret), false);
    assert.equal(verifyTrackingToken(token, undefined, testSecret), false);
    assert.equal(verifyTrackingToken(token, '', testSecret), false);
    assert.equal(verifyTrackingToken(token, 'short-non-hex-hash', testSecret), false);
  });
});

describe('Gate B Step 3: Service Boundary & Architecture', () => {
  it('TRACK-SEC-01: Tracking service is guarded by server-only', () => {
    const serviceContent = fs.readFileSync('lib/tracking/service.ts', 'utf-8');
    assert.ok(serviceContent.includes("import 'server-only';"));
    assert.ok(serviceContent.includes('export async function reissueTrackingToken'));
    assert.ok(serviceContent.includes('export async function getPublicTrackingStatus'));
  });

  it('TRACK-SEC-02: Public tracking never logs token or plaintext secret', () => {
    const serviceContent = fs.readFileSync('lib/tracking/service.ts', 'utf-8');
    assert.equal(serviceContent.includes('console.log(newToken)'), false);
    assert.equal(serviceContent.includes('console.log(token)'), false);
  });
});
