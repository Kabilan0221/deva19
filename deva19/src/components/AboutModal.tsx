import React from 'react';
import { X, Phone, MessageCircle, MapPin, Award, Sparkles, CheckCircle2, Shield } from 'lucide-react';
import { StoreSettings } from '../types';
import { BrandLogo } from './BrandLogo';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings | null;
  language?: 'ta' | 'en';
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  settings,
  language = 'ta',
}) => {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const phone = settings?.owner_whatsapp || '918870929100';
    window.open(
      `https://wa.me/${phone}?text=வணக்கம்,%20தேவராஜ்%20பட்டாசு%20கடை%20(DEVARAJ%20TRADERS)%20பற்றிய%20விவரங்கள்%20அறிய%20விரும்புகிறேன்.`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-red-100 relative my-8 animate-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Header Card */}
        <div className="border-2 border-red-500 rounded-2xl p-4 sm:p-5 relative bg-gradient-to-b from-red-50/50 to-white mb-5 shadow-xs">
          {/* Centered Brand Logo */}
          <div className="flex justify-center mb-3">
            <BrandLogo size="lg" variant="image-only" />
          </div>

          <div className="text-center py-1.5 border-y border-red-100 my-2">
            <h2 className="text-xl sm:text-2xl font-black text-red-700 tracking-tight font-['Outfit',sans-serif]">
              தேவராஜ் பட்டாசு கடை
            </h2>
            <p className="text-xs sm:text-sm font-black text-slate-800 tracking-widest mt-0.5">
              // DEVARAJ CRACKERS //
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-center sm:text-left gap-2 my-2.5 text-xs">
            <div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-500 block">
                {language === 'ta' ? 'உரிமை :' : 'Proprietor :'}
              </span>
              <span className="text-sm font-black text-gray-900 tracking-wide">
                R.S.கோபிநாத் (R.S. Gopinath)
              </span>
            </div>
            <div className="text-center sm:text-right">
              <a
                href="tel:+918870929100"
                className="text-xs sm:text-sm font-black text-red-600 flex items-center justify-center sm:justify-end gap-1 hover:underline"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>98947 77176 / 94444 15380</span>
              </a>
            </div>
          </div>

          {/* Wholesale & Retail Callout Box */}
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-3 text-center my-3">
            <p className="text-xs sm:text-sm font-bold text-red-950 leading-relaxed">
              {language === 'ta'
                ? 'எங்களிடம் அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்தமாகவும் சில்லரையாகவும் பட்டாசுகள் கிடைக்கும்.'
                : 'Direct Sivakasi fireworks available for wholesale & retail at factory discount prices.'}
            </p>
          </div>

          {/* Address Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-slate-900">
                  {language === 'ta' ? 'முகவரி: ' : 'Address: '}
                </span>
                <span>
                  நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில், காஞ்சிபுரம் - 631 502.
                </span>
                <span className="block text-[11px] text-slate-500 mt-0.5">
                  (No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk, Kanchipuram - 631 502)
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <a
              href="tel:+918870929100"
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer text-center"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call Owner</span>
            </a>
            <button
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer text-center"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp Chat</span>
            </button>
          </div>
        </div>

        {/* Why Choose Devaraj Traders */}
        <div className="space-y-2 text-xs text-gray-600">
          <h4 className="font-black text-gray-900 uppercase tracking-wider text-[11px] flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Why Choose Devaraj Traders?</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <div className="bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <div className="font-bold text-gray-900 text-[11px]">100% Genuine Sivakasi</div>
                <div className="text-[10px] text-gray-500">Direct factory supply</div>
              </div>
            </div>
            <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-gray-900 text-[11px]">Government Certified</div>
                <div className="text-[10px] text-gray-500">PESO Green Crackers safety</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
