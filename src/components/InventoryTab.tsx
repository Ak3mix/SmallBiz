import React, { useState, useEffect } from 'react';
import {
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  FileSpreadsheet,
  Trash2,
  Edit,
  Image as ImageIcon,
} from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { cn } from '../utils/cn';
import { useDebounce } from '../hooks/useDebounce';
import { dataTransferService } from '../services/dataTransferService';
import { api } from '../services/api';
import { ProductFormModal } from './ProductFormModal';
import type { ProductFormData } from './ProductFormModal';
import { CardFormModal } from './CardFormModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { MoveInventoryModal } from './MoveInventoryModal';
import type { Product, Card } from '../types';

export function InventoryTab({ products, onUpdate }: { products: Product[]; onUpdate: () => void }) {
  const [activeInventoryTab, setActiveInventoryTab] = useState<'products' | 'cards'>('products');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const debouncedSearch = useDebounce(searchQuery, 300);

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[];
  const filteredProducts = products
    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
    .filter(p => debouncedSearch === '' || p.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [cards, setCards] = useState<Card[]>([]);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);

  const fetchCards = async () => {
    const data = await api.getCards();
    setCards(data);
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleSaveCard = async (data: { name: string; bank: string; account_number: string }) => {
    if (editingCard) {
      await api.updateCard(editingCard.id, data);
    } else {
      await api.addCard(data);
    }
    setShowCardForm(false);
    setEditingCard(null);
    fetchCards();
  };

  const handleDeleteCard = async (id: number) => {
    if (confirm('¿Eliminar esta tarjeta?')) {
      await api.deleteCard(id);
      fetchCards();
    }
  };

  const handleSaveProduct = async (data: ProductFormData) => {
    setIsSaving(true);
    try {
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, data);
        setEditingProduct(null);
      } else {
        await api.addProduct(data);
        setShowAddProduct(false);
      }
      onUpdate();
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert('Error al guardar el producto: ' + errorMsg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deletingProduct || isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      onUpdate();
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert('Error al eliminar el producto: ' + errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async (data: { type: 'entry' | 'waste'; quantity: number; reason: string }) => {
    if (!movingProduct) return;
    try {
      const res = await api.moveInventory({
        product_id: movingProduct.id,
        type: data.type,
        quantity: data.quantity,
        reason: data.reason || (data.type === 'entry' ? 'Reabastecimiento' : 'Merma'),
      });
      if (res) {
        setMovingProduct(null);
        onUpdate();
      } else {
        alert('Error en el movimiento');
      }
    } catch (error: any) {
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert('Error en el movimiento: ' + errorMsg);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex p-1 bg-stone-100 rounded-xl">
        <button
          onClick={() => setActiveInventoryTab('products')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            activeInventoryTab === 'products' ? 'bg-white shadow' : 'text-stone-500'
          )}
        >
          Productos
        </button>
        <button
          onClick={() => setActiveInventoryTab('cards')}
          className={cn(
            'flex-1 py-2 text-xs font-bold rounded-lg transition-all',
            activeInventoryTab === 'cards' ? 'bg-white shadow' : 'text-stone-500'
          )}
        >
          Tarjetas
        </button>
      </div>

      {activeInventoryTab === 'products' ? (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black text-stone-900">Inventario</h2>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    await dataTransferService.exportDatabase();
                    alert('Exportación exitosa');
                  } catch (e: any) {
                    console.error('Export error:', e);
                    alert('Error al exportar: ' + (e.message || e.code || JSON.stringify(e)));
                  }
                }}
                className="bg-stone-100 text-stone-900 p-2 rounded-xl active:scale-95 transition-transform"
                title="Exportar Datos"
              >
                <FileSpreadsheet size={20} />
              </button>
              <button
                onClick={async () => {
                  try {
                    const result = await FilePicker.pickFiles({
                      types: ['application/zip', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
                    });
                    if (result.files.length > 0) {
                      const file = result.files[0];
                      if (!file.path) throw new Error('No se pudo obtener la ruta del archivo');
                      const fileRead = await Filesystem.readFile({ path: file.path });

                      await dataTransferService.importDatabase(fileRead.data as string);
                      alert('Importación exitosa, la app se reiniciará');
                      window.location.reload();
                    }
                  } catch (e: any) {
                    console.error('Import error:', e);
                    alert('Error al importar: ' + (e.message || JSON.stringify(e)));
                  }
                }}
                className="bg-stone-100 text-stone-900 p-2 rounded-xl active:scale-95 transition-transform"
                title="Importar Datos"
              >
                <ArrowDownCircle size={20} />
              </button>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowAddProduct(true);
                }}
                className="bg-stone-900 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Buscar producto..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full border border-stone-200 rounded-xl px-4 py-3 text-sm"
          />

          {categories.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    'text-[10px] uppercase font-bold px-3 py-1.5 rounded-full shrink-0 transition-colors',
                    selectedCategory === cat ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-500'
                  )}
                >
                  {cat === 'all' ? 'Todos' : cat}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-3">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4"
              >
                <div className="flex items-start gap-4">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-20 h-20 object-contain rounded-xl shrink-0 bg-stone-100"
                    />
                  ) : (
                    <div className="w-20 h-20 bg-stone-100 rounded-xl shrink-0 flex items-center justify-center">
                      <ImageIcon size={32} className="text-stone-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-stone-900 text-lg leading-tight truncate">{product.name}</div>
                    <div className="text-xs text-stone-400 mt-1">
                      {product.category && (
                        <span className="inline-block bg-stone-100 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold mr-2">
                          {product.category}
                        </span>
                      )}
                      Stock:{' '}
                      <span
                        className={cn('font-bold', (product.stock ?? 0) <= 5 ? 'text-rose-600' : 'text-stone-600')}
                      >
                        {product.stock}
                      </span>
                      {(product.stock ?? 0) <= 5 && (
                        <span className="ml-1 text-[8px] bg-rose-100 text-rose-700 font-black px-1 py-0.5 rounded-full uppercase">
                          Stock Bajo
                        </span>
                      )}{' '}
                      • Precio:{' '}
                      <span className="font-bold text-emerald-600">${product.price.toFixed(2)}</span> • Costo:{' '}
                      <span className="font-bold text-stone-500">${(product.cost || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => {
                      setMovingProduct(product);
                    }}
                    className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors flex-1 flex justify-center shrink-0"
                    title="Reabastecer"
                  >
                    <ArrowUpCircle size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setMovingProduct(product);
                    }}
                    className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 transition-colors flex-1 flex justify-center shrink-0"
                    title="Merma"
                  >
                    <ArrowDownCircle size={20} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setShowAddProduct(true);
                    }}
                    className="bg-stone-50 text-stone-600 p-2.5 rounded-xl hover:bg-stone-100 transition-colors flex-1 flex justify-center shrink-0"
                    title="Editar"
                  >
                    <Edit size={20} />
                  </button>
                  <button
                    onClick={() => setDeletingProduct(product)}
                    className="bg-stone-50 text-rose-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors flex-1 flex justify-center shrink-0"
                    title="Eliminar"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="p-4 bg-white rounded-2xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">Tarjetas de Pago</h3>
            <button
              onClick={() => {
                setEditingCard(null);
                setShowCardForm(true);
              }}
              className="bg-stone-900 text-white p-2 rounded-xl"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="space-y-2">
            {cards.map(card => (
              <div key={card.id} className="p-3 bg-stone-50 rounded-xl flex justify-between items-center">
                <div>
                  <div className="font-bold">{card.name}</div>
                  <div className="text-xs text-stone-500">
                    {card.bank} - {card.account_number}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingCard(card);
                      setShowCardForm(true);
                    }}
                    className="text-stone-600"
                  >
                    <Edit size={18} />
                  </button>
                  <button onClick={() => handleDeleteCard(card.id)} className="text-rose-500">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {cards.length === 0 && (
              <div className="text-center py-8 text-stone-400 text-sm italic">
                No hay tarjetas registradas
              </div>
            )}
          </div>
        </div>
      )}

      <CardFormModal
        isOpen={showCardForm}
        initialData={editingCard}
        onSave={handleSaveCard}
        onClose={() => {
          setShowCardForm(false);
          setEditingCard(null);
        }}
      />

      <ProductFormModal
        isOpen={showAddProduct}
        initialData={editingProduct}
        isSaving={isSaving}
        onSave={handleSaveProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={!!deletingProduct}
        itemName={deletingProduct?.name || ''}
        isDeleting={isDeleting}
        onConfirm={handleDeleteProduct}
        onClose={() => setDeletingProduct(null)}
      />

      <MoveInventoryModal
        isOpen={!!movingProduct}
        product={movingProduct}
        onConfirm={handleMove}
        onClose={() => setMovingProduct(null)}
      />
    </div>
  );
}
