/**
 * Automated Regression & Security Test Suite: Admin Content Mutations and UI Dialog Sanitization
 * Proyek: PPID Kota Parepare
 * Tiket 6: Pengamanan Mutasi Konten Administrasi (createBerita, updateBerita, deleteBerita, 
 *         createInformasiPublik, updateInformasiPublik, deleteInformasiPublik) dengan requireAdmin() 
 *         dan Eliminasi Dialog Mentah Browser (alert/confirm) pada Seluruh Dashboard & Kontak
 *
 * Test Specifications:
 * - SEC-BERITA-01: createBerita() enforces requireAdmin() and uses createAdminClient()
 * - SEC-BERITA-02: updateBerita() enforces requireAdmin() and uses createAdminClient()
 * - SEC-BERITA-03: deleteBerita() enforces requireAdmin() and uses createAdminClient()
 * - SEC-INFORMASI-01: createInformasiPublik() enforces requireAdmin() and uses createAdminClient()
 * - SEC-INFORMASI-02: updateInformasiPublik() enforces requireAdmin() and uses createAdminClient()
 * - SEC-INFORMASI-03: deleteInformasiPublik() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PUBLIC-READ-01: Public queries (getBerita, getBeritaBySlug, incrementBeritaViews, getInformasiPublik) do not enforce requireAdmin()
 * - SEC-UI-DIALOGS-01: app/kontak/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-DIALOGS-02: app/dashboard/laporan/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-DIALOGS-03: app/dashboard/permohonan/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-DIALOGS-04: app/dashboard/keberatan/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-DIALOGS-05: app/dashboard/informasi/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-DIALOGS-06: app/dashboard/berita/page.tsx has zero alert() and zero confirm() calls
 * - SEC-UI-FEEDBACK-01: UI confirmation modals and feedback state banners are properly implemented in berita and informasi pages
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Tiket 6 — SEC-CONTENT-MUTATIONS & UI-SANITATION: Content Administration and Native UI', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  describe('Group 1: CMS Berita Mutations Security', () => {
    it('SEC-BERITA-01: createBerita() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+createBerita\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'createBerita must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'createBerita must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'createBerita must use createAdminClient()');
      assert.ok(fnBody.includes("from('berita')"), 'createBerita must query berita table');
      assert.equal(
        fnBody.includes("supabase.from('berita')"),
        false,
        'createBerita must not use public anon supabase client'
      );
    });

    it('SEC-BERITA-02: updateBerita() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updateBerita\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updateBerita must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updateBerita must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updateBerita must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('berita')"),
        false,
        'updateBerita must not use public anon supabase client'
      );
    });

    it('SEC-BERITA-03: deleteBerita() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+deleteBerita\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'deleteBerita must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'deleteBerita must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'deleteBerita must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('berita')"),
        false,
        'deleteBerita must not use public anon supabase client'
      );
    });
  });

  describe('Group 2: CMS Informasi Publik Mutations Security', () => {
    it('SEC-INFORMASI-01: createInformasiPublik() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+createInformasiPublik\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'createInformasiPublik must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'createInformasiPublik must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'createInformasiPublik must use createAdminClient()');
      assert.ok(fnBody.includes("from('informasi_publik')"), 'createInformasiPublik must query informasi_publik table');
      assert.equal(
        fnBody.includes("supabase.from('informasi_publik')"),
        false,
        'createInformasiPublik must not use public anon supabase client'
      );
    });

    it('SEC-INFORMASI-02: updateInformasiPublik() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updateInformasiPublik\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updateInformasiPublik must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updateInformasiPublik must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updateInformasiPublik must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('informasi_publik')"),
        false,
        'updateInformasiPublik must not use public anon supabase client'
      );
    });

    it('SEC-INFORMASI-03: deleteInformasiPublik() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+deleteInformasiPublik\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'deleteInformasiPublik must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'deleteInformasiPublik must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'deleteInformasiPublik must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('informasi_publik')"),
        false,
        'deleteInformasiPublik must not use public anon supabase client'
      );
    });
  });

  describe('Group 3: Public Read Accessibility Preservation', () => {
    it('SEC-PUBLIC-READ-01: Public citizen reading functions remain accessible without requireAdmin()', () => {
      const publicReaders = [
        'getBerita',
        'getBeritaBySlug',
        'incrementBeritaViews',
        'getInformasiPublik'
      ];

      for (const fnName of publicReaders) {
        const fnRegex = new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\([\\s\\S]*?\\)\\s*\\{([\\s\\S]*?)(?:\\n\\}|export|$)`);
        const match = actionsContent.match(fnRegex);
        assert.ok(match, `${fnName} must be exported in lib/actions.ts`);
        const fnBody = match[1];
        assert.equal(
          fnBody.includes('requireAdmin()'),
          false,
          `Public reading function ${fnName}() must NOT call requireAdmin()`
        );
      }
    });
  });

  describe('Group 4: Complete Elimination of Raw Browser Popups (alert/confirm)', () => {
    const rawDialogRegex = /(?:^|[^\w$])(?:window\.)?(alert|confirm)\s*\(/;

    const targetFiles = [
      { name: 'app/kontak/page.tsx', id: 'SEC-UI-DIALOGS-01' },
      { name: 'app/dashboard/laporan/page.tsx', id: 'SEC-UI-DIALOGS-02' },
      { name: 'app/dashboard/permohonan/page.tsx', id: 'SEC-UI-DIALOGS-03' },
      { name: 'app/dashboard/keberatan/page.tsx', id: 'SEC-UI-DIALOGS-04' },
      { name: 'app/dashboard/informasi/page.tsx', id: 'SEC-UI-DIALOGS-05' },
      { name: 'app/dashboard/berita/page.tsx', id: 'SEC-UI-DIALOGS-06' }
    ];

    for (const target of targetFiles) {
      it(`${target.id}: ${target.name} has zero alert() and zero confirm() calls`, () => {
        const filePath = path.join(process.cwd(), target.name);
        assert.ok(fs.existsSync(filePath), `Target file ${target.name} must exist`);
        const content = fs.readFileSync(filePath, 'utf-8');

        const match = content.match(rawDialogRegex);
        assert.equal(
          match,
          null,
          `Found raw browser dialog in ${target.name}: ${match ? match[0] : ''}`
        );
      });
    }
  });

  describe('Group 5: UI Modal and State Feedback Verification', () => {
    it('SEC-UI-FEEDBACK-01: Berita and Informasi management pages implement in-UI delete confirmation and feedback states', () => {
      const beritaPath = path.join(process.cwd(), 'app/dashboard/berita/page.tsx');
      const beritaContent = fs.readFileSync(beritaPath, 'utf-8');
      assert.ok(beritaContent.includes('deleteConfirmBerita'), 'Berita page must define deleteConfirmBerita state');
      assert.ok(beritaContent.includes('actionFeedback'), 'Berita page must define actionFeedback state');
      assert.ok(beritaContent.includes('formError'), 'Berita page must define formError state');
      assert.ok(beritaContent.includes('Konfirmasi Hapus'), 'Berita page must render inline confirmation dialog');

      const infoPath = path.join(process.cwd(), 'app/dashboard/informasi/page.tsx');
      const infoContent = fs.readFileSync(infoPath, 'utf-8');
      assert.ok(infoContent.includes('deleteConfirmItem'), 'Informasi page must define deleteConfirmItem state');
      assert.ok(infoContent.includes('actionFeedback'), 'Informasi page must define actionFeedback state');
      assert.ok(infoContent.includes('formError'), 'Informasi page must define formError state');
      assert.ok(infoContent.includes('Konfirmasi Hapus'), 'Informasi page must render inline confirmation dialog');
    });
  });
});
