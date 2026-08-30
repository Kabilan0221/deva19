import React from 'react';
import { Category } from '../types';
import { Sparkles } from 'lucide-react';

interface CategorySectionProps {
  categories: Category[];
  selectedCategory: number | 'all';
  onSelectCategory: (id: number | 'all') => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
}) => {
  return (
    <section id="categories" className="py-10 bg-gray-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col items-center text-center justify-center mb-8">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-red-600 mb-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Full Crackers Assortment • நேரடி சிவகாசி பட்டாசுகள்</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 font-['Outfit',sans-serif]">
            Popular Product Categories / பட்டாசு வகைகள்
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mt-1.5">
            Browse high-quality sparklers, ground chakkars, flower pots, rockets, and family gift boxes.
          </p>

          <button
            onClick={() => onSelectCategory('all')}
            className={`mt-4 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-red-700 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-red-500 hover:text-red-700'
            }`}
          >
            Show All ({categories.length} Categories / அனைத்தும்)
          </button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`group cursor-pointer bg-white rounded-2xl p-3 border transition-all hover:shadow-md flex flex-col items-center text-center ${
                  isSelected
                    ? 'border-red-600 ring-2 ring-red-500/20 shadow-sm'
                    : 'border-gray-200 hover:border-red-300'
                }`}
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden mb-2.5 bg-gray-100 relative">
                  <img
                    src={cat.image_url}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  {isSelected && (
                    <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                      <span className="bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    </div>
                  )}
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-gray-900 group-hover:text-red-600 line-clamp-1">
                  {cat.name}
                </h3>
                <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                  {cat.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
