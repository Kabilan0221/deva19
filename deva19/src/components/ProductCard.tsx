import React, { useState } from 'react';
import { Product } from '../types';
import { ShoppingCart, Plus, Minus, Check, AlertCircle } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const savings = product.mrp - product.selling_price;
  const isOutOfStock = product.stock_quantity <= 0;
  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.min_stock_alert;

  const handleAdd = () => {
    if (isOutOfStock) return;
    onAddToCart(product, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      {/* Product Image & Badges */}
      <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Discount Badge */}
        {product.discount_percentage > 0 && (
          <div className="absolute top-2 left-2 bg-red-600 text-white font-extrabold text-xs px-2 py-0.5 rounded-md shadow-sm">
            {product.discount_percentage}% OFF
          </div>
        )}

        {/* Stock Status Badge */}
        <div className="absolute top-2 right-2">
          {isOutOfStock ? (
            <span className="bg-gray-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              Out of Stock
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-500 text-red-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
              <AlertCircle className="w-3 h-3" /> Only {product.stock_quantity} left
            </span>
          ) : (
            <span className="bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              In Stock
            </span>
          )}
        </div>
      </div>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="text-[11px] font-semibold text-red-700 tracking-wide uppercase mb-1">
            {product.category_name || 'Fireworks'}
          </div>

          <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-snug line-clamp-2 mb-1 group-hover:text-red-700 transition-colors">
            {product.name}
          </h3>

          <p className="text-xs text-gray-500 line-clamp-2 mb-3">
            {product.description}
          </p>
        </div>

        {/* Price & Savings Display */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-baseline justify-between mb-1">
            <div>
              <span className="text-xs text-gray-400 line-through mr-2 font-medium">
                MRP: ₹{product.mrp}
              </span>
              <span className="text-lg font-black text-gray-900 font-['Outfit',sans-serif]">
                ₹{product.selling_price}
              </span>
            </div>

            {savings > 0 && (
              <span className="bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                Save ₹{savings}
              </span>
            )}
          </div>

          {/* Quantity Selector & Add Button */}
          <div className="flex items-center gap-2 mt-3">
            {/* Qty +/- */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={isOutOfStock || qty <= 1}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 active:bg-gray-300"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-7 text-center font-bold text-xs text-gray-800">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty(Math.min(product.stock_quantity || 99, qty + 1))}
                disabled={isOutOfStock || qty >= product.stock_quantity}
                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-200 disabled:opacity-30 active:bg-gray-300"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Add to Cart */}
            <button
              type="button"
              onClick={handleAdd}
              disabled={isOutOfStock}
              className={`flex-1 flex items-center justify-center gap-1.5 h-8 px-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                isOutOfStock
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : added
                  ? 'bg-emerald-600 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {added ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Added!</span>
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>Add to Cart</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
