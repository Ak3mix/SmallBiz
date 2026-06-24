import { Image as ImageIcon, Package, Search } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { useDebounce } from '../hooks/useDebounce';
import { Skeleton } from './Skeleton';
import { formatCurrency } from '../utils/formatCurrency';
import type { Product } from '../types';

interface VenderGridProps {
  products: Product[];
  searchQuery: string;
  selectedCategory: string;
  categories: string[];
  loading?: boolean;
  onSearchChange: (q: string) => void;
  onCategoryChange: (cat: string) => void;
  onAddToCart: (product: Product) => void;
}

function ProductSkeleton() {
  return (
    <div className="p-3 sm:p-4 rounded-3xl border border-stone-200 bg-white min-h-[140px] flex flex-col justify-between">
      <div className="w-full">
        <Skeleton.Box className="w-full aspect-square rounded-2xl mb-2" />
        <Skeleton.Box className="h-4 w-3/4 mb-1" />
        <Skeleton.Box className="h-5 w-1/2 mb-1" />
        <Skeleton.Box className="h-3 w-1/3" />
      </div>
      <div className="flex justify-between items-center mt-2">
        <Skeleton.Box className="h-3 w-12" />
        <Skeleton.Box className="h-3 w-8 rounded-full" />
      </div>
    </div>
  );
}

export function VenderGrid({ products, searchQuery, selectedCategory, categories, loading = false, onSearchChange, onCategoryChange, onAddToCart }: VenderGridProps) {
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => debouncedSearch === '' || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

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
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <ProductSkeleton key={i} />)
          ) : filteredProducts.length === 0 && products.length > 0 ? (
            <div className="col-span-full text-center py-16 text-stone-500">
              <Search className="mx-auto mb-4 opacity-20" size={48} />
              <p className="font-medium">No se encontraron productos</p>
            </div>
          ) : (
            filteredProducts.map(product => (
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
                      loading="lazy"
                      className="w-full aspect-square object-contain rounded-2xl mb-2 bg-stone-100"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-stone-100 rounded-2xl mb-2 flex items-center justify-center">
                      <ImageIcon size={28} className="text-stone-300" />
                    </div>
                  )}
                  <div className="font-black text-stone-900 text-sm leading-tight mb-1 line-clamp-2">{product.name}</div>
                  <div className="text-emerald-600 font-black text-base">{formatCurrency(product.price)}</div>
                  {product.category && (
                    <div className="text-[10px] uppercase font-bold text-stone-500 mt-1">{product.category}</div>
                  )}
                </div>
                <div className="flex justify-between items-center mt-2">
                  <div className="text-[10px] uppercase font-black text-stone-500">
                    Stock: {product.stock}
                  </div>
                  {product.stock <= 5 && product.stock > 0 && (
                    <div className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase">
                      Low
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {!loading && products.length === 0 && (
        <div className="text-center py-20 text-stone-500">
          <Package className="mx-auto mb-4 opacity-20" size={48} />
          <p className="font-medium">No hay productos registrados</p>
        </div>
      )}
    </motion.div>
  );
}
