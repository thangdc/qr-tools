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
import { BulkToolsView } from './components/BulkToolsView';
import { ScannerView } from './components/ScannerView';
import { BatchCardPrintModal, BatchPrintItem } from './components/BatchCardPrintModal';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import { PrintHandoffModal } from './components/PrintHandoffModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { PrivacyModal } from './components/PrivacyModal';
import { ProModal } from './components/ProModal';
import { generatePayload, getQRSummary } from './utils/qrPayload';
import { renderTemplatedQR } from './utils/templateRenderer';
import { Ruler, ShieldCheck, LayoutTemplate } from 'lucide-react';
import { useLanguage } from './i18n';

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

export default function App() {
  const { t, tx } = useLanguage();
  const [activeView, setActiveView] = useState<'generator' | 'scanner' | 'history' | 'bulk'>('generator');
  const [selectedType, setSelectedType] = useState<QRType>('url');
  const [formData, setFormData] = useState<QRFormData>(INITIAL_FORM_DATA);

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

  const activeTemplate = useMemo(() => {
    return templates.find((t) => t.id === activeTemplateId) || defaultTemplate;
  }, [templates, activeTemplateId, defaultTemplate]);

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
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === activeTemplate.id
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

  // Save current QR code to history
  const handleSaveToHistory = () => {
    if (!currentPayload) return;

    const newItem: QRHistoryItem = {
      id: `hist-${Date.now()}`,
      type: selectedType,
      title: summary.title,
      subtitle: summary.subtitle,
      data: formData[selectedType],
      design: activeTemplate.design,
      templateId: activeTemplate.id,
      rawPayload: currentPayload,
      createdAt: Date.now(),
    };

    setHistory((prev) => [
      newItem,
      ...prev.filter((i) => i.rawPayload !== currentPayload),
    ]);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  };

  const handleClearHistory = () => {
    if (confirm(tx('Bạn có chắc muốn xóa toàn bộ lịch sử tạo mã không?', 'Are you sure you want to clear your generation history?'))) {
      setHistory([]);
    }
  };

  const handlePrintSingle = () => {
    if (!currentPayload) return;
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

  // Open card template for multiple batch items from Batch & Export
  const handlePrintBatch = (batchItems: BulkQRItem[]) => {
    setBatchPrintState({
      isOpen: true,
      items: batchItems.map((b) => ({
        id: b.id,
        label: b.label,
        payload: b.resolvedPayload,
        type: b.type,
        subtitle: b.type.toUpperCase(),
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
            1024
          );
          const url = offscreen.toDataURL('image/png');
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
  }, [currentPayload, activeTemplate, selectedType, summary, extraTemplateInfo]);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col selection:bg-neutral-900 selection:text-white font-sans text-neutral-900">
      {/* 3-Zone Top Bar Contract */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        historyCount={history.length}
        isPro={isPro}
        onOpenPro={() => setIsProModalOpen(true)}
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

              {/* Utility Badges on Right */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-800 bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-lg transition-all cursor-pointer shadow-2xs hover:border-neutral-300"
                >
                  <LayoutTemplate className="w-3.5 h-3.5 text-neutral-500" />
                  <span>{t('templatesCount')} ({templates.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMetricModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 border border-neutral-200/90 rounded-lg transition-all cursor-pointer shadow-2xs hover:border-neutral-300"
                >
                  <Ruler className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t('dpiExport')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50/60 hover:bg-emerald-50 border border-emerald-200/60 rounded-lg transition-all cursor-pointer shadow-2xs"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{t('private')}</span>
                </button>
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
                  onSelectTemplate={setActiveTemplateId}
                  isGenerating={isPending}
                  extraTemplateInfo={extraTemplateInfo}
                  onOpenTemplateStudio={() => setIsTemplatesModalOpen(true)}
                  onSaveToHistory={handleSaveToHistory}
                  onPrintSingle={handlePrintSingle}
                  onOpenMetricHandoff={() => setIsMetricModalOpen(true)}
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
            onOpenBulk={() => setActiveView('bulk')}
          />
        )}

        {/* Batch Tools / Bulk View */}
        {activeView === 'bulk' && (
          <BulkToolsView
            isPro={isPro}
            onOpenPro={() => setIsProModalOpen(true)}
            onBackToGenerator={() => setActiveView('generator')}
            onPrintBatch={handlePrintBatch}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-neutral-200/80 bg-white py-4 print:hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-900">QR Tools</span>
            <span>·</span>
            <span>{t('brandTagline')}</span>
            <span>·</span>
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="text-neutral-500 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              {tx('100% Xử lý trên máy & Riêng tư', '100% Client-Side & Private')}
            </button>
          </div>
          <div className="flex items-center gap-3 text-neutral-500">
            <button
              onClick={() => setIsShortcutsOpen(true)}
              className="hover:text-neutral-900 transition-colors cursor-pointer font-mono"
            >
              {tx('Phím tắt (?)', 'Shortcuts (?)')}
            </button>
            <span>·</span>
            <span>{t('supports')}</span>
            <span>·</span>
            <button
              onClick={() => setIsProModalOpen(true)}
              className="hover:text-neutral-900 transition-colors cursor-pointer"
            >
              {isPro ? t('proActive') : t('upgradePro')}
            </button>
          </div>
        </div>
      </footer>

      {/* Unified Multi-QR & Card Print Modal */}
      <BatchCardPrintModal
        isOpen={batchPrintState.isOpen}
        onClose={() => setBatchPrintState({ isOpen: false, items: [] })}
        items={batchPrintState.items}
        templates={templates}
        activeTemplateId={activeTemplateId}
        onSelectTemplate={setActiveTemplateId}
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
        design={activeTemplate.design}
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
