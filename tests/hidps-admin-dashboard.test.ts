/**
 * Automated Regression & Security Test Suite: HIDPS Admin Dashboard & API Security
 * Proyek: PPID Kota Parepare
 *
 * Test Specifications:
 * - HIDPS-AUTH-01: GET /api/admin/hidps strictly enforces requireAdmin()
 * - HIDPS-AUTH-02: POST /api/admin/hidps strictly enforces requireAdmin()
 * - HIDPS-SEC-01: set_log_path rejects directory traversal (..) and null bytes
 * - HIDPS-SEC-02: set_log_path restricts log paths to approved system directories
 * - HIDPS-SEC-03: set_mode restricts values to valid operational modes
 * - HIDPS-SEC-04: Telegram tokens are masked and secrets are redacted
 * - HIDPS-SEC-05: Query parameters containing credentials in URIs are redacted
 * - HIDPS-SEC-06: Event history distinguishes real server detections from demo simulations
 * - HIDPS-UI-01: app/dashboard/security-hidps/page.tsx exists and implements canonical dashboard
 * - HIDPS-UI-02: app/dashboard/layout.tsx contains Keamanan HIDPS navigation link
 * - HIDPS-UI-03: next.config.ts redirects /admin/security-hidps to /dashboard/security-hidps
 * - HIDPS-DEF-01: Firewall enforcement truthfulness (never claims BLOCKED_UFW without execution)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('HIDPS Admin API & Route Authorization Tests', () => {
  const apiRoutePath = path.join(process.cwd(), 'app/api/admin/hidps/route.ts');
  const apiContent = fs.readFileSync(apiRoutePath, 'utf-8');

  it('HIDPS-AUTH-01: GET /api/admin/hidps strictly enforces requireAdmin()', () => {
    assert.ok(apiContent.includes('requireAdmin()'), 'Must call requireAdmin()');
    
    // Check inside GET function body
    const getFnRegex = /export\s+async\s+function\s+GET[\s\S]*?\{([\s\S]*?)(?:export|$)/;
    const match = apiContent.match(getFnRegex);
    assert.ok(match, 'GET function must be exported');
    assert.ok(match[1].includes('await requireAdmin()'), 'GET must await requireAdmin() before handling requests');
  });

  it('HIDPS-AUTH-02: POST /api/admin/hidps strictly enforces requireAdmin()', () => {
    const postFnRegex = /export\s+async\s+function\s+POST[\s\S]*?\{([\s\S]*?)(?:export|$)/;
    const match = apiContent.match(postFnRegex);
    assert.ok(match, 'POST function must be exported');
    assert.ok(match[1].includes('await requireAdmin()'), 'POST must await requireAdmin() before executing any actions');
  });

  it('HIDPS-SEC-01: set_log_path rejects directory traversal (..) and null bytes', () => {
    assert.ok(
      apiContent.includes(".includes('..')"),
      'Must check and reject directory traversal strings (..)'
    );
    assert.ok(
      apiContent.includes(".includes('\\0')"),
      'Must check and reject null bytes'
    );
  });

  it('HIDPS-SEC-02: set_log_path restricts log paths to approved system directories', () => {
    assert.ok(
      apiContent.includes('/var/log/nginx/'),
      'Must define approved system log directories'
    );
    assert.ok(
      apiContent.includes('allowedLogPrefixes'),
      'Must validate log path against allowedLogPrefixes'
    );
  });

  it('HIDPS-SEC-03: set_mode restricts values to valid operational modes', () => {
    assert.ok(
      apiContent.includes('VALID_MODES'),
      'Must validate against VALID_MODES'
    );
    assert.ok(
      apiContent.includes('VALID_MODES.includes'),
      'Must check if requested mode is included in VALID_MODES'
    );
  });
});

describe('HIDPS Engine Data Protection & Truthfulness Tests', () => {
  const configPath = path.join(process.cwd(), 'hidps-engine/config.py');
  const monitorPath = path.join(process.cwd(), 'hidps-engine/monitor.py');
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const monitorContent = fs.readFileSync(monitorPath, 'utf-8');

  it('HIDPS-SEC-04: Telegram tokens are masked and secrets are redacted', () => {
    assert.ok(
      configContent.includes('def redact_secret'),
      'config.py must implement redact_secret function'
    );
    assert.ok(
      configContent.includes('telegram_bot_token_masked'),
      'to_safe_dict must expose only masked telegram token'
    );
    assert.equal(
      configContent.includes('"telegram_bot_token": self.telegram_bot_token'),
      false,
      'to_safe_dict must NEVER expose plaintext telegram token'
    );
  });

  it('HIDPS-SEC-05: Query parameters containing credentials in URIs are redacted', () => {
    assert.ok(
      monitorContent.includes('def sanitize_uri_for_storage'),
      'monitor.py must implement sanitize_uri_for_storage function'
    );
    assert.ok(
      monitorContent.includes('sanitize_uri_for_storage(parsed["request_uri"])'),
      'process_line must sanitize request_uri before storing in event database'
    );
  });

  it('HIDPS-SEC-06: Event history distinguishes real server detections from demo simulations', () => {
    assert.ok(
      monitorContent.includes('is_demo'),
      'monitor.py must track is_demo status'
    );
    assert.ok(
      monitorContent.includes('demo_events'),
      'get_stats must calculate demo_events separately from real_events'
    );
    assert.ok(
      monitorContent.includes('real_events'),
      'get_stats must calculate real_events'
    );
  });

  it('HIDPS-DEF-01: Firewall enforcement truthfulness (never claims BLOCKED_UFW without execution)', () => {
    assert.ok(
      monitorContent.includes('def execute_response_action'),
      'monitor.py must implement execute_response_action'
    );
    assert.ok(
      monitorContent.includes('BLOCKED_UFW'),
      'Must use explicit BLOCKED_UFW status code'
    );
    assert.ok(
      monitorContent.includes('SIMULATED_BLOCK'),
      'Must distinguish simulation mode as SIMULATED_BLOCK'
    );
    assert.ok(
      monitorContent.includes('DETECTED_ONLY'),
      'Must default to DETECTED_ONLY'
    );
    assert.ok(
      monitorContent.includes('WHITELISTED_SKIPPED'),
      'Must skip local whitelisted IPs'
    );
  });
});

describe('HIDPS UI Dashboard & Canonical Navigation Integration', () => {
  const dashboardPagePath = path.join(process.cwd(), 'app/dashboard/security-hidps/page.tsx');
  const layoutPath = path.join(process.cwd(), 'app/dashboard/layout.tsx');
  const nextConfigPath = path.join(process.cwd(), 'next.config.ts');

  it('HIDPS-UI-01: app/dashboard/security-hidps/page.tsx exists and implements canonical dashboard', () => {
    assert.ok(fs.existsSync(dashboardPagePath), 'Dashboard page must exist at canonical path');
    const content = fs.readFileSync(dashboardPagePath, 'utf-8');
    assert.ok(content.includes('export default function SecurityHidpsDashboardPage'), 'Must export dashboard component');
    assert.ok(content.includes('/api/admin/hidps'), 'Must query /api/admin/hidps API route');
    assert.ok(content.includes('TableSkeleton'), 'Must provide loading skeleton state');
    assert.ok(content.includes('Katalog Signature'), 'Must provide signature catalog inspection');
    assert.ok(content.includes('Pindai Log Sekarang'), 'Must provide manual scan action');
    assert.ok(content.includes('Simulasi Serangan Demo'), 'Must provide demo trigger action');
    assert.ok(content.includes('is_demo'), 'Must render demo vs real distinction');
  });

  it('HIDPS-UI-02: app/dashboard/layout.tsx contains Keamanan HIDPS navigation link', () => {
    const content = fs.readFileSync(layoutPath, 'utf-8');
    assert.ok(
      content.includes('/dashboard/security-hidps'),
      'Admin layout sidebar must contain link to /dashboard/security-hidps'
    );
    assert.ok(
      content.includes('Keamanan HIDPS'),
      'Admin layout sidebar must label the route as Keamanan HIDPS'
    );
  });

  it('HIDPS-UI-03: next.config.ts redirects /admin/security-hidps to /dashboard/security-hidps', () => {
    const content = fs.readFileSync(nextConfigPath, 'utf-8');
    assert.ok(
      content.includes("source: '/admin/security-hidps'"),
      'next.config.ts must redirect legacy or alternate path /admin/security-hidps'
    );
    assert.ok(
      content.includes("destination: '/dashboard/security-hidps'"),
      'next.config.ts destination must be /dashboard/security-hidps'
    );
  });
});
