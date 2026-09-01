import React, { useState, useEffect } from 'react';
import { Product, Category, CartItem, Invoice, StoreSettings } from './types';
import { apiRequest, getStoredUser, clearAuthSession } from './utils/api';
import { INITIAL_PRODUCTS, INITIAL_CATEGORIES, INITIAL_SETTINGS } from './data/initialData';
import { Header } from './components/Header';
import { BannerCarousel } from './components/BannerCarousel';
import { FestiveBackground } from './components/FestiveBackground';
import { CategorySection } from './components/CategorySection';
import { ProductCard } from './components/ProductCard';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { OrderSuccessModal } from './components/OrderSuccessModal';
import { InvoiceDetailModal } from './components/InvoiceDetailModal';
import { downloadInvoicePDF } from './utils/pdfGenerator';
import { WorkerPOS } from './components/WorkerPOS';
import { AdminDashboard } from './components/AdminDashboard';
import { PriceListTable } from './components/PriceListTable';
import { LoginModal } from './components/LoginModal';
import { Footer } from './components/Footer';
import { AboutModal } from './components/AboutModal';
import { SafetyTipsModal } from './components/SafetyTipsModal';
import { ContactModal } from './components/ContactModal';
import { CustomerBillsModal } from './components/CustomerBillsModal';
import {
  Sparkles,
  Filter,
  ArrowUpDown,
  Gift,
  CheckCircle2,
  Phone,
  Flame,
  Truck,
  ShieldCheck,
  Package,
  ShoppingCart,
} from 'lucide-react';

export default function App() {
  // Navigation View: 'store' | 'pos' | 'admin'
  const [currentView, setCurrentView] = useState<'store' | 'pos' | 'admin'>('store');

  // Application Data
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [settings, setSettings] = useState<StoreSettings | null>(INITIAL_SETTINGS);
  const [loading, setLoading] = useState<boolean>(false);

  // Cart State (stored in localStorage for convenience)
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('devaraj_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // UI Drawer & Modal States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccessInvoice, setOrderSuccessInvoice] = useState<Invoice | null>(null);
  const [orderSuccessWhatsappMsg, setOrderSuccessWhatsappMsg] = useState<string>('');
  const [orderSuccessWhatsappStatus, setOrderSuccessWhatsappStatus] = useState<string>('');
  const [viewInvoiceModal, setViewInvoiceModal] = useState<Invoice | null>(null);

  // Nav Modals
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isSafetyTipsOpen, setIsSafetyTipsOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isCustomerBillsOpen, setIsCustomerBillsOpen] = useState(false);

  // Language & Theme State
  const [language, setLanguage] = useState<'ta' | 'en'>('ta');
  const [themeMode, setThemeMode] = useState<'festive' | 'bw'>('festive');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | 'all'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'discount'>('featured');
  const [activeBrowseMode, setActiveBrowseMode] = useState<'price-list' | 'cards'>('price-list');

  // Authentication State & Modals
  const [currentUser, setCurrentUser] = useState<any>(() => getStoredUser());
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginTargetView, setLoginTargetView] = useState<'pos' | 'admin' | null>(null);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem('devaraj_cart', JSON.stringify(cart));
    } catch {
      // Ignore
    }
  }, [cart]);

  // Initial Data Fetch
  const fetchData = async () => {
    try {
      const [prodsData, catsData, setsData] = await Promise.all([
        apiRequest<Product[]>('/api/products').catch(() => null),
        apiRequest<Category[]>('/api/categories').catch(() => null),
        apiRequest<StoreSettings>('/api/settings').catch(() => null),
      ]);
      if (prodsData && Array.isArray(prodsData) && prodsData.length > 0) {
        setProducts(prodsData);
      }
      if (catsData && Array.isArray(catsData) && catsData.length > 0) {
        setCategories(catsData);
      }
      if (setsData && typeof setsData === 'object') {
        setSettings(setsData);
      }
    } catch (err) {
      console.warn('API sync warning (using cached/initial store catalog):', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle "?track=INVOICE_NUMBER" deep links (sent via WhatsApp e-bill links)
  // by fetching the matching invoice, opening it in the Invoice Detail Modal,
  // AND immediately auto-downloading the PDF — since a wa.me chat can't
  // attach a real file, this link is the stand-in for "the bill", so
  // clicking it should hand over the actual receipt with no extra taps.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const trackId = params.get('track');
    if (!trackId) return;

    (async () => {
      try {
        const invoice = await apiRequest<Invoice>(`/api/invoices/${encodeURIComponent(trackId)}`);
        if (invoice) {
          setViewInvoiceModal(invoice);
          try {
            downloadInvoicePDF(invoice, settings);
          } catch (pdfErr) {
            console.error('Auto-download of tracked invoice PDF failed:', pdfErr);
          }
        }
      } catch (err) {
        console.warn('Could not load tracked invoice:', err);
      } finally {
        // Clean the URL so refreshing/sharing doesn't keep re-triggering the fetch
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, '', cleanUrl);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: Math.min(newQty, product.stock_quantity),
        };
        return updated;
      }
      return [...prev, { product, quantity: Math.min(quantity, product.stock_quantity) }];
    });
  };

  const handleUpdateCartQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === productId);
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex
            ? { ...item, quantity: Math.min(newQty, item.product.stock_quantity) }
            : item
        );
      }
      const prod = products.find((p) => p.id === productId);
      if (prod) {
        return [...prev, { product: prod, quantity: Math.min(newQty, prod.stock_quantity) }];
      }
      return prev;
    });
  };

  const handleRemoveCartItem = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  // Checkout Handlers
  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderSuccess = (order: any, invoice: Invoice, whatsappMsg: string, whatsappStatus?: string) => {
    setIsCheckoutOpen(false);
    setCart([]);
    setOrderSuccessInvoice(invoice);
    setOrderSuccessWhatsappMsg(whatsappMsg);
    setOrderSuccessWhatsappStatus(whatsappStatus || '');
    // Refresh products to update live stock numbers
    fetchData();
  };

  // Auth Handlers
  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    setCurrentView('store');
  };

  // Filtered & Sorted Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all' || p.category_id === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className={`min-h-screen flex flex-col relative ${themeMode === 'bw' ? 'bg-zinc-950 text-zinc-100 selection:bg-zinc-700 selection:text-white' : 'bg-white text-gray-900 selection:bg-red-200 selection:text-red-900'}`}>
      {/* Background festive effects (fireworks sparkles and festive ambience) */}
      {currentView === 'store' && <FestiveBackground />}

      {/* Top Main Navigation Header with Marquee, B&W Theme toggle & Profile Icon - Only in Store View */}
      {currentView === 'store' && (
        <Header
          currentView={currentView}
          setCurrentView={setCurrentView}
          cartCount={totalCartCount}
          openCart={() => setIsCartOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          products={products}
          categories={categories}
          onSelectProduct={(prod) => {
            setSelectedCategory(prod.category_id);
            const el = document.getElementById('price-list-section') || document.getElementById('products-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          settings={settings}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          currentUser={currentUser}
          onOpenLogin={() => {
            setLoginTargetView('pos');
            setIsLoginModalOpen(true);
          }}
          onLogout={handleLogout}
          onOpenAbout={() => setIsAboutOpen(true)}
          onOpenSafetyTips={() => setIsSafetyTipsOpen(true)}
          onOpenContact={() => setIsContactOpen(true)}
          onOpenCustomerBills={() => setIsCustomerBillsOpen(true)}
          language={language}
          setLanguage={setLanguage}
          themeMode={themeMode}
          setThemeMode={setThemeMode}
        />
      )}

      {/* Main View Router */}
      {currentView === 'store' && (
        <main className="flex-1 relative z-10">
          {/* Admin-published moving banners. Hidden on phones so the mobile view stays compact. */}
          <div className="hidden sm:block">
            <BannerCarousel
              banners={(settings?.banners || []).filter((banner) => banner.is_active !== false)}
              language={language}
              onExploreProducts={() => {
                const el = document.getElementById('price-list-section');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            />
          </div>

          {/* Sivamurugan Crackers Style Quick Price List */}
          <div id="price-list-section">
            <PriceListTable
              products={products}
              categories={categories}
              cart={cart}
              onUpdateCartQty={handleUpdateCartQty}
              onOpenCart={() => setIsCartOpen(true)}
              settings={settings}
            />
          </div>

          {/* Footer */}
          <Footer
            settings={settings}
            onNavigateCategory={(catId) => {
              setSelectedCategory(catId);
              const el = document.getElementById('price-list-section');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            onOpenLogin={() => {
              setLoginTargetView('admin');
              setIsLoginModalOpen(true);
            }}
          />
        </main>
      )}

      {/* POS Billing Screen (Protected) */}
      {currentView === 'pos' && (
        <WorkerPOS
          products={products}
          categories={categories}
          settings={settings}
          currentUser={currentUser}
          onRefreshProducts={fetchData}
          onOpenLogin={() => {
            setLoginTargetView('pos');
            setIsLoginModalOpen(true);
          }}
          onNavigateStore={() => setCurrentView('store')}
          onNavigateAdmin={() => setCurrentView('admin')}
          onLogout={handleLogout}
        />
      )}

      {/* Admin Dashboard Screen */}
      {currentView === 'admin' && (
        <AdminDashboard
          currentUser={currentUser}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          products={products}
          categories={categories}
          settings={settings}
          onRefreshProducts={fetchData}
          onNavigatePos={() => setCurrentView('pos')}
          onNavigateStore={() => setCurrentView('store')}
        />
      )}

      {/* Staff & Admin Security Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => {
          setIsLoginModalOpen(false);
          setLoginTargetView(null);
        }}
        onLoginSuccess={(user) => {
          handleLoginSuccess(user);
          setIsLoginModalOpen(false);
          if (loginTargetView) {
            setCurrentView(loginTargetView);
            setLoginTargetView(null);
          }
        }}
        settings={settings}
        targetView={loginTargetView}
      />

      {/* About Modal (Screenshot 6 details) */}
      <AboutModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        settings={settings}
        language={language}
      />

      {/* Safety Tips Modal */}
      <SafetyTipsModal
        isOpen={isSafetyTipsOpen}
        onClose={() => setIsSafetyTipsOpen(false)}
        language={language}
      />

      {/* Contact Modal */}
      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
        settings={settings}
        language={language}
      />

      {/* Slide-out Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cart}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onCheckout={handleOpenCheckout}
        settings={settings}
      />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        settings={settings}
        language={language}
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Order Success Modal */}
      <OrderSuccessModal
        isOpen={!!orderSuccessInvoice}
        onClose={() => setOrderSuccessInvoice(null)}
        invoice={orderSuccessInvoice}
        whatsappMessage={orderSuccessWhatsappMsg}
        whatsappStatus={orderSuccessWhatsappStatus}
        onViewDetails={(inv) => {
          setOrderSuccessInvoice(null);
          setViewInvoiceModal(inv);
        }}
        settings={settings}
      />

      {/* Customer Self-Service Bills Lookup Modal */}
      <CustomerBillsModal
        isOpen={isCustomerBillsOpen}
        onClose={() => setIsCustomerBillsOpen(false)}
        onSelectInvoice={(inv) => setViewInvoiceModal(inv)}
        settings={settings}
      />

      {/* Detailed Invoice Modal */}
      <InvoiceDetailModal
        invoice={viewInvoiceModal}
        onClose={() => setViewInvoiceModal(null)}
        settings={settings}
        isAdmin={Boolean(currentUser && (currentUser.role === 'OWNER' || currentUser.role === 'WORKER'))}
        onInvoiceDeleted={() => {
          fetchData();
        }}
      />
    </div>
  );
}
