import React, { useState } from 'react';
import { Invoice, StoreSettings } from '../types';
import { apiRequest } from '../utils/api';
import {
  X,
  Search,
  Receipt,
  Phone,
  Calendar,
  IndianRupee,
  Eye,
  MessageCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface CustomerBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectInvoice: (invoice: Invoice) => void;
  settings?: StoreSettings | null;
}

export const CustomerBillsModal: React.FC<CustomerBillsModalProps> = ({
  isOpen,
  onClose,
  onSelectInvoice,
  settings,
}) => {
  const [mobile, setMobile] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      setLoading(true);
      const res = await apiRequest(`/api/user-bills?mobile=${cleanMobile}`);
      if (res.success) {
        setInvoices(res.invoices || []);
        setSearched(true);
      } else {
        setError(res.error || 'Failed to fetch bills');
      }
    } catch (err: any) {
      setError(err.message || 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = (inv: Invoice) => {
    const phone = settings?.owner_whatsapp || '918870929100';
    const itemsList = inv.items
      .map(
        (it, idx) =>
          `${idx + 1}. ${it.product_name} (${it.quantity} qty) = ₹${it.item_total}`
      )
      .join('%0A');

    const msg = `*வணக்கம் தேவராஜ் பட்டாசு கடை!*%0A%0A*ரசீது எண்:* ${inv.invoice_number}%0A*வாடிக்கையாளர் பெயர்:* ${inv.customer_name}%0A*மொபைல்:* ${inv.customer_mobile}%0A*தேதி:* ${new Date(
      inv.created_at
    ).toLocaleDateString('ta-IN')}%0A%0A*வாங்கிய பொருட்கள்:*%0A${itemsList}%0A%0A*மொத்தத் தொகை:* ₹${inv.grand_total.toLocaleString(
      'en-IN'
    )}%0A*பணம் செலுத்திய முறை:* ${inv.payment_mode}%0A%0Aநன்றி!`;

    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-100 my-6 animate-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-700 via-red-800 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
                Customer Bill Portal
              </span>
              <h2 className="text-lg sm:text-xl font-black font-['Outfit',sans-serif]">
                என் ரசீதுகள் (My Invoices & Bills)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-gray-600">
            Enter your 10-digit mobile number to view and download your festival cracker purchases and invoices.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder=""
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Clock className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Find My Bills</span>
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results List */}
          {searched && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-500 border-b pb-2">
                <span>Total Bills Found: {invoices.length}</span>
                <span>Mobile: {mobile}</span>
              </div>

              {invoices.length === 0 ? (
                <div className="text-center py-8 text-gray-500 space-y-2">
                  <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto" />
                  <p className="text-sm font-semibold">No bills found for this mobile number.</p>
                  <p className="text-xs text-gray-400">
                    Make sure you entered the same mobile number provided during order placement.
                  </p>
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                  {invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 rounded-xl border border-gray-200 hover:border-red-300 hover:shadow-md transition-all bg-gray-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-red-700 font-mono">
                            {inv.invoice_number}
                          </span>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                            {inv.payment_mode}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {new Date(inv.created_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">
                          Customer: <span className="font-bold text-gray-800">{inv.customer_name}</span> •{' '}
                          {inv.items.length} Products
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-2.5 pt-2 sm:pt-0 border-t sm:border-0 border-gray-200">
                        <div className="text-right sm:mr-2">
                          <div className="text-sm font-black text-gray-900">
                            ₹{inv.grand_total.toLocaleString('en-IN')}
                          </div>
                          {inv.discount > 0 && (
                            <div className="text-[10px] text-emerald-600 font-bold">
                              Saved ₹{inv.discount.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            onSelectInvoice(inv);
                            onClose();
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Invoice</span>
                        </button>

                        <button
                          onClick={() => handleSendWhatsApp(inv)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Share to WhatsApp"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
