import React from 'react';
import { StoreSettings } from '../types';
import { Flame, Phone, MapPin, ShieldCheck, Mail, Sparkles, CheckCircle2, MessageCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface FooterProps {
  settings?: StoreSettings | null;
  onNavigateCategory: (id: number | 'all') => void;
  onOpenLogin?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigateCategory, onOpenLogin }) => {
  return (
    <footer id="contact" className="bg-gray-950 text-gray-300 pt-12 pb-8 border-t-4 border-red-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Safety Notice Banner */}
        <div className="bg-red-950/70 border border-red-800/80 rounded-2xl p-5 mb-10 text-white">
          <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4" />
            <span>பட்டாசு வெடிக்கும் போது கடைபிடிக்க வேண்டிய பாதுகாப்பு விதிமுறைகள் (Safety Guidelines)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-200">
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">1.</span>
              <span>பட்டாசுகளை எப்போதும் திறந்தவெளியில் மட்டுமே வெடிக்க வேண்டும்.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">2.</span>
              <span>குழந்தைகள் பெரியவர்கள் முன்னிலையில் மட்டுமே பட்டாசுகளை வெடிக்க வேண்டும்.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">3.</span>
              <span>அருகில் ஒரு வாளி தண்ணீர் மற்றும் மணல் எப்போதும் தயாராக வைத்திருக்கவும்.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">4.</span>
              <span>பருத்தி (Cotton) உடைகளை மட்டுமே அணியவும்; இறுக்கமான காலணிகள் அணியவும்.</span>
            </div>
          </div>
        </div>

        {/* 4 Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-gray-800">
          {/* Col 1: About & Ownership from card */}
          <div>
            <div className="mb-3">
              <BrandLogo theme="dark" size="lg" />
            </div>

            <div className="my-2 bg-gray-900 p-2.5 rounded-xl border border-gray-800 text-xs">
              <div className="text-gray-400 text-[10px] uppercase font-bold">உரிமை :</div>
              <div className="text-white font-black text-sm">R.S.கோபிநாத் (R.S. Gopinath)</div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-3">
              எங்களிடம் அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்தமாகவும் சில்லரையாகவும் பட்டாசுகள் கிடைக்கும். நேரடி சிவகாசி தள்ளுபடி விலையில்!
            </p>

            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>100% Genuine Certified Green Crackers</span>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>பட்டாசு வகைகள் (Categories)</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-gray-400">
              <li>
                <button
                  onClick={() => onNavigateCategory(3)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Flower Pots (பூந்தொட்டி)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory(2)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Sparklers (கம்பி மத்தாப்பு)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory(4)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Ground Chakkarams (சக்கரம்)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory(10)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Multi Sky Shots (வானவெடி)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory(8)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Diwali Mega Combo Boxes (கிப்ட் பாக்ஸ்)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigateCategory('all')}
                  className="text-red-400 font-bold hover:text-red-300 transition-colors pt-1 block cursor-pointer"
                >
                  View Full Price List (முழு பட்டியல்) →
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Why Us */}
          <div id="why-us">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Why Devaraj Crackers?
            </h4>
            <ul className="space-y-2 text-xs text-gray-400">
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>நேரடி தொழிற்சாலை விலை (Direct Factory Rates)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>Flat up to 70% Off Discounts</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>அனைத்து சுபநிகழ்ச்சிகளுக்கும் மொத்த & சில்லரை</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>பாதுகாப்பான பார்சல் பேக்கிங் (Safe Packing)</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">✓</span>
                <span>உடனடி அதிகாரப்பூர்வ பில் (Instant PDF Invoice)</span>
              </li>
            </ul>
          </div>

          {/* Col 4: Kanchipuram Outlet Address & Contacts */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              விற்பனை நிலையம் (Outlet Address)
            </h4>
            <div className="space-y-2.5 text-xs text-gray-300">
              <div className="flex items-start gap-2 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed text-xs">
                  <div className="font-bold text-white mb-0.5">DEVARAJ CRACKERS (தேவராஜ் பட்டாசு கடை)</div>
                  நெ.27, கீழ்கதிர்பூர் புதிய பைபாஸ், நயாரா பெட்ரோல் பங்க் எதிரில், காஞ்சிபுரம் - 631 502.
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <div className="flex items-center gap-2">
                  <a
                    href="tel:+918870929100"
                    className="text-white hover:text-amber-300 font-bold"
                  >
                    98947 77176
                  </a>
                  <span className="text-gray-500">/</span>
                  <a
                    href="tel:+919444415380"
                    className="text-white hover:text-amber-300 font-bold"
                  >
                    94444 15380
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <a
                  href="https://wa.me/919894777176"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:text-emerald-300 font-bold"
                >
                  WhatsApp: 98947 77176
                </a>
              </div>

              <div className="pt-2 text-[11px] text-gray-400">
                GSTIN: <span className="font-mono text-gray-300">{settings?.gst_number || '33AAACD9981E1Z5'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Legal & Portal Link */}
        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <div>
            © {new Date().getFullYear()} DEVARAJ CRACKERS (தேவராஜ் பட்டாசு கடை). உரிமை: R.S.கோபிநாத், காஞ்சிபுரம் - 631 502.
          </div>
          <div className="text-[11px] flex items-center gap-3">
            <span>காஞ்சிபுரம், தமிழ்நாடு</span>
            {onOpenLogin && (
              <>
                <span className="text-gray-600">|</span>
                <button
                  onClick={onOpenLogin}
                  className="text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  Staff Portal
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
