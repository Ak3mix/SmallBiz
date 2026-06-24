import { Plus, Minus, Trash2, Image as ImageIcon } from 'lucide-react';
import { Modal } from './Modal';
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
    <Modal isOpen={show} onClose={onClose} title="Tu Carrito" variant="bottom-sheet">
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
                <button
                  onClick={() => onUpdateQuantity(item.id, -1)}
                  className="p-1 text-stone-400 hover:text-stone-600"
                  aria-label="Reducir cantidad"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-bold">{item.quantity}</span>
                <button
                  onClick={() => onUpdateQuantity(item.id, 1)}
                  className="p-1 text-stone-400 hover:text-stone-600"
                  aria-label="Aumentar cantidad"
                >
                  <Plus size={16} />
                </button>
              </div>
              <button
                onClick={() => onRemove(item.id)}
                className="text-rose-400 p-1"
                aria-label={`Eliminar ${item.name} del carrito`}
              >
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
    </Modal>
  );
}
