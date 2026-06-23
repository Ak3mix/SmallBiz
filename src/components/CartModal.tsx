import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus, Trash2, XCircle, Image as ImageIcon } from 'lucide-react';
import type { CartItem } from '../types';

interface CartModalProps {
  show: boolean;
  cart: CartItem[];
  cartTotal: number;
  onClose: () => void;
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
  onProceedToPayment: () => void;
}

export function CartModal({ show, cart, cartTotal, onClose, onRemove, onUpdateQuantity, onProceedToPayment }: CartModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ y: "100%" }} 
            animate={{ y: 0 }} 
            exit={{ y: "100%" }} 
            className="bg-white w-full max-w-md rounded-t-[40px] p-6 pb-8 shadow-2xl max-h-[90vh] max-h-[90dvh] flex flex-col"
          >
            <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6 shrink-0" />
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-2xl font-black">Tu Carrito</h3>
              <button onClick={onClose} className="text-stone-400 p-2"><XCircle size={24} /></button>
            </div>
            
            <div className="overflow-y-auto flex-1 space-y-3 mb-6 pr-1">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                  {item.image ? (
                    <img 
                      src={item.image} 
                      alt={item.name}
                      className="w-16 h-16 object-contain rounded-xl bg-stone-100 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                      <ImageIcon size={24} className="text-stone-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-stone-800 truncate">{item.name}</div>
                    <div className="text-xs text-stone-500">${item.price.toFixed(2)} c/u</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-xl border border-stone-200 p-1">
                      <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 text-stone-400 hover:text-stone-600">
                        <Minus size={16} />
                      </button>
                      <span className="w-8 text-center font-bold">{item.quantity}</span>
                      <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 text-stone-400 hover:text-stone-600">
                        <Plus size={16} />
                      </button>
                    </div>
                    <button onClick={() => onRemove(item.id)} className="text-rose-400 p-1">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-stone-100 shrink-0">
              <div className="flex justify-between items-center mb-6">
                <span className="text-stone-500 font-bold uppercase text-xs tracking-widest">Total a pagar</span>
                <span className="text-3xl font-black text-stone-900">${cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={onProceedToPayment}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-transform"
              >
                Continuar al Pago
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
