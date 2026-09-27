import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../i18n';
import QRCode from 'qrcode';
import { QRDesignOptions, QRType, QRTemplate } from '../types/qr';
import {
  renderTemplatedQR,
  RenderTemplateOptions,
  QRRenderingService,
} from '../utils/templateRenderer';
import {
  computeDiagnostics,
  QRDiagnostics,
} from '../utils/qrRenderer';
import {
  Download,
  Copy,
  Check,
  Printer,
  Bookmark,
  FileCode2,
  ChevronDown,
  LayoutTemplate,
  AlertTriangle,
  Ruler,
  Star,
  Maximize2,
  Utensils,
  CreditCard,
  Layout,
  Type,
  Square,
  Sparkles,
  Sliders,
  Plus,
  Smartphone,
  Calendar,
  Wifi,
  Compass,
  User,
  ExternalLink,
} from 'lucide-react';

interface QRPreviewProps {
  payload: string;
  type: QRType;
  title: string;
  subtitle: string;
  templates: QRTemplate[];
  activeTemplate: QRTemplate;
  onSelectTemplate: (templateId: string) => void;
  isGenerating?: boolean;
  extraTemplateInfo?: RenderTemplateOptions;
  onOpenTemplateStudio: () => void;
  onSaveToHistory: (dataUrl: string) => boolean;
  onPrintSingle: (dataUrl: string) => void;
  isPro: boolean;
  onOpenPro: () => void;
  onOpenMetricHandoff: () => void;
}

export const QRPreview: React.FC<QRPreviewProps> = ({
  payload,
  type,
  title,
  subtitle,
  templates,
  activeTemplate,
  onSelectTemplate,
  isGenerating,
  extraTemplateInfo,
  onOpenTemplateStudio,
  onSaveToHistory,
  onPrintSingle,
  isPro,
  onOpenPro,
  onOpenMetricHandoff,
}) => {
  const { tx } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [svgString, setSvgString] = useState<string>('');
  const [copiedImg, setCopiedImg] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const [saved, setSaved] = useState(false);
  const [downloadRes, setDownloadRes] = useState<512 | 1024 | 2048>(1024);
  const [resDropdownOpen, setResDropdownOpen] = useState(false);
  const [templateDropdownOpen, setTemplateDropdownOpen] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<QRDiagnostics | null>(null);

  // Stage presentation controls
  const [stageMode, setStageMode] = useState<'flat' | 'stand'>('flat');
  const [environmentBg, setEnvironmentBg] = useState<'blueprint' | 'studio' | 'dark'>('blueprint');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showScanSimulator, setShowScanSimulator] = useState(false);
  const [simToast, setSimToast] = useState<string | null>(null);

  // Close template dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTemplateDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Render QR code onto canvas using the active template via centralized rendering service
  useEffect(() => {
    if (!payload || !canvasRef.current) {
      setDataUrl('');
      setSvgString('');
      setDiagnostics(null);
      return;
    }

    let isCancelled = false;
    setRenderError(null);

    const render = async () => {
      try {
        const canvas = canvasRef.current;
        if (!canvas) return;

        await renderTemplatedQR(
          canvas,
          payload,
          activeTemplate,
          {
            label: title,
            subtitle,
            type,
            ...extraTemplateInfo,
          },
          380
        );

        if (isCancelled) return;

        const url = canvas.toDataURL('image/png');
        setDataUrl(url);

        const effectiveDesign = QRRenderingService.getEffectiveDesign(activeTemplate);
        const diag = computeDiagnostics(payload, effectiveDesign);
        setDiagnostics(diag);

        const svg = await QRCode.toString(payload, {
          type: 'svg',
          margin: effectiveDesign.margin,
          color: {
            dark: effectiveDesign.fgColor,
            light: effectiveDesign.bgColor,
          },
          errorCorrectionLevel: effectiveDesign.errorCorrectionLevel,
        });

        if (!isCancelled) {
          setSvgString(svg);
        }
      } catch (err: any) {
        console.error('QR rendering error', err);
        setRenderError(err?.message || 'Could not generate QR code for this input.');
      }
    };

    render();

    return () => {
      isCancelled = true;
    };
  }, [payload, activeTemplate, title, subtitle, type, extraTemplateInfo]);

  // High resolution download trigger with active template via centralized rendering service
  const handleDownloadPNG = async (res = downloadRes) => {
    if (!payload) return;
    if (res >= 2048 && !isPro) {
      onOpenPro();
      return;
    }

    try {
      const highResUrl = await QRRenderingService.renderToDataUrl(
        payload,
        activeTemplate,
        {
          label: title,
          subtitle,
          type,
          ...extraTemplateInfo,
        },
        res
      );

      const filename = `qr-${activeTemplate.layout}-${type}-${Date.now()}.png`;
      const a = document.createElement('a');
      a.href = highResUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${type}-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (blob && navigator.clipboard && window.ClipboardItem) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ]);
            setCopiedImg(true);
            setTimeout(() => setCopiedImg(false), 2000);
            return;
          } catch {
            // fallback
          }
        }
        await navigator.clipboard.writeText(payload);
        setCopiedImg(true);
        setTimeout(() => setCopiedImg(false), 2000);
      });
    } catch {
      await navigator.clipboard.writeText(payload);
      setCopiedImg(true);
      setTimeout(() => setCopiedImg(false), 2000);
    }
  };

  const handleCopySVG = async () => {
    if (!svgString) return;
    try {
      await navigator.clipboard.writeText(svgString);
      setCopiedSvg(true);
      setTimeout(() => setCopiedSvg(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSave = () => {
    if (!dataUrl) return;
    const didSave = onSaveToHistory(dataUrl);
    setSaved(didSave);
    setTimeout(() => setSaved(false), 2000);
  };

  const isEmpty = !payload || payload.trim().length === 0;

  // Icon mapping for template types
  const getTemplateIcon = (layout: string) => {
    switch (layout) {
      case 'bare':
        return Square;
      case 'framed':
        return Type;
      case 'table-tent':
        return Utensils;
      case 'bank-stand':
        return CreditCard;
      case 'minimal-card':
        return Layout;
      case 'dark-card':
        return Sparkles;
      default:
        return LayoutTemplate;
    }
  };

  const ActiveIcon = getTemplateIcon(activeTemplate.layout);

  // Scan simulator metadata based on type
  const getSimAction = () => {
    switch (type) {
      case 'url':
        return {
          icon: ExternalLink,
          title: 'Website Link',
          subtitle: payload.replace(/^https?:\/\//i, '').slice(0, 32) || 'Open web page',
          btn: 'Open Safari',
        };
      case 'wifi':
        return {
          icon: Wifi,
          title: 'Wi-Fi Network',
          subtitle: `Connect to ${extraTemplateInfo?.wifiSsid || title}`,
          btn: 'Join Network',
        };
      case 'payment':
        return {
          icon: CreditCard,
          title: 'VietQR · Napas 247',
          subtitle: 'Open Banking App to Transfer',
          btn: 'Pay Now',
        };
      case 'event':
        return {
          icon: Calendar,
          title: 'Calendar Event',
          subtitle: title || 'Add to Calendar',
          btn: 'Add Event',
        };
      case 'contact':
        return {
          icon: User,
          title: 'vCard Contact',
          subtitle: title || 'Save new contact',
          btn: 'Save Contact',
        };
      default:
        return {
          icon: Compass,
          title: `${type.toUpperCase()} Code`,
          subtitle: payload.slice(0, 32),
          btn: 'Open',
        };
    }
  };

  const sim = getSimAction();
  const SimIcon = sim.icon;

  return (
    <div className="flex flex-col h-full bg-white border border-neutral-200/80 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Stage Header */}
      <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 truncate pr-2">
          <span className="text-[11px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
            {type.toUpperCase()}
          </span>
          <span className="text-neutral-300">·</span>
          <span className="text-xs font-medium text-neutral-800 truncate max-w-[170px] sm:max-w-[210px]">
            {isEmpty ? 'Waiting for input' : title}
          </span>
        </div>

        {/* Simulator & 3D Stand controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Phone Viewfinder Simulator Toggle */}
          <button
            type="button"
            onClick={() => setShowScanSimulator(!showScanSimulator)}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border flex items-center gap-1 ${
              showScanSimulator
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
            title="Simulate Camera Viewfinder & Smartphone Prompt"
          >
            <Smartphone className="w-3 h-3" />
            <span>{tx('Mô phỏng quét', 'Scan Sim')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowScanSimulator(false);
              setStageMode(stageMode === 'flat' ? 'stand' : 'flat');
            }}
            className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer border ${
              stageMode === 'stand' && !showScanSimulator
                ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs'
                : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'
            }`}
            title="Toggle 3D Acrylic Stand Mockup View"
          >
            3D Stand
          </button>

          <button
            type="button"
            onClick={() =>
              setEnvironmentBg(
                environmentBg === 'blueprint'
                  ? 'studio'
                  : environmentBg === 'studio'
                  ? 'dark'
                  : 'blueprint'
              )
            }
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
            title={`Stage Lighting: ${environmentBg}`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <span
            className={`w-1.5 h-1.5 rounded-full ml-1 ${
              isEmpty
                ? 'bg-neutral-300'
                : isGenerating
                ? 'bg-amber-400 animate-ping'
                : 'bg-emerald-500'
            }`}
          />
        </div>
      </div>

      {/* Accessible Template Selector (Combobox + Direct Quick Chips) */}
      <div className="px-3.5 py-2.5 bg-neutral-50/90 border-b border-neutral-100 flex flex-wrap items-center justify-between gap-2 relative">
        <div ref={dropdownRef} className="relative flex-1 min-w-[200px]">
          <button
            type="button"
            onClick={() => setTemplateDropdownOpen(!templateDropdownOpen)}
            className="w-full h-8 px-2.5 bg-white border border-neutral-200/90 hover:border-neutral-300 rounded-lg text-xs flex items-center justify-between gap-2 shadow-2xs transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-1.5 truncate">
              <ActiveIcon className="w-3.5 h-3.5 text-neutral-700 shrink-0" />
              <span className="font-semibold text-neutral-900 truncate">
                {activeTemplate.name}
              </span>
              {activeTemplate.isDefault && (
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200/60 shrink-0">
                  DEFAULT
                </span>
              )}
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-neutral-400 shrink-0 transition-transform ${
                templateDropdownOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {templateDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 rounded-xl shadow-xl py-1.5 z-40 max-h-72 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                Select Display Template ({templates.length})
              </div>

              {templates.map((tmpl) => {
                const isSelected = tmpl.id === activeTemplate.id;
                const Icon = getTemplateIcon(tmpl.layout);

                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      onSelectTemplate(tmpl.id);
                      setTemplateDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between hover:bg-neutral-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-neutral-100/70 font-semibold text-neutral-900' : 'text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-neutral-900' : 'text-neutral-400'}`} />
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate">{tmpl.name}</span>
                          {tmpl.isDefault && (
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500 shrink-0" />
                          )}
                        </div>
                        <span className="text-[10px] text-neutral-400 font-normal line-clamp-1">
                          {tmpl.description}
                        </span>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-neutral-900 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })}

              <div className="p-2 border-t border-neutral-100 mt-1">
                <button
                  type="button"
                  onClick={() => {
                    setTemplateDropdownOpen(false);
                    onOpenTemplateStudio();
                  }}
                  className="w-full py-1.5 px-2 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{tx('Tạo / Tùy chỉnh mẫu...', 'Create / Customize Template...')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenTemplateStudio}
          className="h-8 px-2.5 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-100 border border-neutral-200/90 rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
          title={tx('Mở kho quản lý mẫu', 'Open Template Manager Studio')}
        >
          <LayoutTemplate className="w-3.5 h-3.5 text-neutral-400" />
          <span>{tx('Kho mẫu', 'Studio')}</span>
        </button>
      </div>

      {/* Stage Canvas Viewport */}
      <div
        className={`flex-1 flex flex-col items-center justify-center p-6 sm:p-8 min-h-[350px] relative transition-colors duration-200 ${
          environmentBg === 'blueprint'
            ? 'bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] bg-neutral-50/60'
            : environmentBg === 'studio'
            ? 'bg-gradient-to-b from-amber-50/20 via-neutral-100/50 to-neutral-200/40'
            : 'bg-neutral-900 text-white'
        }`}
      >
        {isEmpty ? (
          <div className="w-64 h-64 border border-dashed border-neutral-300 rounded-xl flex flex-col items-center justify-center text-center p-6 bg-white/80 shadow-2xs">
            <span className="text-xs font-semibold text-neutral-700 mb-1">
              Live QR Stage
            </span>
            <p className="text-[11px] text-neutral-400 leading-normal">
              Type in the form to render your QR code in real-time.
            </p>
          </div>
        ) : renderError ? (
          <div className="w-64 h-64 border border-red-200 bg-red-50/70 rounded-xl flex flex-col items-center justify-center text-center p-6">
            <span className="text-xs font-semibold text-red-700 mb-1">
              Data overflow
            </span>
            <p className="text-[11px] text-red-600/80 leading-normal">
              {renderError}
            </p>
          </div>
        ) : showScanSimulator ? (
          /* Phone Viewfinder Simulator */
          <div className="w-[290px] sm:w-[310px] bg-neutral-950 rounded-3xl p-3.5 border-4 border-neutral-800 shadow-2xl relative text-white animate-in zoom-in-95 duration-200">
            {/* Status bar */}
            <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 px-2 mb-2">
              <span>09:41</span>
              <div className="w-14 h-3 bg-neutral-800 rounded-full" />
              <span>5G 🔋</span>
            </div>

            {/* Native OS camera notification banner */}
            <div className="bg-neutral-900/95 border border-neutral-700 backdrop-blur-md rounded-xl p-2.5 mb-2.5 shadow-lg flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0">
                  <SimIcon className="w-3.5 h-3.5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">
                    {sim.title}
                  </div>
                  <div className="text-[10px] text-neutral-300 truncate font-mono">
                    {sim.subtitle}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSimToast(`✓ Scanned! Smartphone camera detected "${sim.title}".`);
                  setTimeout(() => setSimToast(null), 3000);
                }}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold rounded-lg shrink-0 cursor-pointer shadow-xs active:scale-95 transition-transform"
              >
                {sim.btn}
              </button>
            </div>

            {/* Viewfinder Reticle */}
            <div className="relative rounded-xl overflow-hidden bg-neutral-900 flex items-center justify-center p-3 border border-neutral-800/80">
              {/* Focus Reticle Yellow Brackets */}
              <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-yellow-400 pointer-events-none z-10" />
              <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-yellow-400 pointer-events-none z-10" />
              <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-yellow-400 pointer-events-none z-10" />
              <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-yellow-400 pointer-events-none z-10" />

              {/* Scanning beam animation */}
              <div className="absolute inset-x-4 top-1/2 h-0.5 bg-yellow-400/80 shadow-[0_0_8px_#facc15] animate-pulse z-10 pointer-events-none" />

              <canvas
                ref={canvasRef}
                className="max-w-[200px] h-auto rounded-md block mx-auto"
              />
            </div>

            {/* Camera bottom modes */}
            <div className="flex items-center justify-around pt-2.5 text-[9px] font-mono text-neutral-400">
              <span className="px-1.5 py-0.5 rounded-full bg-neutral-800 text-yellow-400 font-bold">1×</span>
              <span className="text-[10px] text-white font-medium">PHOTO</span>
              <span className="text-neutral-500">QR ACTIVE</span>
            </div>

            {/* Interactive scan feedback toast */}
            {simToast && (
              <div className="absolute inset-x-3 bottom-12 p-2 bg-emerald-600 text-white text-[11px] text-center font-medium rounded-xl shadow-xl animate-in fade-in slide-in-from-bottom-2">
                {simToast}
              </div>
            )}
          </div>
        ) : (
          /* Normal / 3D Stand Stage View */
          <div
            className={`relative group transition-all duration-300 ${
              stageMode === 'stand'
                ? 'perspective-1000 rotate-x-6 hover:rotate-x-2 -translate-y-2'
                : ''
            }`}
          >
            {/* Card Shell */}
            <div
              className={`p-2.5 bg-white rounded-xl transition-all duration-200 cursor-pointer ${
                stageMode === 'stand'
                  ? 'shadow-[0_20px_40px_-10px_rgba(0,0,0,0.18)] ring-1 ring-black/10'
                  : 'shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_-4px_rgba(0,0,0,0.1)] border border-neutral-200/90'
              }`}
              onClick={() => handleDownloadPNG()}
              title="Click to download high-resolution PNG"
            >
              <canvas
                ref={canvasRef}
                className="max-w-[240px] sm:max-w-[270px] h-auto rounded-md block mx-auto"
              />
            </div>

            {/* Stand reflection / shadow in stand mode */}
            {stageMode === 'stand' && (
              <div className="w-full h-4 bg-gradient-to-b from-black/15 to-transparent blur-xs rounded-full mt-2 mx-auto transform scale-90" />
            )}

            {/* Magnify overlay icon */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsFullscreen(true);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs hover:bg-black cursor-pointer shadow-sm"
              title="Full-screen inspect"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Diagnostics Strip */}
      {!isEmpty && diagnostics && (
        <div className="px-5 py-2.5 bg-neutral-50/80 border-t border-neutral-100 flex items-center justify-between text-[11px] text-neutral-500 font-mono">
          <div className="flex items-center gap-3">
            <span>
              v{diagnostics.version} <span className="text-neutral-400">({diagnostics.gridSize}×{diagnostics.gridSize})</span>
            </span>
            <span>·</span>
            <span
              className={`${
                diagnostics.isContrastSafe ? 'text-emerald-700' : 'text-amber-600'
              }`}
            >
              {diagnostics.contrastRatio}:1
            </span>
            <span>·</span>
            <span className="hidden sm:inline text-neutral-400">
              {diagnostics.byteCount}b
            </span>
          </div>

          <span className="text-neutral-400 text-[10px]">
            Scan: {diagnostics.optimalDistance}
          </span>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="p-4 bg-white border-t border-neutral-100 space-y-2">
        <div className="flex items-center gap-2">
          {/* Primary Action Button */}
          <div className="relative flex-1 flex">
            <button
              type="button"
              disabled={isEmpty}
              onClick={() => handleDownloadPNG(downloadRes)}
              className="flex-1 h-9 px-4 text-xs font-semibold bg-neutral-900 hover:bg-black disabled:opacity-40 disabled:pointer-events-none text-white rounded-l-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.99]"
              title={tx('Tải PNG với mẫu đang dùng (⌘S)', 'Download PNG with active template (⌘S)')}
            >
              <Download className="w-3.5 h-3.5" />
              <span>{tx('Tải PNG', 'Download PNG')}</span>
              <span className="text-neutral-400 font-mono text-[11px] font-normal">
                {downloadRes}px
              </span>
            </button>

            <button
              type="button"
              disabled={isEmpty}
              onClick={() => setResDropdownOpen(!resDropdownOpen)}
              className="h-9 px-2 bg-neutral-900 hover:bg-black disabled:opacity-40 disabled:pointer-events-none text-white rounded-r-lg border-l border-neutral-800 transition-colors flex items-center justify-center cursor-pointer"
              title={tx('Chọn độ phân giải', 'Select resolution')}
            >
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {resDropdownOpen && (
              <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-30 text-xs">
                {([512, 1024, 2048] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setDownloadRes(r);
                      setResDropdownOpen(false);
                      handleDownloadPNG(r);
                    }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-neutral-50 flex items-center justify-between cursor-pointer ${
                      downloadRes === r ? 'font-semibold text-neutral-900' : 'text-neutral-600'
                    }`}
                  >
                    <span>{r} × {r} px</span>
                    {downloadRes === r && <Check className="w-3 h-3 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Copy PNG */}
          <button
            type="button"
            disabled={isEmpty}
            onClick={handleCopyImage}
            className="h-9 px-3 text-xs font-medium bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none text-neutral-700 border border-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title={tx('Sao chép ảnh theo mẫu (⌘C)', 'Copy templated image (⌘C)')}
          >
            {copiedImg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">{tx('Đã sao chép', 'Copied')}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-neutral-400" />
                <span>{tx('Sao chép', 'Copy')}</span>
              </>
            )}
          </button>

          {/* Copy Vector SVG */}
          <button
            type="button"
            disabled={isEmpty}
            onClick={handleCopySVG}
            className="h-9 px-3 text-xs font-medium bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:pointer-events-none text-neutral-700 border border-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title={tx('Sao chép SVG vector cho Figma (⌘⇧C)', 'Copy pure vector SVG for Figma (⌘⇧C)')}
          >
            {copiedSvg ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">{tx('SVG sẵn sàng', 'SVG Ready')}</span>
              </>
            ) : (
              <>
                <FileCode2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>SVG</span>
              </>
            )}
          </button>
        </div>

        {/* Secondary Row of Tools */}
        <div className="flex items-center justify-between gap-1 pt-0.5">
          <button
            type="button"
            onClick={onOpenTemplateStudio}
            className="flex-1 h-7 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title={tx('Mở kho mẫu', 'Open Template Studio')}
          >
            <LayoutTemplate className="w-3 h-3 text-neutral-400" />
            <span>{tx('Mẫu', 'Templates')}</span>
          </button>

          <button
            type="button"
            disabled={isEmpty}
            onClick={onOpenMetricHandoff}
            className="flex-1 h-7 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title={tx('Xuất theo kích thước mm chuẩn (300 DPI)', 'Export calibrated mm dimensions (300 DPI)')}
          >
            <Ruler className="w-3 h-3 text-neutral-400" />
            <span>{tx('300 DPI', '300 DPI')}</span>
          </button>

          <button
            type="button"
            disabled={isEmpty}
            onClick={() => onPrintSingle(dataUrl)}
            className="flex-1 h-7 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title={tx('In (⌘P)', 'Print (⌘P)')}
          >
            <Printer className="w-3.5 h-3.5 text-neutral-400" />
            <span>{tx('In', 'Print')}</span>
          </button>

          <button
            type="button"
            disabled={isEmpty}
            onClick={handleSave}
            className="flex-1 h-7 text-[11px] font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md disabled:opacity-40 disabled:pointer-events-none transition-colors flex items-center justify-center gap-1 cursor-pointer"
            title={tx('Lưu vào lịch sử', 'Save to history')}
          >
            {saved ? (
              <span className="text-emerald-600 font-semibold">{tx('Đã lưu ✓', 'Saved ✓')}</span>
            ) : (
              <>
                <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
                <span>{tx('Lưu vào lịch sử', 'Save to history')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen High-Resolution Inspection Modal */}
      {isFullscreen && dataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm cursor-zoom-out animate-in fade-in duration-150"
          onClick={() => setIsFullscreen(false)}
        >
          <div className="relative max-w-lg w-full bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <img
              src={dataUrl}
              alt="Enlarged QR preview"
              className="max-h-[75vh] w-auto object-contain rounded-lg"
            />
            <span className="text-xs text-neutral-400 mt-4 font-mono">
              Click anywhere to close
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
