'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  Terminal, 
  Send, 
  RefreshCw, 
  Play, 
  FileSearch, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Search, 
  ExternalLink,
  Info,
  Server,
  Lock,
  Eye,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Flame,
  Radio
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TableSkeleton } from '@/components/ui/table-skeleton';

interface HidpsEvent {
  id: number;
  timestamp: string;
  source_ip: string;
  http_method: string;
  request_uri: string;
  status_code: number | null;
  user_agent: string | null;
  rule_id: string;
  category: string;
  severity: string;
  matched_payload: string;
  action_taken: string;
  telegram_notified: boolean;
  raw_log_hash: string;
  is_demo: boolean;
}

interface LogSource {
  path: string;
  exists: boolean;
  readable: boolean;
  size_bytes: number;
  is_demo: boolean;
}

interface RuleItem {
  rule_id: string;
  category: string;
  name: string;
  severity: string;
  description: string;
}

interface HidpsStatusData {
  engine_name: string;
  version: string;
  state: string;
  daemon_state: string;
  is_daemon_alive: boolean;
  last_heartbeat: string;
  config: {
    db_path: string;
    log_path: string;
    mode: 'detect_only' | 'simulation' | 'active_ufw';
    dedup_window_seconds: number;
    telegram_configured: boolean;
    telegram_bot_token_masked: string;
    telegram_chat_id: string;
    ufw_enabled: boolean;
  };
  metrics: {
    total_events: number;
    real_events: number;
    demo_events: number;
    by_category: Record<string, number>;
    by_severity: Record<string, number>;
    by_action: Record<string, number>;
    top_ips: Array<Record<string, number>>;
  };
  log_sources: LogSource[];
  rules_count: number;
  rules_catalog: RuleItem[];
  telegram: {
    status: string;
    connected: boolean;
    message: string;
    bot_name: string | null;
    username: string | null;
  };
  last_scan_at: string;
  ufw_available_on_host: boolean;
  events?: HidpsEvent[];
  events_total?: number;
}

export default function SecurityHidpsDashboardPage() {
  const [data, setData] = useState<HidpsStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [bannerMessage, setBannerMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Filters & Pagination
  const [page, setPage] = useState(0);
  const [limit] = useState(25);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [sourceTypeFilter, setSourceTypeFilter] = useState<'all' | 'real' | 'demo'>('all');

  // Selected Log Path & Mode
  const [selectedLogPath, setSelectedLogPath] = useState('');
  const [selectedMode, setSelectedMode] = useState<'detect_only' | 'simulation' | 'active_ufw'>('detect_only');

  // Modal Detail
  const [activeEventDetail, setActiveEventDetail] = useState<HidpsEvent | null>(null);
  const [showRuleCatalog, setShowRuleCatalog] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
      });

      if (categoryFilter) params.set('category', categoryFilter);
      if (severityFilter) params.set('severity', severityFilter);
      if (search) params.set('search', search);
      if (sourceTypeFilter === 'demo') params.set('is_demo', 'true');
      if (sourceTypeFilter === 'real') params.set('is_demo', 'false');

      const res = await fetch(`/api/admin/hidps?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Gagal memuat data dari API HIDPS`);
      }
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        setSelectedLogPath(json.data.config.log_path);
        setSelectedMode(json.data.config.mode);
      } else {
        throw new Error(json.error || 'Respon API tidak valid.');
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message || 'Gagal terhubung ke API HIDPS.' });
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, severityFilter, search, sourceTypeFilter]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(page * limit),
        });

        if (categoryFilter) params.set('category', categoryFilter);
        if (severityFilter) params.set('severity', severityFilter);
        if (search) params.set('search', search);
        if (sourceTypeFilter === 'demo') params.set('is_demo', 'true');
        if (sourceTypeFilter === 'real') params.set('is_demo', 'false');

        const res = await fetch(`/api/admin/hidps?${params.toString()}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setData(json.data);
          setSelectedLogPath(json.data.config.log_path);
          setSelectedMode(json.data.config.mode);
        }
      } catch {
        // Handled on loadData
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => { ignore = true; };
  }, [page, limit, categoryFilter, severityFilter, search, sourceTypeFilter]);

  // Execute Action Helper
  const handleApiAction = async (action: string, payload: Record<string, any> = {}) => {
    try {
      setActionLoading(action);
      setBannerMessage(null);
      const res = await fetch('/api/admin/hidps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const json = await res.json();
      if (json.success) {
        setBannerMessage({ type: 'success', text: json.message || 'Operasi berhasil dilakukan.' });
        await loadData(true);
      } else {
        setBannerMessage({ type: 'error', text: json.error || 'Aksi gagal dieksekusi.' });
      }
    } catch (err: any) {
      setBannerMessage({ type: 'error', text: err.message || 'Pengecualian saat mengirim perintah.' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const getSeverityBadgeClass = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20';
      case 'HIGH':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'MEDIUM':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
    }
  };

  const getActionTakenLabel = (act: string) => {
    switch (act) {
      case 'BLOCKED_UFW':
        return { label: 'Diblokir (UFW)', color: 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300' };
      case 'SIMULATED_BLOCK':
        return { label: 'Simulasi Blokir', color: 'text-purple-700 bg-purple-100 dark:bg-purple-950 dark:text-purple-300' };
      case 'WHITELISTED_SKIPPED':
        return { label: 'IP Whitelist', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300' };
      case 'UFW_UNAVAILABLE':
        return { label: 'UFW Tidak Tersedia', color: 'text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-300' };
      default:
        return { label: 'Terdeteksi (Log Only)', color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 rounded-2xl">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Keamanan HIDPS & Deteksi Intrusi
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Host Intrusion Detection and Prevention System — Pemantauan Web Server PPID Kemenag Parepare
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleApiAction('scan_now')}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading === 'scan_now' ? 'animate-spin' : ''}`} />
            <span>Pindai Log Sekarang</span>
          </button>

          <button
            onClick={() => handleApiAction('run_demo')}
            disabled={actionLoading !== null}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${actionLoading === 'run_demo' ? 'animate-spin' : ''}`} />
            <span>Simulasi Serangan Demo</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      <AnimatePresence>
        {bannerMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-2xl flex items-center justify-between border ${
              bannerMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                : bannerMessage.type === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-300'
                : 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-300'
            }`}
          >
            <div className="flex items-center gap-3">
              {bannerMessage.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
              {bannerMessage.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
              {bannerMessage.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
              <span className="text-sm font-medium">{bannerMessage.text}</span>
            </div>
            <button
              onClick={() => setBannerMessage(null)}
              className="p-1 hover:opacity-75 transition-opacity"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Engine Status & Mode Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Engine State */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Status Mesin HIDPS
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              data?.state === 'ACTIVE' 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
            }`}>
              <span className={`w-2 h-2 rounded-full ${data?.state === 'ACTIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
              {data?.state === 'ACTIVE' ? 'AKTIF (Online)' : 'STANDBY (Siap)'}
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {data ? (data.metrics.total_events) : 0} <span className="text-sm font-medium text-slate-500">total insiden</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
            <span>Real: <strong className="text-slate-700 dark:text-slate-300">{data?.metrics.real_events ?? 0}</strong></span>
            <span>Simulasi: <strong className="text-slate-700 dark:text-slate-300">{data?.metrics.demo_events ?? 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Mode Operasional */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mode Pertahanan
            </span>
            <Radio className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-slate-900 dark:text-white capitalize">
            {selectedMode === 'detect_only' && 'Deteksi Saja (Log)'}
            {selectedMode === 'simulation' && 'Simulasi Blokir'}
            {selectedMode === 'active_ufw' && 'Firewall UFW Aktif'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>UFW Host:</span>
            <span className={data?.ufw_available_on_host ? 'text-emerald-600 font-semibold' : 'text-slate-400'}>
              {data?.ufw_available_on_host ? 'Tersedia di OS' : 'Tidak Terpasang (Safe)'}
            </span>
          </div>
        </div>

        {/* Card 3: Telegram Bot Health */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Notifikasi Telegram
            </span>
            <Send className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
              data?.telegram.connected
                ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {data?.telegram.connected ? 'TERHUBUNG' : 'BELUM DIKONFIGURASI'}
            </span>
            {data?.telegram.username && (
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                @{data.telegram.username}
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <button
              onClick={() => handleApiAction('test_telegram')}
              disabled={actionLoading !== null}
              className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline font-semibold"
            >
              Uji Kirim Pesan
            </button>
            <span className="text-[10px] text-slate-400">
              {data?.config.telegram_bot_token_masked || 'Tanpa Token'}
            </span>
          </div>
        </div>

        {/* Card 4: Signature Catalog */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Aturan Signature
            </span>
            <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
            {data?.rules_count || 21} <span className="text-sm font-medium text-slate-500">aturan aktif</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span>5 Kategori Serangan</span>
            <button
              onClick={() => setShowRuleCatalog(!showRuleCatalog)}
              className="text-purple-600 dark:text-purple-400 hover:underline font-semibold"
            >
              {showRuleCatalog ? 'Tutup Katalog' : 'Lihat Detail'}
            </button>
          </div>
        </div>
      </div>

      {/* Rule Catalog Modal / Accordion */}
      <AnimatePresence>
        {showRuleCatalog && data?.rules_catalog && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-white dark:bg-slate-900 rounded-3xl p-6 border border-purple-200 dark:border-purple-900/50 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-600" />
                Katalog Signature Deteksi Intrusi (OWASP CRS Normalized)
              </h3>
              <span className="text-xs text-slate-500">ReDoS Protected (Max 8192 bytes bound)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.rules_catalog.map((rule) => (
                <div key={rule.rule_id} className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                      {rule.rule_id}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getSeverityBadgeClass(rule.severity)}`}>
                      {rule.severity}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    {rule.name}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {rule.description}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Attack Vectors 5 Categories Breakdown */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-500" />
          Distribusi Vektor Serangan Terdeteksi
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { cat: 'SQLI', name: 'SQL Injection', color: 'border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-400' },
            { cat: 'XSS', name: 'Cross-Site Scripting', color: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400' },
            { cat: 'PATH_TRAVERSAL', name: 'Path Traversal / LFI', color: 'border-blue-200 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400' },
            { cat: 'RFI', name: 'Remote File Inclusion', color: 'border-purple-200 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400' },
            { cat: 'COMMAND_INJECTION', name: 'Command Injection', color: 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400' },
          ].map((item) => {
            const count = data?.metrics.by_category[item.cat] || 0;
            return (
              <div key={item.cat} className={`p-4 rounded-2xl border ${item.color} space-y-1`}>
                <div className="text-xs font-semibold opacity-80">{item.name}</div>
                <div className="text-2xl font-black tabular-nums">{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Log Source Manager & Controls */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileSearch className="w-5 h-5 text-emerald-600" />
              Manajemen Sumber Log Web Server
            </h3>
            <p className="text-xs text-slate-500">
              Pilih berkas access.log aktif untuk dipantau oleh mesin pencocokan pola signature.
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Aktif: <span className="font-bold text-slate-800 dark:text-slate-200">{data?.config.log_path}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {data?.log_sources.map((src) => {
            const isCurrent = src.path === data.config.log_path;
            return (
              <div 
                key={src.path}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent 
                    ? 'border-emerald-500 bg-emerald-500/5 ring-1 ring-emerald-500' 
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 break-all">
                    {src.path}
                  </div>
                  {src.is_demo && (
                    <span className="shrink-0 text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-bold">
                      DEMO LOG
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200/50 dark:border-slate-800">
                  <span>Ukuran: {formatFileSize(src.size_bytes)}</span>
                  <span className={src.readable ? 'text-emerald-600 font-medium' : 'text-slate-400'}>
                    {src.readable ? 'Dapat Dibaca' : 'Tidak Ditemukan'}
                  </span>
                </div>
                {!isCurrent && src.readable && (
                  <button
                    onClick={() => handleApiAction('set_log_path', { log_path: src.path })}
                    disabled={actionLoading !== null}
                    className="w-full mt-3 py-1.5 px-3 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    Gunakan Sumber Log Ini
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Log Table with Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Riwayat Kejadian Deteksi Intrusi (Incident History)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Menampilkan log deteksi yang tersimpan secara persisten pada hidps_events.db
              </p>
            </div>

            {/* Source Type Filter (Pills) */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => { setSourceTypeFilter('all'); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  sourceTypeFilter === 'all' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Semua ({data?.metrics.total_events || 0})
              </button>
              <button
                onClick={() => { setSourceTypeFilter('real'); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  sourceTypeFilter === 'real' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Server Nyata ({data?.metrics.real_events || 0})
              </button>
              <button
                onClick={() => { setSourceTypeFilter('demo'); setPage(0); }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  sourceTypeFilter === 'demo' 
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Simulasi Demo ({data?.metrics.demo_events || 0})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari IP, URI, atau Rule ID..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 text-slate-900 dark:text-white"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
            >
              <option value="">Semua Kategori Serangan</option>
              <option value="SQLI">SQL Injection (SQLI)</option>
              <option value="XSS">Cross-Site Scripting (XSS)</option>
              <option value="PATH_TRAVERSAL">Path Traversal / LFI</option>
              <option value="RFI">Remote File Inclusion (RFI)</option>
              <option value="COMMAND_INJECTION">Command Injection</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => { setSeverityFilter(e.target.value); setPage(0); }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
            >
              <option value="">Semua Tingkat Risiko</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="p-6">
            <TableSkeleton />
          </div>
        ) : !data?.events || data.events.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <ShieldCheck className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Tidak Ada Event Deteksi yang Cocok
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Tidak ditemukan insiden yang sesuai dengan filter saat ini. Coba ubah kata kunci atau jalankan pemindaian log.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-slate-950/60 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">IP Sumber</th>
                  <th className="px-6 py-4">Metode & Target URI</th>
                  <th className="px-6 py-4">Kategori & Aturan</th>
                  <th className="px-6 py-4">Risiko</th>
                  <th className="px-6 py-4">Tindakan</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4 text-right">Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {data.events.map((ev) => {
                  const act = getActionTakenLabel(ev.action_taken);
                  return (
                    <tr 
                      key={ev.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {ev.timestamp ? ev.timestamp.replace('T', ' ').slice(0, 19) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {ev.source_ip}
                      </td>
                      <td className="px-6 py-4 max-w-xs truncate">
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          <span className="font-bold text-emerald-700 dark:text-emerald-400">{ev.http_method}</span>
                          <span className="text-slate-700 dark:text-slate-300 truncate" title={ev.request_uri}>
                            {ev.request_uri}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="font-bold text-xs text-slate-900 dark:text-white">
                            {ev.category}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {ev.rule_id}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${getSeverityBadgeClass(ev.severity)}`}>
                          {ev.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${act.color}`}>
                          {act.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ev.is_demo ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                            DEMO
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            SERVER
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setActiveEventDetail(ev)}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Lihat
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Menampilkan <strong className="text-slate-800 dark:text-slate-200">{data?.events?.length || 0}</strong> dari{' '}
            <strong className="text-slate-800 dark:text-slate-200">{data?.events_total || 0}</strong> total event
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Halaman {page + 1}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!data?.events_total || (page + 1) * limit >= data.events_total || loading}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Event Detail Modal (Safe Plain-Text Rendering) */}
      <AnimatePresence>
        {activeEventDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${getSeverityBadgeClass(activeEventDetail.severity)}`}>
                      {activeEventDetail.severity}
                    </span>
                    <span className="font-mono text-xs text-slate-500">
                      ID #{activeEventDetail.id}
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                    Insiden Keamanan {activeEventDetail.category}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveEventDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-400 block">IP Penyerang</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                      {activeEventDetail.source_ip}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Waktu Deteksi (UTC)</span>
                    <span className="font-mono font-medium text-slate-900 dark:text-white">
                      {activeEventDetail.timestamp}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Rule ID</span>
                    <span className="font-mono font-semibold text-purple-600 dark:text-purple-400">
                      {activeEventDetail.rule_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Tindakan Respons</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {activeEventDetail.action_taken}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Target HTTP URI (Tersanitasi)</span>
                  <div className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs break-all">
                    {activeEventDetail.http_method} {activeEventDetail.request_uri}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">Potongan Payload Berbahaya yang Cocok</span>
                  <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/20 text-red-300 font-mono text-xs break-all whitespace-pre-wrap">
                    {activeEventDetail.matched_payload}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">User-Agent Header</span>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-mono text-xs break-all">
                    {activeEventDetail.user_agent || '-'}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400 block mb-1">SHA-256 Hash Log Mentah</span>
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 font-mono text-[10px] break-all">
                    {activeEventDetail.raw_log_hash}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={() => setActiveEventDetail(null)}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
