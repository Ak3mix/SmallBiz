import React from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from './Modal';

interface Props {
  isOpen: boolean;
  itemName: string;
  title?: string;
  message?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteConfirmModal({
  isOpen,
  itemName,
  title = '¿Eliminar?',
  message = 'Esta acción no se puede deshacer.',
  isDeleting = false,
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <Trash2 size={32} />
        </div>
        <p className="text-stone-500 text-sm mb-8">
          ¿Estás seguro de eliminar <span className="font-bold text-stone-800">{itemName}</span>? {message}
        </p>
        <div className="flex flex-col gap-3 w-full">
          <button
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform disabled:opacity-50"
          >
            {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
          </button>
          <button
            disabled={isDeleting}
            onClick={onClose}
            className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Modal>
  );
}
