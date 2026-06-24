import React, { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Modal } from './Modal';
import { ImagePicker } from './ImagePicker';
import { MigrationService } from '../services/migration';
import type { Product } from '../types';

export interface ProductFormData {
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  image: string | null;
}

interface Props {
  isOpen: boolean;
  initialData?: Product | null;
  isSaving?: boolean;
  onSave: (data: ProductFormData) => Promise<void>;
  onClose: () => void;
}

export function ProductFormModal({ isOpen, initialData, isSaving = false, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; price?: string; stock?: string }>({});

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPrice(initialData.price.toString());
      setCost((initialData.cost || 0).toString());
      setStock(initialData.stock.toString());
      setCategory(initialData.category || '');
      setImage(initialData.image || null);
    } else {
      setName('');
      setPrice('');
      setCost('');
      setStock('');
      setCategory('');
      setImage(null);
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: typeof errors = {};

    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost) || 0;
    const stockNum = parseInt(stock);

    if (!name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio';
    }
    if (isNaN(priceNum)) {
      newErrors.price = 'Ingresa un valor numérico válido';
    }
    if (isNaN(stockNum)) {
      newErrors.stock = 'Ingresa un número válido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});

    const processedImage = image && image.startsWith('data:image')
      ? await MigrationService.saveImage(image)
      : image;

    await onSave({
      name: name.trim(),
      price: priceNum,
      cost: costNum,
      stock: stockNum,
      category: category.trim(),
      image: processedImage,
    });
  };

  if (!isOpen) return null;

  const isEditing = !!initialData;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Producto' : 'Nuevo Producto'}>
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: undefined })); }}
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'product-name-error' : undefined}
              className="w-full bg-stone-50 border-none rounded-xl p-3 font-bold"
            />
            {errors.name && <p id="product-name-error" className="text-xs text-rose-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
            <input
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder="Ej: Bebidas, Snacks, etc."
              className="w-full bg-stone-50 border-none rounded-xl p-3"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
            <ImagePicker
              currentImage={image}
              onImageCapture={setImage}
              onImageClear={() => setImage(null)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={e => { setPrice(e.target.value); setErrors(prev => ({ ...prev, price: undefined })); }}
                required
                aria-invalid={!!errors.price}
                aria-describedby={errors.price ? 'product-price-error' : undefined}
                className="w-full bg-stone-50 border-none rounded-xl p-3"
              />
              {errors.price && <p id="product-price-error" className="text-xs text-rose-500 mt-1">{errors.price}</p>}
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="0"
                className="w-full bg-stone-50 border-none rounded-xl p-3"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">
                {isEditing ? 'Stock' : 'Stock Inicial'}
              </label>
              <input
                type="number"
                min="0"
                value={stock}
                onChange={e => { setStock(e.target.value); setErrors(prev => ({ ...prev, stock: undefined })); }}
                required
                aria-invalid={!!errors.stock}
                aria-describedby={errors.stock ? 'product-stock-error' : undefined}
                className="w-full bg-stone-50 border-none rounded-xl p-3"
              />
              {errors.stock && <p id="product-stock-error" className="text-xs text-rose-500 mt-1">{errors.stock}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
          <button type="submit" disabled={isSaving} className={cn(
            "flex-1 py-3 text-white rounded-xl font-bold disabled:opacity-50",
            isEditing ? "bg-emerald-600" : "bg-stone-900"
          )}>
            {isSaving ? (isEditing ? 'Actualizando...' : 'Guardando...') : (isEditing ? 'Actualizar' : 'Guardar')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
