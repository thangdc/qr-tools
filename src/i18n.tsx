import React, {createContext, useContext, useMemo, useState} from 'react';

export type Language = 'vi' | 'en';

type TranslationKey =
  | 'brandTagline' | 'generator' | 'scanner' | 'history' | 'bulkExport'
  | 'templates' | 'private' | 'shortcuts' | 'pro' | 'proActive'
  | 'qrGenerator' | 'generatorDescription' | 'templatesCount' | 'dpiExport'
  | 'footerPrivate' | 'supports' | 'upgradePro' | 'languageVietnamese'
  | 'languageEnglish' | 'qrTypeSelection';

const translations: Record<Language, Record<TranslationKey, string>> = {
  vi: {
    brandTagline: 'tiện ích chuyên nghiệp',
    generator: 'Tạo QR',
    scanner: 'Quét mã',
    history: 'Lịch sử',
    bulkExport: 'Hàng loạt & Xuất',
    templates: 'Mẫu',
    private: '100% Riêng tư',
    shortcuts: 'Phím tắt',
    pro: 'Pro',
    proActive: 'Pro đang bật',
    qrGenerator: 'Trình tạo mã QR',
    generatorDescription: 'Tạo mã QR chất lượng cao với mẫu tùy chỉnh và định dạng in chuyên nghiệp.',
    templatesCount: 'Mẫu',
    dpiExport: 'Xuất 300 DPI',
    footerPrivate: '100% Xử lý trên máy & Riêng tư',
    supports: 'Hỗ trợ ISO/IEC 18004 & VietQR',
    upgradePro: 'Nâng cấp Pro',
    languageVietnamese: 'Tiếng Việt',
    languageEnglish: 'English',
    qrTypeSelection: 'Chọn loại mã QR',
  },
  en: {
    brandTagline: 'professional utility',
    generator: 'Generator',
    scanner: 'Scanner',
    history: 'History',
    bulkExport: 'Batch & Export',
    templates: 'Templates',
    private: '100% Private',
    shortcuts: 'Shortcuts',
    pro: 'Pro',
    proActive: 'Pro Active',
    qrGenerator: 'QR Code Generator',
    generatorDescription: 'Create high-fidelity QR codes with custom templates and professional print formats.',
    templatesCount: 'Templates',
    dpiExport: '300 DPI Export',
    footerPrivate: '100% Client-Side & Private',
    supports: 'Supports ISO/IEC 18004 & VietQR',
    upgradePro: 'Upgrade to Pro',
    languageVietnamese: 'Tiếng Việt',
    languageEnglish: 'English',
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

const STORAGE_KEY = 'qr_tools_language';

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({children}) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'en' ? 'en' : 'vi';
    } catch {
      return 'vi';
    }
  });

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; language still changes for the current session.
    }
  };

  const toggleLanguage = () => setLanguage(language === 'vi' ? 'en' : 'vi');

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: (key: TranslationKey) => translations[language][key],
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return context;
};
