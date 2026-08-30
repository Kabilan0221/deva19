import React, { useState } from 'react';
import { CartItem, Invoice, PaymentMode, StoreSettings } from '../types';
import { apiRequest } from '../utils/api';
import { Language, t } from '../utils/translations';
import {
  X,
  MapPin,
  User,
  AlertCircle,
  Banknote,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Phone,
  FileText,
  Building2,
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  settings?: StoreSettings | null;
  language?: Language;
  onOrderSuccess: (order: any, invoice: Invoice, whatsappMsg: string, whatsappStatus?: string) => void;
}

const TN_DISTRICTS = [
  'Kanchipuram',
  'Chennai',
  'Chengalpattu',
  'Tiruvallur',
  'Vellore',
  'Ranipet',
  'Tirupattur',
  'Tiruvannamalai',
  'Villupuram',
  'Cuddalore',
  'Salem',
  'Namakkal',
  'Dharmapuri',
  'Krishnagiri',
  'Coimbatore',
  'Tiruppur',
  'Erode',
  'Nilgiris',
  'Tiruchirappalli',
  'Karur',
  'Perambalur',
  'Ariyalur',
  'Thanjavur',
  'Tiruvarur',
  'Nagapattinam',
  'Mayiladuthurai',
  'Pudukkottai',
  'Madurai',
  'Theni',
  'Dindigul',
  'Ramanathapuram',
  'Virudhunagar',
  'Sivagangai',
  'Tirunelveli',
  'Tenkasi',
  'Thoothukudi',
  'Kanniyakumari',
  'Other District',
];

const INDIAN_STATES = [
  'Tamil Nadu',
  'Puducherry',
  'Andhra Pradesh',
  'Karnataka',
  'Kerala',
  'Telangana',
  'Maharashtra',
  'Other State',
];

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  settings,
  language = 'ta',
  onOrderSuccess,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('Kanchipuram');
  const [customDistrict, setCustomDistrict] = useState('');
  const [pincode, setPincode] = useState('631502');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registeredBadge, setRegisteredBadge] = useState<string | null>(null);

  // Auto-fill customer name & address if mobile is already registered
  React.useEffect(() => {
    const cleanDigits = mobile.replace(/\D/g, '');
    if (cleanDigits.length >= 10) {
      const timer = setTimeout(async () => {
        try {
          const res = await apiRequest<any>(`/api/customers/lookup?mobile=${cleanDigits}`);
          if (res && res.found) {
            if (res.name && !name) {
              setName(res.name);
            }
            if (res.address && !address) {
              setAddress(res.address);
            }
            if (res.email && !email) {
              setEmail(res.email);
            }
            setRegisteredBadge(res.name);
          } else {
            setRegisteredBadge(null);
          }
        } catch {
          // ignore lookup error
        }
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setRegisteredBadge(null);
    }
  }, [mobile]);

  if (!isOpen) return null;

  const totalMrp = items.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const totalSavings = totalMrp - grandTotal;
  const minOrderValue = settings?.min_order_value || 500;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(language === 'ta' ? 'தயவுசெய்து உங்கள் பெயரை உள்ளிடவும்.' : 'Please enter your full name.');
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError(
        language === 'ta'
          ? 'தயவுசெய்து சரியான 10 இலக்க மொபைல் எண்ணை உள்ளிடவும்.'
          : 'Please enter a valid 10-digit mobile number.'
      );
      return;
    }

    if (!address.trim()) {
      setError(
        language === 'ta'
          ? 'தயவுசெய்து உங்கள் முகவரி / தெரு பெயரை உள்ளிடவும்.'
          : 'Please enter your delivery street address.'
      );
      return;
    }

    const finalDistrict = district === 'Other District' ? customDistrict.trim() : district;
    if (!finalDistrict) {
      setError(language === 'ta' ? 'தயவுசெய்து மாவட்டத்தை தேர்வு செய்க.' : 'Please specify your district.');
      return;
    }

    if (items.length === 0) {
      setError(language === 'ta' ? 'கூடையில் எந்த பட்டாசும் இல்லை.' : 'Your cart is empty.');
      return;
    }

    setLoading(true);

    try {
      const cleanAddress = address.trim() || `${area.trim() ? area.trim() + ', ' : ''}${finalDistrict}, ${state}${pincode.trim() ? ' - ' + pincode.trim() : ''}`;

      const orderPayload = {
        customer_name: name.trim(),
        customer_mobile: cleanMobile,
        customer_email: email.trim() || undefined,
        address: cleanAddress,
        delivery_address: cleanAddress,
        area: area.trim() || undefined,
        city: finalDistrict,
        state: state,
        district: finalDistrict,
        pincode: pincode.trim() || undefined,
        payment_mode: 'CASH' as PaymentMode,
        payment_reference: 'COD_ORDER',
        notes: notes.trim() || undefined,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      };

      const response = await apiRequest<{
        order: any;
        invoice: Invoice;
        whatsapp_status: string;
        whatsapp_message: string;
      }>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      onOrderSuccess(response.order, response.invoice, response.whatsapp_message, response.whatsapp_status);
      onClose();
    } catch (err: any) {
      console.error('Order submission error:', err);
      setError(err.message || 'Failed to place order. Please check your details and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-red-200 overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-xs border border-white/30">
              <Banknote className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                {t('checkoutTitle', language)}
              </h3>
              <p className="text-xs text-amber-200 font-medium">
                {language === 'ta'
                  ? 'நேரடி சிவகாசி தள்ளுபடி விலை • கேஷ் ஆன் டெலிவரி (COD)'
                  : 'Direct Factory Discount • Cash on Delivery / Direct Counter'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmitOrder} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-gray-900">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-red-800 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {/* Cart Summary Banner */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-900">
                {items.length} {language === 'ta' ? 'வகையான பட்டாசுகள்' : 'Cracker Item Types'} ({' '}
                {items.reduce((s, i) => s + i.quantity, 0)} {language === 'ta' ? 'மொத்த எண்ணிக்கை' : 'Total Boxes'} )
              </div>
              <div className="text-xs text-emerald-700 font-extrabold flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  {language === 'ta' ? 'மொத்த தள்ளுபடி சேமிப்பு:' : 'Your Diwali Savings:'} ₹
                  {totalSavings.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500 line-through">
                MRP: ₹{totalMrp.toLocaleString('en-IN')}
              </div>
              <div className="text-xl sm:text-2xl font-black text-red-700">
                ₹{grandTotal.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          {/* Section 1: Customer Details */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-red-600" />
                <span>{t('customerInfo', language)}</span>
              </h4>
              {registeredBadge && (
                <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  <span>Welcome back, {registeredBadge}!</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('fullName', language)}
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('mobileNumber', language)}
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  placeholder=""
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('emailOptional', language)}
              </label>
              <input
                type="email"
                placeholder=""
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Section 2: Delivery & Address */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <MapPin className="w-4 h-4 text-red-600" />
              <span>{t('deliveryAddress', language)}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('selectState', language)}
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  {INDIAN_STATES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('selectDistrict', language)}
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
                >
                  {TN_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {district === 'Other District' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {language === 'ta' ? 'மாவட்ட பெயரை உள்ளிடவும் *' : 'Enter District / City Name *'}
                </label>
                <input
                  type="text"
                  required
                  placeholder=""
                  value={customDistrict}
                  onChange={(e) => setCustomDistrict(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('streetAddress', language)}
              </label>
              <textarea
                required
                rows={2}
                placeholder=""
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('areaLocality', language)}
                </label>
                <input
                  type="text"
                  placeholder=""
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {t('pincode', language)}
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder=""
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Cash On Delivery / Direct Payment Info */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-100 pb-2">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>{t('paymentMethod', language)}</span>
            </h4>

            {/* Guaranteed Cash on Delivery Option */}
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500/60 rounded-2xl flex items-start gap-3 shadow-xs">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-black text-emerald-950">
                  {t('codOnly', language)}
                </div>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  {t('codDesc', language)}
                </p>
                <div className="mt-2.5 inline-flex items-center gap-2 bg-white px-3 py-1 rounded-xl text-[11px] font-bold text-emerald-900 border border-emerald-200">
                  <Truck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    {language === 'ta'
                      ? 'பார்சல் தயாரானதும் உடனடி வாட்ஸ்அப் ரசீது அனுப்பப்படும்'
                      : 'Instant official PDF bill & WhatsApp confirmation sent on dispatch'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                {t('specialNotes', language)}
              </label>
              <input
                type="text"
                placeholder=""
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>

          {/* Modal Footer / Action Button */}
          <div className="pt-3 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 via-red-700 to-amber-600 hover:from-red-700 hover:to-amber-700 text-white font-black py-4 px-6 rounded-2xl text-base shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-98"
            >
              {loading ? (
                <span>
                  {language === 'ta' ? 'ஆர்டர் பதிவு செய்யப்படுகிறது...' : 'Processing Cracker Order...'}
                </span>
              ) : (
                <>
                  <Banknote className="w-5 h-5 text-amber-300" />
                  <span>
                    {t('confirmOrderBtn', language)} • ₹{grandTotal.toLocaleString('en-IN')}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
