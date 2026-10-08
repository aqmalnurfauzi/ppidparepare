/**
 * Workflow State Machine Validation Schemas
 * Phase 2 — Gate B Admin Workflow & State Machine
 *
 * Rules:
 * 1. status_proses IN ('diajukan', 'diproses', 'selesai').
 * 2. status_proses === 'selesai' <==> decision IS NOT NULL.
 * 3. decision === 'ditolak' <==> alasan_penolakan IS NOT NULL AND non-empty.
 * 4. decision != 'ditolak' <==> alasan_penolakan IS NULL.
 */

import { z } from 'zod';
import { PermohonanIdSchema } from './permohonan.ts';

export const WorkflowStatusSchema = z.enum(['diajukan', 'diproses', 'selesai'], {
  error: 'Status proses harus salah satu dari: diajukan, diproses, atau selesai',
});

export const WorkflowDecisionSchema = z.enum(
  ['dikabulkan_sepenuhnya', 'dikabulkan_sebagian', 'ditolak', 'tidak_dikuasai'],
  {
    error: 'Keputusan harus salah satu dari: dikabulkan_sepenuhnya, dikabulkan_sebagian, ditolak, atau tidak_dikuasai',
  }
);

export const AdminWorkflowUpdateSchema = z
  .object({
    permohonanId: PermohonanIdSchema,
    statusProses: WorkflowStatusSchema,
    decision: WorkflowDecisionSchema.nullable().optional(),
    alasanPenolakan: z.string().trim().max(1000).nullable().optional(),
    catatanInternal: z.string().trim().max(2000).nullable().optional(),
  })
  .superRefine((data, ctx) => {
    // Invariant 1 & 2: status_proses vs decision
    if (data.statusProses === 'selesai') {
      if (!data.decision) {
        ctx.addIssue({
          code: 'custom',
          message: 'Keputusan (decision) wajib dipilih saat status proses adalah selesai',
          path: ['decision'],
        });
      }
    } else {
      if (data.decision !== null && data.decision !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: 'Keputusan (decision) harus kosong jika status proses belum selesai',
          path: ['decision'],
        });
      }
    }

    // Invariant 3 & 4: decision ditolak vs alasan_penolakan
    if (data.decision === 'ditolak') {
      if (!data.alasanPenolakan || data.alasanPenolakan.trim() === '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Alasan penolakan wajib diisi jika keputusan adalah ditolak',
          path: ['alasanPenolakan'],
        });
      }
    } else {
      if (data.alasanPenolakan !== null && data.alasanPenolakan !== undefined && data.alasanPenolakan.trim() !== '') {
        ctx.addIssue({
          code: 'custom',
          message: 'Alasan penolakan harus kosong jika permohonan tidak ditolak',
          path: ['alasanPenolakan'],
        });
      }
    }
  });

export type AdminWorkflowUpdateInput = z.infer<typeof AdminWorkflowUpdateSchema>;
