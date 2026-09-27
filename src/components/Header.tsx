import React from 'react';
import { Sparkles, History, Layers, ScanLine, ShieldCheck, Keyboard, LayoutTemplate } from 'lucide-react';
import { useLanguage } from '../i18n';

interface HeaderProps {
  activeView: 'generator' | 'scanner' | 'history' | 'bulk';
  setActiveView: (view: 'generator' | 'scanner' | 'history' | 'bulk') => void;
  historyCount: number;
  isPro: boolean;
  onOpenPro: () => void;
  onOpenPrivacy: () => void;
  onOpenShortcuts: () => void;
  onOpenTemplates: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  historyCount,
  isPro,
  onOpenPro,
  onOpenPrivacy,
  onOpenShortcuts,
  onOpenTemplates,
}) => {
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xs border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('generator')}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <span className="font-semibold text-base tracking-tight text-neutral-900 group-hover:text-blue-600 transition-colors">
              QR Tools
            </span>
            <span className="text-xs text-neutral-400 font-mono hidden md:inline">
              / professional utility
            </span>
          </button>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="flex items-center gap-1 sm:gap-1.5">
          <button
            onClick={() => setActiveView('generator')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer ${
              activeView === 'generator'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            Generator
          </button>

          <button
            onClick={() => setActiveView('scanner')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeView === 'scanner'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <ScanLine className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('scanner')}</span>
          </button>

          <button
            onClick={() => setActiveView('history')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeView === 'history'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <History className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('history')}</span>
            {historyCount > 0 && (
              <span className="text-xs text-neutral-500 font-mono tabular-nums">
                · {historyCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('bulk')}
            className={`px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeView === 'bulk'
                ? 'bg-neutral-100 text-neutral-900 font-semibold'
                : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-neutral-400" />
            <span>{t('bulkExport')}</span>
          </button>
        </nav>

        {/* Zone 3: Templates, Privacy, Shortcuts & Pro */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Templates manager trigger */}
          <button
            type="button"
            onClick={onOpenTemplates}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"
            title={t('templates')}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-neutral-500" />
            <span className="hidden sm:inline">{t('templates')}</span>
          </button>

          {/* Privacy badge */}
          <button
            type="button"
            onClick={onOpenPrivacy}
            className="hidden lg:inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-emerald-700 px-2 py-1 rounded transition-colors cursor-pointer"
            title={t('private')}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('private')}</span>
          </button>

          {/* Keyboard shortcuts icon */}
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors cursor-pointer"
            title={t('shortcuts')}
          >
            <Keyboard className="w-4 h-4" />
          </button>


          <button
            type="button"
            onClick={toggleLanguage}
            className="inline-flex items-center h-7 px-2 text-[10px] font-semibold rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer"
            aria-label={language === 'vi' ? t('languageEnglish') : t('languageVietnamese')}
            title={language === 'vi' ? t('languageEnglish') : t('languageVietnamese')}
          >
            {language === 'vi' ? 'EN' : 'VI'}
          </button>
          <button
            onClick={onOpenPro}
            className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border cursor-pointer ${
              isPro
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-600' : 'text-blue-600'}`} />
            <span>{isPro ? t('proActive') : t('pro')}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
