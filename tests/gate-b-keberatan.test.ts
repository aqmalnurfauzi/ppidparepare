/**
 * Phase 2 Gate B — Step 5: Keberatan (Objection) Authorization & Flow Tests
 *
 * Verifies:
 * - KEB-DTO-01..02: DTO contracts & column projections (explicit, no wildcard)
 * - KEB-VAL-01..06: Zod validation schemas (UUID, length, required fields, status refinement)
 * - KEB-DB-01..04: Database RLS & column-level GRANT invariants
 * - KEB-SVC-01..05: Service boundary invariants (server-only, requireAuth, terminal status check, audit)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  KEBERATAN_USER_COLUMNS,
  KEBERATAN_USER_PROJECTION,
  KEBERATAN_ADMIN_COLUMNS,
  KEBERATAN_ADMIN_PROJECTION,
  type KeberatanUserDTO,
  type KeberatanAdminDTO,
} from '../types/keberatan.ts';

import {
  KeberatanIdSchema,
  KeberatanStatusSchema,
  CreateKeberatanSchema,
  AdminUpdateKeberatanSchema,
  KeberatanListQuerySchema,
} from '../lib/validations/keberatan.ts';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';
const VALID_UUID_2 = '223e4567-e89b-12d3-a456-426614174001';

describe('Gate B Step 5: Keberatan DTO & Column Projections', () => {
  it('KEB-DTO-01: User projection contains required public fields and no wildcards', () => {
    assert.equal(KEBERATAN_USER_PROJECTION.includes('*'), false);
    const cols = KEBERATAN_USER_COLUMNS as readonly string[];
    assert.ok(cols.includes('id'));
    assert.ok(cols.includes('permohonan_id'));
    assert.ok(cols.includes('nomor_keberatan'));
    assert.ok(cols.includes('alasan_keberatan'));
    assert.ok(cols.includes('status_keberatan'));
    assert.ok(cols.includes('tanggapan_atasan'));
  });

  it('KEB-DTO-02: Admin projection contains explicit columns without wildcard', () => {
    assert.equal(KEBERATAN_ADMIN_PROJECTION.includes('*'), false);
    const cols = KEBERATAN_ADMIN_COLUMNS as readonly string[];
    assert.ok(cols.includes('id'));
    assert.ok(cols.includes('permohonan_id'));
    assert.ok(cols.includes('alasan_keberatan'));
    assert.ok(cols.includes('status_keberatan'));
    assert.ok(cols.includes('tanggapan_atasan'));
  });
});

describe('Gate B Step 5: Keberatan Zod Input Validation', () => {
  it('KEB-VAL-01: CreateKeberatanSchema validates valid permohonanId and alasanKeberatan', () => {
    const valid = CreateKeberatanSchema.parse({
      permohonanId: VALID_UUID,
      alasanKeberatan: 'Permohonan informasi tidak ditanggapi dalam waktu 10 hari kerja sesuai regulasi.',
      kasusPosisi: 'Permohonan diajukan tanggal 1 Oktober, sampai saat ini belum ada respon.',
    });

    assert.equal(valid.permohonanId, VALID_UUID);
    assert.ok(valid.alasanKeberatan.length >= 5);
    assert.equal(valid.kasusPosisi, 'Permohonan diajukan tanggal 1 Oktober, sampai saat ini belum ada respon.');
  });

  it('KEB-VAL-02: CreateKeberatanSchema rejects non-UUID permohonanId', () => {
    assert.throws(
      () =>
        CreateKeberatanSchema.parse({
          permohonanId: 'not-a-uuid',
          alasanKeberatan: 'Alasan pengajuan keberatan yang cukup panjang.',
        }),
      /UUID/i
    );
  });

  it('KEB-VAL-03: CreateKeberatanSchema rejects short or empty alasanKeberatan', () => {
    assert.throws(
      () =>
        CreateKeberatanSchema.parse({
          permohonanId: VALID_UUID,
          alasanKeberatan: '   ',
        }),
      /minimal 5 karakter/i
    );

    assert.throws(
      () =>
        CreateKeberatanSchema.parse({
          permohonanId: VALID_UUID,
          alasanKeberatan: 'abc',
        }),
      /minimal 5 karakter/i
    );
  });

  it('KEB-VAL-04: AdminUpdateKeberatanSchema accepts valid updates for intermediate status', () => {
    const validDiproses = AdminUpdateKeberatanSchema.parse({
      keberatanId: VALID_UUID,
      statusKeberatan: 'diproses',
    });
    assert.equal(validDiproses.statusKeberatan, 'diproses');
  });

  it('KEB-VAL-05: AdminUpdateKeberatanSchema enforces tanggapanAtasan when status is selesai', () => {
    // Missing tanggapanAtasan fails
    assert.throws(
      () =>
        AdminUpdateKeberatanSchema.parse({
          keberatanId: VALID_UUID,
          statusKeberatan: 'selesai',
        }),
      /Tanggapan atasan PPID wajib diisi/i
    );

    // Empty tanggapanAtasan fails
    assert.throws(
      () =>
        AdminUpdateKeberatanSchema.parse({
          keberatanId: VALID_UUID,
          statusKeberatan: 'selesai',
          tanggapanAtasan: '   ',
        }),
      /Tanggapan atasan PPID wajib diisi/i
    );

    // Valid tanggapanAtasan passes
    const validSelesai = AdminUpdateKeberatanSchema.parse({
      keberatanId: VALID_UUID,
      statusKeberatan: 'selesai',
      tanggapanAtasan: 'Keberatan diterima. Informasi yang diminta akan diserahkan dalam 3 hari kerja.',
      nomorKeberatan: 'KEB-2026-00001',
    });
    assert.equal(validSelesai.statusKeberatan, 'selesai');
    assert.ok(validSelesai.tanggapanAtasan);
    assert.equal(validSelesai.nomorKeberatan, 'KEB-2026-00001');
  });

  it('KEB-VAL-06: KeberatanListQuerySchema enforces bounds and whitelisted columns', () => {
    const defaultQuery = KeberatanListQuerySchema.parse({});
    assert.equal(defaultQuery.page, 1);
    assert.equal(defaultQuery.limit, 10);
    assert.equal(defaultQuery.sortBy, 'created_at');
    assert.equal(defaultQuery.sortOrder, 'desc');

    // Page 0 or negative fails
    assert.throws(() => KeberatanListQuerySchema.parse({ page: 0 }));

    // Limit > 100 fails
    assert.throws(() => KeberatanListQuerySchema.parse({ limit: 101 }));

    // Unwhitelisted sort fails
    assert.throws(() => KeberatanListQuerySchema.parse({ sortBy: 'nomor_keberatan' }));
  });
});

describe('Gate B Step 5: Database Security Invariants (Migrations 000002 & 000003)', () => {
  const m2 = fs.readFileSync('db/migrations/20261006000002_phase2_database_foundation.sql', 'utf-8');
  const m3 = fs.readFileSync('db/migrations/20261006000003_phase2_gate_a_authz_corrections.sql', 'utf-8');

  it('KEB-DB-01: Migration 000002 enforces RLS: only selesai permohonan can receive keberatan', () => {
    assert.match(
      m2,
      /CREATE POLICY "Users can insert own keberatan or admin insert" ON public\.keberatan/
    );
    assert.match(m2, /p\.status_proses = 'selesai'/);
    assert.match(m2, /p\.pemohon_id = auth\.uid\(\)/);
  });

  it('KEB-DB-02: Migration 000003 restricts client column grants to only own content columns', () => {
    assert.match(
      m3,
      /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.keberatan FROM PUBLIC, anon, authenticated;/
    );
    assert.match(
      m3,
      /GRANT INSERT \(permohonan_id, alasan_keberatan, kasus_posisi\) ON public\.keberatan TO authenticated;/
    );
  });

  it('KEB-DB-03: Deletion of keberatan is strictly disallowed', () => {
    assert.match(
      m2,
      /CREATE POLICY "Disallow direct keberatan delete" ON public\.keberatan FOR DELETE USING \(false\);/
    );
  });

  it('KEB-DB-04: Direct client updates on keberatan are prohibited', () => {
    assert.match(
      m2,
      /CREATE POLICY "Only admin can update keberatan" ON public\.keberatan FOR UPDATE USING \(public\.is_admin\(\)\);/
    );
  });
});

describe('Gate B Step 5: Keberatan Service Implementation (lib/data/keberatan.ts)', () => {
  const fileContent = fs.readFileSync('lib/data/keberatan.ts', 'utf-8');

  it('KEB-SVC-01: Module is protected with server-only import', () => {
    assert.ok(fileContent.includes("import 'server-only';"));
  });

  it('KEB-SVC-02: Enforces requireAuth() and requireAdmin() on corresponding endpoints', () => {
    assert.ok(fileContent.includes('await requireAuth()'));
    assert.ok(fileContent.includes('await requireAdmin()'));
  });

  it('KEB-SVC-03: Verifies terminal status (status_proses === "selesai") before creating objection', () => {
    assert.ok(
      fileContent.includes("permohonan.status_proses !== 'selesai'"),
      'Service must verify permohonan status_proses is selesai'
    );
  });

  it('KEB-SVC-04: Contains ZERO wildcard projections (select("*"))', () => {
    assert.equal(fileContent.includes("select('*'"), false);
    assert.equal(fileContent.includes('select("*'), false);
    assert.ok(fileContent.includes('KEBERATAN_USER_PROJECTION'));
    assert.ok(fileContent.includes('KEBERATAN_ADMIN_PROJECTION'));
  });

  it('KEB-SVC-05: Writes audit log into log_aktivitas upon creation and update', () => {
    assert.ok(fileContent.includes("'keberatan.create'"));
    assert.ok(fileContent.includes("'keberatan.workflow_update'"));
    assert.ok(fileContent.includes("target_entity: 'keberatan'"));
  });
});
