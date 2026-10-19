/**
 * Phase 2 Gate B — Step 4: Workflow State Machine & Admin Mutation Tests
 *
 * Verifies:
 * - WF-VAL-01..07: Zod state machine schema and business invariants:
 *     1. status_proses in ('diajukan', 'diproses', 'selesai')
 *     2. status_proses === 'selesai' requires decision
 *     3. status_proses !== 'selesai' rejects decision
 *     4. decision === 'ditolak' requires alasan_penolakan
 *     5. decision !== 'ditolak' rejects non-empty alasan_penolakan
 * - WF-DB-01..05: Migration 000003 state machine and RPC SQL invariants
 * - WF-SVC-01..04: Admin workflow service contracts (server-only, requireAdmin, RPC call)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';

import {
  WorkflowStatusSchema,
  WorkflowDecisionSchema,
  AdminWorkflowUpdateSchema,
  type AdminWorkflowUpdateInput,
} from '../lib/validations/workflow.ts';

const VALID_UUID = '123e4567-e89b-12d3-a456-426614174000';

describe('Gate B Step 4: Workflow Status & Decision Enums', () => {
  it('WF-VAL-01: WorkflowStatusSchema only accepts valid statuses', () => {
    assert.equal(WorkflowStatusSchema.parse('diajukan'), 'diajukan');
    assert.equal(WorkflowStatusSchema.parse('diproses'), 'diproses');
    assert.equal(WorkflowStatusSchema.parse('selesai'), 'selesai');

    assert.throws(() => WorkflowStatusSchema.parse('pending'));
    assert.throws(() => WorkflowStatusSchema.parse('batal'));
    assert.throws(() => WorkflowStatusSchema.parse(''));
  });

  it('WF-VAL-02: WorkflowDecisionSchema only accepts valid decisions', () => {
    assert.equal(WorkflowDecisionSchema.parse('dikabulkan_sepenuhnya'), 'dikabulkan_sepenuhnya');
    assert.equal(WorkflowDecisionSchema.parse('dikabulkan_sebagian'), 'dikabulkan_sebagian');
    assert.equal(WorkflowDecisionSchema.parse('ditolak'), 'ditolak');
    assert.equal(WorkflowDecisionSchema.parse('tidak_dikuasai'), 'tidak_dikuasai');

    assert.throws(() => WorkflowDecisionSchema.parse('diterima'));
    assert.throws(() => WorkflowDecisionSchema.parse('pending'));
  });
});

describe('Gate B Step 4: State Machine Invariants (AdminWorkflowUpdateSchema)', () => {
  it('WF-VAL-03: Invariant 1 - Intermediate status (diajukan, diproses) without decision passes', () => {
    const diajukanInput = AdminWorkflowUpdateSchema.parse({
      permohonanId: VALID_UUID,
      statusProses: 'diajukan',
    });
    assert.equal(diajukanInput.statusProses, 'diajukan');
    assert.equal(diajukanInput.decision, undefined);

    const diprosesInput = AdminWorkflowUpdateSchema.parse({
      permohonanId: VALID_UUID,
      statusProses: 'diproses',
      catatanInternal: 'Sedang diverifikasi oleh petugas',
    });
    assert.equal(diprosesInput.statusProses, 'diproses');
    assert.equal(diprosesInput.catatanInternal, 'Sedang diverifikasi oleh petugas');
  });

  it('WF-VAL-04: Invariant 2 - Intermediate status with decision fails validation', () => {
    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'diproses',
          decision: 'dikabulkan_sepenuhnya',
        }),
      /Keputusan \(decision\) harus kosong jika status proses belum selesai/i
    );

    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'diajukan',
          decision: 'ditolak',
          alasanPenolakan: 'Alasan penolakan',
        }),
      /Keputusan \(decision\) harus kosong jika status proses belum selesai/i
    );
  });

  it('WF-VAL-05: Invariant 3 - Terminal status (selesai) without decision fails validation', () => {
    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'selesai',
        }),
      /Keputusan \(decision\) wajib dipilih saat status proses adalah selesai/i
    );

    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'selesai',
          decision: null,
        }),
      /Keputusan \(decision\) wajib dipilih saat status proses adalah selesai/i
    );
  });

  it('WF-VAL-06: Invariant 4 - Decision "ditolak" requires non-empty alasan_penolakan', () => {
    // Missing alasanPenolakan fails
    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'selesai',
          decision: 'ditolak',
        }),
      /Alasan penolakan wajib diisi jika keputusan adalah ditolak/i
    );

    // Whitespace alasanPenolakan fails
    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'selesai',
          decision: 'ditolak',
          alasanPenolakan: '   ',
        }),
      /Alasan penolakan wajib diisi jika keputusan adalah ditolak/i
    );

    // Valid alasanPenolakan passes
    const validDitolak = AdminWorkflowUpdateSchema.parse({
      permohonanId: VALID_UUID,
      statusProses: 'selesai',
      decision: 'ditolak',
      alasanPenolakan: 'Informasi termasuk informasi yang dikecualikan sesuai pasal 17 UU KIP',
    });
    assert.equal(validDitolak.decision, 'ditolak');
    assert.ok(validDitolak.alasanPenolakan);
  });

  it('WF-VAL-07: Invariant 5 - Non-rejected decision rejects non-empty alasan_penolakan', () => {
    assert.throws(
      () =>
        AdminWorkflowUpdateSchema.parse({
          permohonanId: VALID_UUID,
          statusProses: 'selesai',
          decision: 'dikabulkan_sepenuhnya',
          alasanPenolakan: 'Tidak boleh ada alasan penolakan jika dikabulkan',
        }),
      /Alasan penolakan harus kosong jika permohonan tidak ditolak/i
    );

    const validDikabulkan = AdminWorkflowUpdateSchema.parse({
      permohonanId: VALID_UUID,
      statusProses: 'selesai',
      decision: 'dikabulkan_sepenuhnya',
    });
    assert.equal(validDikabulkan.statusProses, 'selesai');
    assert.equal(validDikabulkan.decision, 'dikabulkan_sepenuhnya');
  });
});

describe('Gate B Step 4: Database State Machine SQL Invariants (Migration 000003)', () => {
  const sql = fs.readFileSync(
    'db/migrations/20261006000003_phase2_gate_a_authz_corrections.sql',
    'utf-8'
  );

  it('WF-DB-01: Disallow skipping "diproses" directly from "diajukan" to "selesai"', () => {
    assert.match(
      sql,
      /IF OLD\.status_proses = 'diajukan' AND NEW\.status_proses = 'selesai' THEN\s+RAISE EXCEPTION 'Status transition violation: cannot transition directly from diajukan to selesai \(must transition to diproses first\)';/
    );
  });

  it('WF-DB-02: Status "selesai" is strictly terminal at the database level', () => {
    assert.match(
      sql,
      /IF OLD\.status_proses = 'selesai' AND NEW\.status_proses IS DISTINCT FROM 'selesai' THEN\s+RAISE EXCEPTION 'Status transition violation: selesai is terminal';/
    );
  });

  it('WF-DB-03: Critical identity columns are immutable in state machine trigger', () => {
    assert.match(sql, /nomor_permohonan is immutable once assigned/);
    assert.match(sql, /pemohon_id is immutable: ownership of permohonan cannot be transferred/);
    assert.match(sql, /tracking_token_hash is immutable once assigned/);
  });

  it('WF-DB-04: admin_update_permohonan_workflow locks row with FOR UPDATE', () => {
    assert.match(
      sql,
      /SELECT \* INTO v_old FROM public\.permohonan WHERE permohonan\.id = p_permohonan_id FOR UPDATE;/
    );
  });

  it('WF-DB-05: admin_update_permohonan_workflow records audit trail into log_aktivitas', () => {
    assert.match(
      sql,
      /INSERT INTO public\.log_aktivitas \(actor_id, actor_role, action, target_entity, target_id, metadata\)/
    );
    assert.match(sql, /'permohonan\.workflow_update'/);
    assert.match(sql, /'from_status', v_old\.status_proses, 'to_status', p_status_proses/);
  });
});

describe('Gate B Step 4: Admin Workflow Service Implementation (lib/workflow/admin.ts)', () => {
  const fileContent = fs.readFileSync('lib/workflow/admin.ts', 'utf-8');

  it('WF-SVC-01: Module is protected by server-only import', () => {
    assert.ok(
      fileContent.includes("import 'server-only';"),
      'lib/workflow/admin.ts must include "import \'server-only\';"'
    );
  });

  it('WF-SVC-02: Enforces requireAdmin() session authorization', () => {
    assert.ok(
      fileContent.includes('await requireAdmin()'),
      'Workflow mutation must enforce requireAdmin()'
    );
  });

  it('WF-SVC-03: Validates input through AdminWorkflowUpdateSchema', () => {
    assert.ok(
      fileContent.includes('AdminWorkflowUpdateSchema.parse(rawInput)'),
      'Service must validate input using AdminWorkflowUpdateSchema'
    );
  });

  it('WF-SVC-04: Calls atomic admin_update_permohonan_workflow RPC', () => {
    assert.ok(
      fileContent.includes("supabase.rpc('admin_update_permohonan_workflow'"),
      'Service must invoke admin_update_permohonan_workflow RPC'
    );
    assert.ok(fileContent.includes('p_permohonan_id:'));
    assert.ok(fileContent.includes('p_status_proses:'));
    assert.ok(fileContent.includes('p_decision:'));
    assert.ok(fileContent.includes('p_alasan_penolakan:'));
    assert.ok(fileContent.includes('p_catatan_internal:'));
  });
});
