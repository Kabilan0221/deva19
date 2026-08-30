import React from 'react';
import { CartItem } from '../types';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onUpdateQty: (productId: number, newQty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const totalMrp = items.reduce((sum, item) => sum + item.product.mrp * item.quantity, 0);
  const grandTotal = items.reduce((sum, item) => sum + item.product.selling_price * item.quantity, 0);
  const totalSavings = totalMrp - grandTotal;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 bg-red-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <h2 className="font-extrabold text-base tracking-tight font-['Outfit',sans-serif]">
                Your Cracker Basket ({items.reduce((s, i) => s + i.quantity, 0)} Items)
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="text-center py-16 px-4">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-gray-800 text-base mb-1">Your cart is empty</h3>
                <p className="text-xs text-gray-500 max-w-xs mx-auto mb-6">
                  Add your favorite Sivakasi sparklers, rockets, and gift boxes to start your festival booking!
                </p>
                <button
                  onClick={onClose}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                >
                  Browse Cracker Catalogue
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                  <span className="text-xs font-bold text-gray-600 uppercase">Selected Items</span>
                  <button
                    onClick={onClearCart}
                    className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 font-semibold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Cart</span>
                  </button>
                </div>

                {items.map(({ product, quantity }) => {
                  const itemTotal = product.selling_price * quantity;
                  return (
                    <div
                      key={product.id}
                      className="flex gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200/80 items-center justify-between"
                    >
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                      />

                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="text-xs font-bold text-gray-900 line-clamp-1">
                          {product.name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-bold text-red-700">₹{product.selling_price}</span>
                          <span className="text-[11px] text-gray-400 line-through">₹{product.mrp}</span>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-2xs">
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity - 1)}
                              className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer touch-manipulation select-none active:bg-gray-100"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-black text-gray-900 border-x border-gray-100">{quantity}</span>
                            <button
                              type="button"
                              onClick={() => onUpdateQty(product.id, quantity + 1)}
                              disabled={quantity >= product.stock_quantity}
                              className="w-7 h-7 flex items-center justify-center text-gray-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors cursor-pointer touch-manipulation select-none active:bg-gray-100"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemoveItem(product.id)}
                            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs text-gray-500 font-medium">Subtotal</div>
                        <div className="text-sm font-black text-gray-900">₹{itemTotal}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          {/* Footer & Totals */}
          {items.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              {/* Savings Announcement */}
              {totalSavings > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Total Factory Savings:</span>
                  </span>
                  <span className="text-sm font-extrabold text-emerald-700">
                    ₹{totalSavings.toLocaleString('en-IN')}
                  </span>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-1.5 text-xs text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal (Total MRP):</span>
                  <span>₹{totalMrp.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Factory Direct Discount:</span>
                  <span>- ₹{totalSavings.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between font-black text-base text-gray-900 pt-2 border-t border-gray-200">
                  <span>Final Payable Total:</span>
                  <span className="text-red-700">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                onClick={onCheckout}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 active:scale-95 transition-all"
              >
                <span>Proceed To Delivery Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[10px] text-gray-400 text-center mt-2">
                🔒 Safe packing & Direct Sivakasi dispatch guarantee
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
