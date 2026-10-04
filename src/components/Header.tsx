import React, { useState } from 'react';
import { Sparkles, History, ScanLine, ShieldCheck, Keyboard, LayoutTemplate, Menu, X, BookOpen, ChevronDown, Workflow } from 'lucide-react';
import { useLanguage } from '../i18n';

interface HeaderProps {
  activeView: 'generator' | 'scanner' | 'history' | 'workflows' | 'checkin' | 'bulk-print' | 'assets';
  setActiveView: (view: 'generator' | 'scanner' | 'history' | 'workflows' | 'checkin' | 'bulk-print') => void;
  historyCount: number;
  isPro: boolean;
  onOpenPro: () => void;
  onOpenPrivacy: () => void;
  onOpenShortcuts: () => void;
  onOpenTemplates: () => void;
}

const guideLinks = [
  { label: 'Tổng quan QR Tools', href: '/guide.html' },
  { label: 'Tạo QR VietQR', href: '/tao-ma-qr-vietqr-online/' },
  { label: 'Tạo QR WiFi', href: '/tao-ma-qr-wifi/' },
  { label: 'Tạo QR từ Excel', href: '/tao-ma-qr-tu-excel/' },
  { label: 'Tạo QR hàng loạt', href: '/tao-ma-qr-hang-loat/' },
  { label: 'In nhiều mã QR từ Excel', href: '/in-nhieu-ma-qr-tu-excel/' },
];

export const Header: React.FC<HeaderProps> = (props) => {
  const { activeView, setActiveView, historyCount, isPro, onOpenPro, onOpenPrivacy, onOpenShortcuts, onOpenTemplates } = props;
  const { language, toggleLanguage, t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isGuideMenuOpen, setIsGuideMenuOpen] = useState(false);

  const selectView = (view: HeaderProps['activeView']) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  const openAction = (action: () => void) => {
    action();
    setIsMobileMenuOpen(false);
  };

  const navClass = (active: boolean) =>
    `px-2 py-1.5 text-sm font-medium whitespace-nowrap rounded-lg transition-colors cursor-pointer ${active
      ? 'bg-neutral-100 text-neutral-900 font-semibold'
      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'}`;

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-xs border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <button onClick={() => selectView('generator')} className="flex items-center gap-2 text-left group cursor-pointer min-w-0">
          <span className="font-semibold text-base tracking-tight text-neutral-900 group-hover:text-blue-600 transition-colors shrink-0">QR Tools</span>
        </button>

        <nav className="hidden md:flex items-center gap-0.5 whitespace-nowrap">
          <button data-testid="nav-generator" onClick={() => selectView('generator')} className={navClass(activeView === 'generator')}>{t('generator')}</button>
          <button data-testid="nav-workflows" onClick={() => selectView('workflows')} className={`${navClass(activeView === 'workflows' || activeView === 'checkin' || activeView === 'bulk-print' || activeView === 'assets')} flex items-center gap-1.5`}><Workflow className="w-3.5 h-3.5 text-neutral-400" /><span>Workflows</span></button>
          <button data-testid="nav-history" onClick={() => selectView('history')} className={`${navClass(activeView === 'history')} flex items-center gap-1.5`}><History className="w-3.5 h-3.5 text-neutral-400" /><span>{t('history')}</span>{historyCount > 0 && <span className="text-xs text-neutral-500 font-mono">· {historyCount}</span>}</button>
          <div className="relative">
            <button type="button" onClick={() => setIsGuideMenuOpen(v => !v)} className="px-2.5 py-1.5 text-sm font-medium rounded-lg transition-colors text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 flex items-center gap-1.5 cursor-pointer" aria-expanded={isGuideMenuOpen} aria-haspopup="menu">
              <BookOpen className="w-3.5 h-3.5 text-neutral-400" /><span>Hướng dẫn</span><ChevronDown className={`w-3.5 h-3.5 transition-transform ${isGuideMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isGuideMenuOpen && <div className="absolute left-0 top-full mt-1 w-64 rounded-lg border border-neutral-200 bg-white p-1.5 shadow-lg z-50" role="menu">
              {guideLinks.map((link) => <a key={link.href} href={link.href} onClick={() => setIsGuideMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900" role="menuitem">{link.label}</a>)}
            </div>}
          </div>
        </nav>

        <div className="hidden md:flex items-center gap-1 shrink-0">
          <button data-testid="nav-templates" type="button" onClick={onOpenTemplates} className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 px-2.5 py-1.5 rounded-md transition-colors cursor-pointer"><LayoutTemplate className="w-3.5 h-3.5 text-neutral-500" /><span>{t('templates')}</span></button>
          <button type="button" onClick={onOpenPrivacy} className="hidden xl:inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-emerald-700 px-1.5 py-1 rounded transition-colors cursor-pointer"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /><span>{t('private')}</span></button>
          <button type="button" onClick={onOpenShortcuts} className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded transition-colors cursor-pointer" title={t('shortcuts')}><Keyboard className="w-4 h-4" /></button>
          <button type="button" onClick={toggleLanguage} className="inline-flex items-center h-7 px-2 text-[10px] font-semibold rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 transition-colors cursor-pointer">{language === 'vi' ? 'EN' : 'VI'}</button>
          <button onClick={onOpenPro} className={`px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 border cursor-pointer ${isPro ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-700'}`}><Sparkles className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-600' : 'text-blue-600'}`} /><span>{isPro ? t('proActive') : t('pro')}</span></button>
        </div>

        <div className="flex md:hidden items-center gap-1.5 shrink-0">
          <button type="button" onClick={onOpenPro} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${isPro ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-neutral-50 border-neutral-200 text-neutral-700'}`}><Sparkles className={`w-3.5 h-3.5 ${isPro ? 'text-emerald-600' : 'text-blue-600'}`} /><span>{isPro ? t('proActive') : t('pro')}</span></button>
          <button type="button" onClick={() => setIsMobileMenuOpen(v => !v)} className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer" aria-label={isMobileMenuOpen ? 'Đóng menu' : 'Mở menu'} aria-expanded={isMobileMenuOpen}>{isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button>
        </div>
      </div>

      {isMobileMenuOpen && <div className="md:hidden border-t border-neutral-100 bg-white shadow-lg">
        <nav className="max-w-6xl mx-auto px-4 py-3 grid grid-cols-2 gap-1.5">
          <button onClick={() => selectView('generator')} className={navClass(activeView === 'generator')}>{t('generator')}</button>
          <button onClick={() => selectView('workflows')} className={`${navClass(activeView === 'workflows' || activeView === 'checkin' || activeView === 'bulk-print')} flex items-center gap-2`}><Workflow className="w-4 h-4 text-neutral-400" />Workflows</button>
          <button onClick={() => selectView('history')} className={`${navClass(activeView === 'history')} flex items-center gap-2`}><History className="w-4 h-4 text-neutral-400" />{t('history')}{historyCount > 0 && <span className="text-xs text-neutral-500">· {historyCount}</span>}</button>
          <button onClick={() => selectView('scanner')} className={`${navClass(activeView === 'scanner')} flex items-center gap-2`}><ScanLine className="w-4 h-4 text-neutral-400" />{t('scanner')}</button>
          <div className="col-span-2">
            <button type="button" onClick={() => setIsGuideMenuOpen(v => !v)} className="w-full px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center justify-between gap-2 cursor-pointer" aria-expanded={isGuideMenuOpen}>
              <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-neutral-400" />Hướng dẫn</span><ChevronDown className={`w-4 h-4 transition-transform ${isGuideMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {isGuideMenuOpen && <div className="mt-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1.5">
              {guideLinks.map((link) => <a key={link.href} href={link.href} onClick={() => { setIsGuideMenuOpen(false); setIsMobileMenuOpen(false); }} className="block rounded-md px-3 py-2 text-sm text-neutral-600 hover:bg-white hover:text-neutral-900">{link.label}</a>)}
            </div>}
          </div>
          <button onClick={() => openAction(onOpenTemplates)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><LayoutTemplate className="w-4 h-4 text-neutral-400" />{t('templates')}</button>
          <button onClick={() => openAction(onOpenPrivacy)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><ShieldCheck className="w-4 h-4 text-emerald-600" />{t('private')}</button>
          <button onClick={() => openAction(onOpenShortcuts)} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left flex items-center gap-2 cursor-pointer"><Keyboard className="w-4 h-4 text-neutral-400" />{t('shortcuts')}</button>
          <button onClick={() => { toggleLanguage(); setIsMobileMenuOpen(false); }} className="px-3 py-2 text-sm font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 rounded-lg text-left cursor-pointer">{language === 'vi' ? 'English (EN)' : 'Tiếng Việt (VI)'}</button>
        </nav>
      </div>}
    </header>
  );
};
