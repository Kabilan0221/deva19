import React, { useState, useEffect } from 'react';
import {
  Product,
  Category,
  Invoice,
  StoreSettings,
  StockTransaction,
  UserSummary,
  ActivityLog,
  WhatsAppLog,
  Customer,
  DashboardMetrics,
  WorkerReportItem,
  PaymentReportItem,
  BannerItem,
} from '../types';
import { apiRequest, setAuthSession } from '../utils/api';
import { printThermalReceipt } from '../utils/thermalPrinter';
import { downloadInvoicePDF } from '../utils/pdfGenerator';
import { sendInvoiceViaWhatsApp } from '../utils/whatsappHelper';
import { InvoiceDetailModal } from './InvoiceDetailModal';
import { BrandLogo } from './BrandLogo';
import {
  LayoutDashboard,
  TrendingUp,
  Package,
  Boxes,
  Users,
  UserCheck,
  KeyRound,
  MessageSquare,
  History,
  Settings,
  Server,
  Plus,
  Edit2,
  Trash2,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  LogOut,
  Calendar,
  Clock,
  IndianRupee,
  Receipt,
  Eye,
  FileSpreadsheet,
  Lock,
  Flame,
  Layers,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  ShoppingCart,
  Store,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
  EyeOff,
} from 'lucide-react';

interface AdminDashboardProps {
  currentUser: any;
  onLoginSuccess: (user: any, token: string) => void;
  onLogout: () => void;
  products: Product[];
  categories: Category[];
  settings?: StoreSettings | null;
  onRefreshProducts: () => void;
  onNavigatePos?: () => void;
  onNavigateStore?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  currentUser,
  onLoginSuccess,
  onLogout,
  products,
  categories,
  settings,
  onRefreshProducts,
  onNavigatePos,
  onNavigateStore,
}) => {
  // Navigation tab
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'track_bills'
    | 'sales'
    | 'workers'
    | 'products'
    | 'categories'
    | 'stock'
    | 'banners'
    | 'store_settings'
    | 'customers'
    | 'users'
    | 'security'
    | 'whatsapp'
    | 'activity'
    | 'architecture'
  >('overview');

  // Banner State Management (Owner editable moving banners)
  const [bannersList, setBannersList] = useState<BannerItem[]>(settings?.banners || []);
  const [showAddBannerModal, setShowAddBannerModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerItem | null>(null);
  const [bannerFormTitle, setBannerFormTitle] = useState('');
  const [bannerFormSubtitle, setBannerFormSubtitle] = useState('');
  const [bannerFormTag, setBannerFormTag] = useState('');
  const [bannerFormImage, setBannerFormImage] = useState('');
  const [bannerFormBtnText, setBannerFormBtnText] = useState('');

  // Keep banners in sync when settings prop updates
  useEffect(() => {
    if (settings?.banners && Array.isArray(settings.banners)) {
      setBannersList(settings.banners);
    }
  }, [settings]);

  // Store Settings (Owner editable — Minimum Order Amount & Free Delivery Threshold)
  const [minOrderValueInput, setMinOrderValueInput] = useState<string>(
    String(settings?.min_order_value ?? 500)
  );
  const [freeDeliveryAboveInput, setFreeDeliveryAboveInput] = useState<string>(
    String(settings?.free_delivery_above ?? 0)
  );
  const STATE_MIN_ORDER_LIST = ['Tamil Nadu', 'Karnataka', 'Andhra Pradesh', 'Telangana'];
  const [minOrderByStateInput, setMinOrderByStateInput] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    STATE_MIN_ORDER_LIST.forEach((st) => {
      initial[st] = String(settings?.min_order_by_state?.[st] ?? '');
    });
    return initial;
  });

  // Keep the store settings form in sync when settings prop updates
  useEffect(() => {
    if (settings) {
      setMinOrderValueInput(String(settings.min_order_value ?? 500));
      setFreeDeliveryAboveInput(String(settings.free_delivery_above ?? 0));
      setMinOrderByStateInput((prev) => {
        const next: Record<string, string> = { ...prev };
        STATE_MIN_ORDER_LIST.forEach((st) => {
          next[st] = String(settings.min_order_by_state?.[st] ?? prev[st] ?? '');
        });
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const minOrderValue = parseFloat(minOrderValueInput);
    const freeDeliveryAbove = parseFloat(freeDeliveryAboveInput);

    if (isNaN(minOrderValue) || minOrderValue < 0) {
      setActionError('Please enter a valid Minimum Order Amount (0 or more).');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
    if (isNaN(freeDeliveryAbove) || freeDeliveryAbove < 0) {
      setActionError('Please enter a valid Free Delivery threshold (0 or more).');
      setTimeout(() => setActionError(null), 3000);
      return;
    }

    const minOrderByState: Record<string, number> = {};
    for (const st of STATE_MIN_ORDER_LIST) {
      const raw = minOrderByStateInput[st];
      if (raw === undefined || raw === '') continue;
      const val = parseFloat(raw);
      if (isNaN(val) || val < 0) {
        setActionError(`Please enter a valid Minimum Order Amount for ${st} (0 or more).`);
        setTimeout(() => setActionError(null), 3000);
        return;
      }
      minOrderByState[st] = val;
    }

    try {
      setLoading(true);
      const res = await apiRequest<any>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({
          min_order_value: minOrderValue,
          min_order_by_state: minOrderByState,
          free_delivery_above: freeDeliveryAbove,
        }),
      });
      if (res) {
        setActionSuccess('Store settings updated! குறைந்தபட்ச ஆர்டர் தொகை புதுப்பிக்கப்பட்டது.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update store settings');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Login form state (if not logged in)
  const [adminLoginMode, setAdminLoginMode] = useState<'login' | 'forgot'>('login');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginSuccessMsg, setLoginSuccessMsg] = useState<string | null>(null);

  // Forgot Password States in Admin Dashboard (Recovery Key based — no OTP/SMS)
  const [adminForgotIdentifier, setAdminForgotIdentifier] = useState('owner');
  const [adminRecoveryKey, setAdminRecoveryKey] = useState('');
  const [showAdminRecoveryKey, setShowAdminRecoveryKey] = useState(false);
  const [adminNewPassword, setAdminNewPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [showAdminNewPassword, setShowAdminNewPassword] = useState(false);

  // Data states
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [salesInvoices, setSalesInvoices] = useState<Invoice[]>([]);
  const [trackBillsList, setTrackBillsList] = useState<Invoice[]>([]);
  const [trackBillSearch, setTrackBillSearch] = useState('');
  const [trackBillPayment, setTrackBillPayment] = useState<string>('all');
  const [workerReports, setWorkerReports] = useState<WorkerReportItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | 'all'>('all');
  const [stockLogs, setStockLogs] = useState<StockTransaction[]>([]);
  const [userList, setUserList] = useState<UserSummary[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [whatsappLogs, setWhatsappLogs] = useState<WhatsAppLog[]>([]);

  // Filtering states for sales
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'week' | 'month' | 'custom'>('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workerFilter, setWorkerFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  // Sales Report state
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [itemBreakdown, setItemBreakdown] = useState<any[]>([]);
  const [salesViewMode, setSalesViewMode] = useState<'invoices' | 'items'>('invoices');

  // Product Add / Edit modal states
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodFormName, setProdFormName] = useState('');
  const [prodFormCode, setProdFormCode] = useState('');
  const [prodFormBarcode, setProdFormBarcode] = useState('');
  const [prodFormCategory, setProdFormCategory] = useState<number>(categories[0]?.id || 1);
  const [prodFormContent, setProdFormContent] = useState('1 Box');
  const [prodFormMrp, setProdFormMrp] = useState<number | string>(200);
  const [prodFormDiscount, setProdFormDiscount] = useState<number | string>(65);
  const [prodFormSellingPrice, setProdFormSellingPrice] = useState<number | string>(70);
  const [prodFormStock, setProdFormStock] = useState<number | string>(100);
  const [prodFormMinStock, setProdFormMinStock] = useState<number | string>(20);
  const [prodFormImageUrl, setProdFormImageUrl] = useState('');
  const [prodFormDescription, setProdFormDescription] = useState('');
  const [prodFilterCategory, setProdFilterCategory] = useState<number | 'all'>('all');
  const [prodFilterSearch, setProdFilterSearch] = useState('');

  // Category Add / Edit modal states
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormName, setCatFormName] = useState('');
  const [catFormSlug, setCatFormSlug] = useState('');
  const [catFormDescription, setCatFormDescription] = useState('');
  const [catFormImageUrl, setCatFormImageUrl] = useState('');
  const [catFormOrder, setCatFormOrder] = useState<number | string>(1);

  // In-App Delete Confirmation Modal State
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    message: string;
    onConfirm: () => Promise<void>;
  } | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Stock Modal
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [selectedStockProduct, setSelectedStockProduct] = useState<Product | null>(null);
  const [stockAddQty, setStockAddQty] = useState(50);
  const [stockAddNotes, setStockAddNotes] = useState('Fresh Sivakasi Factory Arrival');

  // User Add / Reset Password Modal
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [newWorkerName, setNewWorkerName] = useState('');
  const [newWorkerUsername, setNewWorkerUsername] = useState('');
  const [newWorkerPassword, setNewWorkerPassword] = useState('');
  const [newWorkerMobile, setNewWorkerMobile] = useState('');
  const [newWorkerRole, setNewWorkerRole] = useState<'WORKER' | 'OWNER'>('WORKER');

  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserSummary | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');

  // General state
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [viewInvoiceModal, setViewInvoiceModal] = useState<Invoice | null>(null);

  // Initial load & Tab changes
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, activeTab, dateFilter, startDate, endDate, workerFilter, paymentFilter]);

  const loadDashboardData = async (isManual = false) => {
    try {
      if (isManual) {
        setIsRefreshing(true);
        if (onRefreshProducts) {
          onRefreshProducts();
        }
      } else {
        setLoading(true);
      }

      if (activeTab === 'overview') {
        const [m, invoicesRes] = await Promise.all([
          apiRequest<any>('/api/dashboard/metrics'),
          apiRequest<Invoice[]>('/api/invoices?limit=50'),
        ]);
        if (m) setMetrics(m);
        if (invoicesRes) setTrackBillsList(invoicesRes);
      } else if (activeTab === 'track_bills') {
        const data = await apiRequest<Invoice[]>('/api/invoices?limit=250');
        if (data) setTrackBillsList(data);
      } else if (activeTab === 'sales') {
        let url = `/api/reports/sales?period=${dateFilter}`;
        if (dateFilter === 'custom' && startDate && endDate) {
          url += `&start=${startDate}&end=${endDate}`;
        }
        if (workerFilter && workerFilter !== 'all') url += `&worker_id=${workerFilter}`;
        if (paymentFilter && paymentFilter !== 'all') url += `&payment_mode=${paymentFilter}`;
        const data = await apiRequest<any>(url);
        if (data) {
          setSalesInvoices(data.invoices || []);
          setSalesSummary(data.summary || null);
          setItemBreakdown(data.item_breakdown || []);
        }
      } else if (activeTab === 'workers') {
        const data = await apiRequest<any>('/api/reports/workers');
        if (data) {
          setWorkerReports(Array.isArray(data) ? data : data.workers || []);
        }
      } else if (activeTab === 'stock') {
        const logs = await apiRequest<any>('/api/stock/logs');
        setStockLogs(logs || []);
      } else if (activeTab === 'customers') {
        const data = await apiRequest<any>('/api/customers');
        setCustomers(data || []);
      } else if (activeTab === 'users') {
        const users = await apiRequest<any>('/api/users');
        setUserList(users || []);
      } else if (activeTab === 'activity') {
        const act = await apiRequest<any>('/api/logs/activity');
        setActivityLogs(act || []);
      } else if (activeTab === 'whatsapp') {
        const wa = await apiRequest<any>('/api/logs/whatsapp');
        setWhatsappLogs(wa || []);
      }

      if (isManual) {
        setActionSuccess('Dashboard and live inventory refreshed successfully.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      console.warn('Dashboard data fetch notification:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccessMsg(null);
    try {
      setLoginLoading(true);
      const res = await apiRequest<any>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword.trim() }),
      });
      if (res && res.token && res.user) {
        setAuthSession(res.token, res.user);
        onLoginSuccess(res.user, res.token);
      } else {
        setLoginError(res?.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Forgot password: Recovery Key reset (no OTP/SMS involved at all)
  const handleAdminRecoveryKeyReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginSuccessMsg(null);

    if (adminNewPassword.length < 6) {
      setLoginError('New password must be at least 6 characters long.');
      return;
    }

    if (adminNewPassword !== adminConfirmPassword) {
      setLoginError('Passwords do not match. Please enter the same password in both fields.');
      return;
    }

    if (!adminRecoveryKey.trim()) {
      setLoginError('Please enter the Recovery Key.');
      return;
    }

    setLoginLoading(true);

    try {
      const res = await apiRequest<{
        success: boolean;
        message: string;
        token: string;
        user: any;
      }>('/api/auth/forgot-password/recovery-key-reset', {
        method: 'POST',
        body: JSON.stringify({
          identifier: adminForgotIdentifier.trim(),
          recovery_key: adminRecoveryKey.trim(),
          new_password: adminNewPassword,
        }),
      });

      if (res && res.success && res.token) {
        setLoginSuccessMsg('Password reset successfully! Logging in...');
        setAuthSession(res.token, res.user);
        setTimeout(() => {
          onLoginSuccess(res.user, res.token);
        }, 1000);
      }
    } catch (err: any) {
      setLoginError(err.message || 'Password reset failed. Please check the Recovery Key and try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const resetAdminForgotState = () => {
    setAdminLoginMode('login');
    setLoginError(null);
    setLoginSuccessMsg(null);
    setAdminRecoveryKey('');
    setAdminNewPassword('');
    setAdminConfirmPassword('');
  };

  // Product Add / Edit Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: prodFormName,
        code: prodFormCode,
        barcode: prodFormBarcode || prodFormCode,
        category_id: Number(prodFormCategory),
        content: prodFormContent,
        mrp: Number(prodFormMrp),
        discount_percentage: Number(prodFormDiscount),
        selling_price: Number(prodFormSellingPrice),
        stock_quantity: Number(prodFormStock),
        min_stock_alert: Number(prodFormMinStock),
        image_url:
          prodFormImageUrl ||
          'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
        description: prodFormDescription || '',
      };

      let res: any;
      if (editingProduct) {
        res = await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res && res.success) {
        setActionSuccess(
          editingProduct ? `Product "${prodFormName}" updated successfully!` : `Product "${prodFormName}" saved successfully!`
        );
        setShowAddProductModal(false);
        setEditingProduct(null);
        onRefreshProducts();
        loadDashboardData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to save product');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Product Delete Handler
  const handleDeleteProduct = (prod: Product) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Delete Cracker Product / பட்டாசு நீக்கு',
      itemName: prod.name,
      message: `Are you sure you want to permanently delete "${prod.name}" (Code: ${prod.code})? This will immediately remove it from the catalog and price list.`,
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          const res = await apiRequest<any>(`/api/products/${prod.id}`, { method: 'DELETE' });
          if (res && res.success) {
            setActionSuccess(`Product "${prod.name}" deleted successfully.`);
            onRefreshProducts();
            loadDashboardData();
            setTimeout(() => setActionSuccess(null), 3000);
          } else {
            setActionError(res?.error || 'Failed to delete product');
            setTimeout(() => setActionError(null), 3000);
          }
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete product');
          setTimeout(() => setActionError(null), 3000);
        } finally {
          setIsDeletingItem(false);
          setDeleteConfirmModal(null);
        }
      },
    });
  };

  // Category Add / Edit Handler
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        name: catFormName,
        slug: catFormSlug || catFormName.toLowerCase().replace(/\s+/g, '-'),
        description: catFormDescription,
        image_url:
          catFormImageUrl ||
          'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=400&q=80',
        display_order: Number(catFormOrder) || 1,
      };

      let res: any;
      if (editingCategory) {
        res = await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      if (res && res.success) {
        setActionSuccess(
          editingCategory ? `Category "${catFormName}" updated!` : `Category "${catFormName}" created!`
        );
        setShowAddCategoryModal(false);
        setEditingCategory(null);
        onRefreshProducts();
        loadDashboardData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to save category');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Category Delete Handler
  const handleDeleteCategory = (cat: Category) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Delete Category / வகை நீக்கு',
      itemName: cat.name,
      message: `Are you sure you want to delete category "${cat.name}"? Products inside must be reassigned.`,
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          const res = await apiRequest<any>(`/api/categories/${cat.id}`, { method: 'DELETE' });
          if (res && res.success) {
            setActionSuccess(`Category "${cat.name}" deleted.`);
            onRefreshProducts();
            loadDashboardData();
            setTimeout(() => setActionSuccess(null), 3000);
          } else {
            setActionError(res?.error || 'Failed to delete category');
            setTimeout(() => setActionError(null), 3000);
          }
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete category');
          setTimeout(() => setActionError(null), 3000);
        } finally {
          setIsDeletingItem(false);
          setDeleteConfirmModal(null);
        }
      },
    });
  };

  // Add Stock Handler
  const handleAddStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockProduct || stockAddQty <= 0) return;
    try {
      const res = await apiRequest<any>(`/api/products/${selectedStockProduct.id}/stock`, {
        method: 'POST',
        body: JSON.stringify({ quantity: Number(stockAddQty), notes: stockAddNotes }),
      });
      if (res && res.success) {
        setActionSuccess(`Successfully added ${stockAddQty} units to ${selectedStockProduct.name}`);
        setShowAddStockModal(false);
        onRefreshProducts();
        loadDashboardData();
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message);
      setTimeout(() => setActionError(null), 3000);
    }
  };

  // Add User Handler
  const handleAddWorkerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest<any>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: newWorkerName,
          username: newWorkerUsername,
          password: newWorkerPassword,
          role: newWorkerRole,
          mobile: newWorkerMobile,
        }),
      });
      if (res && res.success) {
        // Optimistically add the new user to the visible list immediately
        // instead of waiting on a full dashboard refetch — the modal now
        // closes and the new user shows up right away.
        setUserList((prev) => [
          ...prev,
          {
            id: res.id,
            name: res.name,
            username: res.username,
            role: res.role,
            status: res.status,
            mobile: res.mobile,
            email: res.email,
          },
        ]);
        setActionSuccess(`User ${newWorkerName} created successfully.`);
        setShowAddWorkerModal(false);
        setNewWorkerName('');
        setNewWorkerUsername('');
        setNewWorkerPassword('');
        setNewWorkerMobile('');
        setTimeout(() => setActionSuccess(null), 3000);
        // Best-effort background refresh to reconcile with the server
        // (does not block the UI update above).
        loadDashboardData();
      } else {
        setActionError(res?.error || 'Could not create user. Please try again.');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message);
      setTimeout(() => setActionError(null), 3000);
    }
  };

  // Delete User handler
  const handleDeleteUser = (userId: number, userName: string) => {
    if (userId === 1) {
      setActionError('Primary Owner account cannot be deleted.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Delete Staff / User Account',
      itemName: userName,
      message: `Are you sure you want to delete user account "${userName}"? This worker will no longer be able to log in to POS.`,
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          const res = await apiRequest<any>(`/api/users/${userId}`, { method: 'DELETE' });
          if (res && res.success) {
            setActionSuccess(`User ${userName} deleted successfully`);
            setTimeout(() => setActionSuccess(null), 3000);
            loadDashboardData();
          } else {
            setActionError(res?.error || 'Failed to delete user');
            setTimeout(() => setActionError(null), 3000);
          }
        } catch (err: any) {
          setActionError(err.message || 'Error deleting user');
          setTimeout(() => setActionError(null), 3000);
        } finally {
          setIsDeletingItem(false);
          setDeleteConfirmModal(null);
        }
      },
    });
  };

  // Reset Password handler
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !resetPasswordVal.trim()) return;
    try {
      setLoading(true);
      const res = await apiRequest<any>(`/api/users/${resetTargetUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ new_password: resetPasswordVal.trim() }),
      });
      if (res && res.success) {
        setActionSuccess(`Password reset successfully for ${resetTargetUser.name}`);
        setTimeout(() => setActionSuccess(null), 3000);
        setShowResetPasswordModal(false);
        setResetTargetUser(null);
        setResetPasswordVal('');
      } else {
        setActionError(res?.error || 'Failed to reset password');
        setTimeout(() => setActionError(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Error resetting password');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Save Banner Handler
  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerFormTitle.trim() || !bannerFormImage.trim()) {
      setActionError('Please provide banner title and image.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
    try {
      setLoading(true);
      let updatedBanners: BannerItem[] = [];
      if (editingBanner) {
        updatedBanners = bannersList.map((b) =>
          b.id === editingBanner.id
            ? {
                ...b,
                title: bannerFormTitle.trim(),
                subtitle: bannerFormSubtitle.trim(),
                tag: bannerFormTag.trim(),
                image_url: bannerFormImage.trim(),
                button_text: bannerFormBtnText.trim() || 'ஆர்டர் செய்க / Buy Now',
              }
            : b
        );
      } else {
        const newBanner: BannerItem = {
          id: `banner-${Date.now()}`,
          title: bannerFormTitle.trim(),
          subtitle: bannerFormSubtitle.trim(),
          tag: bannerFormTag.trim(),
          image_url: bannerFormImage.trim(),
          button_text: bannerFormBtnText.trim() || 'ஆர்டர் செய்க / Buy Now',
          button_link: '#price-list-section',
          is_active: true,
          display_order: bannersList.length + 1,
        };
        updatedBanners = [...bannersList, newBanner];
      }

      const res = await apiRequest<any>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ banners: updatedBanners }),
      });

      if (res) {
        setBannersList(updatedBanners);
        setShowAddBannerModal(false);
        setEditingBanner(null);
        setBannerFormTitle('');
        setBannerFormSubtitle('');
        setBannerFormTag('');
        setBannerFormImage('');
        setBannerFormBtnText('');
        setActionSuccess('Banner updated successfully! முகப்பு பேனர் மாற்றப்பட்டது.');
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update banner');
      setTimeout(() => setActionError(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Delete Banner
  const handleDeleteBanner = (bannerId: string) => {
    setDeleteConfirmModal({
      isOpen: true,
      title: 'Remove Slider Banner',
      itemName: 'Banner Slide',
      message: 'Are you sure you want to remove this banner from home slider?',
      onConfirm: async () => {
        setIsDeletingItem(true);
        try {
          const updatedBanners = bannersList.filter((b) => b.id !== bannerId);
          const res = await apiRequest<any>('/api/settings', {
            method: 'PUT',
            body: JSON.stringify({ banners: updatedBanners }),
          });
          if (res) {
            setBannersList(updatedBanners);
            setActionSuccess('Banner deleted successfully.');
            setTimeout(() => setActionSuccess(null), 3000);
          }
        } catch (err: any) {
          setActionError(err.message || 'Failed to delete banner');
          setTimeout(() => setActionError(null), 3000);
        } finally {
          setIsDeletingItem(false);
          setDeleteConfirmModal(null);
        }
      },
    });
  };

  // Toggle Banner Active
  const handleToggleBanner = async (bannerId: string) => {
    try {
      const updatedBanners = bannersList.map((b) =>
        b.id === bannerId ? { ...b, is_active: !b.is_active } : b
      );
      const res = await apiRequest<any>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify({ banners: updatedBanners }),
      });
      if (res) {
        setBannersList(updatedBanners);
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to update banner status');
      setTimeout(() => setActionError(null), 3000);
    }
  };

  // Export Sales CSV
  const handleExportSalesCSV = () => {
    if (salesInvoices.length === 0) {
      setActionError('No sales data to export in the selected period.');
      setTimeout(() => setActionError(null), 3000);
      return;
    }
    const headers = ['Invoice No', 'Date', 'Customer Name', 'Mobile', 'Payment Mode', 'Items Count', 'Total MRP', 'Discount', 'Grand Total', 'Billed By'];
    const rows = salesInvoices.map((inv) => [
      inv.invoice_number,
      new Date(inv.created_at).toLocaleString('en-IN'),
      `"${inv.customer_name}"`,
      inv.customer_mobile,
      inv.payment_mode,
      inv.items.reduce((s, it) => s + it.quantity, 0),
      inv.subtotal,
      inv.discount,
      inv.grand_total,
      `"${inv.worker_name || 'Owner'}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Devaraj_Sales_Report_${dateFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user is not logged in, render authentication page
  if (!currentUser) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-red-100 shadow-xl">
          {adminLoginMode === 'login' ? (
            <>
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 shadow-inner">
                  <Lock className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 font-['Outfit',sans-serif]">
                  Admin & Staff Portal Login
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  தேவராஜ் பட்டாசு கடை நிர்வாகி மற்றும் பணியாளர் உள்நுழைவு
                </p>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{loginSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Username / பயனர் பெயர்
                  </label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    placeholder=""
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-gray-700 uppercase">
                      Password / கடவுச்சொல்
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setAdminLoginMode('forgot');
                        setLoginError(null);
                        setLoginSuccessMsg(null);
                        if (loginUsername) setAdminForgotIdentifier(loginUsername);
                      }}
                      className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showAdminPassword ? 'text' : 'password'}
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder=""
                      required
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loginLoading ? 'Authenticating...' : 'Sign In to Portal'}
                </button>
              </form>

              {/* Quick Demo Credentials */}
              <div className="mt-6 pt-5 border-t border-gray-200">
                <div className="text-[11px] font-bold text-gray-400 uppercase text-center mb-2.5">
                  Quick One-Click Demo Credentials:
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('owner');
                      setLoginPassword('devaraj@123');
                    }}
                    className="p-2.5 bg-red-50 hover:bg-red-100 text-red-900 rounded-xl font-bold text-left border border-red-200 transition-colors cursor-pointer"
                  >
                    <div className="text-red-700 text-[10px] font-black">👑 OWNER ROLE</div>
                    <div>User: owner</div>
                    <div className="text-[10px] text-gray-500">Pass: devaraj@123</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setLoginUsername('worker1');
                      setLoginPassword('worker@123');
                    }}
                    className="p-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl font-bold text-left border border-amber-200 transition-colors cursor-pointer"
                  >
                    <div className="text-amber-700 text-[10px] font-black">⚡ WORKER POS</div>
                    <div>User: worker1</div>
                    <div className="text-[10px] text-gray-500">Pass: worker@123</div>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Forgot Password Workflow */
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={resetAdminForgotState}
                  className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h3 className="font-extrabold text-lg text-gray-900 font-['Outfit',sans-serif]">
                    Reset Password
                  </h3>
                  <p className="text-xs text-gray-500">கடவுச்சொல் மீட்டமைப்பு</p>
                </div>
              </div>

              {loginError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {loginSuccessMsg && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{loginSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleAdminRecoveryKeyReset} className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs text-emerald-950 space-y-1">
                  <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Instant Reset with Recovery Key
                  </p>
                  <p className="text-gray-600">
                    No OTP or SMS needed. Enter the secret <strong>Recovery Key</strong> (set as <code className="bg-white px-1 rounded border border-emerald-200">ADMIN_RECOVERY_KEY</code> on the server) to reset the password directly.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Username or Mobile / பயனர் பெயர் அல்லது கைபேசி
                  </label>
                  <input
                    type="text"
                    value={adminForgotIdentifier}
                    onChange={(e) => setAdminForgotIdentifier(e.target.value)}
                    placeholder=""
                    required
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminForgotIdentifier('owner')}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors border ${
                      adminForgotIdentifier === 'owner' || adminForgotIdentifier === 'admin'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    👑 Owner (owner)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdminForgotIdentifier('8870929100')}
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors border ${
                      adminForgotIdentifier === '8870929100'
                        ? 'bg-emerald-700 text-white border-emerald-800 shadow-xs'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}
                  >
                    📱 98947 77176
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Recovery Key
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminRecoveryKey ? 'text' : 'password'}
                      value={adminRecoveryKey}
                      onChange={(e) => setAdminRecoveryKey(e.target.value)}
                      placeholder="Enter the secret recovery key"
                      required
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminRecoveryKey(!showAdminRecoveryKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showAdminRecoveryKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    New Password / புதிய கடவுச்சொல்
                  </label>
                  <div className="relative">
                    <input
                      type={showAdminNewPassword ? 'text' : 'password'}
                      value={adminNewPassword}
                      onChange={(e) => setAdminNewPassword(e.target.value)}
                      placeholder=""
                      required
                      minLength={6}
                      className="w-full px-3.5 py-2.5 pr-10 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAdminNewPassword(!showAdminNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      {showAdminNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Confirm New Password / கடவுச்சொல்லை உறுதிசெய்
                  </label>
                  <input
                    type="password"
                    value={adminConfirmPassword}
                    onChange={(e) => setAdminConfirmPassword(e.target.value)}
                    placeholder=""
                    required
                    minLength={6}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  {loginLoading ? 'Updating...' : 'Reset Password & Sign In'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isOwner = currentUser.role === 'OWNER';

  // Filter products for product management tab
  const filteredAdminProducts = products.filter((p) => {
    const matchCat = prodFilterCategory === 'all' || p.category_id === prodFilterCategory;
    const matchSearch =
      !prodFilterSearch.trim() ||
      p.name.toLowerCase().includes(prodFilterSearch.toLowerCase()) ||
      p.code.toLowerCase().includes(prodFilterSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // Selected Worker in Staff Sales
  const activeWorkerReport =
    selectedWorkerId === 'all'
      ? null
      : workerReports.find((w) => String(w.worker_id) === String(selectedWorkerId));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      {/* 1. MOBILE RESPONSIVE TOP NAV */}
      <header className="md:hidden bg-slate-900 text-white p-3 sticky top-0 z-40 border-b border-slate-800 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-bold text-sm">
              {currentUser.role === 'OWNER' ? '👑' : '⚡'}
            </div>
            <div>
              <div className="font-bold text-xs text-white leading-tight">{currentUser.name}</div>
              <div className="text-[9px] text-amber-400 font-extrabold uppercase">
                {currentUser.role} PORTAL
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-red-400 bg-red-950/50 hover:bg-red-900/60 rounded-lg font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>

        {/* Mobile Horizontal Pill Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {onNavigatePos && (
            <button
              onClick={onNavigatePos}
              className="px-2.5 py-1.5 rounded-lg whitespace-nowrap font-black flex items-center gap-1 bg-amber-500 text-slate-950 shadow-xs cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Desk</span>
            </button>
          )}

          {onNavigateStore && (
            <button
              onClick={onNavigateStore}
              className="px-2.5 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1 bg-slate-800 text-amber-300 border border-slate-700 cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Store Front</span>
            </button>
          )}

          {isOwner && (
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'overview' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Overview</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'sales' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isOwner ? 'Sales Report' : 'My Sales Report'}</span>
          </button>

          <button
            onClick={() => setActiveTab('track_bills')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'track_bills' ? 'bg-amber-600 text-white shadow-xs font-black' : 'bg-slate-800 text-amber-300'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Track Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'products' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products</span>
          </button>

          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'categories' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Categories</span>
          </button>

          <button
            onClick={() => setActiveTab('stock')}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'stock' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
            }`}
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Stock</span>
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => setActiveTab('banners')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'banners' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800 text-amber-300'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Home Banners</span>
              </button>

              <button
                onClick={() => setActiveTab('store_settings')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'store_settings' ? 'bg-amber-600 text-white shadow-xs' : 'bg-slate-800 text-amber-300'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Store Settings</span>
              </button>

              <button
                onClick={() => setActiveTab('workers')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'workers' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Staff Sales</span>
              </button>

              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'users' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users</span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'customers' ? 'bg-red-700 text-white shadow-xs' : 'bg-slate-800 text-slate-300'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Customers</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* 2. DESKTOP SIDEBAR NAVIGATION */}
      <aside className="hidden md:flex md:w-64 bg-slate-900 text-white shrink-0 p-4 flex-col justify-between min-h-screen sticky top-0">
        <div>
          {/* Brand & User badge */}
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800 mb-4">
            <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center font-bold">
              {currentUser.role === 'OWNER' ? '👑' : '⚡'}
            </div>
            <div>
              <div className="font-bold text-sm text-white line-clamp-1">{currentUser.name}</div>
              <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider">
                {currentUser.role} ACCESS
              </div>
            </div>
          </div>

          {/* Quick POS & Store Switcher */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {onNavigatePos && (
              <button
                onClick={onNavigatePos}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-[11px] shadow-sm cursor-pointer transition-all"
                title="Open POS Billing Counter"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>POS Counter</span>
              </button>
            )}
            {onNavigateStore && (
              <button
                onClick={onNavigateStore}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl text-[11px] border border-slate-700 cursor-pointer transition-colors"
                title="Open Online Store Front"
              >
                <Store className="w-3.5 h-3.5 text-amber-400" />
                <span>Store Front</span>
              </button>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            {isOwner && (
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  activeTab === 'overview' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Dashboard Overview</span>
              </button>
            )}

            <button
              onClick={() => setActiveTab('sales')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'sales' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>{isOwner ? 'Sales Reports & Audit' : 'My Sales Report'}</span>
            </button>

            <button
              onClick={() => setActiveTab('track_bills')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'track_bills' ? 'bg-amber-600 text-white font-black' : 'text-amber-300 hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4 text-amber-400" />
              <span>Track Bill & Download</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'products' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Product Management</span>
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'categories' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Category Management</span>
            </button>

            <button
              onClick={() => setActiveTab('stock')}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                activeTab === 'stock' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Boxes className="w-4 h-4" />
              <span>Stock & Inward Logistics</span>
            </button>

            {isOwner && (
              <>
                <button
                  onClick={() => setActiveTab('banners')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'banners' ? 'bg-amber-600 text-white font-bold' : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <ImageIcon className="w-4 h-4 text-amber-400" />
                  <span>Home Banner Slider (பேனர்கள்)</span>
                </button>

                <button
                  onClick={() => setActiveTab('store_settings')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'store_settings' ? 'bg-amber-600 text-white font-bold' : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Settings className="w-4 h-4 text-amber-400" />
                  <span>Store Settings (குறைந்தபட்ச ஆர்டர்)</span>
                </button>

                <button
                  onClick={() => setActiveTab('workers')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'workers' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Staff Sales & Single User Report</span>
                </button>

                <button
                  onClick={() => setActiveTab('customers')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'customers' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Customer Database</span>
                </button>

                <button
                  onClick={() => setActiveTab('users')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'users' ? 'bg-red-700 text-white font-bold' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>User Accounts & Roles</span>
                </button>

                <button
                  onClick={() => setActiveTab('architecture')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                    activeTab === 'architecture' ? 'bg-amber-600 text-white font-bold' : 'text-amber-400 hover:bg-slate-800'
                  }`}
                >
                  <Server className="w-4 h-4" />
                  <span>PHP 8.3 & MySQL Specs</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Logout */}
        <div className="pt-4 border-t border-slate-800 mt-4">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 rounded-xl transition-colors font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out ({currentUser.username})</span>
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto max-w-7xl">
        {/* Banner Alert Feedback */}
        {actionSuccess && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4" />
            <span>{actionSuccess}</span>
          </div>
        )}
        {actionError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4" />
            <span>{actionError}</span>
          </div>
        )}

        {/* 1. OVERVIEW METRICS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Business Overview & Live Dashboard
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Real-time sales, active stock, worker counters, and inventory health.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => loadDashboardData(true)}
                  disabled={isRefreshing || loading}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-red-600' : ''}`} />
                  <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-red-100 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Today's Sales (இன்று)</span>
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                </div>
                <div className="text-2xl font-black text-red-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.today_sales ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-gray-400 mt-1">
                  {metrics?.today_bills ?? 0} Invoices Billed Today
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Yesterday's Sales (நேற்று)</span>
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-2xl font-black text-amber-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.yesterday_sales ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">
                  {metrics?.yesterday_bills ?? 0} Invoices Billed Yesterday
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-100 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>This Month Sales (இந்த மாதம்)</span>
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="text-2xl font-black text-blue-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.this_month_sales ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-blue-600 mt-1">
                  {metrics?.this_month_bills ?? 0} Invoices This Month
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-xs">
                <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Total Overall Sales</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.total_sales ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-emerald-600 mt-1">
                  {metrics?.total_bills ?? 0} Total Orders
                </div>
              </div>
            </div>

            {/* Inventory Health & Counter Status */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-purple-100 shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Hand Cash Collection</div>
                <div className="text-xl font-black text-purple-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.hand_cash ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-purple-600 mt-1">Counter Cash In Hand</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">UPI & Digital Total</div>
                <div className="text-xl font-black text-indigo-700 mt-1 font-['Outfit',sans-serif]">
                  ₹{(metrics?.online_sales ?? 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[11px] text-indigo-600 mt-1">GPay, PhonePe, Cards</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-amber-100 shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Low Stock Alerts</div>
                <div className="text-xl font-black text-amber-700 mt-1 font-['Outfit',sans-serif]">
                  {metrics?.low_stock ?? metrics?.low_stock_items ?? 0} Items
                </div>
                <div className="text-[11px] text-amber-600 mt-1">Stock below 20 boxes</div>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-gray-500 uppercase">Total Catalog Items</div>
                <div className="text-xl font-black text-slate-800 mt-1 font-['Outfit',sans-serif]">
                  {products.length} Products
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Across {categories.length} Categories
                </div>
              </div>
            </div>

            {/* Quick Actions Shortcuts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h3 className="font-bold text-sm text-gray-900 mb-2">Add New Product</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Add new Sivakasi crackers with MRP, discount %, selling price, and photos.
                </p>
                <button
                  onClick={() => {
                    setEditingProduct(null);
                    setProdFormName('');
                    setProdFormCode(`CRK-${products.length + 101}`);
                    setProdFormBarcode(`89012345${products.length + 101}`);
                    setProdFormCategory(categories[0]?.id || 1);
                    setProdFormContent('1 Box');
                    setProdFormMrp(200);
                    setProdFormDiscount(65);
                    setProdFormSellingPrice(70);
                    setProdFormStock(100);
                    setProdFormMinStock(20);
                    setProdFormImageUrl('');
                    setProdFormDescription('');
                    setShowAddProductModal(true);
                  }}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  + Add Cracker Item
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h3 className="font-bold text-sm text-gray-900 mb-2">Manage Categories</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Organize categories like Sparklers, Ground Chakkars, Flower Pots, Rockets, Fancy Aerials.
                </p>
                <button
                  onClick={() => setActiveTab('categories')}
                  className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Manage Categories ({categories.length})
                </button>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
                <h3 className="font-bold text-sm text-gray-900 mb-2">Staff Sales Audit</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Review sales generated by each single worker or billing counter register.
                </p>
                <button
                  onClick={() => setActiveTab('workers')}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Single Staff Sales Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1.5. TRACK BILL & DOWNLOAD SECTION */}
        {activeTab === 'track_bills' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-amber-100 text-amber-900 rounded-xl">
                    <Receipt className="w-5 h-5" />
                  </span>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                      Track Bill & Download (ரசீதுகள் கண்காணிப்பு & பதிவிறக்கம்)
                    </h2>
                    <p className="text-xs text-gray-500">
                      {isOwner
                        ? 'Track all store billing counter & online orders. Print thermal slips, download PDF invoices, and send WhatsApp receipts.'
                        : `Your counter bills (${currentUser.name}) - Print, download PDF, or send via WhatsApp.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={loadDashboardData}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Refresh Bills</span>
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar for Bills */}
            {(() => {
              const filteredList = trackBillsList.filter((inv) => {
                const q = trackBillSearch.toLowerCase().trim();
                const matchesSearch =
                  !q ||
                  inv.invoice_number.toLowerCase().includes(q) ||
                  inv.customer_name.toLowerCase().includes(q) ||
                  inv.customer_mobile.includes(q) ||
                  (inv.worker_name && inv.worker_name.toLowerCase().includes(q));
                const matchesPayment =
                  trackBillPayment === 'all' || inv.payment_mode === trackBillPayment;
                return matchesSearch && matchesPayment;
              });

              const totalTrackedRevenue = filteredList.reduce((sum, i) => sum + i.grand_total, 0);
              const totalTrackedDiscount = filteredList.reduce((sum, i) => sum + i.discount, 0);

              return (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Invoices</div>
                        <div className="text-xl font-black text-gray-900 mt-0.5">{filteredList.length} Bills</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-black">
                        <Receipt className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Revenue Billed</div>
                        <div className="text-xl font-black text-emerald-700 mt-0.5">₹{totalTrackedRevenue.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                        <IndianRupee className="w-5 h-5" />
                      </div>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Factory Discounts</div>
                        <div className="text-xl font-black text-amber-700 mt-0.5">₹{totalTrackedDiscount.toLocaleString('en-IN')}</div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                        <Sparkles className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Filters & Search Toolbar */}
                  <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
                    <div className="relative w-full md:w-80">
                      <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={trackBillSearch}
                        onChange={(e) => setTrackBillSearch(e.target.value)}
                        placeholder="Search Bill #, Customer Name, Mobile..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                      <span className="text-[11px] font-bold text-gray-500 mr-1 uppercase">Payment:</span>
                      {['all', 'CASH', 'UPI', 'CARD', 'ONLINE'].map((mode) => (
                        <button
                          key={mode}
                          onClick={() => setTrackBillPayment(mode)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            trackBillPayment === mode
                              ? 'bg-amber-500 text-slate-950 shadow-xs'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {mode === 'all' ? 'All Payments' : mode}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Bills Table */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-gray-500 font-bold uppercase border-b border-gray-200 text-[11px]">
                          <tr>
                            <th className="p-3">S.No</th>
                            <th className="p-3">Invoice #</th>
                            <th className="p-3">Date & Time</th>
                            <th className="p-3">Customer Info</th>
                            <th className="p-3">Billed By</th>
                            <th className="p-3 text-right">MRP Total</th>
                            <th className="p-3 text-right">Discount</th>
                            <th className="p-3 text-right">Grand Total</th>
                            <th className="p-3 text-center">Payment</th>
                            <th className="p-3 text-center">Actions & Print</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                          {filteredList.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="p-8 text-center text-gray-400">
                                <Receipt className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                                <div>No invoices found matching your search.</div>
                              </td>
                            </tr>
                          ) : (
                            filteredList.map((inv, idx) => (
                              <tr key={inv.id} className="hover:bg-amber-50/40 transition-colors">
                                <td className="p-3 font-bold text-gray-400">{idx + 1}</td>
                                <td className="p-3 font-mono font-bold text-red-700 whitespace-nowrap">
                                  {inv.invoice_number}
                                </td>
                                <td className="p-3 whitespace-nowrap text-gray-500 text-[11px]">
                                  {new Date(inv.created_at).toLocaleDateString('en-IN')}{' '}
                                  <span className="text-gray-400">
                                    {new Date(inv.created_at).toLocaleTimeString('en-IN', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-gray-900">{inv.customer_name}</div>
                                  <div className="text-[11px] text-gray-500 font-mono">
                                    {inv.customer_mobile || '-'}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <span className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-bold text-[10px]">
                                    {inv.worker_name || 'Owner'}
                                  </span>
                                </td>
                                <td className="p-3 text-right text-gray-400 line-through">
                                  ₹{inv.subtotal.toLocaleString('en-IN')}
                                </td>
                                <td className="p-3 text-right text-emerald-600 font-bold">
                                  -₹{inv.discount.toLocaleString('en-IN')}
                                </td>
                                <td className="p-3 text-right font-black text-sm text-red-700">
                                  ₹{inv.grand_total.toLocaleString('en-IN')}
                                </td>
                                <td className="p-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                      inv.payment_mode === 'CASH'
                                        ? 'bg-emerald-100 text-emerald-900'
                                        : inv.payment_mode === 'UPI'
                                        ? 'bg-purple-100 text-purple-900'
                                        : 'bg-blue-100 text-blue-900'
                                    }`}
                                  >
                                    {inv.payment_mode}
                                  </span>
                                </td>
                                <td className="p-3 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {/* Thermal Print */}
                                    <button
                                      onClick={() => printThermalReceipt(inv, settings)}
                                      title="Print Thermal Receipt (58mm/80mm)"
                                      className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Printer className="w-3.5 h-3.5" />
                                    </button>

                                    {/* PDF Download */}
                                    <button
                                      onClick={() => downloadInvoicePDF(inv, settings)}
                                      title="Download A4 PDF Invoice"
                                      className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>

                                    {/* WhatsApp Direct */}
                                    <button
                                      onClick={() =>
                                        sendInvoiceViaWhatsApp(inv, settings, inv.customer_mobile)
                                      }
                                      title="Send Full Bill to Customer WhatsApp"
                                      className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </button>

                                    {/* Detailed View */}
                                    <button
                                      onClick={() => setViewInvoiceModal(inv)}
                                      title="View Detailed Items Breakdown"
                                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* 2. SALES REPORTS */}
        {activeTab === 'sales' && (
          <div className="space-y-4">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Sales Reports & Audit (விற்பனை அறிக்கை)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Audit counter POS billing, payment modes, item-wise volume, and customer savings.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleExportSalesCSV}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="bg-gray-800 hover:bg-gray-900 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
              </div>
            </div>

            {/* Sales Summary KPI Cards */}
            {salesSummary && (
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
                <div className="bg-white p-3.5 rounded-2xl border border-red-100 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Total Sales</div>
                  <div className="text-xl font-black text-red-700 mt-1 font-['Outfit',sans-serif]">
                    ₹{(salesSummary.total_sales || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{salesSummary.total_bills || 0} Total Bills</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Cash Collection</div>
                  <div className="text-xl font-black text-emerald-700 mt-1 font-['Outfit',sans-serif]">
                    ₹{(salesSummary.cash_total || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-emerald-600 mt-0.5">Counter Hand Cash</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">UPI / Online</div>
                  <div className="text-xl font-black text-indigo-700 mt-1 font-['Outfit',sans-serif]">
                    ₹{((salesSummary.upi_total || 0) + (salesSummary.online_total || 0)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-indigo-600 mt-0.5">GPay, PhonePe, Card</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-amber-100 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Discount Given</div>
                  <div className="text-xl font-black text-amber-700 mt-1 font-['Outfit',sans-serif]">
                    ₹{(salesSummary.discount_given || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-amber-600 mt-0.5">Factory Savings</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Avg Bill Value</div>
                  <div className="text-xl font-black text-gray-900 mt-1 font-['Outfit',sans-serif]">
                    ₹{(salesSummary.average_bill_value || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Per Transaction</div>
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
                  <div className="text-[11px] font-bold text-gray-500 uppercase">Crackers Sold</div>
                  <div className="text-xl font-black text-gray-900 mt-1 font-['Outfit',sans-serif]">
                    {(salesSummary.total_items_sold || 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5">Boxes & Pieces</div>
                </div>
              </div>
            )}

            {/* Filter Bar */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs space-y-3">
              <div className="flex flex-wrap gap-2 items-center text-xs">
                <div className="flex items-center gap-1 font-bold text-gray-700 mr-1">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Period / காலம்:</span>
                </div>

                {[
                  { key: 'today', label: 'Today (இன்று)' },
                  { key: 'yesterday', label: 'Yesterday (நேற்று)' },
                  { key: 'week', label: 'This Week (இந்த வாரம்)' },
                  { key: 'month', label: 'This Month (இந்த மாதம்)' },
                  { key: 'custom', label: 'Day to Day (தேதி வாரியாக 📅)' },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => {
                      setDateFilter(item.key as any);
                      if (item.key === 'custom' && !startDate && !endDate) {
                        const nowStr = new Date().toISOString().slice(0, 10);
                        setStartDate(nowStr);
                        setEndDate(nowStr);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                      dateFilter === item.key
                        ? 'bg-red-700 text-white shadow-xs'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}

                {dateFilter === 'custom' && (
                  <div className="flex flex-wrap items-center gap-2 p-1.5 bg-red-50/70 border border-red-200 rounded-xl">
                    <span className="text-[11px] font-bold text-red-900 ml-1">From:</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-red-600 focus:outline-none"
                    />
                    <span className="text-[11px] font-bold text-red-900">To:</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="px-2 py-1 bg-white border border-gray-300 rounded-lg text-xs font-semibold focus:ring-1 focus:ring-red-600 focus:outline-none"
                    />
                    <button
                      onClick={() => loadDashboardData(false)}
                      className="bg-red-700 hover:bg-red-800 text-white px-3 py-1 rounded-lg text-xs font-black shadow-xs cursor-pointer active:scale-95 transition-all"
                    >
                      Filter (வடிகட்டு)
                    </button>
                  </div>
                )}
              </div>

              {/* Secondary Filters */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-semibold">Staff Member:</span>
                  <select
                    value={workerFilter}
                    onChange={(e) => setWorkerFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="">All Staff & Online</option>
                    {userList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-gray-500 font-semibold">Payment Mode:</span>
                  <select
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 bg-white font-medium focus:ring-1 focus:ring-red-600 focus:outline-none"
                  >
                    <option value="">All Payment Modes</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CARD">Card Swipes</option>
                    <option value="ONLINE">Direct Web Online</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Sub-Tab Navigation: Invoices vs Item-Wise Sales Breakdown */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
              <button
                onClick={() => setSalesViewMode('invoices')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  salesViewMode === 'invoices'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Invoices List ({salesInvoices.length})</span>
              </button>

              <button
                onClick={() => setSalesViewMode('items')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  salesViewMode === 'items'
                    ? 'bg-red-700 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Item-Wise Sales Volume ({itemBreakdown.length})</span>
              </button>
            </div>

            {/* Invoices Table */}
            {salesViewMode === 'invoices' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                {salesInvoices.length === 0 ? (
                  <div className="p-8 text-center text-gray-400 text-xs">
                    No invoices generated in this period.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-3">Invoice No</th>
                          <th className="p-3">Date & Time</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Mobile</th>
                          <th className="p-3">Billed By</th>
                          <th className="p-3">Payment</th>
                          <th className="p-3 text-right">MRP</th>
                          <th className="p-3 text-right">Discount</th>
                          <th className="p-3 text-right">Grand Total</th>
                          <th className="p-3 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {salesInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono font-bold text-red-700">
                              {inv.invoice_number}
                            </td>
                            <td className="p-3 text-gray-500">
                              {new Date(inv.created_at).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="p-3 font-bold text-gray-900">{inv.customer_name}</td>
                            <td className="p-3 font-mono text-gray-600">{inv.customer_mobile}</td>
                            <td className="p-3">
                              <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded font-medium">
                                {inv.worker_name || 'Owner'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                  inv.payment_mode === 'CASH'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}
                              >
                                {inv.payment_mode}
                              </span>
                            </td>
                            <td className="p-3 text-right text-gray-400 line-through">
                              ₹{inv.subtotal}
                            </td>
                            <td className="p-3 text-right text-emerald-700 font-bold">
                              -₹{inv.discount}
                            </td>
                            <td className="p-3 text-right font-black text-gray-900 text-sm">
                              ₹{inv.grand_total}
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => printThermalReceipt(inv, settings)}
                                  className="p-1.5 text-gray-500 hover:text-red-700 hover:bg-red-50 rounded-lg cursor-pointer"
                                  title="Print Thermal Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => downloadInvoicePDF(inv, settings)}
                                  className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                  title="Download PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Item Breakdown Table */}
            {salesViewMode === 'items' && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-3">Product Name</th>
                        <th className="p-3">Code</th>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Total Qty Sold</th>
                        <th className="p-3 text-right">Total Discount Given</th>
                        <th className="p-3 text-right">Net Revenue Generated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {itemBreakdown.map((item) => (
                        <tr key={item.product_id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                            <img
                              src={item.image_url}
                              alt=""
                              className="w-8 h-8 rounded-lg object-cover border"
                            />
                            <span>{item.product_name}</span>
                          </td>
                          <td className="p-3 font-mono text-gray-500">{item.code}</td>
                          <td className="p-3 text-gray-600">{item.category_name}</td>
                          <td className="p-3 text-right font-black text-gray-900 text-sm">
                            {item.total_quantity}
                          </td>
                          <td className="p-3 text-right text-emerald-700 font-bold">
                            ₹{item.total_discount.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-black text-red-700 text-sm">
                            ₹{item.total_revenue.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. STAFF SALES & SINGLE USER REPORT */}
        {activeTab === 'workers' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Staff Performance & Single User Sales Report
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track individual billing counters, cash collected, UPI amounts, and worker bills.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Filter Staff:</span>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="text-xs font-bold bg-gray-50 border border-gray-300 rounded-xl px-3 py-2"
                >
                  <option value="all">All Staff Combined</option>
                  {workerReports.map((w) => (
                    <option key={w.worker_id} value={w.worker_id}>
                      {w.name} ({w.role || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Staff Cards Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {workerReports.map((w) => (
                <div
                  key={w.worker_id}
                  onClick={() => setSelectedWorkerId(String(w.worker_id))}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    String(selectedWorkerId) === String(w.worker_id)
                      ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400'
                      : 'bg-white border-gray-200 hover:border-amber-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-amber-400 font-black flex items-center justify-center text-sm shadow-xs">
                        {w.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-extrabold text-sm text-gray-900">{w.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">@{w.username} • {w.mobile || 'No Mobile'}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                      {w.role || 'WORKER'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-gray-100 text-xs">
                    <div>
                      <div className="text-[10px] text-gray-400 font-bold">BILLS</div>
                      <div className="font-black text-gray-900 text-sm">{w.bills_count}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-600 font-bold">CASH</div>
                      <div className="font-black text-emerald-700 text-xs">₹{w.cash_collected.toLocaleString('en-IN')}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-indigo-600 font-bold">UPI / ONLINE</div>
                      <div className="font-black text-indigo-700 text-xs">₹{w.online_collected.toLocaleString('en-IN')}</div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500 font-medium">Total Billed Revenue:</span>
                    <span className="font-black text-red-700 text-base font-['Outfit',sans-serif]">
                      ₹{w.total_sales.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Single User Invoices Table */}
            {activeWorkerReport && (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                  <div>
                    <h3 className="font-black text-sm text-gray-900">
                      Bills Generated by "{activeWorkerReport.name}" ({activeWorkerReport.bills.length} Invoices)
                    </h3>
                    <p className="text-xs text-gray-500">
                      Detailed invoice audit for this specific user.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedWorkerId('all')}
                    className="text-xs font-bold text-gray-500 hover:text-gray-800"
                  >
                    View All Staff
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                      <tr>
                        <th className="p-2.5">Invoice #</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Customer Name</th>
                        <th className="p-2.5">Mobile</th>
                        <th className="p-2.5">Mode</th>
                        <th className="p-2.5 text-right">Amount</th>
                        <th className="p-2.5 text-center">Print</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activeWorkerReport.bills.map((b) => (
                        <tr key={b.id} className="hover:bg-gray-50">
                          <td className="p-2.5 font-bold font-mono text-red-700">{b.invoice_number}</td>
                          <td className="p-2.5 text-gray-500">
                            {new Date(b.created_at).toLocaleString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-2.5 font-bold text-gray-900">{b.customer_name}</td>
                          <td className="p-2.5 font-mono text-gray-500">{b.customer_mobile}</td>
                          <td className="p-2.5">
                            <span className="bg-gray-100 text-gray-800 font-bold px-2 py-0.5 rounded text-[10px]">
                              {b.payment_mode}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-black text-gray-900">₹{b.grand_total}</td>
                          <td className="p-2.5 text-center">
                            <button
                              onClick={() => printThermalReceipt(b, settings)}
                              className="p-1 text-gray-400 hover:text-red-700 cursor-pointer"
                              title="Print Thermal Bill"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. PRODUCT MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Product Catalog Management (பட்டாசு வகைகள்)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage Sivakasi cracker prices, 65% - 85% discounts, stocks, and barcodes.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setProdFormName('');
                  setProdFormCode(`CRK-${products.length + 101}`);
                  setProdFormBarcode(`89012345${products.length + 101}`);
                  setProdFormCategory(categories[0]?.id || 1);
                  setProdFormContent('1 Box');
                  setProdFormMrp(200);
                  setProdFormDiscount(65);
                  setProdFormSellingPrice(70);
                  setProdFormStock(100);
                  setProdFormMinStock(20);
                  setProdFormImageUrl('');
                  setProdFormDescription('');
                  setShowAddProductModal(true);
                }}
                className="bg-red-700 hover:bg-red-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Cracker</span>
              </button>
            </div>

            {/* Filter Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={prodFilterSearch}
                  onChange={(e) => setProdFilterSearch(e.target.value)}
                  placeholder="Search by cracker name or code..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600"
                />
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <select
                value={prodFilterCategory}
                onChange={(e) =>
                  setProdFilterCategory(e.target.value === 'all' ? 'all' : Number(e.target.value))
                }
                className="w-full px-3 py-2 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-red-600 font-bold"
              >
                <option value="all">All Categories ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Code / Barcode</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Content</th>
                      <th className="p-3 text-right">MRP</th>
                      <th className="p-3 text-right">Discount</th>
                      <th className="p-3 text-right">Selling Rate</th>
                      <th className="p-3 text-center">Stock</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAdminProducts.map((prod) => (
                      <tr key={prod.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900 flex items-center gap-2">
                          <img
                            src={prod.image_url}
                            alt=""
                            className="w-9 h-9 rounded-lg object-cover border shrink-0"
                          />
                          <div>
                            <div>{prod.name}</div>
                            <div className="text-[10px] text-gray-400 font-normal truncate max-w-xs">
                              {prod.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono font-medium text-gray-500">{prod.code}</td>
                        <td className="p-3 text-gray-600 font-medium">
                          {categories.find((c) => c.id === prod.category_id)?.name || 'General'}
                        </td>
                        <td className="p-3 text-gray-500">{prod.content}</td>
                        <td className="p-3 text-right text-gray-400 line-through">₹{prod.mrp}</td>
                        <td className="p-3 text-right text-emerald-700 font-bold">
                          {prod.discount_percentage}% OFF
                        </td>
                        <td className="p-3 text-right font-black text-red-700 text-sm">
                          ₹{prod.selling_price}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-black text-[10px] ${
                              prod.stock_quantity <= 0
                                ? 'bg-red-100 text-red-700'
                                : prod.stock_quantity <= (prod.min_stock_alert || 20)
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {prod.stock_quantity} Boxes
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingProduct(prod);
                                setProdFormName(prod.name);
                                setProdFormCode(prod.code);
                                setProdFormBarcode(prod.barcode);
                                setProdFormCategory(prod.category_id);
                                setProdFormContent(prod.content);
                                setProdFormMrp(prod.mrp);
                                setProdFormDiscount(prod.discount_percentage);
                                setProdFormSellingPrice(prod.selling_price);
                                setProdFormStock(prod.stock_quantity);
                                setProdFormMinStock(prod.min_stock_alert || 20);
                                setProdFormImageUrl(prod.image_url);
                                setProdFormDescription(prod.description);
                                setShowAddProductModal(true);
                              }}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Edit Cracker"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(prod)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                              title="Delete Cracker"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. CATEGORY MANAGEMENT */}
        {activeTab === 'categories' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Category Management (பிரிவு மேலாண்மை)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create and arrange cracker product categories (Sparklers, Chakkars, Pots, Aerials).
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory(null);
                  setCatFormName('');
                  setCatFormSlug('');
                  setCatFormDescription('');
                  setCatFormImageUrl('');
                  setCatFormOrder(categories.length + 1);
                  setShowAddCategoryModal(true);
                }}
                className="bg-red-700 hover:bg-red-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Category</span>
              </button>
            </div>

            {/* Category Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((cat) => {
                const count = products.filter((p) => p.category_id === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <img
                        src={cat.image_url}
                        alt={cat.name}
                        className="w-12 h-12 rounded-xl object-cover border border-gray-200 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-extrabold text-sm text-gray-900 truncate">
                          {cat.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">Slug: {cat.slug}</div>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{cat.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs">
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        {count} Products
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatFormName(cat.name);
                            setCatFormSlug(cat.slug);
                            setCatFormDescription(cat.description);
                            setCatFormImageUrl(cat.image_url);
                            setCatFormOrder(cat.display_order);
                            setShowAddCategoryModal(true);
                          }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 6. STOCK MANAGEMENT & INWARD LOGISTICS */}
        {activeTab === 'stock' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Stock Inventory & Inward Arrivals (சரக்கு இருப்பு)
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record new factory stock arrivals from Sivakasi and monitor low inventory.
                </p>
              </div>

              <button
                onClick={() => {
                  setSelectedStockProduct(products[0] || null);
                  setStockAddQty(50);
                  setStockAddNotes('Fresh Sivakasi Factory Arrival');
                  setShowAddStockModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Inward Stock Arrival</span>
              </button>
            </div>

            {/* Low Stock Alerts Banner */}
            {products.filter((p) => p.stock_quantity <= 20).length > 0 && (
              <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4">
                <div className="flex items-center gap-2 font-bold text-amber-900 text-sm mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Low Stock Warning (சரக்கு குறைவு):</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {products
                    .filter((p) => p.stock_quantity <= 20)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="bg-white p-2.5 rounded-xl border border-amber-200 text-xs flex justify-between items-center"
                      >
                        <span className="font-bold truncate text-gray-800">{p.name}</span>
                        <span className="font-black text-red-700 shrink-0 ml-1">
                          {p.stock_quantity} left
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Stock Transactions Log */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-3 bg-gray-50 border-b border-gray-200 font-bold text-xs text-gray-700">
                Recent Stock Movements & Inward History
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/50 text-gray-500 font-bold border-b border-gray-100">
                    <tr>
                      <th className="p-3">Product Name</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3">Reason / Notes</th>
                      <th className="p-3">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-gray-400">
                          No stock movement logs recorded yet.
                        </td>
                      </tr>
                    ) : (
                      stockLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{log.product_name}</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded font-black text-[10px] ${
                                log.transaction_type === 'INWARD'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {log.transaction_type}
                            </span>
                          </td>
                          <td className="p-3 text-right font-black text-gray-900">
                            {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                          </td>
                          <td className="p-3 text-gray-500">{log.notes || 'Counter Billing'}</td>
                          <td className="p-3 text-gray-400">
                            {new Date(log.created_at).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 7. CUSTOMER DATABASE */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                Customer Records & Purchase History (வாடிக்கையாளர்கள்)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Directory of customer mobile numbers, purchase history, and price-list/catalog download leads.
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Customer Name</th>
                      <th className="p-3">Mobile Number</th>
                      <th className="p-3">Address</th>
                      <th className="p-3 text-center">Orders Count</th>
                      <th className="p-3 text-right">Total Purchase Value</th>
                      <th className="p-3">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {customers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-400">
                          No customer profiles recorded yet.
                        </td>
                      </tr>
                    ) : (
                      customers.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-gray-900">{c.name}</td>
                          <td className="p-3 font-mono text-gray-600">{c.mobile}</td>
                          <td className="p-3 text-gray-500">{c.address}</td>
                          <td className="p-3 text-center font-bold">{c.total_orders}</td>
                          <td className="p-3 text-right font-black text-red-700">
                            ₹{c.total_purchase.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-gray-400">
                            {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('en-IN') : c.last_download_at ? new Date(c.last_download_at).toLocaleDateString('en-IN') : '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 8. USERS & STAFF ACCOUNTS */}
        {activeTab === 'users' && isOwner && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                  Owner Portal: Manage User Accounts & Staff
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Create POS cashier workers, reset passwords, remove staff accounts, and monitor individual worker billing revenue.
                </p>
              </div>

              <button
                onClick={() => setShowAddWorkerModal(true)}
                className="bg-red-700 hover:bg-red-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Add Cashier / Staff User</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userList.map((u) => {
                const report = workerReports.find((w) => String(w.worker_id) === String(u.id));
                const isPrimaryOwner = u.id === 1;

                return (
                  <div
                    key={u.id}
                    className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between gap-3 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shadow-xs ${
                          u.role === 'OWNER' ? 'bg-red-900 text-amber-400' : 'bg-slate-900 text-white'
                        }`}>
                          {u.role === 'OWNER' ? '👑' : u.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-gray-900">{u.name}</span>
                            {isPrimaryOwner && (
                              <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1.5 py-0.5 rounded">
                                MAIN OWNER
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">@{u.username} • 📞 {u.mobile || 'No Mobile'}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`inline-block text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                              u.role === 'OWNER' ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'
                            }`}>
                              {u.role}
                            </span>
                            {u.created_at && (
                              <span className="text-[10px] text-gray-400">
                                Joined {new Date(u.created_at).toLocaleDateString('en-IN')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-mono font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          ID: #{u.id}
                        </span>
                      </div>
                    </div>

                    {/* Worker Performance Pill if available */}
                    {report && (
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Total Sales</span>
                          <div className="font-black text-emerald-700">₹{report.total_sales.toLocaleString('en-IN')}</div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 uppercase font-bold">Total Bills</span>
                          <div className="font-bold text-gray-800">{report.total_bills} Invoices</div>
                        </div>
                      </div>
                    )}

                    {/* Action Controls: Reset Password & Delete */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setResetTargetUser(u);
                          setResetPasswordVal('');
                          setShowResetPasswordModal(true);
                        }}
                        className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Reset Password</span>
                      </button>

                      {!isPrimaryOwner && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name)}
                          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete User</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 8.5 HOME BANNER SLIDER MANAGEMENT (Owner Photo / Slider control) */}
        {activeTab === 'banners' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif] flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-amber-600" />
                  <span>Home Moving Banners & Photo Slider (முகப்பு பேனர்கள்)</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Manage auto-sliding banner images, festive offers, and Diwali shop photo promotions.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingBanner(null);
                  setBannerFormTitle('');
                  setBannerFormSubtitle('');
                  setBannerFormTag('💥 DIWALI SPECIAL');
                  setBannerFormImage('');
                  setBannerFormBtnText('பட்டாசுகள் காண்க / Explore Crackers');
                  setShowAddBannerModal(true);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add New Banner (பேனர் படம் சேர்க்க)</span>
              </button>
            </div>

            {/* Banner Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bannersList.map((banner, index) => (
                <div
                  key={banner.id}
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Banner Image Preview */}
                    <div className="relative h-44 bg-gray-900 overflow-hidden group">
                      <img
                        src={banner.image_url}
                        alt={banner.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as any).src =
                            'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                      
                      {banner.tag && (
                        <span className="absolute top-3 left-3 bg-amber-400 text-red-950 text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase shadow">
                          {banner.tag}
                        </span>
                      )}

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className="bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                          Slide #{index + 1}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            banner.is_active
                              ? 'bg-emerald-500 text-white'
                              : 'bg-zinc-700 text-zinc-300'
                          }`}
                        >
                          {banner.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3 text-white">
                        <h3 className="font-extrabold text-sm drop-shadow-md line-clamp-1">
                          {banner.title}
                        </h3>
                        {banner.subtitle && (
                          <p className="text-xs text-amber-200 drop-shadow line-clamp-1">
                            {banner.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Banner Meta details */}
                    <div className="p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-gray-500">
                        <span>Button Text:</span>
                        <span className="font-bold text-gray-800">{banner.button_text || 'Default'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                    <button
                      onClick={() => handleToggleBanner(banner.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        banner.is_active
                          ? 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {banner.is_active ? 'Hide from Home' : 'Show on Home'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingBanner(banner);
                          setBannerFormTitle(banner.title);
                          setBannerFormSubtitle(banner.subtitle || '');
                          setBannerFormTag(banner.tag || '');
                          setBannerFormImage(banner.image_url);
                          setBannerFormBtnText(banner.button_text || '');
                          setShowAddBannerModal(true);
                        }}
                        className="p-1.5 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit Banner"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteBanner(banner.id)}
                        className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg transition-colors cursor-pointer"
                        title="Delete Banner"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STORE SETTINGS — Minimum Order Amount & Free Delivery Threshold */}
        {activeTab === 'store_settings' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
              <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-600" />
                <span>Store Settings (கடை அமைப்புகள்)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Control the minimum cart value required for customers to check out, and the free-delivery threshold shown across the site.
              </p>
            </div>

            <form
              onSubmit={handleSaveStoreSettings}
              className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-5 max-w-xl"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Minimum Order Amount (குறைந்தபட்ச ஆர்டர் தொகை) — ₹
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={minOrderValueInput}
                  onChange={(e) => setMinOrderValueInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-gray-900"
                  placeholder="500"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Customers whose cart total is below this amount will see a warning in the Cart and won't be able to proceed to checkout. This is the fallback used for any state below that doesn't have its own amount set.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Minimum Order Amount by State (மாநிலம் வாரியாக) — ₹
                </label>
                <p className="text-[11px] text-gray-400 mb-2">
                  Set a different minimum order amount per delivery state, shown and enforced at checkout based on what the customer selects. Leave a field blank to fall back to the general amount above.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STATE_MIN_ORDER_LIST.map((st) => (
                    <div key={st}>
                      <label className="block text-[11px] font-bold text-gray-500 mb-1">{st}</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={minOrderByStateInput[st] ?? ''}
                        onChange={(e) =>
                          setMinOrderByStateInput((prev) => ({ ...prev, [st]: e.target.value }))
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-gray-900"
                        placeholder={String(settings?.min_order_value ?? 500)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Free Delivery Above (இலவச டெலிவரி வரம்பு) — ₹
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={freeDeliveryAboveInput}
                  onChange={(e) => setFreeDeliveryAboveInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-bold text-gray-900"
                  placeholder="0"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Set to 0 to disable the free-delivery message.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-extrabold py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Saving...' : 'Save Store Settings'}</span>
              </button>
            </form>
          </div>
        )}

        {/* 9. PHP ARCHITECTURE SPECS */}
        {activeTab === 'architecture' && (
          <div className="space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
              <h2 className="text-xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
                PHP 8.3 & MySQL 8 Production Architecture
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Specifications for cPanel, Apache, and MariaDB/MySQL deployment.
              </p>
            </div>
          </div>
        )}
      </main>

      {/* HOME BANNER ADD / EDIT MODAL */}
      {showAddBannerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-amber-600" />
                <span>{editingBanner ? 'Edit Banner / பேனர் திருத்து' : 'Add New Home Banner / புதிய பேனர் சேர்க்க'}</span>
              </h3>
              <button
                onClick={() => setShowAddBannerModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Banner Headline (Tamil & English) / தலைப்பு
                </label>
                <input
                  type="text"
                  required
                  value={bannerFormTitle}
                  onChange={(e) => setBannerFormTitle(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">
                  Subtitle / விளக்கம் (Optional)
                </label>
                <input
                  type="text"
                  value={bannerFormSubtitle}
                  onChange={(e) => setBannerFormSubtitle(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Badge Tag (முக்கிய குறிப்பு)
                  </label>
                  <input
                    type="text"
                    value={bannerFormTag}
                    onChange={(e) => setBannerFormTag(e.target.value)}
                    placeholder=""
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-amber-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">
                    Button Label / பொத்தான்
                  </label>
                  <input
                    type="text"
                    value={bannerFormBtnText}
                    onChange={(e) => setBannerFormBtnText(e.target.value)}
                    placeholder=""
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Photo Upload & Camera Capture for Banner */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block font-bold text-gray-700">
                  Banner Photo (Browse from Phone/PC or Take Camera Photo)
                </label>

                <div className="grid grid-cols-2 gap-2">
                  {/* Browse File */}
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Browse Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBannerFormImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {/* Camera Photo */}
                  <label className="cursor-pointer bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-amber-700" />
                    <span>Camera / Take Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBannerFormImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Direct Image URL input & Live Preview */}
                <div className="space-y-1">
                  <input
                    type="url"
                    value={bannerFormImage}
                    onChange={(e) => setBannerFormImage(e.target.value)}
                    placeholder="Or enter banner image URL (https://...)"
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                  {bannerFormImage && (
                    <div className="relative h-32 rounded-xl overflow-hidden border border-gray-300 bg-gray-100 mt-1">
                      <img
                        src={bannerFormImage}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBannerModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Saving...' : editingBanner ? 'Update Banner' : 'Publish Banner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRODUCT ADD / EDIT MODAL */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-900">
                {editingProduct ? 'Edit Cracker Item' : 'Add New Cracker Item'}
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Product Name (Tamil & English)</label>
                <input
                  type="text"
                  required
                  value={prodFormName}
                  onChange={(e) => setProdFormName(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Product Code</label>
                  <input
                    type="text"
                    required
                    value={prodFormCode}
                    onChange={(e) => setProdFormCode(e.target.value)}
                    placeholder=""
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Category</label>
                  <select
                    value={prodFormCategory}
                    onChange={(e) => setProdFormCategory(Number(e.target.value))}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Rates with Real-Time Two-Way Auto-Calculation */}
              <div className="grid grid-cols-3 gap-2 bg-amber-50/50 p-2.5 rounded-2xl border border-amber-200">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">MRP Price (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prodFormMrp}
                    onChange={(e) => {
                      const mrp = Number(e.target.value);
                      setProdFormMrp(e.target.value);
                      const disc = Number(prodFormDiscount);
                      if (mrp > 0 && !isNaN(disc)) {
                        setProdFormSellingPrice(Math.max(1, Math.round(mrp * (1 - disc / 100))));
                      }
                    }}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Discount %</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    required
                    value={prodFormDiscount}
                    onChange={(e) => {
                      const disc = Number(e.target.value);
                      setProdFormDiscount(e.target.value);
                      const mrp = Number(prodFormMrp);
                      if (mrp > 0 && !isNaN(disc)) {
                        setProdFormSellingPrice(Math.max(1, Math.round(mrp * (1 - disc / 100))));
                      }
                    }}
                    className="w-full p-2 bg-white border border-gray-300 rounded-xl font-bold text-emerald-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-gray-700 mb-1">Selling Rate (₹)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={prodFormSellingPrice}
                    onChange={(e) => {
                      const sp = Number(e.target.value);
                      setProdFormSellingPrice(e.target.value);
                      const mrp = Number(prodFormMrp);
                      if (mrp > 0 && !isNaN(sp)) {
                        const calculatedDiscount = Math.max(0, Math.round(((mrp - sp) / mrp) * 100));
                        setProdFormDiscount(calculatedDiscount);
                      }
                    }}
                    className="w-full p-2 bg-white border border-red-300 rounded-xl font-black text-red-700 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Stock Quantity (Boxes)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={prodFormStock}
                    onChange={(e) => setProdFormStock(e.target.value)}
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Packing / Content</label>
                  <input
                    type="text"
                    value={prodFormContent}
                    onChange={(e) => setProdFormContent(e.target.value)}
                    placeholder=""
                    className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                  />
                </div>
              </div>

              {/* Browse Image and Camera Photo Capture */}
              <div className="space-y-2 pt-1 border-t border-gray-100">
                <label className="block font-bold text-gray-700">Product Image (Browse or Camera)</label>
                
                <div className="grid grid-cols-2 gap-2">
                  {/* 1. Browse file from phone/computer */}
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>Browse Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProdFormImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>

                  {/* 2. Direct Camera Photo Snap */}
                  <label className="cursor-pointer bg-red-50 hover:bg-red-100 text-red-900 border border-red-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors">
                    <Camera className="w-3.5 h-3.5 text-red-700" />
                    <span>Take Photo / Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setProdFormImageUrl(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                </div>

                {/* Optional Image URL Input & Preview */}
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="url"
                    value={prodFormImageUrl}
                    onChange={(e) => setProdFormImageUrl(e.target.value)}
                    placeholder="Or enter image URL (https://...)"
                    className="flex-1 p-2 bg-gray-50 border border-gray-300 rounded-xl text-xs"
                  />
                  {prodFormImageUrl && (
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-300 shrink-0 bg-gray-100">
                      <img
                        src={prodFormImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-extrabold py-2.5 rounded-xl cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY ADD / EDIT MODAL */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h3>
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={catFormName}
                  onChange={(e) => setCatFormName(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Slug / Code</label>
                <input
                  type="text"
                  value={catFormSlug}
                  onChange={(e) => setCatFormSlug(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  value={catFormDescription}
                  onChange={(e) => setCatFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Description of products in this category..."
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCategoryModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-extrabold py-2.5 rounded-xl cursor-pointer"
                >
                  {loading ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ARRIVAL MODAL */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-900">Record Inward Stock Arrival</h3>
              <button
                onClick={() => setShowAddStockModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddStockSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Cracker Product</label>
                <select
                  value={selectedStockProduct?.id || ''}
                  onChange={(e) => {
                    const prod = products.find((p) => p.id === Number(e.target.value));
                    setSelectedStockProduct(prod || null);
                  }}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Inward Arrival Quantity (Boxes)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={stockAddQty}
                  onChange={(e) => setStockAddQty(Number(e.target.value))}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Notes / Lorry Receipt</label>
                <input
                  type="text"
                  value={stockAddNotes}
                  onChange={(e) => setStockAddNotes(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStockModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold py-2.5 rounded-xl cursor-pointer"
                >
                  Confirm Arrival
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddWorkerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="text-lg font-black text-gray-900">Create Staff User Account</h3>
              <button
                onClick={() => setShowAddWorkerModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddWorkerSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newWorkerName}
                  onChange={(e) => setNewWorkerName(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Username (Login ID)</label>
                <input
                  type="text"
                  required
                  value={newWorkerUsername}
                  onChange={(e) => setNewWorkerUsername(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={newWorkerPassword}
                  onChange={(e) => setNewWorkerPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={newWorkerMobile}
                  onChange={(e) => setNewWorkerMobile(e.target.value)}
                  placeholder=""
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Role Permission</label>
                <select
                  value={newWorkerRole}
                  onChange={(e) => setNewWorkerRole(e.target.value as any)}
                  className="w-full p-2 bg-gray-50 border border-gray-300 rounded-xl font-bold"
                >
                  <option value="WORKER">WORKER (POS Billing Only)</option>
                  <option value="OWNER">OWNER (Full Admin & Audit)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-gray-100 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddWorkerModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-extrabold py-2.5 rounded-xl cursor-pointer"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET USER PASSWORD MODAL */}
      {showResetPasswordModal && resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 font-['Outfit',sans-serif]">
                  Reset User Password
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  User: <span className="font-bold text-gray-900">{resetTargetUser.name}</span> (@{resetTargetUser.username})
                </p>
              </div>
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setResetTargetUser(null);
                  setResetPasswordVal('');
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">New Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl font-mono text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setResetTargetUser(null);
                    setResetPasswordVal('');
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-700 hover:bg-red-800 text-white font-extrabold py-2.5 rounded-xl transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW INVOICE DETAIL MODAL */}
      {viewInvoiceModal && (
        <InvoiceDetailModal
          invoice={viewInvoiceModal}
          settings={settings}
          onClose={() => setViewInvoiceModal(null)}
        />
      )}

      {/* IN-APP DELETE CONFIRMATION MODAL */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-gray-100 animate-in zoom-in-95">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-200 shadow-xs">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-black text-gray-900 font-['Outfit',sans-serif]">
                {deleteConfirmModal.title}
              </h3>

              <div className="my-3 px-3 py-2 bg-red-50 text-red-900 font-bold rounded-xl border border-red-200 text-sm truncate">
                {deleteConfirmModal.itemName}
              </div>

              <p className="text-xs text-gray-600 leading-relaxed mb-6">
                {deleteConfirmModal.message}
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => setDeleteConfirmModal(null)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel / ரத்து
                </button>
                <button
                  type="button"
                  disabled={isDeletingItem}
                  onClick={() => deleteConfirmModal.onConfirm()}
                  className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingItem ? 'Deleting...' : 'Yes, Delete / நீக்கு'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
