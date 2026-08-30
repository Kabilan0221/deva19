import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle, Flame, Droplets, UserCheck, Sparkles } from 'lucide-react';

interface SafetyTipsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: 'ta' | 'en';
}

export const SafetyTipsModal: React.FC<SafetyTipsModalProps> = ({
  isOpen,
  onClose,
  language = 'ta',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-amber-100 relative my-8 animate-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-gray-900 font-['Outfit',sans-serif]">
              {language === 'ta' ? 'பட்டாசு வெடிக்கும் பாதுகாப்பு குறிப்புகள்' : 'Fireworks Safety Guidelines'}
            </h3>
            <p className="text-xs text-gray-500">
              {language === 'ta' ? 'பாதுகாப்பான மற்றும் மகிழ்ச்சியான தீபாவளி திருநாள்!' : 'Stay safe and celebrate joyfully with your family.'}
            </p>
          </div>
        </div>

        {/* Dos and Don'ts */}
        <div className="space-y-4 text-xs">
          {/* DO's */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <h4 className="font-extrabold text-emerald-900 mb-2 flex items-center gap-1.5 text-xs">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{language === 'ta' ? 'செய்ய வேண்டியவை (DOs):' : 'Recommended Practices (DOs):'}</span>
            </h4>
            <ul className="space-y-1.5 text-emerald-800 text-[11px] list-disc list-inside">
              <li>{language === 'ta' ? 'திறந்த வெளிகளில், கட்டடங்கள் இல்லாத இடங்களில் பட்டாசுகளை வெடிக்கவும்.' : 'Always burst crackers in open grounds away from buildings and vehicles.'}</li>
              <li>{language === 'ta' ? 'குழந்தைகள் பட்டாசு வெடிக்கும் போது பெரியவர்கள் உடனிருக்க வேண்டும்.' : 'Ensure strict adult supervision when children light crackers.'}</li>
              <li>{language === 'ta' ? 'எப்போதும் பக்கத்தில் ஒரு வாளி தண்ணீர் மற்றும் மணல் வைத்திருக்கவும்.' : 'Keep a bucket of water and sand nearby for quick safety.'}</li>
              <li>{language === 'ta' ? 'பருத்தி ஆடைகளை (Cotton clothes) மட்டுமே அணியவும்.' : 'Wear well-fitted cotton clothes; avoid loose synthetic garments.'}</li>
              <li>{language === 'ta' ? 'மத்தாப்பு மற்றும் பூந்தொட்டிகளை கையில் பிடிக்காமல் தரையில் வைக்கவும்.' : 'Place flower pots and rockets firmly on flat ground or bottles before lighting.'}</li>
            </ul>
          </div>

          {/* DONT's */}
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <h4 className="font-extrabold text-red-900 mb-2 flex items-center gap-1.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{language === 'ta' ? 'செய்யக் கூடாதவை (DON\'Ts):' : 'Strictly Prohibited (DON\'Ts):'}</span>
            </h4>
            <ul className="space-y-1.5 text-red-800 text-[11px] list-disc list-inside">
              <li>{language === 'ta' ? 'வெடிக்காத பட்டாசுகளை மீண்டும் பற்ற வைக்கவோ, கையில் எடுக்கவோ கூடாது.' : 'Never attempt to re-ignite or pick up a cracker that failed to burst.'}</li>
              <li>{language === 'ta' ? 'பாக்கெட்டுகளில் அல்லது ஆடைகளின் பைகளில் பட்டாசுகளை வைத்திருக்கக் கூடாது.' : 'Never carry fireworks in your pockets or close to heat sources.'}</li>
              <li>{language === 'ta' ? 'மூடிய அறைகளிலோ அல்லது மின் கம்பிகளுக்கு அருகிலோ வெடிக்க வேண்டாம்.' : 'Never ignite fireworks inside enclosed rooms or near electrical cables.'}</li>
              <li>{language === 'ta' ? 'விலங்குகள் மற்றும் முதியவர்கள் அருகில் பட்டாசு வெடிப்பதைத் தவிர்க்கவும்.' : 'Avoid bursting noisy sound crackers near elderly people or animals.'}</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
        >
          {language === 'ta' ? 'புரிந்து கொண்டேன் (Close)' : 'Understood & Close'}
        </button>
      </div>
    </div>
  );
};
