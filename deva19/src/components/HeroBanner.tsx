import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Truck,
  Percent,
  Gift,
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  FileText,
  Award,
  ShoppingCart,
  ThumbsUp,
  Flame,
} from 'lucide-react';
import { StoreSettings } from '../types';
import { Language, t } from '../utils/translations';
import officialLogoImg from '../assets/images/dj_devaraj_logo_new_1787994242607.jpg';

interface HeroBannerProps {
  onExploreProducts: () => void;
  onExploreGiftBoxes: () => void;
  onSelectPriceList?: () => void;
  settings?: StoreSettings | null;
  language?: Language;
}

type PosterTheme = 'gold' | 'blue' | 'red' | 'green';

const THEMES: PosterTheme[] = ['gold', 'blue', 'red', 'green'];

export const HeroBanner: React.FC<HeroBannerProps> = ({
  onExploreProducts,
  onExploreGiftBoxes,
  onSelectPriceList,
  settings,
  language = 'ta',
}) => {
  const [currentThemeIndex, setCurrentThemeIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Automatically cycle through the 4 poster themes every 3.5 seconds
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentThemeIndex((prev) => (prev + 1) % THEMES.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [isPaused]);

  const activeTheme = THEMES[currentThemeIndex];

  const handleWhatsAppOrder = () => {
    const phone = settings?.owner_whatsapp || '918870929100';
    window.open(
      `https://wa.me/${phone}?text=வணக்கம்,%20DJ%20DEVARAJ%20CRACKERS%20(தேவராஜ்%20பட்டாசு%20கடை)%20விலைப்%20பட்டியல்%20மற்றும்%20ஆர்டர்%20செய்ய%20விரும்புகிறேன்.`,
      '_blank'
    );
  };

  // Theme styling configurations matching the 4 authentic poster designs
  const themeStyles = {
    gold: {
      id: 'gold',
      name: 'Ivory Gold',
      tamilName: 'பொன் நிறம்',
      bgClass: 'bg-gradient-to-b from-[#FFFDF5] via-[#FFF8E7] to-[#FEEDBA] text-gray-900 border-amber-400 shadow-amber-900/10',
      headerText: 'text-gray-700',
      proprietorName: 'text-amber-950',
      phoneText: 'text-red-600',
      altPhoneText: 'text-gray-800',
      titleGrad: 'from-amber-600 via-amber-700 to-amber-900',
      subBg: 'bg-amber-100/90 border-amber-300/80 text-amber-950',
      addressBg: 'bg-white/90 border-amber-300/60 text-gray-800',
      badgeBg: 'bg-white/85 border-amber-300/70 text-amber-950',
      badgeIconColor: 'text-amber-600',
      dotActive: 'bg-amber-500 w-6',
    },
    blue: {
      id: 'blue',
      name: 'Midnight Blue',
      tamilName: 'ராயல் நீலம்',
      bgClass: 'bg-gradient-to-b from-[#0B1528] via-[#091E42] to-[#020B18] text-white border-blue-400/60 shadow-blue-950/40',
      headerText: 'text-blue-200',
      proprietorName: 'text-white',
      phoneText: 'text-amber-400',
      altPhoneText: 'text-blue-100',
      titleGrad: 'from-amber-300 via-amber-400 to-amber-200',
      subBg: 'bg-blue-900/60 border-blue-400/40 text-blue-100',
      addressBg: 'bg-blue-950/80 border-blue-500/40 text-blue-200',
      badgeBg: 'bg-blue-950/70 border-blue-400/30 text-amber-300',
      badgeIconColor: 'text-amber-400',
      dotActive: 'bg-blue-500 w-6',
    },
    red: {
      id: 'red',
      name: 'Ruby Festive Red',
      tamilName: 'தீபாவளி சிவப்பு',
      bgClass: 'bg-gradient-to-b from-[#380A0A] via-[#2A0505] to-[#170202] text-white border-red-500/60 shadow-red-950/40',
      headerText: 'text-red-200',
      proprietorName: 'text-white',
      phoneText: 'text-amber-400',
      altPhoneText: 'text-red-100',
      titleGrad: 'from-amber-300 via-amber-400 to-yellow-200',
      subBg: 'bg-red-950/70 border-red-500/40 text-red-100',
      addressBg: 'bg-black/60 border-red-500/40 text-red-200',
      badgeBg: 'bg-red-950/70 border-red-500/30 text-amber-300',
      badgeIconColor: 'text-amber-400',
      dotActive: 'bg-red-500 w-6',
    },
    green: {
      id: 'green',
      name: 'Emerald Royale',
      tamilName: 'மரகத பச்சை',
      bgClass: 'bg-gradient-to-b from-[#082414] via-[#051A0E] to-[#020E07] text-white border-emerald-500/60 shadow-emerald-950/40',
      headerText: 'text-emerald-200',
      proprietorName: 'text-white',
      phoneText: 'text-amber-400',
      altPhoneText: 'text-emerald-100',
      titleGrad: 'from-amber-300 via-amber-400 to-amber-200',
      subBg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-100',
      addressBg: 'bg-black/60 border-emerald-600/40 text-emerald-200',
      badgeBg: 'bg-emerald-950/70 border-emerald-500/30 text-amber-300',
      badgeIconColor: 'text-amber-400',
      dotActive: 'bg-emerald-500 w-6',
    },
  };

  const st = themeStyles[activeTheme];

  return (
    <div className="relative overflow-hidden bg-gradient-to-b from-red-50 via-amber-50/40 to-white py-6 sm:py-10 px-3 sm:px-6 border-b border-red-100">
      {/* Festive golden sparkles and ambient background lights */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-red-400/15 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Left Hero Content: Highly Styled English & Tamil Branding */}
          <div className="lg:col-span-6 text-center lg:text-left pt-2">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-red-100 via-amber-100 to-red-100 border border-red-200/80 text-red-700 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider mb-3 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>{t('outletBadge', language)}</span>
              <Flame className="w-3.5 h-3.5 text-red-500" />
            </div>

            {/* Main Brand Title: Styled for both Tamil and English */}
            <div className="mb-3">
              {/* English Brand Name */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight font-['Outfit',sans-serif]">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-900 via-red-950 to-gray-900">
                  DEVARAJ CRACKERS
                </span>
              </h1>

              {/* Styled Tamil Name with Gold Badge Frame */}
              <div className="mt-2 inline-block">
                <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white font-black text-xl sm:text-2xl lg:text-3xl px-4 py-1 rounded-2xl shadow-md border-2 border-amber-400 tracking-wide">
                  தேவராஜ் பட்டாசு கடை
                </div>
                <div className="text-xs sm:text-sm font-extrabold tracking-widest text-amber-800 uppercase mt-1">
                  📍 KANCHIPURAM (காஞ்சிபுரம்)
                </div>
              </div>
            </div>

            {/* Festive Announcement Banner */}
            <div className="text-xs sm:text-sm font-bold text-amber-950 bg-gradient-to-r from-amber-100/90 via-yellow-100/80 to-amber-100/90 border-2 border-amber-300/80 p-3 sm:p-3.5 rounded-2xl mb-4 max-w-xl mx-auto lg:mx-0 leading-relaxed shadow-xs">
              ✨ எங்களிடம் அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்தமாகவும் சில்லரையாகவும் பட்டாசுகள் கிடைக்கும்!
            </div>

            <p className="text-xs sm:text-sm text-gray-700 max-w-xl mb-5 mx-auto lg:mx-0 leading-relaxed">
              {t('heroDesc', language)}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2.5 justify-center lg:justify-start mb-6">
              <button
                onClick={onSelectPriceList || onExploreProducts}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 active:scale-95 text-white font-black px-5 py-3 rounded-xl text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer border border-amber-400/40"
              >
                <FileText className="w-4 h-4 text-amber-300" />
                <span>{t('onlinePriceListBtn', language)}</span>
              </button>

              <button
                onClick={onExploreGiftBoxes}
                className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-800 font-extrabold px-4 py-3 rounded-xl text-sm transition-all shadow-2xs flex items-center gap-2 cursor-pointer"
              >
                <Gift className="w-4 h-4 text-red-600" />
                <span>{t('giftBoxesBtn', language)}</span>
              </button>

              <button
                onClick={handleWhatsAppOrder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-3 rounded-xl text-sm transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('whatsAppOrderBtn', language)}</span>
              </button>
            </div>

            {/* 4 Feature Trust Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-red-100 text-left">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                  <Percent className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{t('featureDiscount', language)}</div>
                  <div className="text-[10px] text-gray-500">{t('featureDiscountSub', language)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{t('featureSafe', language)}</div>
                  <div className="text-[10px] text-gray-500">{t('featureSafeSub', language)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-amber-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{t('featureDispatch', language)}</div>
                  <div className="text-[10px] text-gray-500">{t('featureDispatchSub', language)}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-blue-700" />
                </div>
                <div>
                  <div className="text-xs font-bold text-gray-900">{t('featureBill', language)}</div>
                  <div className="text-[10px] text-gray-500">{t('featureBillSub', language)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Hero: Smooth Auto-Changing 4-Theme Poster Showcase (Hidden on Mobile view, Desktop Only) */}
          <div
            className="hidden lg:block lg:col-span-6"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Poster Card Container with Smooth Transition */}
            <div
              key={activeTheme}
              className={`relative rounded-3xl p-5 sm:p-6 shadow-2xl border-2 transition-all duration-700 overflow-hidden animate-in fade-in-50 zoom-in-98 ${st.bgClass}`}
            >
              {/* Festive Golden Sparkles & Ambient Glow */}
              <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-amber-400/15 blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 rounded-full bg-red-500/15 blur-2xl pointer-events-none" />

              {/* 1. Top Bar: Proprietor & Direct Phones */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-3 relative z-10">
                <div>
                  <span className={`text-[10px] font-bold block ${st.headerText}`}>
                    {language === 'ta' ? 'உரிமை :' : 'Proprietor:'}
                  </span>
                  <span className={`text-xs sm:text-sm font-black tracking-wide ${st.proprietorName}`}>
                    R.S.கோபிநாத் (R.S. Gopinath)
                  </span>
                </div>

                <div className="text-right">
                  <div className={`flex items-center justify-end gap-1 font-black text-xs sm:text-sm ${st.phoneText}`}>
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <a href="tel:+918870929100" className="hover:underline">
                      98947 77176
                    </a>
                  </div>
                  <div className={`text-[11px] font-extrabold mt-0.5 ${st.altPhoneText}`}>
                    <a href="tel:+919444415380" className="hover:underline">
                      94444 15380
                    </a>
                  </div>
                </div>
              </div>

              {/* 2. Central Official 3D DEVARAJ CRACKERS Logo */}
              <div className="text-center py-2 relative z-10">
                <div className="flex items-center justify-center mb-2">
                  <div className="relative rounded-2xl overflow-hidden max-w-[280px] sm:max-w-[340px] p-2 bg-white/95 border border-amber-300 shadow-xl backdrop-blur-xs">
                    <img
                      src={officialLogoImg}
                      alt="DEVARAJ CRACKERS Official Logo"
                      referrerPolicy="no-referrer"
                      className="w-full h-auto object-contain drop-shadow-md"
                    />
                  </div>
                </div>

                {/* Tamil Subtitle / Celebration Notice */}
                <div className={`mt-2 px-3 py-2 rounded-xl border text-center ${st.subBg}`}>
                  <p className="text-[11px] sm:text-xs font-bold leading-relaxed">
                    ✨ தேவராஜ் பட்டாசு கடை • அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்தமாகவும் சில்லரையாகவும் பட்டாசுகள் கிடைக்கும்!
                  </p>
                </div>
              </div>

              {/* 3. Address Card */}
              <div className={`mt-3 pt-2.5 rounded-2xl p-3 text-xs flex items-start gap-2.5 border relative z-10 ${st.addressBg}`}>
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-snug">
                  <span className="font-bold">{language === 'ta' ? 'முகவரி: ' : 'Address: '}</span>
                  நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில், காஞ்சிபுரம் - 631 502.
                </div>
              </div>

              {/* 4. Action Buttons (Call Owner & WhatsApp) */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-1 relative z-10">
                <a
                  href="tel:+918870929100"
                  className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-white" />
                  <span>Call Owner</span>
                </a>
                <button
                  onClick={handleWhatsAppOrder}
                  className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                  <span>WhatsApp Chat</span>
                </button>
              </div>

              {/* 5. 4 Distinct Trust Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3 pt-2.5 border-t border-white/10 text-[10px] relative z-10">
                <div className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-center font-bold ${st.badgeBg}`}>
                  <Award className={`w-3 h-3 ${st.badgeIconColor} shrink-0`} />
                  <span className="truncate">BEST QUALITY</span>
                </div>

                <div className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-center font-bold ${st.badgeBg}`}>
                  <ShoppingCart className={`w-3 h-3 ${st.badgeIconColor} shrink-0`} />
                  <span className="truncate">WHOLESALE & RETAIL</span>
                </div>

                <div className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-center font-bold ${st.badgeBg}`}>
                  <ThumbsUp className={`w-3 h-3 ${st.badgeIconColor} shrink-0`} />
                  <span className="truncate">BEST PRICE</span>
                </div>

                <div className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-lg border text-center font-bold ${st.badgeBg}`}>
                  <ShieldCheck className={`w-3 h-3 ${st.badgeIconColor} shrink-0`} />
                  <span className="truncate">SAFE & TRUSTED</span>
                </div>
              </div>
            </div>

            {/* Subtle Auto-Rotating Indicator Dots */}
            <div className="flex items-center justify-center gap-2 mt-3">
              {THEMES.map((thm, idx) => {
                const isActive = idx === currentThemeIndex;
                return (
                  <button
                    key={thm}
                    onClick={() => setCurrentThemeIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                      isActive ? 'w-7 bg-red-600' : 'w-2 bg-gray-300 hover:bg-gray-400'
                    }`}
                    title={`Theme ${idx + 1}: ${themeStyles[thm].name}`}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
