/**
 * Automated Regression & Security Test Suite: Admin Actions Guards & Permohonan RPC Integration
 * Proyek: PPID Kota Parepare
 * Tiket 2: Remediasi Alur Permohonan RPC (PPID-YYYY-XXXXX) & Pengamanan Server Actions Admin
 *
 * Test Specifications:
 * - SEC-ACTIONS-ADMIN-01: Static verification that all administrative actions in lib/actions.ts enforce requireAdmin()
 * - SEC-ACTIONS-SUBMIT-01: Static verification that submitPermohonan delegates to createPermohonanAction and eliminates direct INSERT
 * - SEC-SCHEMA-KTP-01: CreatePermohonanInputSchema validates ktp_storage_path alongside all required fields
 * - SEC-SCHEMA-KTP-02: CreatePermohonanInputSchema strictly rejects invalid phone, email, and unsupported categories
 * - SEC-RPC-FORMAT-01: Validates official ticket numbering specification (^PPID-\\d{4}-\\d{5}$)
 * - SEC-TRIGGER-GUARD-01: Database migration SQL audit verifying direct write blocking trigger (Error 42501)
 * - SEC-DOKUMEN-LINK-01: Static audit verifying atomic linking of citizen KTP in app/actions/permohonan.ts
 * - SEC-AJUKAN-UI-01: Static audit verifying ajukan-permohonan UI displays ticket, token, copy buttons, and login notice
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { CreatePermohonanInputSchema } from '../lib/validations/permohonan.ts';

describe('Tiket 2 — SEC-ACTIONS-ADMIN: Admin Server Actions Security Guard', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  let actionsContent = '';

  it('SEC-ACTIONS-ADMIN-01: lib/actions.ts imports and utilizes requireAdmin', () => {
    assert.ok(fs.existsSync(actionsFilePath), 'lib/actions.ts must exist');
    actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');
    assert.ok(
      actionsContent.includes("import { requireAdmin } from '@/lib/auth/session'") ||
      actionsContent.includes('requireAdmin'),
      'lib/actions.ts must import requireAdmin from @/lib/auth/session'
    );
  });

  const ADMIN_PROTECTED_FUNCTIONS = [
    'getPermohonan',
    'updatePermohonanStatus',
    'updatePermohonanInternalNotes',
    'getKeberatan',
    'updateKeberatanStatus',
    'getPengguna',
    'createPengguna',
    'updatePengguna',
    'deletePengguna',
    'getLogAktivitas',
  ];

  for (const fnName of ADMIN_PROTECTED_FUNCTIONS) {
    it(`SEC-ACTIONS-ADMIN-02: ${fnName} enforces requireAdmin() guard`, () => {
      // Find function definition block
      const fnRegex = new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\([\\s\\S]*?\\)\\s*\\{([\\s\\S]*?)(?:\\n\\}|export|$)`);
      const match = actionsContent.match(fnRegex);
      assert.ok(match, `Function ${fnName} must be exported in lib/actions.ts`);

      const fnBody = match[1];
      assert.ok(
        fnBody.includes('requireAdmin()'),
        `Function ${fnName} must call requireAdmin() to enforce admin authentication and role check`
      );
    });
  }
});

describe('Tiket 2 — SEC-ACTIONS-SUBMIT: Permohonan RPC Delegation & Direct Write Elimination', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  it('SEC-ACTIONS-SUBMIT-01: submitPermohonan delegates to createPermohonanAction', () => {
    const fnRegex = /export\s+async\s+function\s+submitPermohonan\s*\([\s\S]*?\)\s*\{([\s\S]*?)\n\}/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match, 'submitPermohonan must be exported in lib/actions.ts');

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('createPermohonanAction'),
      'submitPermohonan must delegate execution to createPermohonanAction'
    );
  });

  it('SEC-ACTIONS-SUBMIT-02: submitPermohonan does NOT execute direct supabase.from("permohonan").insert()', () => {
    const fnRegex = /export\s+async\s+function\s+submitPermohonan\s*\([\s\S]*?\)\s*\{([\s\S]*?)\n\}/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      !fnBody.includes("from('permohonan').insert") && !fnBody.includes('from("permohonan").insert'),
      'submitPermohonan must NEVER execute direct insert on table permohonan'
    );
  });

  it('SEC-ACTIONS-SUBMIT-03: submitPermohonan maps return values to include id (nomor_permohonan) and tracking_token', () => {
    const fnRegex = /export\s+async\s+function\s+submitPermohonan\s*\([\s\S]*?\)\s*\{([\s\S]*?)\n\}/;
    const match = actionsContent.match(fnRegex);
    assert.ok(match);

    const fnBody = match[1];
    assert.ok(
      fnBody.includes('nomor_permohonan') && fnBody.includes('tracking_token'),
      'submitPermohonan must return official nomor_permohonan and tracking_token'
    );
  });
});

describe('Tiket 2 — SEC-SCHEMA-KTP: CreatePermohonanInputSchema Validation', () => {
  const baseValidInput = {
    nama_pemohon: 'Muh. Ramadhan',
    kategori_pemohon: 'perorangan' as const,
    nik: '7372010101900001',
    alamat: 'Jl. Jenderal Sudirman No. 12, Parepare',
    telepon: '081234567890',
    email: 'ramadhan@example.com',
    kebutuhan: 'Memohon salinan RKA-SKPD Dinas Pendidikan Tahun 2026',
    tujuan_penggunaan: 'Untuk bahan penelitian tesis magister kebijakan publik',
    cara_memperoleh_informasi: 'melihat_membaca_mendengarkan',
    cara_mendapatkan_salinan: 'softcopy_elektronik',
  };

  it('SEC-SCHEMA-KTP-01: Validates input with ktp_storage_path successfully', () => {
    const inputWithKtp = {
      ...baseValidInput,
      ktp_storage_path: 'identitas/550e8400-e29b-41d4-a716-446655440000.jpg',
    };

    const parsed = CreatePermohonanInputSchema.safeParse(inputWithKtp);
    assert.ok(parsed.success, 'Valid permohonan input with ktp_storage_path must succeed');
    if (parsed.success) {
      assert.equal(parsed.data.ktp_storage_path, inputWithKtp.ktp_storage_path);
    }
  });

  it('SEC-SCHEMA-KTP-02: Validates input without ktp_storage_path (optional/backward-compatible)', () => {
    const parsed = CreatePermohonanInputSchema.safeParse(baseValidInput);
    assert.ok(parsed.success, 'Permohonan input without ktp_storage_path must succeed');
  });

  it('SEC-SCHEMA-KTP-03: Rejects invalid email address', () => {
    const invalidEmail = { ...baseValidInput, email: 'not-an-email' };
    const parsed = CreatePermohonanInputSchema.safeParse(invalidEmail);
    assert.equal(parsed.success, false, 'Invalid email must fail validation');
  });

  it('SEC-SCHEMA-KTP-04: Rejects invalid phone numbers', () => {
    const invalidPhone = { ...baseValidInput, telepon: 'abcd-efgh-hijk' };
    const parsed = CreatePermohonanInputSchema.safeParse(invalidPhone);
    assert.equal(parsed.success, false, 'Non-numeric phone must fail validation');
  });

  it('SEC-SCHEMA-KTP-05: Rejects unsupported applicant categories', () => {
    const invalidCategory = { ...baseValidInput, kategori_pemohon: 'alien' as any };
    const parsed = CreatePermohonanInputSchema.safeParse(invalidCategory);
    assert.equal(parsed.success, false, 'Unsupported category must fail validation');
  });
});

describe('Tiket 2 — SEC-RPC-FORMAT: Ticket Numbering & Invariants', () => {
  const OFFICIAL_TICKET_REGEX = /^PPID-\d{4}-\d{5}$/;

  it('SEC-RPC-FORMAT-01: Validates standard PPID-YYYY-XXXXX format', () => {
    assert.ok(OFFICIAL_TICKET_REGEX.test('PPID-2026-00001'));
    assert.ok(OFFICIAL_TICKET_REGEX.test('PPID-2026-00123'));
    assert.ok(OFFICIAL_TICKET_REGEX.test('PPID-2027-99999'));
  });

  it('SEC-RPC-FORMAT-02: Rejects legacy REQ- format and invalid structures', () => {
    assert.equal(OFFICIAL_TICKET_REGEX.test('REQ-1729000000'), false);
    assert.equal(OFFICIAL_TICKET_REGEX.test('REQ-ABCDEF'), false);
    assert.equal(OFFICIAL_TICKET_REGEX.test('PPID-26-001'), false);
    assert.equal(OFFICIAL_TICKET_REGEX.test('PPID-2026-1'), false);
  });
});

describe('Tiket 2 — SEC-TRIGGER-GUARD: Database Migration Write Guard Audit', () => {
  const migrationsDir = path.join(process.cwd(), 'db/migrations');

  it('SEC-TRIGGER-GUARD-01: Migration files define trg_a_guard_permohonan_direct_client_write with error 42501', () => {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
    let foundTrigger = false;

    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      if (sql.includes('trg_a_guard_permohonan_direct_client_write') || sql.includes('guard_permohonan_direct_client_write')) {
        foundTrigger = true;
        assert.ok(
          sql.includes('42501'),
          `Migration ${file} must raise SQL exception 42501 on unauthorized direct write`
        );
        break;
      }
    }

    assert.ok(foundTrigger, 'Direct write guard trigger must be defined in database migrations');
  });
});

describe('Tiket 2 — SEC-DOKUMEN-LINK: KTP Attachment in createPermohonanAction', () => {
  const permohonanActionPath = path.join(process.cwd(), 'app/actions/permohonan.ts');
  const actionContent = fs.readFileSync(permohonanActionPath, 'utf-8');

  it('SEC-DOKUMEN-LINK-01: createPermohonanAction links ktp_storage_path via attachKtpDokumen with kategori identitas_ktp', () => {
    assert.ok(
      actionContent.includes('attachKtpDokumen') && actionContent.includes('ktp_storage_path'),
      'createPermohonanAction must delegate KTP attachment to attachKtpDokumen'
    );

    const docStorageContent = fs.readFileSync(path.join(process.cwd(), 'lib/storage/documents.ts'), 'utf-8');
    assert.ok(
      docStorageContent.includes('dokumen_permohonan') && docStorageContent.includes('identitas_ktp'),
      'attachKtpDokumen in lib/storage/documents.ts must insert into dokumen_permohonan with kategori identitas_ktp'
    );
  });

  it('SEC-DOKUMEN-LINK-02: createPermohonanAction enforces requireVerifiedUser and user role check', () => {
    assert.ok(
      actionContent.includes('requireVerifiedUser'),
      'createPermohonanAction must enforce requireVerifiedUser'
    );
    assert.ok(
      actionContent.includes("profile.role !== 'user'"),
      'createPermohonanAction must reject non-user roles'
    );
  });
});

describe('Tiket 2 — SEC-AJUKAN-UI: Citizen Permohonan Submission UI Security Audit', () => {
  const uiFilePath = path.join(process.cwd(), 'app/ajukan-permohonan/page.tsx');
  const uiContent = fs.readFileSync(uiFilePath, 'utf-8');

  it('SEC-AJUKAN-UI-01: Success screen renders ticket ID and tracking token with copy buttons', () => {
    assert.ok(
      uiContent.includes('trackingToken') && uiContent.includes('ticketId'),
      'UI must statefully track and render both ticketId and trackingToken'
    );
    assert.ok(
      uiContent.includes('copyToClipboard'),
      'UI must provide copy-to-clipboard functionality'
    );
  });

  it('SEC-AJUKAN-UI-02: UI eliminates login link and keeps form open to public without login requirement', () => {
    assert.equal(
      uiContent.includes('href="/login"'),
      false,
      'UI must not provide public link to /login'
    );
    assert.ok(
      uiContent.includes('Layanan Permohonan Informasi Publik Terbuka') || uiContent.includes('Pendaftaran Permohonan Informasi Publik'),
      'UI must clarify that permohonan is open to public without login'
    );
    assert.equal(
      uiContent.includes('(Tanpa Wajib Login)'),
      false,
      'UI must eliminate redundant (Tanpa Wajib Login) phrasing'
    );
  });

  it('SEC-AJUKAN-UI-03: UI eliminates raw window alert popups for submission errors', () => {
    assert.ok(
      !uiContent.includes("alert('Gagal mengirim permohonan:") && !uiContent.includes('alert("Gagal mengirim permohonan:'),
      'UI must not use raw browser alert() popups'
    );
    assert.ok(
      uiContent.includes('submitError'),
      'UI must use structured submitError alert card'
    );
  });
});
