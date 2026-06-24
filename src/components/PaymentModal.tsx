import { motion } from 'motion/react';
import { DollarSign, CreditCard } from 'lucide-react';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/formatCurrency';
import { Modal } from './Modal';

interface PaymentModalProps {
  show: boolean;
  cartTotal: number;
  cards: any[];
  paymentMethod: 'cash' | 'transfer' | 'split' | null;
  selectedCardId: number | null;
  splitPayments: { cash: number; transfer: number };
  cashInput: string;
  transferInput: string;
  loading: boolean;
  onClose: () => void;
  onPaymentMethodChange: (method: 'cash' | 'transfer' | 'split') => void;
  onCardChange: (id: number) => void;
  onCashInputChange: (value: string) => void;
  onTransferInputChange: (value: string) => void;
  onProcessSale: () => void;
}

export function PaymentModal({
  show,
  cartTotal,
  cards,
  paymentMethod,
  selectedCardId,
  splitPayments,
  cashInput,
  transferInput,
  loading,
  onClose,
  onPaymentMethodChange,
  onCardChange,
  onCashInputChange,
  onTransferInputChange,
  onProcessSale,
}: PaymentModalProps) {
  return (
    <Modal isOpen={show} onClose={onClose} title="Método de Pago" variant="bottom-sheet">
      <p className="text-stone-500 text-center mb-6 -mt-4">Selecciona cómo pagará el cliente</p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => onPaymentMethodChange('cash')}
          className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'cash' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-100 bg-stone-50 text-stone-500")}
        >
          <DollarSign size={28} />
          <span className="font-bold text-xs">Efectivo</span>
        </button>
        <button
          onClick={() => onPaymentMethodChange('transfer')}
          className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'transfer' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-100 bg-stone-50 text-stone-500")}
        >
          <CreditCard size={28} />
          <span className="font-bold text-xs">Transferencia</span>
        </button>
        <button
          onClick={() => onPaymentMethodChange('split')}
          className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'split' ? "border-purple-500 bg-purple-50 text-purple-700" : "border-stone-100 bg-stone-50 text-stone-500")}
        >
          <div className="flex items-center gap-1">
            <DollarSign size={14} />
            <span className="text-xs font-black">+</span>
            <CreditCard size={14} />
          </div>
          <span className="font-bold text-xs">Combinado</span>
        </button>
      </div>

      {(paymentMethod === 'transfer' || paymentMethod === 'split') && (
        <div className="mb-6">
          <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Tarjeta Destino</label>
          <select
            value={selectedCardId || ''}
            onChange={(e) => onCardChange(Number(e.target.value))}
            className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold"
          >
            <option value="">Seleccionar tarjeta</option>
            {cards.map(card => (
              <option key={card.id} value={card.id}>{card.name} - {card.bank}</option>
            ))}
          </select>
        </div>
      )}

      {paymentMethod === 'split' && (
        <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-6 space-y-4">
          <div className="text-center mb-2">
            <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Total a pagar</p>
            <p className="text-2xl font-black text-purple-700">{formatCurrency(cartTotal)}</p>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block flex items-center gap-2">
              <DollarSign size={12} /> Efectivo
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={cashInput}
              onChange={(e) => onCashInputChange(e.target.value)}
              className="w-full bg-white border-2 border-purple-200 rounded-xl p-3 focus:ring-2 ring-purple-500 font-bold text-lg"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block flex items-center gap-2">
              <CreditCard size={12} /> Transferencia
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={transferInput}
              onChange={(e) => onTransferInputChange(e.target.value)}
              className="w-full bg-white border-2 border-blue-200 rounded-xl p-3 focus:ring-2 ring-blue-500 font-bold text-lg"
            />
          </div>

          <div className="pt-3 border-t border-purple-200">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-purple-600 uppercase">Suma:</span>
              <span className={cn("text-lg font-black", Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) < 0.01 ? "text-emerald-600" : "text-rose-500")}>
                {formatCurrency(splitPayments.cash + splitPayments.transfer)}
              </span>
            </div>
            {Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01 && (
              <p className="text-xs text-rose-500 font-bold mt-1">
                La suma debe ser igual al total ({formatCurrency(cartTotal)})
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100">Cancelar</button>
        <button
          disabled={!paymentMethod || loading || (paymentMethod === 'split' && Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01)}
          onClick={onProcessSale}
          className="flex-[2] py-4 rounded-2xl font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-100 disabled:opacity-50"
        >
          {loading ? "Procesando..." : "Confirmar Venta"}
        </button>
      </div>
    </Modal>
  );
}
