import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, CartItem, StoreSettings } from '../types';
import {
  Sparkles,
  Search,
  ShoppingCart,
  Download,
  FileText,
  AlertCircle,
  Plus,
  Minus,
  MessageCircle,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { downloadOrderEstimatePDF, downloadPriceListPDF } from '../utils/pdfGenerator';
import { DownloadDetailsModal } from './DownloadDetailsModal';
import { apiRequest } from '../utils/api';

type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'discount-desc' | 'name-asc';

const SORT_LABELS: Record<SortOption, string> = {
  featured: 'Featured (இயல்பு வரிசை)',
  'price-asc': 'Price: Low to High',
  'price-desc': 'Price: High to Low',
  'discount-desc': 'Discount: High to Low',
  'name-asc': 'Name: A to Z',
};

interface PriceListTableProps {
  products: Product[];
  categories: Category[];
  cart: CartItem[];
  onUpdateCartQty: (productId: number, newQty: number) => void;
  onOpenCart: () => void;
  settings?: StoreSettings | null;
}

export const PriceListTable: React.FC<PriceListTableProps> = ({
  products,
  categories,
  cart,
  onUpdateCartQty,
  onOpenCart,
  settings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [downloadSuccessToast, setDownloadSuccessToast] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [downloadType, setDownloadType] = useState<'estimate' | 'catalog' | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  // Observer to show floating bottom bar ONLY when the user is actively viewing/scrolling the product list section
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0,
        rootMargin: '-80px 0px -40px 0px',
      }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Cart quantity map for quick O(1) lookups
  const cartQtyMap = new Map<number, number>();
  cart.forEach((item) => {
    cartQtyMap.set(item.product.id, item.quantity);
  });

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesCat = selectedCatId === 'all' || p.category_id === selectedCatId;
    const matchesSearch =
      !filterSearch.trim() ||
      p.name.toLowerCase().includes(filterSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(filterSearch.toLowerCase()) ||
      (p.content && p.content.toLowerCase().includes(filterSearch.toLowerCase())) ||
      (p.category_name && p.category_name.toLowerCase().includes(filterSearch.toLowerCase()));
    const matchesStock = !inStockOnly || p.stock_quantity > 0;
    return matchesCat && matchesSearch && matchesStock;
  });

  // Sort products (applied per-category below, but computed once here as a comparator)
  const sortProducts = (list: Product[]): Product[] => {
    if (sortOption === 'featured') return list;
    const sorted = [...list];
    switch (sortOption) {
      case 'price-asc':
        sorted.sort((a, b) => a.selling_price - b.selling_price);
        break;
      case 'price-desc':
        sorted.sort((a, b) => b.selling_price - a.selling_price);
        break;
      case 'discount-desc':
        sorted.sort((a, b) => b.discount_percentage - a.discount_percentage);
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  };

  // Calculate live order totals
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalMrp = cart.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const totalNet = cart.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const totalSavings = totalMrp - totalNet;
  const savingsPct = totalMrp > 0 ? Math.round((totalSavings / totalMrp) * 100) : 0;

  const requestDownload = (type: 'estimate' | 'catalog') => {
    if (type === 'estimate' && cart.length === 0) {
      showNotice('Please select at least 1 cracker quantity before downloading your estimate (பட்டாசு எண்ணிக்கையை உள்ளிடவும்).');
      return;
    }
    setDownloadType(type);
  };

  const completeDownload = async (name: string, mobile: string) => {
    await apiRequest('/api/customers/register-download', {
      method: 'POST',
      body: JSON.stringify({ name, mobile }),
    });

    try {
      if (downloadType === 'estimate') {
        downloadOrderEstimatePDF(cart, settings);
        setDownloadSuccessToast('Order Estimate PDF downloaded successfully!');
      } else {
        downloadPriceListPDF(products, categories, settings);
        setDownloadSuccessToast('Full Wholesale Price List PDF downloaded successfully!');
      }
      setTimeout(() => setDownloadSuccessToast(null), 4000);
      setDownloadType(null);
    } catch (err) {
      console.error(err);
      showNotice('Failed to generate PDF. Please try again.');
      throw err;
    }
  };

  // Generate WhatsApp Order Text
  const handleWhatsAppOrder = () => {
    if (cart.length === 0) {
      showNotice('Please add items to your price list before placing a WhatsApp order.');
      return;
    }
    const phone = settings?.owner_whatsapp || '919894777176';
    let text = `💥 *DEVARAJ TRADERS - FESTIVAL CRACKER ORDER* 💥\n`;
    text += `📍 *Kanchipuram Direct Outlet*\n`;
    text += `------------------------------------\n`;
    cart.forEach((item, idx) => {
      const content = item.product.content ? ` [${item.product.content}]` : '';
      text += `${idx + 1}. ${item.product.name}${content} x ${item.quantity} = ₹${(item.product.selling_price * item.quantity).toFixed(2)}\n`;
    });
    text += `------------------------------------\n`;
    text += `*Total Items:* ${cart.length} (${totalCartCount} Boxes/Pcs)\n`;
    text += `*Total MRP:* ₹${totalMrp.toLocaleString('en-IN')}\n`;
    text += `*Direct Factory Savings:* ₹${totalSavings.toLocaleString('en-IN')} (${savingsPct}% OFF)\n`;
    text += `*Net Amount:* ₹${totalNet.toLocaleString('en-IN')}\n\n`;
    text += `Please confirm my cracker booking. Thank you!`;

    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Group products by category when 'all' is selected
  const knownCatIds = new Set(categories.map((c) => c.id));
  const uncategorizedProds = filteredProducts.filter((p) => !knownCatIds.has(p.category_id));

  const allEffectiveCategories = [...categories];
  if (uncategorizedProds.length > 0) {
    allEffectiveCategories.push({
      id: -1,
      name: 'General Crackers (இதர பட்டாசுகள்)',
      slug: 'general-crackers',
      description: 'Newly added fireworks',
      image_url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
      display_order: 999,
      is_active: true,
      created_at: new Date().toISOString(),
    });
  }

  const displayedCategories = selectedCatId === 'all'
    ? allEffectiveCategories.filter((cat) =>
        cat.id === -1
          ? uncategorizedProds.length > 0
          : filteredProducts.some((p) => p.category_id === cat.id)
      )
    : allEffectiveCategories.filter((cat) => cat.id === selectedCatId);

  return (
    <div ref={containerRef} className="w-full">
      {/* Toast Notification */}
      {downloadSuccessToast && (
        <div className="fixed top-20 right-4 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{downloadSuccessToast}</span>
        </div>
      )}

      {actionNotice && (
        <div className="fixed top-20 right-4 z-50 bg-amber-600 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-top duration-300">
          <Sparkles className="w-4 h-4 text-amber-200" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* TOP STICKY ESTIMATE & DOWNLOAD BAR */}
      <div className="hidden sm:block sticky top-14 sm:top-16 z-30 mb-4 sm:mb-6 bg-gradient-to-r from-red-700 via-red-800 to-amber-700 rounded-2xl shadow-xl p-3 sm:p-4 text-white border-2 border-amber-400/40 backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Live calculation stats */}
          <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 sm:gap-4">
            <div className="bg-amber-400 text-red-950 px-2.5 py-1 rounded-xl font-black text-xs flex items-center gap-1 shadow-xs">
              <Sparkles className="w-3 h-3 text-red-900" />
              <span>{cart.length} Items ({totalCartCount} Pcs)</span>
            </div>

            <div className="text-xs sm:text-sm text-red-100 flex items-center gap-1.5 font-medium">
              <span>MRP: <span className="line-through text-red-200">₹{totalMrp.toLocaleString('en-IN')}</span></span>
              <span className="bg-emerald-500/30 text-emerald-200 px-1.5 py-0.5 rounded font-bold border border-emerald-400/30 text-[10px] sm:text-xs">
                Save ₹{totalSavings.toLocaleString('en-IN')} ({savingsPct}%)
              </span>
            </div>

            <div className="text-sm sm:text-base font-black text-yellow-300 flex items-baseline gap-1 ml-auto sm:ml-0">
              <span className="text-[10px] sm:text-xs text-red-100 font-bold uppercase">Net Total:</span>
              <span className="text-lg sm:text-2xl font-black font-['Outfit',sans-serif]">
                ₹{totalNet.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Action buttons: grid on mobile (never clipped/scrolled), single row from sm: up */}
          <div className="grid grid-cols-4 sm:flex sm:items-center gap-1.5 sm:gap-2 py-0.5">
            {/* 1. Download PDF */}
            <button
              type="button"
              onClick={() => requestDownload('estimate')}
              className={`px-1.5 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-md transition-all cursor-pointer min-w-0 ${
                cart.length > 0
                  ? 'bg-amber-400 hover:bg-amber-300 text-red-950 active:scale-95 ring-2 ring-amber-300'
                  : 'bg-white/15 hover:bg-white/25 text-white border border-white/30'
              }`}
              title="Download Order Estimate PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Download PDF</span>
            </button>

            {/* 2. Full Catalog */}
            <button
              type="button"
              onClick={() => requestDownload('catalog')}
              className="bg-white/20 hover:bg-white/30 text-white px-1.5 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 border border-white/30 transition-colors cursor-pointer min-w-0"
              title="Download Full Catalog PDF"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Catalog</span>
            </button>

            {/* 3. WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppOrder}
              disabled={cart.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-1.5 sm:px-3.5 py-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-xs transition-colors cursor-pointer min-w-0"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {/* 4. Checkout */}
            <button
              type="button"
              onClick={onOpenCart}
              disabled={cart.length === 0}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-1.5 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer border border-red-400/50 min-w-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Checkout</span>
            </button>
          </div>
        </div>

        {cart.length === 0 && (
          <div className="mt-2 pt-2 border-t border-white/15 text-[10px] sm:text-[11px] text-amber-200">
            <span>💡 கீழே உள்ள பட்டாசு பட்டியலில் எண்ணிக்கையை (Qty) உள்ளிடவும். மொத்த விலை உடனடியாக மாறும்!</span>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-red-100 shadow-xs mb-4 sm:mb-6 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search crackers / தேடவும்..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-red-600 focus:outline-none transition-all"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
            {filterSearch && (
              <button
                type="button"
                onClick={() => setFilterSearch('')}
                className="absolute right-3 top-2 text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Button (Sort + In Stock Only) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setShowSortMenu((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold border transition-colors cursor-pointer ${
                selectedCatId !== 'all' || sortOption !== 'featured' || inStockOnly
                  ? 'bg-red-700 text-white border-red-700'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSortMenu && (
              <>
                {/* Backdrop to close on outside click */}
                <div className="fixed inset-0 z-30" onClick={() => setShowSortMenu(false)} />
                <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl border border-gray-200 shadow-xl z-40 p-3 space-y-3">
                  <div>
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Category (வகை)
                    </div>
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="all">All Categories ({products.length})</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name} ({products.filter((p) => p.category_id === cat.id).length})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t border-gray-100 pt-3">
                    <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1.5">
                      Sort By (வரிசைப்படுத்து)
                    </div>
                    <div className="space-y-1">
                      {(Object.keys(SORT_LABELS) as SortOption[]).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => {
                            setSortOption(opt);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            sortOption === opt
                              ? 'bg-red-700 text-white'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {SORT_LABELS[opt]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer border-t border-gray-100 pt-2.5">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="w-3.5 h-3.5 accent-red-600"
                    />
                    <span className="text-xs font-semibold text-gray-700">In Stock Only (கையிருப்பு உள்ளவை)</span>
                  </label>

                  {(selectedCatId !== 'all' || sortOption !== 'featured' || inStockOnly) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSortOption('featured');
                        setSelectedCatId('all');
                        setInStockOnly(false);
                      }}
                      className="w-full text-center text-[11px] font-bold text-red-700 hover:underline pt-1"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category selection is now inside the Filter menu for a cleaner mobile/desktop layout. */}
      </div>

      {/* MOBILE ACTIONS - the large sticky summary bar is intentionally removed from phone view. */}
      <div className="sm:hidden grid grid-cols-4 gap-1.5 mb-4 bg-white rounded-2xl border border-red-100 p-2 shadow-xs">
        <button type="button" onClick={() => requestDownload('estimate')} disabled={cart.length === 0} className="bg-amber-400 disabled:opacity-40 text-red-950 rounded-xl py-2 px-1 text-[9px] font-black flex flex-col items-center gap-1 cursor-pointer">
          <Download className="w-4 h-4" /> PDF
        </button>
        <button type="button" onClick={() => requestDownload('catalog')} className="bg-slate-800 text-white rounded-xl py-2 px-1 text-[9px] font-black flex flex-col items-center gap-1 cursor-pointer">
          <FileText className="w-4 h-4" /> Catalog
        </button>
        <button type="button" onClick={handleWhatsAppOrder} disabled={cart.length === 0} className="bg-emerald-600 disabled:opacity-40 text-white rounded-xl py-2 px-1 text-[9px] font-black flex flex-col items-center gap-1 cursor-pointer">
          <MessageCircle className="w-4 h-4" /> WhatsApp
        </button>
        <button type="button" onClick={onOpenCart} disabled={cart.length === 0} className="bg-red-600 disabled:opacity-40 text-white rounded-xl py-2 px-1 text-[9px] font-black flex flex-col items-center gap-1 cursor-pointer">
          <ShoppingCart className="w-4 h-4" /> Checkout
        </button>
      </div>

      {/* Main Categorized Price List */}
      <div className="space-y-6 pb-32">
        {displayedCategories.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-200">
            <AlertCircle className="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p className="font-bold text-gray-700">No crackers matched your search.</p>
            <p className="text-xs text-gray-500 mt-1">Try another search keyword or clear filters.</p>
          </div>
        ) : (
          displayedCategories.map((cat) => {
            const catProducts = sortProducts(filteredProducts.filter((p) => p.category_id === cat.id));
            if (catProducts.length === 0) return null;

            const isCombo =
              cat.slug === 'gift-boxes' ||
              cat.slug === 'combo-packs' ||
              cat.name.toLowerCase().includes('combo') ||
              cat.name.toLowerCase().includes('gift');
            const discountPillText = isCombo ? 'NET RATE PRODUCTS' : '65% DISCOUNT';

            return (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden"
              >
                {/* Category Header (Periwinkle / Lavender bar styled after Image 2 reference) */}
                <div className="bg-purple-100/90 border-b border-purple-200 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-700"></span>
                    <h3 className="font-black text-purple-950 text-sm sm:text-base tracking-wide font-['Outfit',sans-serif]">
                      {cat.name.toUpperCase()}
                    </h3>
                  </div>
                  <span className="bg-purple-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-2xs">
                    {discountPillText}
                  </span>
                </div>

                {/* 1. MOBILE RESPONSIVE CARD VIEW (< md screens) */}
                <div className="block md:hidden divide-y divide-gray-100">
                  {catProducts.map((prod, idx) => {
                    const qty = cartQtyMap.get(prod.id) || 0;
                    const itemTotal = prod.selling_price * qty;
                    const isOutOfStock = prod.stock_quantity <= 0;

                    return (
                      <div
                        key={prod.id}
                        className={`p-3 transition-colors ${
                          qty > 0 ? 'bg-amber-50/70 border-l-4 border-amber-500' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {/* Image Thumbnail with zoom on click */}
                          <div
                            onClick={() => setPreviewImage(prod.image_url)}
                            className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0 cursor-pointer relative group"
                          >
                            <img
                              src={prod.image_url}
                              alt={prod.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] text-white font-bold">
                              Zoom
                            </div>
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-1">
                              <span className="text-[11px] font-bold text-gray-400">#{idx + 1}</span>
                              <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                {prod.code}
                              </span>
                            </div>
                            <h4 className="font-bold text-gray-900 text-xs leading-snug truncate">
                              {prod.name}
                            </h4>
                            <div className="text-[11px] text-gray-500 font-medium">
                              {prod.content || '1 Box'}
                            </div>

                            {/* Rates Breakdown */}
                            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                              <span className="text-[10px] font-bold text-gray-500 line-through">
                                MRP ₹{prod.mrp.toLocaleString('en-IN')}
                              </span>
                              <span className="text-[10px] font-bold text-emerald-700">
                                {prod.discount_percentage}% OFF
                              </span>
                              <span className="text-sm font-black text-red-700">
                                ₹{prod.selling_price.toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity Stepper & Line Total in one row */}
                        <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                          {isOutOfStock ? (
                            <span className="text-xs text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                              Out of Stock
                            </span>
                          ) : (
                            <div className="inline-flex items-center border border-gray-300 rounded-xl bg-white shadow-2xs overflow-hidden">
                              <button
                                type="button"
                                onClick={() => onUpdateCartQty(prod.id, Math.max(0, qty - 1))}
                                disabled={qty === 0}
                                className="px-3 py-1.5 text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer touch-manipulation select-none"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                min="0"
                                max={prod.stock_quantity}
                                value={qty === 0 ? '' : qty}
                                placeholder="0"
                                onClick={(e) => (e.target as HTMLInputElement).select()}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  onUpdateCartQty(prod.id, isNaN(val) ? 0 : Math.max(0, val));
                                }}
                                className="w-12 text-center text-xs font-bold text-gray-900 focus:outline-none focus:bg-red-50 py-1"
                              />
                              <button
                                type="button"
                                onClick={() => onUpdateCartQty(prod.id, qty + 1)}
                                disabled={qty >= prod.stock_quantity}
                                className="px-3 py-1.5 text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer touch-manipulation select-none"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}

                          {/* Line Total */}
                          <div className="text-right">
                            <span className="text-[10px] text-gray-400 block font-medium">Subtotal:</span>
                            <span
                              className={`text-sm font-black ${
                                itemTotal > 0 ? 'text-red-700' : 'text-gray-400'
                              }`}
                            >
                              ₹{itemTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. DESKTOP SPREADSHEET TABLE VIEW (>= md screens) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-12">S.No</th>
                        <th className="py-2.5 px-3 text-center w-14">Image</th>
                        <th className="py-2.5 px-4 min-w-[200px]">Product Name & Code</th>
                        <th className="py-2.5 px-3 text-center min-w-[90px]">Content</th>
                        <th className="py-2.5 px-3 text-right min-w-[90px]">MRP (₹)</th>
                        <th className="py-2.5 px-3 text-right min-w-[80px]">Discount</th>
                        <th className="py-2.5 px-3 text-right min-w-[90px]">Price (₹)</th>
                        <th className="py-2.5 px-4 text-center min-w-[130px]">Quantity</th>
                        <th className="py-2.5 px-4 text-right min-w-[100px]">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {catProducts.map((prod, idx) => {
                        const qty = cartQtyMap.get(prod.id) || 0;
                        const itemTotal = prod.selling_price * qty;
                        const isOutOfStock = prod.stock_quantity <= 0;

                        return (
                          <tr
                            key={prod.id}
                            className={`hover:bg-amber-50/50 transition-colors ${
                              qty > 0 ? 'bg-amber-50/70 font-semibold' : ''
                            }`}
                          >
                            {/* 1. S.No */}
                            <td className="py-2.5 px-3 text-center text-gray-500 font-medium">{idx + 1}</td>

                            {/* 2. Image */}
                            <td className="py-2.5 px-3 text-center">
                              <div
                                onClick={() => setPreviewImage(prod.image_url)}
                                className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 mx-auto cursor-pointer relative group"
                              >
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                />
                              </div>
                            </td>

                            {/* 3. Product Name & Code */}
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-gray-900 text-xs leading-snug">{prod.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono mt-0.5">{prod.code}</div>
                            </td>

                            {/* 4. Content */}
                            <td className="py-2.5 px-3 text-center text-gray-600 text-[11px] font-medium">
                              {prod.content || '1 Box'}
                            </td>

                            {/* 5. MRP */}
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-gray-500 line-through font-semibold text-xs">
                                ₹{prod.mrp.toLocaleString('en-IN')}
                              </span>
                            </td>

                            {/* 6. Discount */}
                            <td className="py-2.5 px-3 text-right">
                              <span className="text-emerald-700 font-bold text-xs">
                                {prod.discount_percentage}%
                              </span>
                            </td>

                            {/* 7. Price (Selling Price) */}
                            <td className="py-2.5 px-3 text-right">
                              <span className="font-extrabold text-red-700 text-xs sm:text-sm font-['Outfit',sans-serif]">
                                ₹{prod.selling_price.toFixed(2)}
                              </span>
                            </td>

                            {/* 8. Quantity Stepper */}
                            <td className="py-2.5 px-4 text-center">
                              {isOutOfStock ? (
                                <span className="text-xs text-gray-400 font-semibold">Sold Out</span>
                              ) : (
                                <div className="inline-flex items-center border border-gray-300 rounded-lg bg-white shadow-2xs overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty(prod.id, Math.max(0, qty - 1))}
                                    disabled={qty === 0}
                                    className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer touch-manipulation select-none"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    min="0"
                                    max={prod.stock_quantity}
                                    value={qty === 0 ? '' : qty}
                                    placeholder="0"
                                    onClick={(e) => (e.target as HTMLInputElement).select()}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      onUpdateCartQty(prod.id, isNaN(val) ? 0 : Math.max(0, val));
                                    }}
                                    className="w-10 text-center text-xs font-bold text-gray-900 focus:outline-none focus:bg-red-50 py-1"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => onUpdateCartQty(prod.id, qty + 1)}
                                    disabled={qty >= prod.stock_quantity}
                                    className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer touch-manipulation select-none"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </td>

                            {/* 9. Total */}
                            <td className="py-2.5 px-4 text-right">
                              <div
                                className={`text-xs sm:text-sm font-black ${
                                  itemTotal > 0 ? 'text-gray-900' : 'text-gray-300'
                                }`}
                              >
                                ₹{itemTotal.toFixed(2)}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FLOATING BOTTOM BAR - desktop only. Phone view uses the compact action row above. */}
      <div
        className={`hidden sm:block fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-white p-3 border-t-2 border-amber-400 shadow-2xl backdrop-blur-lg transition-all duration-300 transform ${
          isInView
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 sm:gap-3">
          {/* Rate and Items info */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4 px-0.5">
            <div>
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                {cart.length > 0
                  ? `${cart.length} Items (${totalCartCount} Boxes/Pcs)`
                  : 'Select Crackers to Order'}
              </div>
              <div className="text-base sm:text-lg font-black text-white font-['Outfit',sans-serif]">
                {cart.length > 0 ? (
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-yellow-400 font-black">₹{totalNet.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-red-300 line-through">₹{totalMrp.toLocaleString('en-IN')}</span>
                    <span className="text-xs text-emerald-400 font-bold">Save {savingsPct}%</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 font-medium">Add crackers above to calculate rate</span>
                )}
              </div>
            </div>
          </div>

          {/* 4 Action Buttons - wrap into a full-width grid on mobile so nothing gets clipped, single row on larger screens */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2 w-full md:w-auto md:flex md:items-center">
            {/* 1. Download PDF */}
            <button
              type="button"
              onClick={() => requestDownload('estimate')}
              disabled={cart.length === 0}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-40 disabled:cursor-not-allowed text-red-950 px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer min-w-0"
              title="Download Order Estimate PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Download PDF</span>
            </button>

            {/* 2. Full Catalog */}
            <button
              type="button"
              onClick={() => requestDownload('catalog')}
              className="bg-slate-800 hover:bg-slate-700 text-white px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 border border-slate-700 transition-colors cursor-pointer min-w-0"
              title="Download Full Catalog PDF"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Catalog</span>
            </button>

            {/* 3. WhatsApp */}
            <button
              type="button"
              onClick={handleWhatsAppOrder}
              disabled={cart.length === 0}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-1.5 sm:px-3 py-2 rounded-xl text-[10px] sm:text-xs font-bold flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 transition-colors cursor-pointer min-w-0"
            >
              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {/* 4. Checkout */}
            <button
              type="button"
              onClick={onOpenCart}
              disabled={cart.length === 0}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white px-1.5 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-black flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer min-w-0"
            >
              <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Checkout {cart.length > 0 ? `(${cart.length})` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      <DownloadDetailsModal
        isOpen={downloadType !== null}
        title={downloadType === 'estimate' ? 'Download Order Estimate' : 'Download Price List / Catalog'}
        description="Enter your name and mobile number before downloading."
        onClose={() => setDownloadType(null)}
        onSubmit={completeDownload}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
        >
          <div className="relative bg-white rounded-3xl p-3 max-w-sm w-full shadow-2xl animate-in zoom-in-95">
            <img
              src={previewImage}
              alt="Cracker Preview"
              className="w-full h-72 object-cover rounded-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="w-full mt-3 bg-red-700 hover:bg-red-800 text-white font-bold py-2 rounded-xl text-xs transition-colors"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
