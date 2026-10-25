import { NextResponse } from 'next/server';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import { requireAdmin, AuthError } from '@/lib/auth/session';

const execFileAsync = promisify(execFile);

const MONITOR_SCRIPT = path.join(process.cwd(), 'hidps-engine', 'monitor.py');
const VALID_MODES = ['detect_only', 'simulation', 'active_ufw'] as const;
const VALID_CATEGORIES = ['SQLI', 'XSS', 'PATH_TRAVERSAL', 'RFI', 'COMMAND_INJECTION', ''] as const;
const VALID_SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', ''] as const;

async function runMonitorCli(args: string[]): Promise<any> {
  const { stdout } = await execFileAsync('python3', [MONITOR_SCRIPT, ...args], {
    timeout: 15000,
    maxBuffer: 5 * 1024 * 1024,
    cwd: process.cwd(),
  });
  return JSON.parse(stdout);
}

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);
    const category = (searchParams.get('category') || '').trim().toUpperCase();
    const severity = (searchParams.get('severity') || '').trim().toUpperCase();
    const search = (searchParams.get('search') || '').trim().slice(0, 120);

    const safeCategory = VALID_CATEGORIES.includes(category as any) ? category : '';
    const safeSeverity = VALID_SEVERITIES.includes(severity as any) ? severity : '';
    const isDemoParam = searchParams.get('is_demo');

    const cliArgs = [
      '--dashboard-json',
      '--limit',
      String(limit),
      '--offset',
      String(offset),
    ];

    if (safeCategory) {
      cliArgs.push('--category', safeCategory);
    }
    if (safeSeverity) {
      cliArgs.push('--severity', safeSeverity);
    }
    if (search) {
      cliArgs.push('--search', search);
    }
    if (isDemoParam === 'true') {
      cliArgs.push('--demo-only');
    } else if (isDemoParam === 'false') {
      cliArgs.push('--real-only');
    }

    const data = await runMonitorCli(cliArgs);
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    if (err instanceof AuthError) {
      const status = err.code === 'FORBIDDEN' ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error('[HIDPS API GET ERROR]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal memuat status mesin HIDPS.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action.trim() : '';

    if (action === 'run_demo') {
      const result = await runMonitorCli(['--demo']);
      return NextResponse.json({
        success: true,
        message: 'Simulasi serangan 5 kategori berhasil dijalankan dan dianalisis.',
        result,
      });
    }

    if (action === 'scan_now') {
      const result = await runMonitorCli([]);
      return NextResponse.json({
        success: true,
        message: 'Pemindaian file log selesai.',
        result,
      });
    }

    if (action === 'set_mode') {
      const mode = typeof body?.mode === 'string' ? body.mode.trim() : '';
      if (!VALID_MODES.includes(mode as any)) {
        return NextResponse.json(
          { success: false, error: 'Mode operasional tidak valid.' },
          { status: 400 }
        );
      }
      const result = await runMonitorCli(['--set-mode', mode]);
      return NextResponse.json({
        success: true,
        message: `Mode mesin HIDPS berhasil diubah ke '${mode}'.`,
        result,
      });
    }

    if (action === 'set_log_path') {
      const logPath = typeof body?.log_path === 'string' ? body.log_path.trim() : '';
      if (!logPath || logPath.length > 255 || logPath.includes('\0') || logPath.includes('..')) {
        return NextResponse.json(
          { success: false, error: 'Lokasi file log tidak valid atau mengandung path traversal.' },
          { status: 400 }
        );
      }

      const allowedLogPrefixes = [
        '/var/log/nginx/',
        '/var/log/apache2/',
        '/var/log/httpd/',
        path.join(process.cwd(), 'hidps-engine', 'logs'),
      ];

      const isAllowed = allowedLogPrefixes.some(prefix => logPath.startsWith(prefix));
      if (!isAllowed) {
        return NextResponse.json(
          { success: false, error: 'Path log harus berada dalam direktori log server yang diizinkan (/var/log/ atau hidps-engine/logs).' },
          { status: 400 }
        );
      }

      const result = await runMonitorCli(['--set-log-path', logPath]);
      return NextResponse.json({
        success: true,
        message: `Sumber log aktif berhasil diperbarui ke '${logPath}'.`,
        result,
      });
    }

    if (action === 'check_telegram') {
      const result = await runMonitorCli(['--check-telegram']);
      return NextResponse.json({
        success: true,
        result,
      });
    }

    if (action === 'test_telegram') {
      const result = await runMonitorCli(['--test-telegram-message']);
      return NextResponse.json({
        success: result.success,
        message: result.detail,
        result,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Aksi HIDPS tidak dikenali.' },
      { status: 400 }
    );
  } catch (err: any) {
    if (err instanceof AuthError) {
      const status = err.code === 'FORBIDDEN' ? 403 : 401;
      return NextResponse.json({ success: false, error: err.message }, { status });
    }
    console.error('[HIDPS API POST ERROR]:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengeksekusi perintah HIDPS.',
      },
      { status: 500 }
    );
  }
}
