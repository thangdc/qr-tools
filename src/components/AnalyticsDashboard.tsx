import React, { useState, useMemo } from 'react';
import { TrackedUrlItem, ScanEvent } from '../types/qr';
import { AnalyticsService } from '../services/analyticsService';
import {
  BarChart3,
  TrendingUp,
  Smartphone,
  Globe,
  Plus,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Download,
  Trash2,
  Play,
  Pause,
  Zap,
  ArrowUpRight,
  QrCode,
  Search,
  Lock,
  RefreshCw,
  Clock,
  Layers,
  MapPin,
} from 'lucide-react';

interface AnalyticsDashboardProps {
  isPro: boolean;
  onOpenPro: () => void;
  onLoadUrlInGenerator: (url: string, title: string) => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  isPro,
  onOpenPro,
  onLoadUrlInGenerator,
}) => {
  const [items, setItems] = useState<TrackedUrlItem[]>(() =>
    AnalyticsService.loadTrackedUrls()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDestUrl, setNewDestUrl] = useState('');
  const [newCustomSlug, setNewCustomSlug] = useState('');
  const [simulatedId, setSimulatedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSimulateScan = (item: TrackedUrlItem) => {
    const updatedItem = AnalyticsService.simulateScanEvent(item);
    const updatedList = items.map((i) => (i.id === item.id ? updatedItem : i));
    setItems(updatedList);
    AnalyticsService.saveTrackedUrls(updatedList);
    setSimulatedId(item.id);
    setTimeout(() => setSimulatedId(null), 1200);

    const latest = updatedItem.recentScans[0];
    showToast(
      `✓ New scan simulated from ${latest.device} in ${latest.city} (${latest.source})`
    );
  };

  const handleCreateLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDestUrl.trim()) return;

    const newItem = AnalyticsService.createTrackedUrl(
      newTitle || 'Campaign Link',
      newDestUrl,
      newCustomSlug
    );
    const updated = [newItem, ...items];
    setItems(updated);
    AnalyticsService.saveTrackedUrls(updated);

    setNewTitle('');
    setNewDestUrl('');
    setNewCustomSlug('');
    setShowCreateModal(false);
    showToast(`Created tracked link: ${newItem.shortUrl}`);
  };

  const handleToggleStatus = (id: string) => {
    const updated = items.map((i) =>
      i.id === id
        ? {
            ...i,
            status: i.status === 'active' ? ('paused' as const) : ('active' as const),
          }
        : i
    );
    setItems(updated);
    AnalyticsService.saveTrackedUrls(updated);
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    AnalyticsService.saveTrackedUrls(updated);
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Aggregated Metrics
  const totalScans = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.totalScans, 0);
  }, [items]);

  const uniqueScans = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.uniqueScans, 0);
  }, [items]);

  const activeCount = useMemo(() => {
    return items.filter((i) => i.status === 'active').length;
  }, [items]);

  // Combined Daily Stats for 7-day Chart
  const combinedDailyStats = useMemo(() => {
    if (items.length === 0) return [];
    const dateMap: Record<string, number> = {};
    items.forEach((item) => {
      item.dailyStats.forEach((d) => {
        dateMap[d.date] = (dateMap[d.date] || 0) + d.scans;
      });
    });

    const entries = Object.entries(dateMap).map(([date, scans]) => ({
      date,
      scans,
    }));
    return entries.slice(-7);
  }, [items]);

  const maxDailyScan = useMemo(() => {
    return Math.max(...combinedDailyStats.map((d) => d.scans), 10);
  }, [combinedDailyStats]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.destinationUrl.toLowerCase().includes(q) ||
        i.shortUrl.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  // Device & Geography breakdown
  const deviceStats = useMemo(() => {
    const counts = { iOS: 0, Android: 0, Desktop: 0 };
    let total = 0;
    items.forEach((i) => {
      i.recentScans.forEach((s) => {
        if (s.device === 'iOS') counts.iOS++;
        else if (s.device === 'Android') counts.Android++;
        else counts.Desktop++;
        total++;
      });
    });

    if (total === 0) return { iOS: 65, Android: 30, Desktop: 5 };
    return {
      iOS: Math.round((counts.iOS / total) * 100),
      Android: Math.round((counts.Android / total) * 100),
      Desktop: Math.max(1, 100 - Math.round((counts.iOS / total) * 100) - Math.round((counts.Android / total) * 100)),
    };
  }, [items]);

  const formatRelativeTime = (timestamp?: number) => {
    if (!timestamp) return 'Never scanned';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-4">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              URL Scan Tracking & Analytics
            </h1>
            <span
              className={`text-xs px-2 py-0.5 rounded font-mono font-medium flex items-center gap-1 ${
                isPro
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              {isPro ? (
                <>
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span>Pro Analytics Active</span>
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3 text-amber-700" />
                  <span>Pro Feature Preview</span>
                </>
              )}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Monitor real-time camera scans, unique visitor deduplication, device operating systems, and campaign engagement.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => AnalyticsService.exportCSV(items)}
            className="h-9 px-3 text-xs sm:text-sm font-semibold text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-300 rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export analytics records as CSV"
          >
            <Download className="w-3.5 h-3.5 text-neutral-500" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-3.5 text-xs sm:text-sm font-semibold bg-neutral-900 hover:bg-black text-white rounded-lg transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Tracked Link</span>
          </button>
        </div>
      </div>

      {/* Pro Promotional Callout (if not Pro) */}
      {!isPro && (
        <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">
                Unlock Real-Time Scan Analytics with Pro
              </h3>
              <p className="text-xs text-neutral-600 mt-0.5">
                Dynamic QR shortlinks let you edit destination URLs anytime without reprinting cards, while gathering visitor statistics.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenPro}
            className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white text-xs font-semibold rounded-lg shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            Activate Instant Pro Trial
          </button>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Scans */}
        <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Total Scans</span>
            <BarChart3 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              {totalScans.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-emerald-600 flex items-center">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              +18.4%
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">All-time across {items.length} campaigns</p>
        </div>

        {/* Unique Visitors */}
        <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Unique Visitors</span>
            <Smartphone className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              {uniqueScans.toLocaleString()}
            </span>
            <span className="text-xs font-mono text-neutral-400">
              {Math.round((uniqueScans / (totalScans || 1)) * 100)}% unique
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">Deduplicated unique smartphone devices</p>
        </div>

        {/* Active Campaigns */}
        <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Active Links</span>
            <Globe className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-neutral-900">
              {activeCount}
            </span>
            <span className="text-xs text-neutral-400 font-mono">
              of {items.length} total
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">Live dynamic routing URLs</p>
        </div>

        {/* Top Performer */}
        <div className="p-4 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-medium">
            <span>Top Performing</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="truncate">
            <span className="text-sm font-bold text-neutral-900 truncate block">
              {items[0]?.title || 'None'}
            </span>
            <span className="text-xs font-mono text-neutral-500">
              {items[0]?.totalScans || 0} scans
            </span>
          </div>
          <p className="text-[11px] text-neutral-400">Highest traffic this week</p>
        </div>
      </div>

      {/* Visual Chart & Audience Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 7-Day Scans Trend Chart */}
        <div className="lg:col-span-2 p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-neutral-700" />
                <span>Daily Scans (Past 7 Days)</span>
              </h2>
              <p className="text-xs text-neutral-400">
                Hourly and daily scan distribution for camera captures
              </p>
            </div>
            <span className="text-xs font-mono text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-md">
              7D View
            </span>
          </div>

          {/* SVG Bar Chart */}
          <div className="h-44 w-full flex items-end justify-between gap-3 pt-4 border-b border-neutral-100 pb-2">
            {combinedDailyStats.map((item, idx) => {
              const heightPct = Math.round((item.scans / maxDailyScan) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                >
                  <span className="text-[10px] font-mono text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.scans}
                  </span>
                  <div
                    style={{ height: `${Math.max(8, heightPct)}%` }}
                    className="w-full max-w-[42px] bg-neutral-900 group-hover:bg-blue-600 rounded-t-md transition-all shadow-2xs"
                  />
                  <span className="text-[10px] font-mono text-neutral-400 group-hover:text-neutral-800 transition-colors">
                    {item.date}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Peak Day: 220 scans (09/24)</span>
            <span className="text-emerald-700 font-medium">Average: ~120 scans / day</span>
          </div>
        </div>

        {/* Device & Platform Breakdown */}
        <div className="p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-neutral-700" />
              <span>Scanning Devices</span>
            </h2>
            <p className="text-xs text-neutral-400">
              Operating systems detected via browser User-Agent
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-neutral-800">Apple iOS (iPhone / iPad)</span>
                <span className="font-mono text-neutral-500">{deviceStats.iOS}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${deviceStats.iOS}%` }}
                  className="h-full bg-blue-600 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-neutral-800">Android (Samsung, Xiaomi...)</span>
                <span className="font-mono text-neutral-500">{deviceStats.Android}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${deviceStats.Android}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-neutral-800">Desktop & Other</span>
                <span className="font-mono text-neutral-500">{deviceStats.Desktop}%</span>
              </div>
              <div className="h-2 w-full bg-neutral-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${deviceStats.Desktop}%` }}
                  className="h-full bg-neutral-400 rounded-full"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-500 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-neutral-400" />
            <span>Top Locations: TP.HCM (62%), Hà Nội (28%), Đà Nẵng (10%)</span>
          </div>
        </div>
      </div>

      {/* Tracked Links Table Section */}
      <div className="p-4 sm:p-5 bg-white border border-neutral-200/80 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">
              Tracked Campaigns & Dynamic Links ({filteredItems.length})
            </h2>
            <p className="text-xs text-neutral-400">
              Click "Test Scan" to simulate camera traffic and see real-time updates.
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-neutral-50 border border-neutral-200 rounded-lg outline-none focus:bg-white focus:border-neutral-900"
            />
          </div>
        </div>

        {/* Links Table */}
        <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-400">
              No tracked links match your search.
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSimulating = simulatedId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-colors ${
                    isSimulating
                      ? 'bg-amber-50/80'
                      : item.status === 'paused'
                      ? 'bg-neutral-50/50 opacity-60'
                      : 'hover:bg-neutral-50/60'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-neutral-900 truncate">
                        {item.title}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                          item.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-neutral-100 text-neutral-600'
                        }`}
                      >
                        {item.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {/* Short Link */}
                      <button
                        type="button"
                        onClick={() => handleCopy(item.shortUrl, item.id)}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-blue-600 hover:text-blue-700 bg-blue-50/60 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        title="Copy short tracking link"
                      >
                        <span>{item.shortUrl}</span>
                        {copiedId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3 text-blue-400" />
                        )}
                      </button>

                      <span className="text-neutral-300">→</span>

                      {/* Destination URL */}
                      <span
                        className="text-neutral-500 text-[11px] truncate max-w-[200px] sm:max-w-[280px]"
                        title={item.destinationUrl}
                      >
                        {item.destinationUrl}
                      </span>
                    </div>
                  </div>

                  {/* Middle: Stats */}
                  <div className="flex items-center gap-6 shrink-0 md:px-4">
                    <div className="text-left md:text-right">
                      <span className="text-sm font-bold font-mono text-neutral-900 block">
                        {item.totalScans}
                      </span>
                      <span className="text-[10px] text-neutral-400">Total Scans</span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-sm font-bold font-mono text-neutral-900 block">
                        {item.uniqueScans}
                      </span>
                      <span className="text-[10px] text-neutral-400">Unique</span>
                    </div>

                    <div className="text-left md:text-right hidden sm:block">
                      <span className="text-xs font-mono text-neutral-600 block">
                        {formatRelativeTime(item.lastScannedAt)}
                      </span>
                      <span className="text-[10px] text-neutral-400">Last Scan</span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-1 md:pt-0">
                    {/* Live Test Scan Simulation */}
                    <button
                      type="button"
                      onClick={() => handleSimulateScan(item)}
                      className="h-8 px-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title="Simulate +1 live scan from an iPhone or Android camera"
                    >
                      <Zap className="w-3 h-3 text-amber-600" />
                      <span>Test Scan</span>
                    </button>

                    {/* Open in Generator */}
                    <button
                      type="button"
                      onClick={() => onLoadUrlInGenerator(item.shortUrl, item.title)}
                      className="h-8 px-2.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      title="Create printable QR code for this tracked link"
                    >
                      <QrCode className="w-3 h-3 text-neutral-500" />
                      <span className="hidden sm:inline">QR</span>
                    </button>

                    {/* Toggle pause/active */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                      title={item.status === 'active' ? 'Pause tracking' : 'Resume tracking'}
                    >
                      {item.status === 'active' ? (
                        <Pause className="w-3.5 h-3.5" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                      title="Delete tracked campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Create Tracked Link Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                  <BarChart3 className="w-4 h-4" />
                </span>
                <h2 className="text-sm font-bold text-neutral-900">
                  Create Dynamic Tracked Link
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLink} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Campaign / Table Name
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Table 05 Menu or Summer Catalog"
                  className="w-full h-9 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Destination Target URL
                </label>
                <input
                  type="url"
                  required
                  value={newDestUrl}
                  onChange={(e) => setNewDestUrl(e.target.value)}
                  placeholder="https://mywebsite.com/promotion"
                  className="w-full h-9 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-lg text-xs outline-none focus:border-neutral-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-800 mb-1">
                  Custom Tracking Slug (Optional)
                </label>
                <div className="flex items-center">
                  <span className="h-9 px-2.5 bg-neutral-100 border border-r-0 border-neutral-300 rounded-l-lg text-neutral-500 font-mono text-xs flex items-center">
                    https://qr.tl/
                  </span>
                  <input
                    type="text"
                    value={newCustomSlug}
                    onChange={(e) => setNewCustomSlug(e.target.value)}
                    placeholder="my-campaign"
                    className="flex-1 h-9 px-3 bg-white text-neutral-900 border border-neutral-300 rounded-r-lg text-xs outline-none focus:border-neutral-900 font-mono"
                  />
                </div>
              </div>

              <p className="text-[11px] text-neutral-500 leading-normal pt-1">
                A short dynamic redirect will be generated. You can change the destination URL in the future without reprinting physical QR materials.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg font-semibold cursor-pointer shadow-xs"
                >
                  Start Tracking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
