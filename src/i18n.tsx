import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'vi' | 'en';

type TranslationKey =
  | 'generator' | 'scanner' | 'history' | 'batchExport' | 'templates' | 'privacy'
  | 'shortcuts' | 'pro' | 'proActive' | 'private' | 'professionalUtility'
  | 'qrGenerator' | 'qrGeneratorDescription' | 'clientSidePrivate'
  | 'supportsIso' | 'upgradePro' | 'shortcutsLabel' | 'manageTemplates'
  | 'qrTypeSelection';

const translations: Record<Language, Record<TranslationKey, string>> = {
  vi: {
    generator: 'Tạo mã QR',
    scanner: 'Quét mã',
    history: 'Lịch sử',
    batchExport: 'Hàng loạt & Xuất',
    templates: 'Mẫu',
    privacy: 'Riêng tư',
    shortcuts: 'Phím tắt',
    pro: 'Pro',
    proActive: 'Pro đang hoạt động',
    private: '100% Riêng tư',
    professionalUtility: 'công cụ chuyên nghiệp',
    qrGenerator: 'Tạo mã QR',
    qrGeneratorDescription: 'Tạo mã QR chất lượng cao với mẫu thiết kế và định dạng in tùy chỉnh.',
    clientSidePrivate: '100% xử lý trên máy & riêng tư',
    supportsIso: 'Hỗ trợ ISO/IEC 18004 & VietQR',
    upgradePro: 'Nâng cấp Pro',
    shortcutsLabel: 'Phím tắt (?)',
    manageTemplates: 'Quản lý và tạo mẫu',
    qrTypeSelection: 'Chọn loại mã QR',
  },
  en: {
    generator: 'Generator',
    scanner: 'Scanner',
    history: 'History',
    batchExport: 'Batch & Export',
    templates: 'Templates',
    privacy: 'Privacy',
    shortcuts: 'Shortcuts',
    pro: 'Pro',
    proActive: 'Pro Active',
    private: '100% Private',
    professionalUtility: 'professional utility',
    qrGenerator: 'QR Code Generator',
    qrGeneratorDescription: 'Create high-fidelity QR codes with custom templates and print formats.',
    clientSidePrivate: '100% Client-Side & Private',
    supportsIso: 'Supports ISO/IEC 18004 & VietQR',
    upgradePro: 'Upgrade to Pro',
    shortcutsLabel: 'Shortcuts (?)',
    manageTemplates: 'Manage and create templates',
    qrTypeSelection: 'QR Code Type Selection',
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem('qr_tools_language');
      return stored === 'en' ? 'en' : 'vi';
    } catch {
      return 'vi';
    }
  });

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem('qr_tools_language', next);
    } catch {}
  };

  const toggleLanguage = () => setLanguage(language === 'vi' ? 'en' : 'vi');

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t: (key: TranslationKey) => translations[language][key] }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
};
