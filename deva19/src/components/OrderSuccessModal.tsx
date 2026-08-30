import React, { useEffect } from 'react';
import { Invoice, StoreSettings } from '../types';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { buildInvoiceWhatsAppMessage } from '../utils/whatsappHelper';
import { CheckCircle2, Download, Eye, X, MessageSquare, ShieldCheck, Printer, Send } from 'lucide-react';
import { printThermalReceipt } from '../utils/thermalPrinter';

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  whatsappMessage?: string;
  whatsappStatus?: string;
  onViewDetails: (invoice: Invoice) => void;
  settings?: StoreSettings | null;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  invoice,
  whatsappMessage,
  whatsappStatus,
  onViewDetails,
  settings,
}) => {
  // WhatsApp is no longer auto-sent from the server via the Meta Cloud API
  // (avoids needing a dedicated WhatsApp Business number). Instead, as soon
  // as the order is confirmed, the browser itself auto-opens a pre-filled
  // WhatsApp chat to the owner with the full bill + a link to view/download
  // the official PDF (a real file can't be attached through a wa.me link,
  // so the download link stands in for the attachment). Browsers can block
  // an auto-opened tab if it isn't tied closely enough to a user gesture —
  // the big green button below does the same thing as a guaranteed fallback.
  const autoSendSucceeded = false;
  const ownerWhatsAppUrl = invoice
    ? (() => {
        const message = buildInvoiceWhatsAppMessage(invoice, settings);
        const ownerPhone = (settings?.owner_whatsapp || '9444415380').replace(/\D/g, '');
        const ownerFormattedPhone = ownerPhone.startsWith('91') ? ownerPhone : `91${ownerPhone}`;
        return `https://wa.me/${ownerFormattedPhone}?text=${encodeURIComponent(message)}`;
      })()
    : '';

  // Auto trigger PDF download + WhatsApp redirect on order confirmation
  useEffect(() => {
    if (isOpen && invoice) {
      try {
        downloadInvoicePDF(invoice, settings);
      } catch (e) {
        console.error('PDF auto-generation error:', e);
      }
      try {
        window.open(ownerWhatsAppUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error('WhatsApp auto-redirect error:', e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, invoice?.id]);

  if (!isOpen || !invoice) return null;

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, settings);
  };

  const handlePrintThermal = () => {
    printThermalReceipt(invoice, settings);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 text-center animate-in fade-in zoom-in duration-200">
        {/* Top Celebration Header */}
        <div className="bg-gradient-to-b from-emerald-600 to-emerald-700 text-white p-6 sm:p-7">
          <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2.5 shadow-lg">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="inline-block bg-emerald-800/80 text-amber-300 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-1.5 border border-emerald-500/50">
            ✓ ORDER CONFIRMED • ஆர்டர் உறுதி
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight font-['Outfit',sans-serif]">
            ஆர்டர் உறுதி செய்யப்பட்டது!
          </h2>

          <p className="text-emerald-100 text-xs sm:text-sm mt-0.5 font-medium">
            Order Confirmed
          </p>
        </div>

        {/* Invoice Summary Box */}
        <div className="p-5 sm:p-6 space-y-3.5">
          <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-3.5 text-left flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                <span>OPENING WHATSAPP FOR YOU</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <p className="text-[11px] text-emerald-800 font-medium mt-0.5 leading-snug">
                ஆர்டர் விவரங்கள் மற்றும் பில் லிங்குடன் வாட்ஸ்அப் திறக்கப்படுகிறது. உங்கள் பிரௌசர் அதைத் தடுத்தால், கீழே உள்ள பொத்தானை அழுத்தவும். If WhatsApp didn't open automatically (some browsers block it), just tap the button below.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">பில் எண் (Invoice No):</span>
              <span className="font-mono font-bold text-gray-900 bg-white px-2 py-0.5 rounded border border-gray-200">
                {invoice.invoice_number}
              </span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">வாடிக்கையாளர்:</span>
              <span className="font-bold text-gray-900">{invoice.customer_name}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 font-medium">பட்டாசுகள் எண்ணிக்கை:</span>
              <span className="font-bold text-gray-900">
                {invoice.items.reduce((s, i) => s + i.quantity, 0)} Boxes ({invoice.items.length} Varieties)
              </span>
            </div>

            <div className="pt-2 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm font-extrabold text-gray-700">மொத்த தொகை (Total):</span>
              <span className="text-xl font-black text-red-700 font-['Outfit',sans-serif]">
                ₹{invoice.grand_total.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action Buttons: DOWNLOAD BILL PDF, VIEW ORDER */}
          <div className="space-y-2 pt-1">
            {/* Direct WhatsApp to Owner Button */}
            <a
              href={ownerWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 fill-white" />
              <span>உரிமையாளருக்கு WhatsApp அனுப்ப (SEND TO OWNER)</span>
            </a>

            <button
              onClick={handleDownloadPDF}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/25 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>பில் PDF பதிவிறக்கம் (DOWNLOAD BILL PDF)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onViewDetails(invoice)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>விவரங்கள் பார்க்க</span>
              </button>

              <button
                onClick={handlePrintThermal}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                title="Print thermal receipt (58/80mm)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>PRINT RECEIPT</span>
              </button>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl block mx-auto cursor-pointer transition-colors"
          >
            தொடர்ந்து வாங்க (Continue Shopping)
          </button>
        </div>
      </div>
    </div>
  );
};
