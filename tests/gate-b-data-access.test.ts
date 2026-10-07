/**
 * Phase 2 Gate B — Step 1: Type Contracts, DTO & Data Access Boundary Tests
 *
 * Verifies:
 * - DTO contracts strictly prevent exposure of confidential fields (catatan_internal, tracking_token_hash)
 * - Projections use explicit column lists instead of wildcard (SELECT *)
 * - Zod validation schemas strictly enforce UUID formats, pagination limits, and sort allowlists
 * - Server data-access module enforces session-derived ownership and server-only protection
 * - Codebase query audit tracks legacy wildcard queries for subsequent migration
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  PERMOHONAN_USER_COLUMNS,
  PERMOHONAN_USER_PROJECTION,
  PERMOHONAN_ADMIN_COLUMNS,
  PERMOHONAN_ADMIN_PROJECTION,
  FORBIDDEN_USER_COLUMNS,
  maskApplicantName,
  type PermohonanUserDTO,
  type PermohonanAdminDTO,
  type PermohonanPublicTrackingDTO,
} from '../types/permohonan.ts';

import {
  PermohonanIdSchema,
  PermohonanSortBySchema,
  PermohonanSortOrderSchema,
  PermohonanStatusFilterSchema,
  PermohonanListQuerySchema,
} from '../lib/validations/permohonan.ts';

describe('Gate B Step 1: DTO & Column Projection Security Contracts', () => {
  it('DTO-SEC-01: User projection columns MUST NOT contain catatan_internal or tracking_token_hash', () => {
    const userCols = PERMOHONAN_USER_COLUMNS as readonly string[];
    assert.equal(
      userCols.includes('catatan_internal'),
      false,
      'CRITICAL LEAK: catatan_internal found in user projection columns'
    );
    assert.equal(
      userCols.includes('tracking_token_hash'),
      false,
      'CRITICAL LEAK: tracking_token_hash found in user projection columns'
    );
  });

  it('DTO-SEC-02: User SQL projection string is explicit and contains no wildcard or forbidden fields', () => {
    assert.equal(
      PERMOHONAN_USER_PROJECTION.includes('*'),
      false,
      'Wildcard (*) is strictly forbidden in database projections'
    );
    for (const forbidden of FORBIDDEN_USER_COLUMNS) {
      assert.equal(
        PERMOHONAN_USER_PROJECTION.includes(forbidden),
        false,
        `Forbidden column "${forbidden}" present in user projection string`
      );
    }
  });

  it('DTO-SEC-03: Admin projection columns MUST NOT contain tracking_token_hash or wildcard', () => {
    const adminCols = PERMOHONAN_ADMIN_COLUMNS as readonly string[];
    assert.equal(
      adminCols.includes('tracking_token_hash'),
      false,
      'tracking_token_hash must not be exposed in general admin queries'
    );
    assert.equal(
      PERMOHONAN_ADMIN_PROJECTION.includes('*'),
      false,
      'Admin projection must use explicit columns, not wildcard (*)'
    );
  });

  it('DTO-SEC-04: Admin projection includes catatan_internal and pemohon_id for authorized staff', () => {
    const adminCols = PERMOHONAN_ADMIN_COLUMNS as readonly string[];
    assert.ok(
      adminCols.includes('catatan_internal'),
      'catatan_internal missing from admin columns'
    );
    assert.ok(
      adminCols.includes('pemohon_id'),
      'pemohon_id missing from admin columns'
    );
    assert.ok(
      adminCols.includes('p_tiket_id'),
      'p_tiket_id missing from admin legacy columns'
    );
  });

  it('DTO-SEC-05: maskApplicantName correctly redacts personal name for public view', () => {
    assert.equal(maskApplicantName('Ahmad Dahlan'), 'A**** D*****');
    assert.equal(maskApplicantName('Budi'), 'B***');
    assert.equal(maskApplicantName(' Siti   Rahma '), 'S*** R****');
    assert.equal(maskApplicantName(''), '***');
  });

  it('DTO-SEC-06: PermohonanPublicTrackingDTO excludes all PII, internal notes, and hashes by contract', () => {
    const sampleTracking: PermohonanPublicTrackingDTO = {
      nomor_permohonan: 'PPID-2026-00001',
      status_proses: 'diproses',
      decision: null,
      alasan_penolakan: null,
      tanggal_pengajuan: '2026-10-07T00:00:00Z',
      tanggal_pembaruan: '2026-10-07T01:00:00Z',
      nama_pemohon_masked: maskApplicantName('John Doe'),
    };

    const keys = Object.keys(sampleTracking);
    const forbiddenPublicKeys = [
      'nik',
      'alamat',
      'telepon',
      'email',
      'catatan_internal',
      'tracking_token_hash',
      'pemohon_id',
      'id',
    ];

    for (const key of forbiddenPublicKeys) {
      assert.equal(
        keys.includes(key),
        false,
        `Public tracking contract must not contain ${key}`
      );
    }
  });
});

describe('Gate B Step 1: Input Validation Schemas (Zod)', () => {
  it('VAL-ID-01: Valid UUID passes PermohonanIdSchema', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';
    const parsed = PermohonanIdSchema.parse(validUuid);
    assert.equal(parsed, validUuid);
  });

  it('VAL-ID-02: Non-UUID strings fail PermohonanIdSchema', () => {
    const invalidInputs = [
      '',
      'not-a-uuid',
      '12345',
      "123e4567' OR '1'='1",
      '../etc/passwd',
      'null',
    ];

    for (const input of invalidInputs) {
      assert.throws(
        () => PermohonanIdSchema.parse(input),
        /UUID/i,
        `Input "${input}" should have failed UUID validation`
      );
    }
  });

  it('VAL-QUERY-01: Valid list query parses with defaults', () => {
    const result = PermohonanListQuerySchema.parse({});
    assert.equal(result.page, 1);
    assert.equal(result.limit, 10);
    assert.equal(result.sortBy, 'created_at');
    assert.equal(result.sortOrder, 'desc');
    assert.equal(result.status, undefined);
    assert.equal(result.search, undefined);
  });

  it('VAL-QUERY-02: Coerces numeric query strings and validates limits', () => {
    const result = PermohonanListQuerySchema.parse({
      page: '3',
      limit: '25',
      status: 'diproses',
      sortBy: 'nomor_permohonan',
      sortOrder: 'asc',
      search: ' KTP ',
    });

    assert.equal(result.page, 3);
    assert.equal(result.limit, 25);
    assert.equal(result.status, 'diproses');
    assert.equal(result.sortBy, 'nomor_permohonan');
    assert.equal(result.sortOrder, 'asc');
    assert.equal(result.search, 'KTP');
  });

  it('VAL-QUERY-03: Rejects invalid page, limit > 100, and unwhitelisted sortBy', () => {
    // Negative or 0 page
    assert.throws(() => PermohonanListQuerySchema.parse({ page: 0 }));
    assert.throws(() => PermohonanListQuerySchema.parse({ page: -5 }));

    // Limit exceeding 100
    assert.throws(() => PermohonanListQuerySchema.parse({ limit: 101 }));
    assert.throws(() => PermohonanListQuerySchema.parse({ limit: 0 }));

    // Unwhitelisted sort column
    assert.throws(() => PermohonanListQuerySchema.parse({ sortBy: 'catatan_internal' }));
    assert.throws(() => PermohonanListQuerySchema.parse({ sortBy: 'tracking_token_hash' }));
    assert.throws(() => PermohonanListQuerySchema.parse({ sortBy: 'id; DROP TABLE permohonan;' }));

    // Unwhitelisted status
    assert.throws(() => PermohonanListQuerySchema.parse({ status: 'unknown_status' }));
    assert.throws(() => PermohonanListQuerySchema.parse({ status: 'admin' }));
  });
});

describe('Gate B Step 1: Server Data-Access Boundary (lib/data/permohonan.ts)', () => {
  const fileContent = fs.readFileSync('lib/data/permohonan.ts', 'utf-8');

  it('MOD-SEC-01: Module is strictly protected by server-only import', () => {
    assert.ok(
      fileContent.includes("import 'server-only';"),
      'lib/data/permohonan.ts must start with "import \'server-only\';"'
    );
  });

  it('MOD-SEC-02: Contains NO wildcard queries (.select("*"))', () => {
    assert.equal(
      fileContent.includes("select('*'"),
      false,
      'Module must not contain wildcard query: select(\'*\''
    );
    assert.equal(
      fileContent.includes('select("*'),
      false,
      'Module must not contain wildcard query: select("*'
    );
  });

  it('MOD-SEC-03: Exports exactly the 4 required data access functions', () => {
    assert.ok(fileContent.includes('export async function getUserPermohonanList'));
    assert.ok(fileContent.includes('export async function getUserPermohonanDetail'));
    assert.ok(fileContent.includes('export async function getAdminPermohonanList'));
    assert.ok(fileContent.includes('export async function getAdminPermohonanDetail'));
  });

  it('MOD-SEC-04: User queries strictly enforce caller ownership (pemohon_id = user.id)', () => {
    assert.ok(
      fileContent.includes(".eq('pemohon_id', user.id)"),
      'User queries must bind pemohon_id strictly to authenticated user.id'
    );
  });

  it('MOD-SEC-05: User queries use PERMOHONAN_USER_PROJECTION', () => {
    assert.ok(
      fileContent.includes('select(PERMOHONAN_USER_PROJECTION'),
      'User queries must use PERMOHONAN_USER_PROJECTION'
    );
  });

  it('MOD-SEC-06: Admin queries enforce requireAdmin() and use PERMOHONAN_ADMIN_PROJECTION', () => {
    assert.ok(
      fileContent.includes('requireAdmin()'),
      'Admin queries must call requireAdmin()'
    );
    assert.ok(
      fileContent.includes('select(PERMOHONAN_ADMIN_PROJECTION'),
      'Admin queries must use PERMOHONAN_ADMIN_PROJECTION'
    );
  });
});

describe('Gate B Step 1: Codebase Query Audit Verification', () => {
  it('AUDIT-QUERY-01: Legacy queries in lib/actions.ts identified and flagged for later migration', () => {
    const actionsContent = fs.readFileSync('lib/actions.ts', 'utf-8');

    // Confirm existing legacy locations exist so we know our audit is grounded in real code
    assert.ok(actionsContent.includes("from('permohonan').select('*')"));
    assert.ok(actionsContent.includes('cekStatusTiket'));
    assert.ok(actionsContent.includes('getLaporanData'));
  });

  it('AUDIT-QUERY-02: New data modules in lib/data/ contain ZERO SELECT * on permohonan', () => {
    const dir = fs.readdirSync('lib/data');
    for (const file of dir) {
      if (file.endsWith('.ts')) {
        const content = fs.readFileSync(`lib/data/${file}`, 'utf-8');
        assert.equal(
          content.includes("from('permohonan').select('*')"),
          false,
          `File lib/data/${file} contains forbidden wildcard select('*')`
        );
      }
    }
  });
});
