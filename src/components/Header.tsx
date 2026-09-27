import React, { useState } from 'react';
import { Sparkles, History, Layers, ScanLine, ShieldCheck, Keyboard, LayoutTemplate, Menu, X, BookOpen } from 'lucide-react';
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

export const Header: React.FC<HeaderProps> = (props) => {
  const { activeView, setActiveView, historyCount, isPro, onOpenPro, onOpenPrivacy, onOpenShortcuts, onOpenTemplates } = props;
  const { language, toggleLanguage, t, tx } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const selectView = (view: HeaderProps['activeView']) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const openAction = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  const navClass = (active: boolean) =>
    `px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${active
      ? 'bg-neutral-100 text-neutral-900 font-semibold'
      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xs border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <button onClick={() => selectView('generator')} className="flex items-center gap-2 text-left group cursor-pointer min-w-0">
          <span className="font-semibold text-base tracking-tight text-neutral-900 group-hover:text-blue-600 transition-colors shrink-0">QR Tools</span>
          <span className="text-xs text-neutral-400 font-mono hidden lg:inline truncate">/ {tx('tiện ích chuyên nghiệp', 'professional utility')}</span>
        </button>

        <nav className="hidden md:flex items-center gap-1">
          <button onClick={() => selectView('generator')} className={navClass(activeView === 'generator')}>{t('generator')}</button>
          <button onClick={() => selectView('scanner')} className={`${navClass(activeView === 'scanner')} flex items-center gap-1.5`}><ScanLine className="w-3.5 h-3.5 text-neutral-400" /><span>{t('scanner')}</span></button>
          <button onClick={() => selectView('history')} className={`${navClass(activeView === 'history')} flex items-center gap-1.5`}><History className="w-3.5 h-3.5 text-neutral-400" /><span>{t('history')}</span>{historyCount > 0 && <span className="text-xs text-neutral-500 font-mono">· {historyCount}</span>}</button>
          <button onClick={() => selectView('bulk')} className={`${navClass(activeView === 'bulk')} flex items-center gap-1.5`}><Layers className="w-3.5 h-3.5 text-neutral-400" /><span>{t('bulkExport')}</span></button>
          <a href="/guide.html" className="px-3 py-2 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-neutral-400" /><span>Hướng dẫn</span></a>
        </nav>

        <div className="hidden md:flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a href="/guide.html" className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-md transition-colors"><BookOpen className="w-3.5 h-3.5 text-neutral-500" /><span>Hướng dẫn</span></a>
          <button type="button" onClick={onOpenTemplates} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"><LayoutTemplate className="w-3.5 h-3.5 text-neutral-500" /><span>{t('templates')}</span></button>
          <button type="button" onClick={onOpenPrivacy} className="hidden lg:inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-emerald-700 px-2 py-1 rounded transition-colors cursor-pointer"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /><span>{t('private')}</span></button>
          <button type="button" onClick={onOpenShortcuts} className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors cursor-pointer" title={t('shortcuts')}><Keyboard className="w-4 h-4" /></button>
          <button type="button" onClick={toggleLanguage} className="inline-flex items-center h-7 px-2 text-[10px] font-semibold rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer">{language === 'vi' ? 'EN' : 'VI'}</button>
          <button onClick={onOpenPro} className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border cursor-pointer ${isPro ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'}`}><Sparkles className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-600' : 'text-blue-600'}`} /><span>{isPro ? t('proActive') : t('pro')}</span></button>
        </div>

        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button type="button" onClick={onOpenPro} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${isPro ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}><Sparkles className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-600' : 'text-blue-600'}`} /><span>{isPro ? t('proActive') : t('pro')}</span></button>
          <button type="button" onClick={() => setIsMobileMenuOpen(v => !v)} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer" aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={isMobileMenuOpen}>{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-neutral-100 bg-white shadow-lg">
          <nav className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-2 gap-1.5">
            <button onClick={() => selectView('generator')} className={navClass(activeView === 'generator')}>{t('generator')}</button>
            <button onClick={() => selectView('scanner')} className={`${navClass(activeView === 'scanner')} flex items-center gap-2`}><ScanLine className="w-4 h-4 text-neutral-400" />{t('scanner')}</button>
            <button onClick={() => selectView('history')} className={`${navClass(activeView === 'history')} flex items-center gap-2`}><History className="w-4 h-4 text-neutral-400" />{t('history')}{historyCount > 0 && <span className="text-xs text-neutral-500">· {historyCount}</span>}</button>
            <button onClick={() => selectView('bulk')} className={`${navClass(activeView === 'bulk')} flex items-center gap-2`}><Layers className="w-4 h-4 text-neutral-400" />{t('bulkExport')}</button>
            <a href="/guide.html" onClick={() => setIsMobileMenuOpen(false)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2"><BookOpen className="w-4 h-4 text-neutral-400" />Hướng dẫn</a>
            <button onClick={() => openAction(onOpenTemplates)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><LayoutTemplate className="w-4 h-4 text-neutral-400" />{t('templates')}</button>
            <button onClick={() => openAction(onOpenPrivacy)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><ShieldCheck className="w-4 h-4 text-emerald-600" />{t('private')}</button>
            <button onClick={() => openAction(onOpenShortcuts)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><Keyboard className="w-4 h-4 text-neutral-400" />{t('shortcuts')}</button>
            <button onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left cursor-pointer">{language === 'vi' ? 'English (EN)' : 'Tiếng Việt (VI)'}</button>
          </nav>
        </div>
      )}
    </header>
  );
};
