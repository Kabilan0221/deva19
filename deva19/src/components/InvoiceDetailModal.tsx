import React, { useState } from 'react';
import { Invoice, StoreSettings } from '../types';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { buildInvoiceWhatsAppMessage } from '../utils/whatsappHelper';
import { apiRequest } from '../utils/api';
import { BrandLogo } from './BrandLogo';
import { X, Download, Printer, FileText, CheckCircle, MessageCircle, Trash2, AlertTriangle } from 'lucide-react';

interface InvoiceDetailModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  settings?: StoreSettings | null;
  isAdmin?: boolean;
  onInvoiceDeleted?: (invoiceId: number) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  onClose,
  settings,
  isAdmin = false,
  onInvoiceDeleted,
}) => {
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!invoice) return null;

  const handleDownloadPDF = () => {
    downloadInvoicePDF(invoice, settings);
  };

  const handlePrint = () => {
    printThermalReceipt(invoice, settings);
  };

  const handleDeleteInvoice = async () => {
    try {
      setDeleting(true);
      setActionError(null);
      const res = await apiRequest<{ success?: boolean; error?: string }>(`/api/invoices/${invoice.id}`, {
        method: 'DELETE',
      });
      if (res && res.success) {
        if (onInvoiceDeleted) onInvoiceDeleted(invoice.id);
        onClose();
      } else {
        setActionError(res?.error || 'Failed to delete invoice');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error deleting invoice');
    } finally {
      setDeleting(false);
    }
  };

  const handleSendWhatsApp = () => {
    const shopPhone = settings?.owner_whatsapp || '919894777176';
    const recipientPhone = invoice.customer_mobile ? invoice.customer_mobile.replace(/\D/g, '') : shopPhone;
    const text = buildInvoiceWhatsAppMessage(invoice, settings);
    const encodedText = encodeURIComponent(text);
    const targetUrl = recipientPhone.length >= 10
      ? `https://wa.me/${recipientPhone.startsWith('91') ? recipientPhone : '91' + recipientPhone}?text=${encodedText}`
      : `https://wa.me/${shopPhone}?text=${encodedText}`;

    window.open(targetUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-800 via-red-700 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-xl shadow-xs">
              <BrandLogo theme="white" size="sm" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-black tracking-wide font-['Outfit',sans-serif]">
                  TAX INVOICE / CASH BILL
                </h2>
                <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Official
                </span>
              </div>
              <p className="text-xs text-amber-200 font-bold">
                {invoice.invoice_number} • {new Date(invoice.created_at).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-slate-50/50">
          {actionError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
              <X className="w-4 h-4 text-red-500 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Printable Invoice Header Card with Official Logo */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
            <div className="flex flex-col items-center justify-center text-center gap-3 pb-3.5 border-b border-gray-100">
              <div className="shrink-0 flex items-center justify-center p-2 bg-gradient-to-b from-amber-50 to-white rounded-2xl border border-amber-200/80 shadow-xs">
                <BrandLogo theme="light" size="lg" variant="image-only" />
              </div>
              <div className="space-y-1 max-w-lg">
                <h3 className="text-xl font-black text-red-700 tracking-tight font-['Outfit',sans-serif]">
                  DEVARAJ CRACKERS
                </h3>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  No.27, Kilkathirpur New Bypass, Opp. Nayara Petrol Bunk, Kanchipuram - 631502, Tamil Nadu
                </p>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-bold text-gray-700 pt-0.5">
                  <span className="text-red-700">📞 98947 77176 / 94444 15380</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-amber-800">GSTIN: {settings?.gst_number || '33AAACD9981E1Z5'}</span>
                </div>
              </div>
            </div>

            {/* Quick Bill Meta Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Invoice:</span>
                <span className="font-mono font-black text-red-700">{invoice.invoice_number}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-medium">Channel:</span>
                <span className="font-bold text-gray-800">
                  {invoice.order_source === 'WORKER_POS' ? '🏪 Billing Desk Counter' : '🌐 Online Web Store'}
                </span>
              </div>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
            <div className="space-y-1">
              <span className="text-gray-500 font-bold uppercase text-[10px] block">BILLED TO (CUSTOMER DETAILS):</span>
              <span className="font-extrabold text-gray-900 text-sm block">{invoice.customer_name}</span>
              <span className="text-red-700 font-extrabold block text-xs">
                📞 Mobile: {invoice.customer_mobile || 'Walk-in'}
              </span>
              <span className="text-gray-500 block truncate">{invoice.customer_address || 'Kanchipuram, Tamil Nadu'}</span>
              <span className="text-[10px] text-gray-400 italic block pt-0.5">
                💡 Mobile is linked for instant receipt tracking & re-ordering
              </span>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 space-y-1">
              <span className="text-gray-500 font-bold uppercase text-[10px] block">PAYMENT & FULFILLMENT:</span>
              <span className="font-extrabold text-emerald-700 text-sm block">
                {invoice.payment_mode} • <span className="text-xs uppercase bg-emerald-100 px-1.5 py-0.5 rounded font-black">PAID</span>
              </span>
              <span className="text-gray-600 block text-[11px]">
                {invoice.order_source === 'WORKER_POS' ? 'Store Counter (Billing Desk)' : 'Customer Online Order'}
              </span>
              <span className="text-gray-500 block text-[11px]">
                Staff Cashier: {invoice.worker_name || 'Store Proprietor'}
              </span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-2.5">Item</th>
                  <th className="p-2.5 text-right">MRP</th>
                  <th className="p-2.5 text-right">Price</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-gray-800">
                {invoice.items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2.5 font-medium">{it.product_name}</td>
                    <td className="p-2.5 text-right text-gray-400">₹{it.mrp}</td>
                    <td className="p-2.5 text-right font-semibold">₹{it.selling_price}</td>
                    <td className="p-2.5 text-center font-bold">{it.quantity}</td>
                    <td className="p-2.5 text-right font-black">₹{it.item_total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Total MRP Subtotal:</span>
              <span>₹{invoice.subtotal.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Factory Discount Savings:</span>
              <span>- ₹{invoice.discount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between font-black text-base text-gray-900 pt-2 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-red-700">₹{invoice.grand_total.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Delete Confirmation Box (Admin only) */}
          {showConfirmDelete && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Are you sure you want to permanently delete this bill?</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteInvoice}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Computer Generated & E-Sign Note */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-center space-y-1">
            <p className="text-[11px] text-gray-600">
              This is an official computer generated tax invoice.
            </p>
            <p className="text-xs font-bold text-red-700">
              * Note: Physical Signature / E-Sign Not Required *
            </p>
          </div>

          {/* Thank You Visit Again Festive Banner */}
          <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white rounded-xl p-3 text-center shadow-md">
            <div className="text-sm font-black tracking-wider uppercase font-['Outfit',sans-serif]">
              ✨ THANK YOU! VISIT AGAIN! ✨
            </div>
            <div className="text-xs font-bold text-amber-200 mt-0.5">
              நன்றி! மீண்டும் வருக! • DEVARAJ CRACKERS KANCHIPURAM
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Send WhatsApp</span>
            </button>

            {/* Print button ONLY rendered if admin / staff */}
            {isAdmin && (
              <button
                onClick={handlePrint}
                className="flex-1 bg-gray-800 hover:bg-gray-900 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
            )}

            {/* Delete button (Admin only) */}
            {isAdmin && !showConfirmDelete && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                className="bg-red-100 hover:bg-red-200 text-red-800 font-bold py-2.5 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                title="Delete this bill"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


