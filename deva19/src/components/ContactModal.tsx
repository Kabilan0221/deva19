import React from 'react';
import { X, Phone, MessageCircle, MapPin, Clock, Send, Sparkles } from 'lucide-react';
import { StoreSettings } from '../types';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: StoreSettings | null;
  language?: 'ta' | 'en';
}

export const ContactModal: React.FC<ContactModalProps> = ({
  isOpen,
  onClose,
  settings,
  language = 'ta',
}) => {
  if (!isOpen) return null;

  const handleWhatsApp = () => {
    const phone = settings?.owner_whatsapp || '918870929100';
    window.open(
      `https://wa.me/${phone}?text=வணக்கம்,%20தேவராஜ்%20பட்டாசு%20கடை%20(DEVARAJ%20TRADERS)%20தொடர்பு%20கொள்ள%20விரும்புகிறேன்.`,
      '_blank'
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-red-100 relative my-8 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shadow-xs">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 font-['Outfit',sans-serif]">
              {language === 'ta' ? 'தொடர்பு விவரங்கள்' : 'Contact & Store Location'}
            </h3>
            <p className="text-xs text-gray-500">
              {language === 'ta' ? 'நேரடி வருகை மற்றும் தொலைபேசி தொடர்புக்கு' : 'Direct outlet visits & phone orders'}
            </p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Shop Card */}
          <div className="bg-gradient-to-br from-red-600 to-amber-600 text-white rounded-2xl p-4 shadow-md">
            <div className="text-[10px] uppercase tracking-wider font-extrabold text-amber-200">
              {language === 'ta' ? 'உரிமையாளர்: R.S.கோபிநாத்' : 'Proprietor: R.S. Gopinath'}
            </div>
            <div className="text-lg font-black mt-0.5 font-['Outfit',sans-serif]">
              தேவராஜ் பட்டாசு கடை • DEVARAJ TRADERS
            </div>
            <div className="text-xs text-red-100 mt-1 font-medium">
              Sivakasi Direct Fireworks Outlet • Kanchipuram
            </div>
          </div>

          {/* Phone Numbers */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-red-600" />
                <span>Primary Mobile:</span>
              </span>
              <a href="tel:+918870929100" className="font-black text-red-700 text-sm hover:underline">
                +91 98947 77176
              </a>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-gray-500" />
                <span>Alternate Mobile:</span>
              </span>
              <a href="tel:+919444415380" className="font-black text-gray-800 text-sm hover:underline">
                +91 94444 15380
              </a>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>Store Timings:</span>
              </span>
              <span className="font-bold text-emerald-800 text-xs">
                8:00 AM – 10:00 PM (All 7 Days)
              </span>
            </div>
          </div>

          {/* Location Address */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-2.5">
            <MapPin className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-black text-gray-900 text-xs">
                {language === 'ta' ? 'கடை முகவரி:' : 'Shop Outlet Address:'}
              </div>
              <div className="text-gray-700 text-xs leading-relaxed mt-0.5">
                நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில், காஞ்சிபுரம் - 631 502, தமிழ்நாடு.
              </div>
              <div className="text-[11px] text-gray-500 mt-1">
                No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk, Kanchipuram - 631 502.
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <a
              href="tel:+918870929100"
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer text-center"
            >
              <Phone className="w-4 h-4" />
              <span>Call 98947 77176</span>
            </a>
            <button
              onClick={handleWhatsApp}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer text-center"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp Direct</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
