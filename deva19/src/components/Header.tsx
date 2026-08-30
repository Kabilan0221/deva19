import React, { useState, useRef, useEffect } from 'react';
import {
  ShoppingCart,
  Menu,
  X,
  Store,
  Calculator,
  ShieldCheck,
  Phone,
  Flame,
  Lock,
  LogOut,
  MessageCircle,
  User,
  Sparkles,
  Download,
  ShieldAlert,
  Sun,
  Moon,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { Product, StoreSettings } from '../types';
import { downloadPriceListPDF } from '../utils/pdfGenerator';
import { BrandLogo } from './BrandLogo';
import { Language, t } from '../utils/translations';

interface HeaderProps {
  currentView: 'store' | 'pos' | 'admin';
  setCurrentView: (view: 'store' | 'pos' | 'admin') => void;
  cartCount: number;
  openCart: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  products: Product[];
  categories: any[];
  onSelectProduct: (p: Product) => void;
  settings?: StoreSettings | null;
  selectedCategory: number | 'all';
  setSelectedCategory: (id: number | 'all') => void;
  currentUser: any;
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenSafetyTips: () => void;
  onOpenContact: () => void;
  onOpenCustomerBills: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  themeMode: 'festive' | 'bw';
  setThemeMode: (theme: 'festive' | 'bw') => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  cartCount,
  openCart,
  products,
  categories,
  settings,
  setSelectedCategory,
  currentUser,
  onOpenLogin,
  onLogout,
  onOpenSafetyTips,
  onOpenContact,
  onOpenCustomerBills,
  language,
  setLanguage,
  themeMode,
  setThemeMode,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWhatsAppChat = () => {
    const phone = settings?.owner_whatsapp || '918870929100';
    window.open(
      `https://wa.me/${phone}?text=வணக்கம்,%20தேவராஜ்%20பட்டாசு%20கடை%20(DEVARAJ%20TRADERS)%20பட்டாசு%20விவரங்கள்%20மற்றும்%20ஆர்டர்%20செய்ய%20விரும்புகிறேன்.`,
      '_blank'
    );
  };

  const handleDownloadPricelist = () => {
    downloadPriceListPDF(products, categories, settings);
  };

  const scrollToCrackers = () => {
    setCurrentView('store');
    const el =
      document.getElementById('price-list-section') ||
      document.getElementById('products-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleGoHome = () => {
    setCurrentView('store');
    setSelectedCategory('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className={`sticky top-0 z-40 shadow-md ${themeMode === 'bw' ? 'bg-zinc-900 text-white' : 'bg-white text-gray-900'}`}>
      {/* 1. Top Notice Bar */}
      <div className={`border-b text-xs py-1.5 px-3 sm:px-4 ${themeMode === 'bw' ? 'bg-black border-zinc-800 text-zinc-300' : 'bg-amber-50/80 border-amber-200/60 text-slate-800'}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
          {/* Left: Proprietor & Shop Name */}
          <div className="flex items-center gap-2 font-medium tracking-wide truncate min-w-0">
            <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] sm:text-[11px] font-black px-2 py-0.5 rounded uppercase tracking-wider shrink-0 shadow-2xs">
              {t('proprietor', language)}
            </span>
            <span className="hidden md:inline font-black text-red-700 truncate">
              {t('shopTitleFull', language)}
            </span>
            <span className="md:hidden font-bold text-red-700 text-[10px] truncate">
              💥 DEVARAJ TRADERS • 90% DISCOUNT!
            </span>
          </div>

          {/* Right: Phone Numbers, WhatsApp, Language & Theme Toggles */}
          <div className="flex items-center gap-2.5 text-[10px] sm:text-[11px] shrink-0">
            <a
              href="tel:+918870929100"
              className="text-slate-800 hover:text-red-700 transition-colors flex items-center gap-1 font-bold whitespace-nowrap"
            >
              <Phone className="w-3 h-3 text-red-600 shrink-0" />
              <span>98947 77176</span>
            </a>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <button
              onClick={handleWhatsAppChat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <MessageCircle className="w-2.5 h-2.5 shrink-0" />
              <span>WhatsApp</span>
            </button>

            {/* Language Switcher (English / Tamil) */}
            <button
              onClick={() => setLanguage(language === 'ta' ? 'en' : 'ta')}
              className="bg-red-700 hover:bg-red-800 text-white text-[9px] sm:text-[10px] font-black px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              title="Switch Language (தமிழ் / English)"
            >
              <Globe className="w-2.5 h-2.5 text-amber-300 shrink-0" />
              <span>{language === 'ta' ? 'English' : 'தமிழ்'}</span>
            </button>

            {/* B&W / Festive Theme Switcher */}
            <button
              onClick={() => setThemeMode(themeMode === 'festive' ? 'bw' : 'festive')}
              className={`text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer border ${
                themeMode === 'bw'
                  ? 'bg-zinc-800 border-zinc-700 text-amber-400'
                  : 'bg-white border-amber-300 text-slate-800 hover:bg-amber-100'
              }`}
              title="Toggle Black & White / Festive Theme"
            >
              {themeMode === 'bw' ? (
                <>
                  <Sun className="w-2.5 h-2.5 text-amber-400" />
                  <span className="hidden sm:inline">Color</span>
                </>
              ) : (
                <>
                  <Moon className="w-2.5 h-2.5 text-slate-700" />
                  <span className="hidden sm:inline">B&W</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Smooth Moving Announcement Banner (Marquee) */}
      <div className="bg-gradient-to-r from-red-800 via-red-700 to-amber-700 text-white py-1 overflow-hidden relative shadow-inner border-y border-amber-400/30">
        <div className="flex items-center whitespace-nowrap animate-marquee">
          <span className="text-xs font-black tracking-wide mx-4 text-amber-200 drop-shadow-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{t('marqueeText', language)}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </span>
          <span className="text-xs font-black tracking-wide mx-4 text-amber-200 drop-shadow-xs flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>{t('marqueeText', language)}</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </span>
        </div>
      </div>

      {/* 3. Main Brand Header Bar */}
      <div className={`max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 ${themeMode === 'bw' ? 'bg-zinc-900' : 'bg-white'}`}>
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Shop Identity */}
          <div
            onClick={handleGoHome}
            className="cursor-pointer group min-w-0 flex-1 sm:flex-initial"
          >
            <BrandLogo
              theme={themeMode === 'bw' ? 'dark' : 'light'}
              size="md"
              showSubtitle={true}
            />
          </div>

          {/* Centered 'Explore Crackers Now' Button (Replaced Search Bar as requested) */}
          {currentView === 'store' && !currentUser && (
            <div className="hidden sm:flex flex-1 justify-center max-w-md mx-2">
              <button
                onClick={scrollToCrackers}
                className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold px-6 py-2.5 rounded-full text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95"
              >
                <Flame className="w-4 h-4 text-amber-300 fill-amber-300 animate-bounce" />
                <span>{t('exploreCrackersNow', language)}</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          )}

          {/* Action Navigation: Profile Avatar Icon & Cart Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Sleek Profile / Avatar Icon Button */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                type="button"
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-full border transition-all cursor-pointer shadow-xs ${
                  currentUser
                    ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                    : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                }`}
                title={currentUser ? `${currentUser.name} (${currentUser.role})` : 'Staff / Owner Login'}
              >
                {currentUser ? (
                  <div className="font-black text-xs uppercase flex items-center justify-center w-full h-full text-red-800">
                    {currentUser.name.charAt(0)}
                  </div>
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </button>

              {/* Profile Dropdown Menu */}
              {isProfileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-50 text-gray-900 animate-in zoom-in-95">
                  {currentUser ? (
                    <div>
                      <div className="p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100">
                        <div className="font-extrabold text-sm text-gray-900">{currentUser.name}</div>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-0.5">
                          <span>{currentUser.mobile || 'Staff Member'}</span>
                          <span className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                            {currentUser.role}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs font-bold">
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentView('pos');
                            setIsProfileDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer ${
                            currentView === 'pos' ? 'bg-amber-100 text-amber-900 font-black' : 'hover:bg-amber-50 text-amber-900'
                          }`}
                        >
                          <Calculator className="w-3.5 h-3.5 text-amber-700" />
                          <span>Store Billing Desk (POS)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentView('admin');
                            setIsProfileDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 cursor-pointer ${
                            currentView === 'admin' ? 'bg-red-100 text-red-900 font-black' : 'hover:bg-red-50 text-red-900'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                          <span>{currentUser.role === 'OWNER' ? 'Owner Admin Dashboard' : 'Staff Sales & Stock Portal'}</span>
                        </button>

                        <div className="pt-1 border-t border-gray-100 mt-1">
                          <button
                            type="button"
                            onClick={() => {
                              onLogout();
                              setIsProfileDropdownOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-xl flex items-center gap-2 text-red-600 cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 space-y-2">
                      <div className="text-xs text-gray-500 leading-tight px-1">
                        Staff and owner portal for store counter billing, product price management, and stock.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onOpenLogin();
                          setIsProfileDropdownOpen(false);
                        }}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-2 shadow cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Staff / Owner Login</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Shopping Cart Button */}
            {currentView === 'store' && (
              <button
                onClick={openCart}
                className="relative flex items-center gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-4 py-2 rounded-full text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">{t('cart', language)}</span>
                {cartCount > 0 && (
                  <span className="bg-amber-400 text-red-950 text-[11px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-xs">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Mobile Drawer Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-xl md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile 'Explore Crackers Now' Button */}
        {currentView === 'store' && !currentUser && (
          <div className="mt-2.5 sm:hidden">
            <button
              onClick={scrollToCrackers}
              className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:from-red-700 hover:to-amber-700 text-white font-extrabold py-2.5 px-4 rounded-full text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Flame className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>{t('exploreCrackersNow', language)}</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* 4. Deep Red Navigation Bar - ONLY shown in public store when not logged in */}
      {currentView === 'store' && !currentUser && (
        <nav className="bg-[#990000] text-white border-t border-red-900/40 shadow-inner overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between gap-1 sm:gap-3 py-1 text-xs sm:text-sm font-black whitespace-nowrap min-w-max">
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Home */}
              <button
                onClick={handleGoHome}
                className="px-3 py-1.5 rounded-lg hover:bg-red-800/80 text-white hover:text-amber-200 transition-colors cursor-pointer"
              >
                {t('home', language)}
              </button>
              <span className="text-red-300/40">|</span>

              {/* Products */}
              <button
                onClick={scrollToCrackers}
                className="px-3 py-1.5 rounded-lg hover:bg-red-800/80 text-white hover:text-amber-200 transition-colors cursor-pointer"
              >
                {t('products', language)}
              </button>
              <span className="text-red-300/40">|</span>

              {/* Safety Tips */}
              <button
                onClick={onOpenSafetyTips}
                className="px-3 py-1.5 rounded-lg hover:bg-red-800/80 text-white hover:text-amber-300 transition-colors cursor-pointer"
              >
                {t('safetyTips', language)}
              </button>
              <span className="text-red-300/40">|</span>

              {/* Contact */}
              <button
                onClick={onOpenContact}
                className="px-3 py-1.5 rounded-lg hover:bg-red-800/80 text-white hover:text-amber-300 transition-colors cursor-pointer"
              >
                {t('contact', language)}
              </button>
              <span className="text-red-300/40">|</span>

              {/* Customer Bill Search / Track */}
              <button
                onClick={onOpenCustomerBills}
                className="px-3 py-1.5 rounded-lg bg-amber-400/20 hover:bg-amber-400 hover:text-red-950 text-amber-300 font-black transition-all cursor-pointer flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{t('trackMyBill', language)}</span>
              </button>
            </div>

            {/* Right: Download Pricelist Button */}
            <div className="pl-2">
              <button
                onClick={handleDownloadPricelist}
                className="bg-amber-400 hover:bg-amber-300 text-red-950 px-3.5 py-1 rounded-md text-xs font-black flex items-center gap-1.5 transition-all shadow cursor-pointer uppercase tracking-wider"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('downloadPricelist', language)}</span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-2 text-gray-900 animate-in slide-in-from-top duration-150">
          <div className="space-y-1 text-xs font-bold text-gray-700">
            <button
              onClick={() => {
                handleGoHome();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 hover:bg-red-50 rounded-xl flex items-center gap-2"
            >
              <Store className="w-4 h-4 text-red-600" />
              <span>{t('home', language)}</span>
            </button>

            <button
              onClick={() => {
                scrollToCrackers();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 hover:bg-red-50 rounded-xl flex items-center gap-2"
            >
              <Flame className="w-4 h-4 text-amber-600" />
              <span>{t('products', language)}</span>
            </button>

            <button
              onClick={() => {
                onOpenCustomerBills();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 bg-amber-50 text-amber-900 rounded-xl flex items-center gap-2 font-black"
            >
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>{t('trackMyBill', language)}</span>
            </button>

            <button
              onClick={() => {
                onOpenSafetyTips();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 hover:bg-amber-50 rounded-xl flex items-center gap-2 text-gray-700"
            >
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span>{t('safetyTips', language)}</span>
            </button>

            <button
              onClick={() => {
                onOpenContact();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 hover:bg-red-50 rounded-xl flex items-center gap-2 text-gray-700"
            >
              <Phone className="w-4 h-4 text-red-600" />
              <span>{t('contact', language)}</span>
            </button>

            <button
              onClick={() => {
                handleDownloadPricelist();
                setMobileMenuOpen(false);
              }}
              className="w-full text-left p-2.5 bg-amber-50 text-amber-900 rounded-xl flex items-center gap-2 font-black"
            >
              <Download className="w-4 h-4 text-amber-700" />
              <span>{t('downloadPricelist', language)}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
