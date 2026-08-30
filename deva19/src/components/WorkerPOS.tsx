import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, Invoice, PaymentMode, StoreSettings } from '../types';
import { apiRequest } from '../utils/api';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { sendInvoiceViaWhatsApp } from '../utils/whatsappHelper';
import { CameraBarcodeScanner } from './CameraBarcodeScanner';
import { BrandLogo } from './BrandLogo';
import {
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Printer,
  Save,
  RotateCcw,
  User,
  Phone,
  Banknote,
  Smartphone,
  QrCode,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
  Camera,
  ArrowRight,
  Sparkles,
  Percent,
  Coins,
  Check,
  Flame,
  CornerDownLeft,
  MessageSquare,
  Send,
  Download,
  LayoutDashboard,
  Store,
  LogOut,
  ArrowLeft,
  X,
} from 'lucide-react';

interface WorkerPOSProps {
  products: Product[];
  categories: Category[];
  settings?: StoreSettings | null;
  currentUser: any;
  onRefreshProducts: () => void;
  onOpenLogin?: () => void;
  onNavigateStore?: () => void;
  onNavigateAdmin?: () => void;
  onLogout?: () => void;
}

interface POSCartItem {
  product: Product;
  quantity: number;
  selling_price: number;
}

export const WorkerPOS: React.FC<WorkerPOSProps> = ({
  products,
  categories,
  settings,
  currentUser,
  onRefreshProducts,
  onOpenLogin,
  onNavigateStore,
  onNavigateAdmin,
  onLogout,
}) => {
  // Cart & Bill States
  const [cart, setCart] = useState<POSCartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [transactionId, setTransactionId] = useState('');
  const [manualDiscount, setManualDiscount] = useState<number | string>(0);
  const [cashTendered, setCashTendered] = useState<number | string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');

  // Fast Keyboard & Product Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedPendingProduct, setSelectedPendingProduct] = useState<Product | null>(null);
  const [pendingQuantity, setPendingQuantity] = useState<number | string>(1);

  // Status & Modals
  const [loading, setLoading] = useState(false);
  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [registeredCustomerInfo, setRegisteredCustomerInfo] = useState<{
    name: string;
    total_orders?: number;
    address?: string;
  } | null>(null);
  const [lastSavedInvoice, setLastSavedInvoice] = useState<Invoice | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [recentCompletedBill, setRecentCompletedBill] = useState<Invoice | null>(null);
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);

  // Refs for auto-focus flow: Product Search -> Quantity -> (Enter adds & loops to Search)
  const searchInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Filter products by search query
  const searchMatchingProducts = products.filter((p) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q) ||
      (p.category_name && p.category_name.toLowerCase().includes(q))
    );
  });

  const categoryProducts = products.filter((p) => {
    return selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
  });

  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsDropdownOpen(true);
      setHighlightedIndex(0);
    } else {
      setIsDropdownOpen(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Fast Auto-Lookup for Registered Customer by Mobile (User Request: number already register na name vanthurunum in billing system)
  useEffect(() => {
    const cleanDigits = customerMobile.replace(/\D/g, '');
    if (cleanDigits.length >= 10) {
      const timer = setTimeout(async () => {
        try {
          setCustomerLookupLoading(true);
          const res = await apiRequest<any>(`/api/customers/lookup?mobile=${cleanDigits}`);
          if (res && res.found && res.name) {
            setCustomerName(res.name);
            setRegisteredCustomerInfo({
              name: res.name,
              total_orders: res.total_orders || 1,
              address: res.address || '',
            });
            showToast(`✓ Registered Customer Found: "${res.name}"`);
          } else {
            setRegisteredCustomerInfo(null);
          }
        } catch {
          // ignore lookup error
        } finally {
          setCustomerLookupLoading(false);
        }
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setRegisteredCustomerInfo(null);
    }
  }, [customerMobile]);

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 920;
      gain.gain.value = 0.12;
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        audioCtx.close();
      }, 80);
    } catch {
      // Audio not supported
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  // If user is not authenticated, lock POS behind login
  if (!currentUser) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-xl text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-1.5 font-['Outfit',sans-serif]">
            Billing Counter Access Required
          </h2>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            The Billing POS Register is reserved for authorized staff & owners. Please sign in with your account to start billing.
          </p>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => onOpenLogin && onOpenLogin()}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-extrabold py-3 rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              Sign In to Billing Counter
            </button>
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Back to Online Store
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Keyboard navigation inside search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchMatchingProducts.length === 0) {
      if (e.key === 'Enter') {
        e.preventDefault();
        const exact = products.find(
          (p) =>
            p.barcode.toLowerCase() === searchQuery.trim().toLowerCase() ||
            p.code.toLowerCase() === searchQuery.trim().toLowerCase()
        );
        if (exact) {
          selectProductForQuantity(exact);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % searchMatchingProducts.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev === 0 ? searchMatchingProducts.length - 1 : prev - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = searchMatchingProducts[highlightedIndex] || searchMatchingProducts[0];
      if (selected) {
        selectProductForQuantity(selected);
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
    }
  };

  // Select Product and jump immediately to Quantity box
  const selectProductForQuantity = (product: Product) => {
    if (product.stock_quantity <= 0) {
      setErrorMessage(`Cannot add "${product.name}" — Out of stock!`);
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }
    setSelectedPendingProduct(product);
    setPendingQuantity(1);
    setIsDropdownOpen(false);

    setTimeout(() => {
      if (qtyInputRef.current) {
        qtyInputRef.current.focus();
        qtyInputRef.current.select();
      }
    }, 50);
  };

  // Quantity input Enter -> Add to bill and immediately jump back to Search for next product
  const handleQuantitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendingProduct) return;

    const qty = Math.max(1, parseInt(String(pendingQuantity), 10) || 1);
    addProductWithQtyToCart(selectedPendingProduct, qty);

    // Reset and focus back to search for the next product
    setSelectedPendingProduct(null);
    setSearchQuery('');
    setIsDropdownOpen(false);
    setPendingQuantity(1);

    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const addProductWithQtyToCart = (product: Product, quantityToAdd: number) => {
    if (product.stock_quantity <= 0) {
      setErrorMessage(`Cannot add "${product.name}" — out of stock!`);
      setTimeout(() => setErrorMessage(null), 2500);
      return;
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        const newTotalQty = existing.quantity + quantityToAdd;
        if (newTotalQty > product.stock_quantity) {
          setErrorMessage(
            `Max available stock for "${product.name}" is ${product.stock_quantity}`
          );
          setTimeout(() => setErrorMessage(null), 2500);
          return prev.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: product.stock_quantity }
              : item
          );
        }
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: newTotalQty }
            : item
        );
      }
      const finalQty = Math.min(quantityToAdd, product.stock_quantity);
      return [
        ...prev,
        {
          product,
          quantity: finalQty,
          selling_price: product.selling_price,
        },
      ];
    });

    playBeep();
    showToast(`Added ${quantityToAdd}x ${product.name}`);
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const maxStock = item.product.stock_quantity;
          return { ...item, quantity: Math.min(qty, maxStock) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerName('Counter Customer');
    setCustomerMobile('');
    setPaymentMode('CASH');
    setTransactionId('');
    setManualDiscount(0);
    setCashTendered('');
    setErrorMessage(null);
    setSelectedPendingProduct(null);
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Billing Calculations
  const subtotalMrp = cart.reduce((sum, it) => sum + it.product.mrp * it.quantity, 0);
  const rawSellingTotal = cart.reduce((sum, it) => sum + it.selling_price * it.quantity, 0);
  const normalDiscount = subtotalMrp - rawSellingTotal;
  const manualDiscountVal = Math.max(0, parseFloat(String(manualDiscount)) || 0);
  const grandTotal = Math.max(0, rawSellingTotal - manualDiscountVal);
  const totalCombinedDiscount = normalDiscount + manualDiscountVal;

  // Cash Tendered & Change Return
  const cashGiven = parseFloat(String(cashTendered)) || 0;
  const balanceToReturn = cashGiven > 0 ? cashGiven - grandTotal : 0;

  // UPI Details & Dynamic QR
  const shopUpiId = settings?.upi_id || settings?.owner_whatsapp
    ? `${(settings?.owner_whatsapp || '8870929100').replace(/\D/g, '')}@okbizaxis`
    : '8870929100@okbizaxis';
  const shopDisplayName = settings?.shop_name || 'DEVARAJ TRADERS';
  const upiPayUrl = `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(
    shopDisplayName
  )}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Devaraj Crackers Bill')}`;
  const upiQrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(
    upiPayUrl
  )}`;

  // Save Bill Handler - Instant Next Bill Flow
  const handleSaveBill = async (andPrint: boolean = false, sendWa: boolean = false): Promise<Invoice | null> => {
    if (cart.length === 0) {
      setErrorMessage('Please add items to bill before saving.');
      return null;
    }

    try {
      setLoading(true);
      setErrorMessage(null);

      const savedCustName = customerName.trim() || 'Counter Customer';
      const savedCustMobile = customerMobile.trim() || 'Walk-in';

      const payload = {
        customer_name: savedCustName,
        customer_mobile: savedCustMobile,
        payment_mode: paymentMode,
        transaction_id: transactionId.trim() || undefined,
        manual_discount: manualDiscountVal,
        items: cart.map((it) => ({
          product_id: it.product.id,
          quantity: it.quantity,
          selling_price: it.selling_price,
        })),
        notes: [
          cashGiven > 0 ? `Cash Given: ₹${cashGiven}, Return: ₹${balanceToReturn}` : '',
          transactionId.trim() ? `Txn ID: ${transactionId.trim()}` : '',
        ]
          .filter(Boolean)
          .join(' • '),
      };

      const res = await apiRequest<{ success: boolean; invoice: Invoice; error?: string }>(
        '/api/billing',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      if (res && res.success && res.invoice) {
        const inv = res.invoice;
        setRecentCompletedBill(inv);
        onRefreshProducts();

        // Automatic PDF invoice generation & download
        try {
          downloadInvoicePDF(inv, settings);
        } catch (e) {
          console.error('PDF auto download error:', e);
        }

        // Print thermal receipt if requested
        if (andPrint) {
          try {
            printThermalReceipt(inv, settings);
          } catch (e) {
            console.error('Thermal print error:', e);
          }
        }

        // Send WhatsApp if requested
        if (sendWa) {
          sendInvoiceViaWhatsApp(inv, settings, savedCustMobile);
        }

        // Play confirmation beep & show non-blocking toast
        playBeep();
        setSuccessToast(`✓ Bill #${inv.invoice_number} (₹${inv.grand_total}) Saved & Printed! Ready for Next Customer.`);
        setTimeout(() => setSuccessToast(null), 4000);

        // Instantly reset bill state to prepare for the NEXT BILL without blocking modal
        clearCart();
        setCustomerName('');
        setCustomerMobile('');
        setPaymentMode('CASH');
        setTransactionId('');
        setManualDiscount(0);
        setCashTendered('');
        searchInputRef.current?.focus();

        return inv;
      } else {
        setErrorMessage(res?.error || 'Failed to save bill.');
        return null;
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred while saving bill.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-100px)] bg-slate-100 p-2 sm:p-4 flex flex-col font-sans">
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 mb-3 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center justify-between gap-3">
          <BrandLogo theme="white" size="md" />

          {/* Quick Exit / Back buttons for mobile only (hidden md and up, where the full row below takes over) */}
          <div className="flex items-center gap-1.5 flex-wrap justify-end md:hidden">
            {onNavigateAdmin && (
              <button
                type="button"
                onClick={onNavigateAdmin}
                className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                title="View Admin Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            )}
            {onNavigateStore && (
              <button
                type="button"
                onClick={onNavigateStore}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                title="Go to Store Front"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Store</span>
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="px-2.5 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>

        {/* Full desktop nav row - hidden on mobile since the compact row above already covers these actions */}
        <div className="hidden md:flex items-center gap-2 text-xs flex-wrap justify-end">
          {/* Navigation Action Buttons */}
          {onNavigateAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="px-3 py-1.5 sm:px-3.5 sm:py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl border border-amber-400 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <LayoutDashboard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Dashboard / டேஷ்போர்டு</span>
            </button>
          )}

          {onNavigateStore && (
            <button
              type="button"
              onClick={onNavigateStore}
              className="px-3 py-1.5 sm:px-3 sm:py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
              <span>Store / கடை</span>
            </button>
          )}

          <div className="text-right hidden xl:block px-2.5 py-1 bg-slate-800/80 rounded-xl border border-slate-700">
            <div className="font-bold text-slate-200 text-xs">Cashier: {currentUser?.name || 'Counter Desk'}</div>
            <div className="text-[10px] text-amber-400 font-extrabold uppercase">
              {currentUser?.role || 'Staff'} REGISTER
            </div>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="px-2.5 py-1.5 sm:py-2 bg-red-900/60 hover:bg-red-800 text-red-200 font-bold rounded-xl border border-red-800 flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="mb-3 p-3 bg-red-100 border border-red-300 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successToast && (
        <div className="mb-3 p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successToast}</span>
        </div>
      )}

      {/* FAST KEYBOARD WORKFLOW: PRODUCT SEARCH & QUANTITY (ENTER JUMPS TO NEXT PRODUCT) */}
      <div className="bg-white rounded-2xl border-2 border-amber-400 p-3 sm:p-4 mb-3 shadow-md">
        <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span>Fast Product Entry (Type Name / Code &rarr; Enter Qty &rarr; Enter Next Product)</span>
          </span>
          <span className="text-[11px] text-gray-500 lowercase font-mono">
            {products.length} active products
          </span>
        </div>

        <form onSubmit={handleQuantitySubmit} className="flex flex-col sm:flex-row items-center gap-2">
          {/* Product Search Input with Autocomplete */}
          <div className="relative flex-1 w-full">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search by Cracker Name, Code, Barcode..."
              className="w-full pl-10 pr-4 py-2.5 text-sm sm:text-base font-bold bg-gray-50 border-2 border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />

            {/* Autocomplete dropdown */}
            {isDropdownOpen && searchMatchingProducts.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-amber-400 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto">
                <div className="p-2 bg-amber-50 text-[11px] font-bold text-amber-900 border-b border-amber-200 flex justify-between">
                  <span>Press ↑ ↓ and Enter to select</span>
                  <span>{searchMatchingProducts.length} matches</span>
                </div>
                {searchMatchingProducts.map((prod, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={prod.id}
                      onClick={() => selectProductForQuantity(prod)}
                      className={`p-2.5 cursor-pointer flex items-center justify-between border-b border-gray-100 last:border-0 ${
                        isHighlighted ? 'bg-amber-100 font-bold' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-200"
                        />
                        <div>
                          <div className="text-sm font-extrabold text-gray-900">{prod.name}</div>
                          <div className="text-xs text-gray-500">
                            Code: <span className="font-mono font-bold text-gray-700">{prod.code}</span> •{' '}
                            {prod.category_name} ({prod.content})
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-black text-red-600">₹{prod.selling_price}</div>
                        <div className="text-xs text-gray-400 line-through">MRP ₹{prod.mrp}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quantity Input */}
          <div className="w-full sm:w-32">
            <input
              ref={qtyInputRef}
              type="number"
              min="1"
              value={pendingQuantity}
              onChange={(e) => setPendingQuantity(e.target.value)}
              placeholder="Qty"
              className="w-full text-center py-2.5 text-sm sm:text-base font-black bg-gray-50 border-2 border-gray-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Add / Enter Button */}
          <button
            type="submit"
            disabled={!selectedPendingProduct && searchMatchingProducts.length === 0}
            className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 shadow-md shrink-0 cursor-pointer disabled:opacity-40"
          >
            <span>Add (Enter)</span>
            <CornerDownLeft className="w-4 h-4" />
          </button>
        </form>

        {/* Active pending item preview */}
        {selectedPendingProduct && (
          <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="font-bold">Ready to add:</span>
              <span className="font-black text-red-700">{selectedPendingProduct.name}</span>
              <span className="text-[11px] text-gray-600 font-mono">
                (Rate: ₹{selectedPendingProduct.selling_price} • MRP: ₹{selectedPendingProduct.mrp})
              </span>
            </div>
            <span className="text-[11px] font-bold text-amber-800">
              Type quantity & press Enter!
            </span>
          </div>
        )}
      </div>

      {/* MAIN BILLING LAYOUT: BILL TABLE (S.No, Name, Qty, MRP, Price, Total) + SETTLEMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 items-start">
        {/* LEFT COLUMN: Bill Table Register (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-sm flex flex-col min-h-[420px]">
          {/* Bill Register Top Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-200 mb-3 gap-2">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
              <h3 className="font-black text-base text-gray-900 font-['Outfit',sans-serif]">
                Bill Items Table ({cart.reduce((s, i) => s + i.quantity, 0)} Items)
              </h3>
            </div>

            <div className="flex items-center gap-2">
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-red-600 hover:text-red-800 font-bold flex items-center gap-1 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>
          </div>

          {/* Customer Details Inputs with Auto-Lookup */}
          <div className="bg-amber-50/70 border-2 border-amber-200 rounded-xl p-2.5 sm:p-3 mb-3 shadow-2xs">
            <div className="text-[11px] font-extrabold text-amber-900 mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-700" />
                <span>CUSTOMER INFO / வாடிக்கையாளர் விபரம்</span>
              </span>
              <span className="text-[10px] text-amber-800 font-semibold hidden sm:inline">
                {registeredCustomerInfo ? '✓ ஏற்கனவே பதிவு செய்யப்பட்டவர்' : 'Enter mobile to auto-fetch name'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-extrabold text-gray-700 uppercase block mb-1 flex items-center justify-between">
                  <span>Customer Mobile (WhatsApp) / மொபைல்</span>
                  {customerLookupLoading && (
                    <span className="text-[9px] text-amber-700 font-bold animate-pulse">
                      Checking...
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    placeholder="Enter 10-digit mobile..."
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold font-mono shadow-2xs text-gray-900"
                  />
                  <Phone className="w-4 h-4 text-emerald-600 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-gray-700 uppercase block mb-1 flex items-center justify-between">
                  <span>Customer Name / பெயர்</span>
                  {registeredCustomerInfo && (
                    <span className="text-[9px] text-emerald-700 font-black flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Auto-Fetched
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Auto-fills if number registered..."
                    className={`w-full pl-8 pr-3 py-2 text-xs border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold shadow-2xs text-gray-900 transition-colors ${
                      registeredCustomerInfo
                        ? 'bg-emerald-50/50 border-emerald-400 text-emerald-950'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  <User className="w-4 h-4 text-amber-600 absolute left-2.5 top-2.5" />
                </div>
              </div>

              {/* Registered Customer Found Badge */}
              {registeredCustomerInfo && (
                <div className="sm:col-span-2 p-2 bg-emerald-100/80 border border-emerald-300 rounded-lg flex items-center justify-between text-xs text-emerald-950 animate-in fade-in">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Registered Customer:{' '}
                      <span className="font-extrabold text-emerald-900 underline">
                        {registeredCustomerInfo.name}
                      </span>
                    </span>
                    {registeredCustomerInfo.total_orders && registeredCustomerInfo.total_orders > 0 && (
                      <span className="bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded-full font-black ml-1">
                        {registeredCustomerInfo.total_orders} Bills
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-emerald-800">
                    பெயர் தானாக நிரப்பப்பட்டது ✓
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* BILL TABLE: S.No, Product Name, Quantity, MRP, Price, Total, Action */}
          <div className="flex-1 overflow-x-auto border border-gray-200 rounded-xl">
            {cart.length === 0 ? (
              <div className="text-center py-14 text-gray-400 text-xs">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="font-extrabold text-sm text-gray-700">No items added to current bill</p>
                <p className="text-xs text-gray-400 mt-1">
                  Type cracker name or barcode above and press Enter to add items
                </p>
              </div>
            ) : (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 text-white font-extrabold sticky top-0 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-2.5 text-center w-12">S.No</th>
                    <th className="p-2.5 text-left">Product Name</th>
                    <th className="p-2.5 text-center w-28">Quantity</th>
                    <th className="p-2.5 text-right w-20">MRP (₹)</th>
                    <th className="p-2.5 text-right w-24">Price (₹)</th>
                    <th className="p-2.5 text-right w-24">Total (₹)</th>
                    <th className="p-2.5 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-medium">
                  {cart.map((item, idx) => (
                    <tr key={item.product.id} className="hover:bg-amber-50/40 transition-colors">
                      {/* S.No */}
                      <td className="p-2.5 text-center font-bold text-gray-600 bg-gray-50/50">
                        {idx + 1}
                      </td>

                      {/* Product Name */}
                      <td className="p-2.5 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-7 h-7 rounded-md object-cover border border-gray-200 shrink-0"
                          />
                          <div>
                            <div className="font-extrabold">{item.product.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              Code: {item.product.code} {item.product.content ? `• ${item.product.content}` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Quantity */}
                      <td className="p-2.5 text-center">
                        <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2.5 font-black text-gray-900 text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* MRP */}
                      <td className="p-2.5 text-right text-gray-500 font-mono line-through">
                        ₹{item.product.mrp}
                      </td>

                      {/* Price (Offer / Sale Price) */}
                      <td className="p-2.5 text-right font-black text-red-600 font-mono">
                        ₹{item.selling_price}
                      </td>

                      {/* Total */}
                      <td className="p-2.5 text-right font-black text-gray-900 font-mono text-sm">
                        ₹{item.selling_price * item.quantity}
                      </td>

                      {/* Action (Delete) */}
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Payment Mode, UPI QR, Transaction ID & Action Buttons (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-3 sm:p-4 shadow-sm flex flex-col space-y-3">
          <div className="border-b border-gray-200 pb-2">
            <h4 className="font-black text-sm text-gray-900 font-['Outfit',sans-serif]">
              Bill Settlement & Payment
            </h4>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">
              Payment Mode / பணம் செலுத்தும் முறை
            </label>
            <div className="grid grid-cols-2 gap-2 font-bold text-xs">
              <button
                type="button"
                onClick={() => setPaymentMode('CASH')}
                className={`py-2 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === 'CASH'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Banknote className="w-4 h-4" />
                <span>CASH (ரொக்கம்)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMode('UPI')}
                className={`py-2 rounded-xl text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentMode === 'UPI'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI QR (ஜிபே/போன்பே)</span>
              </button>
            </div>
          </div>

          {/* UPI QR Display & Optional Transaction ID */}
          {paymentMode === 'UPI' && (
            <div className="bg-amber-50/80 border-2 border-amber-300 p-3 rounded-2xl space-y-2 text-center">
              <div className="text-xs font-black text-amber-900 flex items-center justify-center gap-1">
                <QrCode className="w-4 h-4 text-amber-700" />
                <span>Scan & Pay via GPay / PhonePe / Paytm</span>
              </div>

              {/* Dynamic QR Code */}
              <div className="bg-white p-2.5 rounded-xl border border-amber-200 inline-block shadow-inner">
                <img
                  src={upiQrImageUrl}
                  alt="UPI QR Code"
                  className="w-36 h-36 object-contain mx-auto rounded"
                />
              </div>

              <div className="text-xs font-bold text-gray-700">
                UPI ID: <span className="font-mono text-red-700 font-black">{shopUpiId}</span>
              </div>

              {/* Optional Transaction ID input */}
              <div className="text-left pt-1">
                <label className="text-[10px] font-extrabold text-amber-900 uppercase block mb-1">
                  UPI Transaction ID / UTR (Optional)
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder=""
                  className="w-full px-3 py-1.5 text-xs bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
              </div>
            </div>
          )}

          {/* Cash Tendered & Return change calculator */}
          {paymentMode === 'CASH' && (
            <div className="bg-emerald-50/80 border border-emerald-300 p-3 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900">Cash Received:</span>
                <input
                  type="number"
                  min="0"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder=""
                  className="w-24 px-2 py-1 text-xs font-black text-right bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCashTendered(amt)}
                    className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded font-black text-[10px] cursor-pointer"
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCashTendered(grandTotal)}
                  className="px-2 py-0.5 bg-emerald-700 text-white rounded font-black text-[10px] cursor-pointer"
                >
                  Exact
                </button>
              </div>

              {cashGiven > 0 && (
                <div
                  className={`p-2 rounded-lg text-xs font-black flex items-center justify-between ${
                    balanceToReturn >= 0
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  <span>{balanceToReturn >= 0 ? 'Change to Return:' : 'Shortage:'}</span>
                  <span className="text-sm font-['Outfit',sans-serif]">
                    ₹{Math.abs(balanceToReturn).toLocaleString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Extra Discount Input */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1 flex items-center justify-between">
              <span>Extra Discount (கூடுதல் தள்ளுபடி ₹)</span>
              <Percent className="w-3 h-3 text-gray-400" />
            </label>
            <input
              type="number"
              min="0"
              value={manualDiscount}
              onChange={(e) => setManualDiscount(e.target.value)}
              placeholder="₹ 0.00"
              className="w-full px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-black text-red-700"
            />
          </div>

          {/* Bill Totals Summary */}
          <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-gray-500">
              <span>Total MRP:</span>
              <span className="font-mono">₹{subtotalMrp.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-emerald-700 font-bold">
              <span>Diwali Discount Saved:</span>
              <span className="font-mono">- ₹{totalCombinedDiscount.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-200">
              <span>Grand Total:</span>
              <span className="text-red-700 font-black text-lg font-['Outfit',sans-serif]">
                ₹{grandTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* ACTION BUTTONS: SAVE BILL, SAVE & PRINT, SEND WHATSAPP */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSaveBill(false, false)}
                disabled={loading || cart.length === 0}
                className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Save className="w-4 h-4 text-amber-400" />
                <span>SAVE BILL</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveBill(true, false)}
                disabled={loading || cart.length === 0}
                className="bg-amber-600 hover:bg-amber-700 text-white font-black py-3 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>SAVE & PRINT</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleSaveBill(false, true)}
              disabled={loading || cart.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 disabled:opacity-40 transition-all cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>SAVE & SEND WHATSAPP BILL</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-blocking Recent Bill Status Bar (Never Blocks Next Bill) */}
      {recentCompletedBill && (
        <div className="fixed bottom-2 left-2 right-2 sm:left-auto sm:bottom-4 sm:right-4 z-40 bg-slate-900 text-white p-3 rounded-2xl shadow-2xl border border-slate-700 flex flex-wrap items-center gap-3 animate-in slide-in-from-bottom-4 sm:max-w-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black shrink-0">
              ✓
            </div>
            <div>
              <div className="text-xs font-bold text-slate-200">
                Bill <span className="font-mono text-amber-400 font-black">{recentCompletedBill.invoice_number}</span> (₹{recentCompletedBill.grand_total})
              </div>
              <div className="text-[10px] text-emerald-400 font-semibold">
                Saved & Printed • Next Bill Ready
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-2 ml-auto">
            <button
              type="button"
              onClick={() => printThermalReceipt(recentCompletedBill, settings)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Reprint receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={() => downloadInvoicePDF(recentCompletedBill, settings)}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setRecentCompletedBill(null)}
              className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Live Camera Barcode Scanner Modal */}
      <CameraBarcodeScanner
        isOpen={isCameraScannerOpen}
        onClose={() => {
          setIsCameraScannerOpen(false);
          searchInputRef.current?.focus();
        }}
        onScan={(scannedBarcode) => {
          const matchedProduct = products.find(
            (p) =>
              p.barcode.toLowerCase() === scannedBarcode.toLowerCase() ||
              p.code.toLowerCase() === scannedBarcode.toLowerCase()
          );
          if (matchedProduct) {
            selectProductForQuantity(matchedProduct);
            playBeep();
            setErrorMessage(null);
          } else {
            setErrorMessage(`Barcode "${scannedBarcode}" not found.`);
            setTimeout(() => setErrorMessage(null), 3000);
          }
        }}
        productsList={products.map((p) => ({ barcode: p.barcode, code: p.code, name: p.name }))}
      />
    </div>
  );
};
