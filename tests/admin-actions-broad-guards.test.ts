/**
 * Automated Regression & Security Test Suite: Admin Actions Broad Guards
 * Proyek: PPID Kota Parepare
 * Tiket 5: Pengamanan Penuh Seluruh Server Actions Administrasi (Kotak Pesan Warga, Partisipasi Publik, Survei Kepuasan, Pengaturan Sistem, Profil/Konten Statis, dan FAQ)
 *
 * Test Specifications:
 * - SEC-PESAN-01: getPesan() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PESAN-02: deletePesan() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PESAN-03: markPesanAsRead() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PESAN-UI-01: app/dashboard/pesan/page.tsx provides inline confirmation and feedback state
 * - SEC-PARTISIPASI-01: getPartisipasiPublik() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PARTISIPASI-02: updatePartisipasiStatus() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PARTISIPASI-03: deletePartisipasiPublik() enforces requireAdmin() and uses createAdminClient()
 * - SEC-SURVEI-01: getSurveiKepuasan() enforces requireAdmin() and uses createAdminClient()
 * - SEC-SURVEI-02: deleteSurveiKepuasan() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PENGATURAN-01: updatePengaturan() enforces requireAdmin() and uses createAdminClient()
 * - SEC-PROFIL-01: updateProfil() enforces requireAdmin() and uses createAdminClient()
 * - SEC-KONTEN-01: updateKontenStatis() enforces requireAdmin() and uses createAdminClient()
 * - SEC-FAQ-01: addFaq(), updateFaq(), and deleteFaq() enforce requireAdmin() and use createAdminClient()
 * - SEC-PUBLIC-ACTIONS-01: Public citizen actions (getProfil, getKontenStatis, getFAQs, submitPesan, submitPartisipasiPublik, submitSurveiKepuasan) do not enforce requireAdmin()
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Tiket 5 — SEC-ADMIN-ACTIONS: Broad Administration Server Actions Guards', () => {
  const actionsFilePath = path.join(process.cwd(), 'lib/actions.ts');
  const actionsContent = fs.readFileSync(actionsFilePath, 'utf-8');

  describe('Group 1: Kotak Pesan Warga Security', () => {
    it('SEC-PESAN-01: getPesan() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+getPesan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'getPesan must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'getPesan must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'getPesan must use createAdminClient()');
      assert.ok(fnBody.includes("from('pesan')"), 'getPesan must query pesan table');
      assert.equal(
        fnBody.includes("supabase.from('pesan')"),
        false,
        'getPesan must not use public anon supabase client'
      );
    });

    it('SEC-PESAN-02: deletePesan() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+deletePesan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'deletePesan must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'deletePesan must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'deletePesan must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('pesan')"),
        false,
        'deletePesan must not use public anon supabase client'
      );
    });

    it('SEC-PESAN-03: markPesanAsRead() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+markPesanAsRead\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'markPesanAsRead must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'markPesanAsRead must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'markPesanAsRead must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('pesan')"),
        false,
        'markPesanAsRead must not use public anon supabase client'
      );
    });

    it('SEC-PESAN-UI-01: app/dashboard/pesan/page.tsx provides inline confirmation and feedback banner', () => {
      const pesanPagePath = path.join(process.cwd(), 'app/dashboard/pesan/page.tsx');
      const pesanPageContent = fs.readFileSync(pesanPagePath, 'utf-8');

      assert.ok(pesanPageContent.includes('deleteConfirmId'), 'Pesan page must track delete confirmation state');
      assert.ok(pesanPageContent.includes('actionFeedback'), 'Pesan page must provide action feedback banner');
      assert.equal(
        pesanPageContent.includes('window.confirm'),
        false,
        'Pesan page must eliminate window.confirm in favor of accessible inline confirmation'
      );
    });
  });

  describe('Group 2: Partisipasi Publik Security', () => {
    it('SEC-PARTISIPASI-01: getPartisipasiPublik() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+getPartisipasiPublik\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'getPartisipasiPublik must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'getPartisipasiPublik must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'getPartisipasiPublik must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('partisipasi_publik')"),
        false,
        'getPartisipasiPublik must not use public anon supabase client'
      );
    });

    it('SEC-PARTISIPASI-02: updatePartisipasiStatus() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updatePartisipasiStatus\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updatePartisipasiStatus must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updatePartisipasiStatus must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updatePartisipasiStatus must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('partisipasi_publik')"),
        false,
        'updatePartisipasiStatus must not use public anon supabase client'
      );
    });

    it('SEC-PARTISIPASI-03: deletePartisipasiPublik() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+deletePartisipasiPublik\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'deletePartisipasiPublik must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'deletePartisipasiPublik must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'deletePartisipasiPublik must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('partisipasi_publik')"),
        false,
        'deletePartisipasiPublik must not use public anon supabase client'
      );
    });
  });

  describe('Group 3: Survei Kepuasan Security', () => {
    it('SEC-SURVEI-01: getSurveiKepuasan() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+getSurveiKepuasan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'getSurveiKepuasan must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'getSurveiKepuasan must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'getSurveiKepuasan must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('survei_kepuasan')"),
        false,
        'getSurveiKepuasan must not use public anon supabase client'
      );
    });

    it('SEC-SURVEI-02: deleteSurveiKepuasan() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+deleteSurveiKepuasan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'deleteSurveiKepuasan must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'deleteSurveiKepuasan must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'deleteSurveiKepuasan must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('survei_kepuasan')"),
        false,
        'deleteSurveiKepuasan must not use public anon supabase client'
      );
    });
  });

  describe('Group 4: Pengaturan Sistem, Profil & Konten Statis', () => {
    it('SEC-PENGATURAN-01: updatePengaturan() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updatePengaturan\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updatePengaturan must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updatePengaturan must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updatePengaturan must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase.from('pengaturan')"),
        false,
        'updatePengaturan must not use public anon supabase client'
      );
    });

    it('SEC-PROFIL-01: updateProfil() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updateProfil\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updateProfil must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updateProfil must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updateProfil must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase\n      .from('profil_konten')"),
        false,
        'updateProfil must not use public anon supabase client'
      );
    });

    it('SEC-KONTEN-01: updateKontenStatis() enforces requireAdmin() and uses createAdminClient()', () => {
      const fnRegex = /export\s+async\s+function\s+updateKontenStatis\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/;
      const match = actionsContent.match(fnRegex);
      assert.ok(match, 'updateKontenStatis must be exported in lib/actions.ts');

      const fnBody = match[1];
      assert.ok(fnBody.includes('requireAdmin()'), 'updateKontenStatis must call requireAdmin()');
      assert.ok(fnBody.includes('createAdminClient()'), 'updateKontenStatis must use createAdminClient()');
      assert.equal(
        fnBody.includes("supabase\n      .from('konten_statis')"),
        false,
        'updateKontenStatis must not use public anon supabase client'
      );
    });
  });

  describe('Group 5: FAQ Management & Public Citizen Action Preservation', () => {
    it('SEC-FAQ-01: addFaq, updateFaq, and deleteFaq enforce requireAdmin() and use createAdminClient()', () => {
      const addMatch = actionsContent.match(/export\s+async\s+function\s+addFaq\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/);
      assert.ok(addMatch, 'addFaq must exist');
      assert.ok(addMatch[1].includes('requireAdmin()'), 'addFaq must call requireAdmin()');
      assert.ok(addMatch[1].includes('createAdminClient()'), 'addFaq must use createAdminClient()');

      const updateMatch = actionsContent.match(/export\s+async\s+function\s+updateFaq\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/);
      assert.ok(updateMatch, 'updateFaq must exist');
      assert.ok(updateMatch[1].includes('requireAdmin()'), 'updateFaq must call requireAdmin()');
      assert.ok(updateMatch[1].includes('createAdminClient()'), 'updateFaq must use createAdminClient()');

      const deleteMatch = actionsContent.match(/export\s+async\s+function\s+deleteFaq\s*\([\s\S]*?\)\s*\{([\s\S]*?)(?:\n\}|export|$)/);
      assert.ok(deleteMatch, 'deleteFaq must exist');
      assert.ok(deleteMatch[1].includes('requireAdmin()'), 'deleteFaq must call requireAdmin()');
      assert.ok(deleteMatch[1].includes('createAdminClient()'), 'deleteFaq must use createAdminClient()');
    });

    it('SEC-PUBLIC-ACTIONS-01: Public citizen actions remain open without requireAdmin()', () => {
      const publicFns = [
        'getProfil',
        'getKontenStatis',
        'getFAQs',
        'submitPesan',
        'submitPartisipasiPublik',
        'submitSurveiKepuasan'
      ];

      for (const fnName of publicFns) {
        const regex = new RegExp(`export\\s+async\\s+function\\s+${fnName}\\s*\\([\\s\\S]*?\\)\\s*\\{([\\s\\S]*?)(?:\\n\\}|export|$)`);
        const match = actionsContent.match(regex);
        assert.ok(match, `${fnName} must be exported in lib/actions.ts`);
        assert.equal(
          match[1].includes('requireAdmin()'),
          false,
          `${fnName} must remain publicly accessible without requireAdmin()`
        );
      }
    });
  });
});
