/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import QRCode from 'qrcode';
import {
  QRType,
  QRFormData,
  QRDesignOptions,
  QRHistoryItem,
  BulkQRItem,
  DecodedQRData,
  QRTemplate,
  QROutputSettings,
  DEFAULT_QR_OUTPUT_SETTINGS,
} from './types/qr';
import { PREDEFINED_TEMPLATES } from './utils/defaultTemplates';
import { Header } from './components/Header';
import { QrTypeSelector } from './components/QrTypeSelector';
import { UrlForm } from './components/forms/UrlForm';
import { TextForm } from './components/forms/TextForm';
import { ContactForm } from './components/forms/ContactForm';
import { WifiForm } from './components/forms/WifiForm';
import { EmailForm } from './components/forms/EmailForm';
import { PhoneForm } from './components/forms/PhoneForm';
import { SmsForm } from './components/forms/SmsForm';
import { LocationForm } from './components/forms/LocationForm';
import { PaymentForm } from './components/forms/PaymentForm';
import { EventForm } from './components/forms/EventForm';
import { CustomizePanel } from './components/CustomizePanel';
import { QRPreview } from './components/QRPreview';
import { HistoryView } from './components/HistoryView';
import { ScannerView } from './components/ScannerView';
import { BatchCardPrintModal, BatchPrintItem } from './components/BatchCardPrintModal';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import { PrintHandoffModal } from './components/PrintHandoffModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { ProModal } from './components/ProModal';
import { generatePayload, getQRSummary } from './utils/qrPayload';
import { renderTemplatedQR } from './utils/templateRenderer';
import { useLanguage } from './i18n';
import { initAnalytics, trackEvent } from './utils/analytics';

const INITIAL_FORM_DATA: QRFormData = {
  url: { url: 'https://example.com' },
  text: { text: '' },
  contact: {
    firstName: 'Minh',
    lastName: 'Nguyen',
    phone: '+84 901 234 567',
    email: 'minh.nguyen@company.vn',
    organization: 'Acme Vietnam Tech',
    address: 'District 1, Ho Chi Minh City',
    website: 'https://company.vn',
  },
  wifi: {
    ssid: 'Highlands_Guest',
    password: 'highlandscoffee',
    security: 'WPA',
    hidden: false,
  },
  email: {
    email: 'contact@service.vn',
    subject: 'Feedback & Support',
    message: 'Xin chào, tôi cần hỗ trợ về dịch vụ...',
  },
  phone: { phone: '+84 901 234 567' },
  sms: {
    phone: '+84 901 234 567',
    message: 'Xin chào, tôi quan tâm đến sản phẩm của bạn.',
  },
  location: {
    latitude: '10.795123',
    longitude: '106.721915',
    locationName: 'Landmark 81, TP. Hồ Chí Minh',
  },
  payment: {
    bankBin: '970436', // Vietcombank
    bankName: 'Vietcombank',
    accountNumber: '1029384756',
    accountName: 'NGUYEN VAN A',
    amount: '100000',
    description: 'Thanh toan don hang',
  },
  event: {
    title: 'Grand Opening & Coffee Tasting',
    location: '72 Lê Thánh Tôn, Bến Nghé, Quận 1, TP.HCM',
    startDate: '2026-10-01T09:00',
    endDate: '2026-10-01T12:00',
    description: 'Tiệc khai trương trải nghiệm cà phê đặc sản & ưu đãi 30%',
    allDay: false,
  },
};

const INITIAL_HISTORY: QRHistoryItem[] = [
  {
    id: 'hist-1',
    type: 'payment',
    title: 'Vietcombank · 1029384756',
    subtitle: 'NGUYEN VAN A · 100.000 ₫',
    data: {
      bankBin: '970436',
      bankName: 'Vietcombank',
      accountNumber: '1029384756',
      accountName: 'NGUYEN VAN A',
      amount: '100000',
      description: 'Thanh toan don hang',
    },
    design: PREDEFINED_TEMPLATES[0].design,
    rawPayload:
      '00020101021238540010A00000072701240006970436011010293847560208QRIBFTTA530370454061000005802VN5913NGUYEN VAN A6002VN62220818THANH TOAN DON HANG63044991',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'hist-2',
    type: 'wifi',
    title: 'WiFi: Highlands_Guest',
    subtitle: 'WPA bảo mật',
    data: {
      ssid: 'Highlands_Guest',
      password: 'highlandscoffee',
      security: 'WPA',
      hidden: false,
    },
    design: PREDEFINED_TEMPLATES[0].design,
    rawPayload: 'WIFI:T:WPA;S:Highlands_Guest;P:highlandscoffee;H:false;;',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'hist-3',
    type: 'url',
    title: 'example.com',
    subtitle: 'Trang web trực tuyến',
    data: { url: 'https://example.com' },
    design: PREDEFINED_TEMPLATES[0].design,
    rawPayload: 'https://example.com',
    createdAt: Date.now() - 172800000,
  },
];

const QR_TYPE_LIST: QRType[] = [
  'url',
  'payment',
  'wifi',
  'contact',
  'text',
  'email',
  'phone',
  'sms',
  'location',
];

const DEEP_LINK_TYPES: Partial<Record<QRType, true>> = {
  url: true, payment: true, wifi: true, contact: true, text: true,
  email: true, phone: true, sms: true, location: true, event: true,
};

function getDeepLinkConfig(): { view: 'generator' | 'bulk'; type?: QRType; source?: string } {
  if (typeof window === 'undefined') return { view: 'generator' };
  const params = new URLSearchParams(window.location.search);
  const requestedType = params.get('type') as QRType | null;
  return {
    view: params.get('view') === 'bulk' ? 'bulk' : 'generator',
    type: requestedType && DEEP_LINK_TYPES[requestedType] ? requestedType : undefined,
    source: params.get('source') || undefined,
  };
}

export default function App() {
  const { t } = useLanguage();

  const deepLink = useMemo(getDeepLinkConfig, []);
  useEffect(() => {
    initAnalytics();
    if (deepLink.source) {
      trackEvent('landing_cta_opened', {
        source: deepLink.source,
        destination: deepLink.view === 'bulk' ? 'bulk' : deepLink.type || 'url',
      });
    }
  }, [deepLink]);
  const [activeView, setActiveView] = useState<'generator' | 'scanner' | 'history'>(deepLink.view === 'bulk' ? 'history' : deepLink.view);
  const [selectedType, setSelectedType] = useState<QRType>(deepLink.type || 'url');
  const [formData, setFormData] = useState<QRFormData>(INITIAL_FORM_DATA);

  const [outputSettings, setOutputSettings] = useState<QROutputSettings>(() => {
    try {
      const stored = localStorage.getItem('qr_tools_output_settings');
      if (stored) return { ...DEFAULT_QR_OUTPUT_SETTINGS, ...JSON.parse(stored) };
    } catch {}
    return DEFAULT_QR_OUTPUT_SETTINGS;
  });

  // Templates Management State
  const [templates, setTemplates] = useState<QRTemplate[]>(() => {
    try {
      const stored = localStorage.getItem('qr_tools_templates');
      if (stored) return JSON.parse(stored);
    } catch {}
    return PREDEFINED_TEMPLATES;
  });

  const defaultTemplate = useMemo(() => {
    return templates.find((t) => t.isDefault) || templates[0];
  }, [templates]);

  const [activeTemplateId, setActiveTemplateId] = useState<string>(() => {
    return defaultTemplate.id;
  });

  const [historyDesignOverride, setHistoryDesignOverride] = useState<QRDesignOptions | null>(null);

  const activeTemplate = useMemo(() => {
    const template = templates.find((t) => t.id === activeTemplateId) || defaultTemplate;
    return historyDesignOverride
      ? { ...template, design: historyDesignOverride, frameStyle: historyDesignOverride.frameStyle, frameText: historyDesignOverride.frameText }
      : template;
  }, [templates, activeTemplateId, defaultTemplate, historyDesignOverride]);

  // History State
  const [history, setHistory] = useState<QRHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem('qr_tools_history');
      return stored ? JSON.parse(stored) : INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      return localStorage.getItem('qr_tools_pro') === 'true';
    } catch {
      return false;
    }
  });

  // Modals state
  const [isProModalOpen, setIsProModalOpen] = useState(false);

  const [isMetricModalOpen, setIsMetricModalOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Multi-card & Batch Print modal state
  const [batchPrintState, setBatchPrintState] = useState<{
    isOpen: boolean;
    items: BatchPrintItem[];
  }>({
    isOpen: false,
    items: [],
  });

  // Sync output settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_tools_output_settings', JSON.stringify(outputSettings));
    } catch (e) {
      console.error(e);
    }
  }, [outputSettings]);

  // Sync templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_tools_templates', JSON.stringify(templates));
    } catch (e) {
      console.error(e);
    }
  }, [templates]);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('qr_tools_history', JSON.stringify(history));
    } catch (e) {
      console.error(e);
    }
  }, [history]);

  // Set default template
  const handleSetDefaultTemplate = (templateId: string) => {
    setTemplates((prev) =>
      prev.map((t) => ({
        ...t,
        isDefault: t.id === templateId,
      }))
    );
    setHistoryDesignOverride(null);
    setActiveTemplateId(templateId);
  };

  // Save new or edited template
  const handleSaveTemplate = (saved: QRTemplate) => {
    setTemplates((prev) => {
      const exists = prev.some((t) => t.id === saved.id);
      if (exists) {
        return prev.map((t) => (t.id === saved.id ? saved : t));
      }
      return [...prev, saved];
    });
    setActiveTemplateId(saved.id);
  };

  // Delete custom template
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (activeTemplateId === templateId) {
      setActiveTemplateId(defaultTemplate.id);
    }
  };

  // Update design of active template directly from CustomizePanel
  const handleUpdateDesign = (design: QRDesignOptions) => {
    setHistoryDesignOverride(null);
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === activeTemplateId
          ? {
              ...t,
              design,
              frameStyle: design.frameStyle,
              frameText: design.frameText,
            }
          : t
      )
    );
  };

  // Sync Pro status to localStorage
  const handleTogglePro = (status: boolean) => {
    setIsPro(status);
    try {
      localStorage.setItem('qr_tools_pro', status ? 'true' : 'false');
    } catch (e) {
      console.error(e);
    }
  };

  // Compute live payload string
  const currentPayload = useMemo(() => {
    return generatePayload(selectedType, formData[selectedType]);
  }, [selectedType, formData]);

  // Compute title & subtitle summary
  const summary = useMemo(() => {
    return getQRSummary(selectedType, formData[selectedType]);
  }, [selectedType, formData]);

  // Extra template details for rich card layouts
  const extraTemplateInfo = useMemo(() => {
    return {
      wifiSsid: formData.wifi.ssid,
      wifiPass: formData.wifi.password,
      bankName: formData.payment.bankName,
      accountNumber: formData.payment.accountNumber,
      accountName: formData.payment.accountName,
      amount: formData.payment.amount,
    };
  }, [formData]);

  // Update specific form data with debouncing
  const updateFormData = (type: QRType, data: any) => {
    startTransition(() => {
      setFormData((prev) => ({
        ...prev,
        [type]: data,
      }));
    });
  };

  // Restore history item to editor
  const handleRestoreHistory = (item: QRHistoryItem) => {
    setSelectedType(item.type);
    setFormData((prev) => ({
      ...prev,
      [item.type]: item.data,
    }));
    setHistoryDesignOverride(item.design || null);
    if (item.templateId) {
      setActiveTemplateId(item.templateId);
    }
    setActiveView('generator');
  };

  // Load from scanner into editor
  const handleLoadFromScanner = (decoded: DecodedQRData) => {
    setSelectedType(decoded.type);
    setFormData((prev) => ({
      ...prev,
      [decoded.type]: {
        ...prev[decoded.type],
        ...decoded.parsedData,
      },
    }));
    setActiveView('generator');
  };

  const openProModal = (source?: string) => {
    trackEvent('pro_view', {
      source: source || activeView,
      view: activeView,
    });
    setIsProModalOpen(true);
  };

  // Save current QR code to history
  const handleSaveToHistory = () => {
    if (!currentPayload) return false;

    const designKey = JSON.stringify(activeTemplate.design);
    const alreadySaved = history.some(
      (item) =>
        item.type === selectedType &&
        item.rawPayload === currentPayload &&
        JSON.stringify(item.design) === designKey
    );

    if (alreadySaved) return false;

    const newItem: QRHistoryItem = {
      id: `hist-${Date.now()}`,
      type: selectedType,
      title: summary.title,
      subtitle: summary.subtitle,
      data: formData[selectedType],
      design: { ...activeTemplate.design },
      templateId: activeTemplateId,
      rawPayload: currentPayload,
      createdAt: Date.now(),
    };

    setHistory((prev) => [newItem, ...prev]);
    trackEvent('qr_saved', { qr_type: selectedType });
    return true;
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear your generation history?')) {
      setHistory([]);
    }
  };

  // Import multiple QR codes directly into History.
  const handleImportToHistory = (items: BulkQRItem[]) => {
    const now = Date.now();
    const imported: QRHistoryItem[] = items.map((item, index) => {
      const isUrl = item.type === 'url' || item.resolvedPayload.startsWith('http');
      const type: QRType = isUrl ? 'url' : 'text';
      const data = isUrl ? { url: item.resolvedPayload } : { text: item.resolvedPayload };
      return {
        id: `hist-import-${now}-${index}`,
        type,
        title: item.label || `QR ${index + 1}`,
        subtitle: item.resolvedPayload,
        data,
        design: { ...activeTemplate.design },
        templateId: activeTemplateId,
        rawPayload: item.resolvedPayload,
        createdAt: now + index,
      };
    });

    setHistory((prev) => {
      const existing = new Set(prev.map((item) => `${item.type}::${item.rawPayload}`));
      const unique = imported.filter((item) => !existing.has(`${item.type}::${item.rawPayload}`));
      return [...unique, ...prev];
    });
    trackEvent('qr_imported_to_history', { count: imported.length });
  };

  const handlePrintSingle = () => {
    if (!currentPayload) return;
    trackEvent('qr_print_started', { qr_type: selectedType, is_pro: isPro });
    setBatchPrintState({
      isOpen: true,
      items: [
        {
          label: summary.title,
          payload: currentPayload,
          type: selectedType,
          subtitle: summary.subtitle,
          ...extraTemplateInfo,
        },
      ],
    });
  };

  const handleOpenMetricHandoff = () => {
    setIsMetricModalOpen(true);
  };

  const handleBatchPrintFromHistory = (items: QRHistoryItem[]) => {
    setBatchPrintState({
      isOpen: true,
      items: items.map((item) => ({
        id: item.id,
        label: item.title,
        payload: item.rawPayload,
        type: item.type,
        subtitle: item.subtitle,
        accountName: item.type === 'payment' ? item.data.accountName : undefined,
        accountNumber: item.type === 'payment' ? item.data.accountNumber : undefined,
        bankName: item.type === 'payment' ? item.data.bankName : undefined,
      })),
    });
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput = activeTag === 'input' || activeTag === 'textarea';

      // '?' key to toggle shortcuts modal
      if (e.key === '?' && !isInput) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Cmd/Ctrl + S -> Download PNG
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && !e.shiftKey) {
        e.preventDefault();
        if (currentPayload) {
          if (outputSettings.imageSize >= 2048 && !isPro) {
            openProModal('single_download_2048');
            return;
          }
          const offscreen = document.createElement('canvas');
          await renderTemplatedQR(
            offscreen,
            currentPayload,
            activeTemplate,
            {
              label: summary.title,
              subtitle: summary.subtitle,
              type: selectedType,
              ...extraTemplateInfo,
            },
            outputSettings.imageSize
          );
          const url = offscreen.toDataURL('image/png');
          trackEvent('qr_downloaded', {
            qr_type: selectedType,
            format: 'png',
            resolution: outputSettings.imageSize,
            method: 'keyboard',
            is_pro: isPro,
          });
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-${activeTemplate.layout}-${selectedType}-${Date.now()}.png`;
          a.click();
        }
        return;
      }

      // Cmd/Ctrl + Shift + C -> Copy SVG
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        if (currentPayload) {
          const svg = await QRCode.toString(currentPayload, {
            type: 'svg',
            margin: activeTemplate.design.margin,
            color: { dark: activeTemplate.design.fgColor, light: activeTemplate.design.bgColor },
            errorCorrectionLevel: activeTemplate.design.errorCorrectionLevel,
          });
          navigator.clipboard.writeText(svg);
        }
        return;
      }

      // Cmd/Ctrl + P -> Print
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePrintSingle();
        return;
      }

      // 1-9 to switch type when not typing in form inputs
      if (!isInput && !e.metaKey && !e.ctrlKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 9) {
          const targetType = QR_TYPE_LIST[num - 1];
          if (targetType) {
            setSelectedType(targetType);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPayload, activeTemplate, selectedType, summary, extraTemplateInfo, outputSettings.imageSize]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col selection:bg-neutral-900 selection:text-white font-sans text-neutral-900">
      {/* 3-Zone Top Bar Contract */}
      <div className="print:hidden">
        <Header
        activeView={activeView}
        setActiveView={setActiveView}
        historyCount={history.length}
        isPro={isPro}
        onOpenPro={openProModal}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
      />

        {/* Main Content Workspace Area */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Generator View */}
        {activeView === 'generator' && (
          <div className="space-y-6">
            {/* Generator Heading - Studio style */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {t('qrGenerator')}
                </h1>
                <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
                  {t('generatorDescription')}
                </p>
              </div>


            </div>

            {/* Horizontal Type Selector */}
            <div className="pt-0.5">
              <QrTypeSelector
                selectedType={selectedType}
                onSelectType={setSelectedType}
              />
            </div>

            {/* Two-Column Studio Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-1">
              {/* Left Column: Input / Configuration (7 cols on desktop) */}
              <div className="lg:col-span-7 bg-white border border-neutral-200/80 rounded-2xl p-6 sm:p-7 shadow-xs">
                {/* Active Type Form */}
                <div className="min-h-[220px]">
                  {selectedType === 'url' && (
                    <UrlForm
                      data={formData.url}
                      onChange={(d) => updateFormData('url', d)}
                    />
                  )}
                  {selectedType === 'payment' && (
                    <PaymentForm
                      data={formData.payment}
                      onChange={(d) => updateFormData('payment', d)}
                    />
                  )}
                  {selectedType === 'wifi' && (
                    <WifiForm
                      data={formData.wifi}
                      onChange={(d) => updateFormData('wifi', d)}
                    />
                  )}
                  {selectedType === 'contact' && (
                    <ContactForm
                      data={formData.contact}
                      onChange={(d) => updateFormData('contact', d)}
                    />
                  )}
                  {selectedType === 'text' && (
                    <TextForm
                      data={formData.text}
                      onChange={(d) => updateFormData('text', d)}
                    />
                  )}
                  {selectedType === 'email' && (
                    <EmailForm
                      data={formData.email}
                      onChange={(d) => updateFormData('email', d)}
                    />
                  )}
                  {selectedType === 'phone' && (
                    <PhoneForm
                      data={formData.phone}
                      onChange={(d) => updateFormData('phone', d)}
                    />
                  )}
                  {selectedType === 'sms' && (
                    <SmsForm
                      data={formData.sms}
                      onChange={(d) => updateFormData('sms', d)}
                    />
                  )}
                  {selectedType === 'location' && (
                    <LocationForm
                      data={formData.location}
                      onChange={(d) => updateFormData('location', d)}
                    />
                  )}
                  {selectedType === 'event' && (
                    <EventForm
                      data={formData.event}
                      onChange={(d) => updateFormData('event', d)}
                    />
                  )}
                </div>

                {/* Progressive Disclosure: Customization Accordion */}
                <CustomizePanel
                  design={activeTemplate.design}
                  onChange={handleUpdateDesign}
                  isPaymentType={selectedType === 'payment'}
                />
              </div>

              {/* Right Column: QR Preview (5 cols on desktop, sticky on large screens) */}
              <div className="lg:col-span-5 lg:sticky lg:top-20">
                <QRPreview
                  payload={currentPayload}
                  type={selectedType}
                  title={summary.title}
                  subtitle={summary.subtitle}
                  templates={templates}
                  activeTemplate={activeTemplate}
                  onSelectTemplate={(templateId) => {
                  setHistoryDesignOverride(null);
                  setActiveTemplateId(templateId);
                }}
                  isGenerating={isPending}
                  extraTemplateInfo={extraTemplateInfo}
                  onOpenTemplateStudio={() => setIsTemplatesModalOpen(true)}
                  onSaveToHistory={handleSaveToHistory}
                  onPrintSingle={handlePrintSingle}
                  isPro={isPro}
                  onOpenPro={openProModal}
                  onOpenMetricHandoff={handleOpenMetricHandoff}
                   outputSettings={outputSettings}
                />
              </div>
            </div>
          </div>
        )}

        {/* Scanner View */}
        {activeView === 'scanner' && (
          <ScannerView
            onBackToGenerator={() => setActiveView('generator')}
            onLoadIntoGenerator={handleLoadFromScanner}
          />
        )}

        {/* History View */}
        {activeView === 'history' && (
          <HistoryView
            items={history}
            onRestore={handleRestoreHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearHistory}
            onBackToGenerator={() => setActiveView('generator')}
            isPro={isPro}
            onOpenPro={openProModal}
            onImport={handleImportToHistory}
            onBatchPrint={handleBatchPrintFromHistory}
          />
        )}

        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-neutral-200/80 bg-white py-4 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-semibold text-neutral-900">QR Tools</span>
            <span>·</span>
            <span>{t('brandTagline')}</span>
          </div>
          <div className="flex items-center justify-start sm:justify-end gap-x-3 overflow-x-auto max-w-full whitespace-nowrap text-neutral-500">
            <a href="/terms.html" className="hover:text-neutral-900 transition-colors">Điều khoản</a>
            <span>·</span>
            <a href="/privacy.html" className="hover:text-neutral-900 transition-colors">Bảo mật</a>
            <span>·</span>
            <a href="/refund.html" className="hover:text-neutral-900 transition-colors">Hoàn tiền</a>
            <span>·</span>
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-neutral-900 transition-colors cursor-pointer font-mono"
            >
              Shortcuts (?)
            </button>
            <span>·</span>
            <a href="mailto:thang@thangdc.com" className="hover:text-neutral-900 transition-colors">thang@thangdc.com</a>
            <span>·</span>
            <button
              onClick={() => openProModal('footer')}
              className="hover:text-neutral-900 transition-colors cursor-pointer"
            >
              {isPro ? t('proActive') : t('upgradePro')}
            </button>
          </div>
        </div>
        </footer>
      </div>

      {/* Unified Multi-QR & Card Print Modal */}
      <BatchCardPrintModal
        isOpen={batchPrintState.isOpen}
        onClose={() => setBatchPrintState({ isOpen: false, items: [] })}
        items={batchPrintState.items}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={setActiveTemplateId}
        outputSettings={outputSettings}
      />

      {/* Template Manager / Studio Modal */}
      <TemplateEditorModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={setActiveTemplateId}
        onSetDefaultTemplate={handleSetDefaultTemplate}
        onSaveTemplate={handleSaveTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Metric Print Handoff Modal */}
      <PrintHandoffModal
        isOpen={isMetricModalOpen}
        onClose={() => setIsMetricModalOpen(false)}
        payload={currentPayload}
        template={activeTemplate}
        outputSettings={outputSettings}
        onOutputSettingsChange={setOutputSettings}
        isPro={isPro}
        onOpenPro={openProModal}
      />

      {/* Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Privacy Guarantee Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />

      {/* Pro Modal */}
      <ProModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        isPro={isPro}
        onTogglePro={handleTogglePro}
      />
    </div>
  );
}
