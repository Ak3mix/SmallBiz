import { Image as ImageIcon, Package } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import type { Product } from '../types';

interface VenderGridProps {
  products: Product[];
  searchQuery: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (q: string) => void;
  onCategoryChange: (cat: string) => void;
  onAddToCart: (product: Product) => void;
}

export function VenderGrid({ products, searchQuery, selectedCategory, categories, onSearchChange, onCategoryChange, onAddToCart }: VenderGridProps) {
  return (
    <motion.div
      key="vender"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="space-y-4">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full bg-white border border-stone-200 rounded-xl p-3 pl-10 focus:ring-2 ring-stone-900 font-medium text-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => onCategoryChange(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-black uppercase whitespace-nowrap transition-all shrink-0",
                selectedCategory === cat 
                  ? "bg-stone-900 text-white" 
                  : "bg-white text-stone-500 border border-stone-200"
              )}
            >
              {cat === 'all' ? 'Todos' : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {products
            .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
            .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name))
            .map(product => (
              <button
                key={product.id}
                onClick={() => onAddToCart(product)}
                disabled={product.stock <= 0}
                className={cn(
                  "p-3 sm:p-4 rounded-3xl border text-left transition-all active:scale-95 flex flex-col justify-between min-h-[140px]",
                  product.stock > 0 
                    ? "bg-white border-stone-200 shadow-sm hover:border-emerald-200" 
                    : "bg-stone-50 border-stone-100 opacity-60 grayscale"
                )}
              >
                <div className="w-full">
                  {product.image ? (
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full aspect-square object-contain rounded-2xl mb-2 bg-stone-100"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-stone-100 rounded-2xl mb-2 flex items-center justify-center">
                      <ImageIcon size={28} className="text-stone-300" />
                    </div>
                  )}
                  <div className="font-black text-stone-900 text-sm leading-tight mb-1 line-clamp-2">{product.name}</div>
                  <div className="text-emerald-600 font-black text-base">${product.price.toFixed(2)}</div>
                  {product.category && (
                    <div className="text-[8px] uppercase font-bold text-stone-400 mt-1">{product.category}</div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-[8px] uppercase font-black text-stone-400">
                    Stock: {product.stock}
                  </div>
                  {product.stock <= 2 && product.stock > 0 && (
                    <div className="bg-amber-500 text-white text-[7px] font-black px-1 py-0.5 rounded-full uppercase">
                      Low
                    </div>
                  )}
                </div>
              </button>
            ))}
        </div>
      </div>

      {products.length === 0 && (
        <div className="text-center py-20 text-stone-400">
          <Package className="mx-auto mb-4 opacity-20" size={48} />
          <p className="font-medium">No hay productos registrados</p>
        </div>
      )}
    </motion.div>
  );
}
