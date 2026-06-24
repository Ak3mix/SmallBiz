import React, { useState } from 'react';
import { cn } from '../utils/cn';
import { Modal } from './Modal';
import type { Product } from '../types';

interface MoveData {
  type: 'entry' | 'waste';
  quantity: number;
  reason: string;
}

interface Props {
  isOpen: boolean;
  product: Product | null;
  onConfirm: (data: MoveData) => Promise<void>;
  onClose: () => void;
}

export function MoveInventoryModal({ isOpen, product, onConfirm, onClose }: Props) {
  const [moveType, setMoveType] = useState<'entry' | 'waste'>('entry');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState<string>('');

  const handleConfirm = async () => {
    await onConfirm({ type: moveType, quantity: moveQty, reason: moveReason });
    setMoveQty(1);
    setMoveReason('');
  };

  if (!isOpen || !product) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={moveType === 'entry' ? 'Reabastecer' : 'Registrar Merma'}
    >
      <p className="text-stone-500 text-sm mb-6">{product.name}</p>
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setMoveType('entry')}
          className={cn(
            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
            moveType === 'entry' ? "bg-blue-600 text-white" : "bg-stone-100 text-stone-500"
          )}
        >
          Entrada
        </button>
        <button
          type="button"
          onClick={() => setMoveType('waste')}
          className={cn(
            "flex-1 py-2 rounded-xl text-xs font-bold transition-all",
            moveType === 'waste' ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-500"
          )}
        >
          Merma
        </button>
      </div>
      <div className="space-y-4 mb-8">
        <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Cantidad</label>
          <input
            type="number"
            min="1"
            value={moveQty}
            onChange={e => setMoveQty(parseInt(e.target.value) || 0)}
            className="w-full bg-stone-50 border-none rounded-xl p-3"
          />
        </div>
        {moveType === 'waste' && (
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block">Motivo (Opcional)</label>
            <input
              placeholder="Ej: Caducidad, Daño..."
              value={moveReason}
              onChange={e => setMoveReason(e.target.value)}
              className="w-full bg-stone-50 border-none rounded-xl p-3"
            />
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
        <button
          onClick={handleConfirm}
          className={cn(
            "flex-1 py-3 text-white rounded-xl font-bold",
            moveType === 'entry' ? "bg-blue-600" : "bg-rose-600"
          )}
        >
          Confirmar
        </button>
      </div>
    </Modal>
  );
}
