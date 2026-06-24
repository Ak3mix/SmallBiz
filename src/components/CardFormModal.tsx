import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

interface CardFormData {
  name: string;
  bank: string;
  account_number: string;
}

interface Props {
  isOpen: boolean;
  initialData?: { id: number; name: string; bank: string; account_number: string } | null;
  onSave: (data: CardFormData) => Promise<void>;
  onClose: () => void;
}

export function CardFormModal({ isOpen, initialData, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setBank(initialData.bank || '');
      setAccount(initialData.account_number || '');
    } else {
      setName('');
      setBank('');
      setAccount('');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({ name, bank, account_number: account });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Editar Tarjeta' : 'Nueva Tarjeta'}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-8">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nombre (Ej: Banco X)"
            required
            className="w-full bg-stone-50 border-none rounded-xl p-3"
          />
          <input
            value={bank}
            onChange={e => setBank(e.target.value)}
            placeholder="Banco"
            required
            className="w-full bg-stone-50 border-none rounded-xl p-3"
          />
          <input
            value={account}
            onChange={e => setAccount(e.target.value)}
            placeholder="Número de cuenta"
            required
            className="w-full bg-stone-50 border-none rounded-xl p-3"
          />
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
          <button type="submit" className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold">Guardar</button>
        </div>
      </form>
    </Modal>
  );
}
