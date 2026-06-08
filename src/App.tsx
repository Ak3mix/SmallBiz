import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  ClipboardList, 
  Plus, 
  Minus, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  CheckCircle2, 
  XCircle, 
  FileSpreadsheet,
  Trash2,
  DollarSign,
  CreditCard,
  Edit,
  Camera as CameraIcon,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { api } from './services/api';
import { dbService } from './services/database';
import { MigrationService } from './services/migration';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Types
interface Product {
  id: number;
  name: string;
  price: number;
  cost: number;
  stock: number;
  initial_stock: number;
  category: string;
  image?: string;
}

interface CartItem extends Product {
  quantity: number;
}

interface Movement {
  id: number;
  product_id: number;
  product_name: string;
  type: 'entry' | 'waste' | 'sale';
  quantity: number;
  reason: string;
  timestamp: string;
}

interface Sale {
  id: number;
  total: number;
  payment_method: 'cash' | 'transfer' | 'split';
  payments?: { method: 'cash' | 'transfer'; amount: number }[];
  payments_json?: string;
  timestamp: string;
}

interface Session {
  id: number;
  start_time: string;
  end_time: string | null;
  is_closed: number;
}

// Components
function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 p-2 transition-all relative",
        active ? "text-emerald-600" : "text-stone-400"
      )}
    >
      {active && (
        <motion.div 
          layoutId="nav-active"
          className="absolute -top-2 w-8 h-1 bg-emerald-600 rounded-full"
        />
      )}
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
    </button>
  );
}

function InventoryTab({ products, onUpdate }: { products: Product[], onUpdate: () => void }) {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Product | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [moveType, setMoveType] = useState<'entry' | 'waste'>('entry');
  const [moveQty, setMoveQty] = useState(1);
  const [moveReason, setMoveReason] = useState('');

  // Form states
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCost, setFormCost] = useState('');
  const [formStock, setFormStock] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formImage, setFormImage] = useState<string | null>(null);

  const takePhoto = async () => {
    try {
      const photo = await Camera.getPhoto({
        quality: 80,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        preserveAspectRatio: true,
        correctOrientation: true,
      });
      
      if (photo.webPath) {
        // Copiar a almacenamiento interno
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        
        // Convertir blob a base64 para guardar
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        setFormImage(base64Data);
      }
    } catch (error: any) {
      console.error('Error al tomar foto:', error);
      alert('Error al tomar la foto.');
    }
  };

  const selectFile = async () => {
    try {
      const result = await FilePicker.pickImages({
        multiple: false
      });
      
      if (result.files && result.files.length > 0) {
        const file = result.files[0];
        
        // En Android/iOS nativo, usamos el Filesystem para leer el archivo de forma robusta
        if (Capacitor.isNativePlatform()) {
          if (!file.path) {
            alert('No se pudo obtener la ruta del archivo.');
            return;
          }
          
          const fileRead = await Filesystem.readFile({
            path: file.path,
          });
          
          const mimeType = file.mimeType || 'image/jpeg';
          setFormImage(`data:${mimeType};base64,${fileRead.data}`);
        } else {
          // En web, usamos un fetch tradicional o reader
          const path = file.webPath || file.path;
          if (!path) return;

          const response = await fetch(path);
          const blob = await response.blob();
          
          const base64Data = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          
          setFormImage(base64Data);
        }
      }
    } catch (error) {
      console.error('Error al seleccionar archivo:', error);
      alert('Error al seleccionar el archivo.');
    }
  };

  const handleFileSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Usamos createObjectURL para vista previa eficiente sin cargar toda la imagen en memoria
      const previewUrl = URL.createObjectURL(file);
      
      // Convertimos a base64 solo para guardar, o idealmente guarda directamente en filesystem
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        setFormImage(base64); // Mantenemos el preview
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error al procesar archivo:', error);
      alert('Error al seleccionar el archivo. Intenta con otra imagen.');
    }
  };

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };


  useEffect(() => {
    if (showEditProduct) {
      setFormName(showEditProduct.name);
      setFormPrice(showEditProduct.price.toString());
      setFormCost((showEditProduct.cost || 0).toString());
      setFormStock(showEditProduct.stock.toString());
      setFormCategory(showEditProduct.category || '');
      setFormImage(showEditProduct.image || null);
    } else if (showAddProduct) {
      setFormName('');
      setFormPrice('');
      setFormCost('');
      setFormStock('');
      setFormCategory('');
      setFormImage(null);
    }
  }, [showEditProduct, showAddProduct]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleAddProduct: Start");
    if (isSaving) {
      console.log("handleAddProduct: Already saving, skipping");
      return;
    }
    
    const price = parseFloat(formPrice);
    const cost = parseFloat(formCost) || 0;
    const stock = parseInt(formStock);

    if (isNaN(price) || isNaN(stock)) {
      console.log("handleAddProduct: Validation failed (NaN)");
      alert("Por favor ingresa valores numéricos válidos (Precio y Stock)");
      return;
    }

    if (!formName.trim()) {
      console.log("handleAddProduct: Validation failed (empty name)");
      alert("El nombre del producto es obligatorio");
      return;
    }

    const data = {
      name: formName.trim(),
      price,
      cost,
      stock,
      initial_stock: stock,
      category: formCategory.trim(),
      image: formImage && formImage.startsWith('data:image') ? await MigrationService.saveImage(formImage) : formImage
    };

    console.log("handleAddProduct: Sending data:", data);
    setIsSaving(true);
    try {
      const res = await api.addProduct(data);

      console.log("handleAddProduct: Response received");
      if (res) {
        console.log("handleAddProduct: Success, closing modal and updating");
        setShowAddProduct(false);
        onUpdate();
        setTimeout(() => alert("¡Producto guardado con éxito!"), 100);
      } else {
        alert("Error al guardar el producto");
      }
    } catch (error: any) {
      console.error("handleAddProduct: Catch error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al guardar el producto: " + errorMsg);
    } finally {
      console.log("handleAddProduct: Finally block reached");
      setIsSaving(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("handleEditProduct: Start");
    if (!showEditProduct || isSaving) {
      console.log("handleEditProduct: Not editing or already saving, skipping");
      return;
    }

    const price = parseFloat(formPrice);
    const cost = parseFloat(formCost) || 0;
    const stock = parseInt(formStock);

    if (isNaN(price) || isNaN(stock)) {
      console.log("handleEditProduct: Validation failed (NaN)");
      alert("Por favor ingresa valores numéricos válidos");
      return;
    }

    const data = {
      name: formName.trim(),
      price,
      cost,
      stock,
      category: formCategory.trim(),
      image: formImage && formImage.startsWith('data:image') ? await MigrationService.saveImage(formImage) : formImage
    };

    console.log("handleEditProduct: Sending data", data);
    setIsSaving(true);
    try {
      const res = await api.updateProduct(showEditProduct.id, data);

      console.log("handleEditProduct: Response received");
      if (res) {
        console.log("handleEditProduct: Success, closing modal and updating");
        setShowEditProduct(null);
        onUpdate();
        setTimeout(() => alert("¡Producto actualizado con éxito!"), 100);
      } else {
        alert("Error al actualizar el producto");
      }
    } catch (error: any) {
      console.error("handleEditProduct: Catch error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al actualizar el producto: " + errorMsg);
    } finally {
      console.log("handleEditProduct: Finally block reached");
      setIsSaving(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!showDeleteConfirm || isDeleting) return;
    setIsDeleting(true);
    try {
      const res = await api.deleteProduct(showDeleteConfirm.id);
      if (res) {
        setShowDeleteConfirm(null);
        onUpdate();
      } else {
        alert("No se pudo eliminar el producto");
      }
    } catch (error: any) {
      console.error("handleDeleteProduct error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al eliminar el producto: " + errorMsg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMove = async () => {
    if (!showMoveModal) return;
    try {
      const res = await api.moveInventory({
        product_id: showMoveModal.id,
        type: moveType,
        quantity: moveQty,
        reason: moveReason || (moveType === 'entry' ? 'Reabastecimiento' : 'Merma')
      });
      if (res) {
        setShowMoveModal(null);
        setMoveQty(1);
        setMoveReason('');
        onUpdate();
      } else {
        alert("Error en el movimiento");
      }
    } catch (error: any) {
      console.error("handleMove error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error en el movimiento: " + errorMsg);
    }
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-stone-900">Inventario</h2>
        <button 
          onClick={() => { setShowAddProduct(true); }}
          className="bg-stone-900 text-white p-2 rounded-xl shadow-lg active:scale-95 transition-transform shrink-0"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="space-y-3">
        {products
          .sort((a, b) => a.name.localeCompare(b.name))
          .map(product => (
          <div key={product.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {product.image ? (
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-xl shrink-0 bg-stone-100"
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
                    <span className="inline-block bg-stone-100 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold mr-2">{product.category}</span>
                  )}
                  Stock: <span className="font-bold text-stone-600">{product.stock}</span> • 
                  Precio: <span className="font-bold text-emerald-600">${product.price.toFixed(2)}</span> •
                  Costo: <span className="font-bold text-stone-500">${(product.cost || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button 
                onClick={() => { setShowMoveModal(product); setMoveType('entry'); }}
                className="bg-blue-50 text-blue-600 p-2.5 rounded-xl hover:bg-blue-100 transition-colors flex-1 flex justify-center shrink-0"
                title="Reabastecer"
              >
                <ArrowUpCircle size={20} />
              </button>
              <button 
                onClick={() => { setShowMoveModal(product); setMoveType('waste'); }}
                className="bg-rose-50 text-rose-600 p-2.5 rounded-xl hover:bg-rose-100 transition-colors flex-1 flex justify-center shrink-0"
                title="Merma"
              >
                <ArrowDownCircle size={20} />
              </button>
              <button 
                onClick={() => { setShowEditProduct(product); }}
                className="bg-stone-50 text-stone-600 p-2.5 rounded-xl hover:bg-stone-100 transition-colors flex-1 flex justify-center shrink-0"
                title="Editar"
              >
                <Edit size={20} />
              </button>
              <button 
                onClick={() => setShowDeleteConfirm(product)}
                className="bg-stone-50 text-rose-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-colors flex-1 flex justify-center shrink-0"
                title="Eliminar"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals for Inventory */}
      <AnimatePresence>
        {showAddProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <form onSubmit={handleAddProduct}>
                <h3 className="text-xl font-black mb-6">Nuevo Producto</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
                    <input 
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required 
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
                    <input 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      placeholder="Ej: Bebidas, Snacks, etc."
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
                    <div className="flex gap-3 items-center">
                      {formImage ? (
                        <div className="relative">
                          <img src={formImage} alt="Vista previa" className="w-24 h-24 object-cover rounded-xl bg-stone-100" />
                          <button
                            type="button"
                            onClick={() => setFormImage(null)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={takePhoto}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border-2 border-emerald-200"
                          >
                            <CameraIcon size={32} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 mt-1 font-bold">📷 Tomar foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectFile}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200"
                          >
                            <ImageIcon size={32} className="text-blue-500" />
                            <span className="text-[10px] text-blue-600 mt-1 font-bold">📁 Seleccionar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formPrice}
                        onChange={e => setFormPrice(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formCost}
                        onChange={e => setFormCost(e.target.value)}
                        placeholder="0"
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Stock Inicial</label>
                      <input 
                        type="number" 
                        value={formStock}
                        onChange={e => setFormStock(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowAddProduct(false)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-stone-900 text-white rounded-xl font-bold disabled:opacity-50">
                    {isSaving ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <form onSubmit={handleEditProduct}>
                <h3 className="text-xl font-black mb-6">Editar Producto</h3>
                <div className="space-y-4 mb-8">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Nombre</label>
                    <input 
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      required 
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900 font-bold" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Categoría</label>
                    <input 
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value)}
                      placeholder="Ej: Bebidas, Snacks, etc."
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Foto del producto</label>
                    <div className="flex gap-3 items-center">
                      {formImage ? (
                        <div className="relative">
                          <img src={formImage} alt="Vista previa" className="w-24 h-24 object-cover rounded-xl bg-stone-100" />
                          <button
                            type="button"
                            onClick={() => setFormImage(null)}
                            className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full hover:bg-rose-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={takePhoto}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors border-2 border-emerald-200"
                          >
                            <CameraIcon size={32} className="text-emerald-500" />
                            <span className="text-[10px] text-emerald-600 mt-1 font-bold">📷 Tomar foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={selectFile}
                            className="flex flex-col items-center justify-center w-24 h-24 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200"
                          >
                            <ImageIcon size={32} className="text-blue-500" />
                            <span className="text-[10px] text-blue-600 mt-1 font-bold">📁 Seleccionar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Precio</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formPrice}
                        onChange={e => setFormPrice(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Costo</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={formCost}
                        onChange={e => setFormCost(e.target.value)}
                        placeholder="0"
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Stock</label>
                      <input 
                        type="number" 
                        value={formStock}
                        onChange={e => setFormStock(e.target.value)}
                        required 
                        className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                      />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowEditProduct(null)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold disabled:opacity-50">
                    {isSaving ? "Actualizando..." : "Actualizar"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">¿Eliminar Producto?</h3>
              <p className="text-stone-500 text-sm mb-8">
                ¿Estás seguro de eliminar <span className="font-bold text-stone-800">{showDeleteConfirm.name}</span>? Esta acción no se puede deshacer.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  disabled={isDeleting}
                  onClick={handleDeleteProduct}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform disabled:opacity-50"
                >
                  {isDeleting ? "Eliminando..." : "Sí, Eliminar"}
                </button>
                <button 
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showMoveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-6 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-2">
                {moveType === 'entry' ? 'Reabastecer' : 'Registrar Merma'}
              </h3>
              <p className="text-stone-500 text-sm mb-6">{showMoveModal.name}</p>
              
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Cantidad</label>
                  <input 
                    type="number" 
                    value={moveQty} 
                    onChange={e => setMoveQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                  />
                </div>
                {moveType === 'waste' && (
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-400 mb-1 block">Motivo (Opcional)</label>
                    <input 
                      placeholder="Ej: Caducidad, Daño..."
                      value={moveReason}
                      onChange={e => setMoveReason(e.target.value)}
                      className="w-full bg-stone-50 border-none rounded-xl p-3 focus:ring-2 ring-stone-900" 
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowMoveModal(null)} className="flex-1 py-3 font-bold text-stone-500">Cancelar</button>
                <button 
                  onClick={handleMove}
                  className={cn(
                    "flex-1 py-3 text-white rounded-xl font-bold",
                    moveType === 'entry' ? "bg-blue-600" : "bg-rose-600"
                  )}
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReportsTab({ products, onSessionClose }: { products: Product[], onSessionClose: () => void }) {
  const [reportData, setReportData] = useState<{ sales: Sale[], movements: Movement[], session: Session } | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  const fetchReport = async () => {
    try {
      const data = await api.getCurrentReport();
      setReportData(data);
    } catch (e) {
      console.error("Error fetching report", e);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.getSessionHistory();
      setHistory(data);
    } catch (e) {
      console.error("Error fetching history", e);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchHistory();
  }, []);

  const handleCloseDay = async () => {
    setShowConfirmClose(false);
    setIsClosing(true);
    try {
      const res = await api.closeSession();
      if (res) {
        await fetchReport();
        await fetchHistory();
        onSessionClose();
        alert("Jornada cerrada correctamente. Se ha iniciado una nueva.");
      } else {
        alert("No se pudo cerrar la jornada");
      }
    } catch (error) {
      console.error("handleCloseDay error:", error);
      alert("Error al cerrar la jornada. Intente nuevamente.");
    } finally {
      setIsClosing(false);
    }
  };

  const exportSessionExcel = async (sessionId: number, sessionDate: string) => {
    try {
      const data = await api.getSessionReport(sessionId);
      
      const totals = data.sales.reduce((acc: any, s: any) => {
        if (s.payment_method === 'cash') {
          acc.cash += s.total;
        } else if (s.payment_method === 'transfer') {
          acc.transfer += s.total;
        } else if (s.payment_method === 'split' && s.payments_json) {
          // For split payments, parse the payments_json and add to each total
          const payments = JSON.parse(s.payments_json);
          for (const payment of payments) {
            if (payment.method === 'cash') {
              acc.cash += payment.amount;
            } else if (payment.method === 'transfer') {
              acc.transfer += payment.amount;
            }
          }
        } else if (s.payment_method === 'split' && s.payments && Array.isArray(s.payments)) {
          // Handle case where payments is already an array (not yet stringified)
          for (const payment of s.payments) {
            if (payment.method === 'cash') {
              acc.cash += payment.amount;
            } else if (payment.method === 'transfer') {
              acc.transfer += payment.amount;
            }
          }
        } else {
          // Fallback: if we can't determine, add to transfer (should not happen normally)
          acc.transfer += s.total;
        }
        acc.total += s.total;
        return acc;
      }, { cash: 0, transfer: 0, total: 0 });

      // Prepare consolidated data for a single sheet
      const combinedData: any[] = [
        { 'Col1': 'RESUMEN DE JORNADA', 'Col2': `#${sessionId}` },
        { 'Col1': 'Fecha', 'Col2': sessionDate },
        { 'Col1': 'Total Efectivo', 'Col2': totals.cash },
        { 'Col1': 'Total Transferencia', 'Col2': totals.transfer },
        { 'Col1': 'TOTAL VENDIDO', 'Col2': totals.total },
        { 'Col1': '', 'Col2': '' }, // Separator
        { 'Col1': 'DETALLE DE VENTAS POR PRODUCTO', 'Col2': '' },
        { 'Col1': 'Producto', 'Col2': 'Cant. Vendida', 'Col3': 'Precio Unit.', 'Col4': 'Costo Unit.', 'Col5': 'Subtotal', 'Col6': 'Costo Total', 'Col7': 'Ganancia Neta', 'Col8': 'Stock Restante' }
      ];

      const productInfo = data.movements.reduce((acc: any, m: any) => {
        if (!acc[m.product_id]) {
          acc[m.product_id] = {
            name: m.product_name || 'Producto Desconocido',
            sold: 0,
            price: 0,
            cost: 0,
            stock: 0
          };
        }
        if (m.type === 'sale') {
          acc[m.product_id].sold += m.quantity;
        }
        return acc;
      }, {});

      // Try to get prices and costs from current products for those that still exist
      products.forEach(p => {
        if (productInfo[p.id]) {
          productInfo[p.id].price = p.price;
          productInfo[p.id].cost = p.cost || 0;
          productInfo[p.id].stock = p.stock;
        }
      });

      let totalNetProfit = 0;
      Object.values(productInfo).forEach((p: any) => {
        const subtotal = p.price ? p.sold * p.price : 0;
        const totalCost = p.cost ? p.sold * p.cost : 0;
        const netProfit = subtotal - totalCost;
        if (netProfit > 0) {
          totalNetProfit += netProfit;
        }
        combinedData.push({
          'Col1': p.name,
          'Col2': p.sold,
          'Col3': p.price || '-',
          'Col4': p.cost || '-',
          'Col5': p.price ? p.sold * p.price : '-',
          'Col6': p.cost ? p.sold * p.cost : '-',
          'Col7': netProfit > 0 ? netProfit : '-',
          'Col8': p.stock || '-'
        });
      });

      combinedData.push({ 'Col1': '', 'Col2': '' }); // Separator
      combinedData.push({ 'Col1': 'GANANCIA NETA TOTAL', 'Col2': totalNetProfit.toFixed(2) });
      combinedData.push({ 'Col1': '', 'Col2': '' }); // Separator
      combinedData.push({ 'Col1': 'DETALLE DE MERMAS Y BAJAS', 'Col2': '' });
      combinedData.push({ 'Col1': 'Producto', 'Col2': 'Cant. Perdida', 'Col3': 'Motivo', 'Col4': 'Fecha/Hora' });

      data.movements
        .filter((m: any) => m.type === 'waste')
        .forEach((m: any) => {
          combinedData.push({
            'Col1': m.product_name || 'Producto Desconocido',
            'Col2': m.quantity,
            'Col3': m.reason,
            'Col4': format(new Date(m.timestamp), 'dd/MM/yyyy HH:mm')
          });
        });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(combinedData, { skipHeader: true });
      XLSX.utils.book_append_sheet(wb, ws, "Reporte Completo");

      const fileName = `Reporte_VentasPro_Jornada_${sessionId}_${sessionDate}.xlsx`;

      if (Capacitor.isNativePlatform()) {
        // Native export flow
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        
        const result = await Filesystem.writeFile({
          path: fileName,
          data: wbout,
          directory: Directory.Cache,
        });

        await Share.share({
          title: 'Exportar Reporte Excel',
          text: `Reporte de Jornada #${sessionId}`,
          url: result.uri,
          dialogTitle: 'Compartir Reporte',
        });
      } else {
        // Web export flow
        XLSX.writeFile(wb, fileName);
      }
    } catch (e: any) {
      console.error("Excel export error:", e);
      alert("Error al exportar Excel: " + (e.message || "Error desconocido"));
    }
  };

  const totals = reportData?.sales.reduce((acc, s) => {
    if (s.payment_method === 'cash') {
      acc.cash += s.total;
    } else if (s.payment_method === 'transfer') {
      acc.transfer += s.total;
    } else if (s.payment_method === 'split') {
      const payments = s.payments || [];
      if (payments.length === 0 && s.payments_json) {
        try {
          const parsed = JSON.parse(s.payments_json);
          payments.push(...parsed);
        } catch (e) { console.error('JSON parse error', e); }
      }
      
      payments.forEach((p: any) => {
        if (p.method === 'cash') acc.cash += p.amount;
        else if (p.method === 'transfer') acc.transfer += p.amount;
      });
      
      // Si es split pero no hay pagos registrados, no lo asignamos a ninguno para detectar el error
      if (payments.length === 0) {
        console.warn('Sale split without payments data:', s.id);
      }
    } else {
      // Fallback general: no asignar a ninguna categoría específica para evitar inflar la transferencia
      console.warn('Unknown payment method:', s.payment_method);
    }
    acc.total += s.total;
    return acc;
  }, { cash: 0, transfer: 0, total: 0 }) || { cash: 0, transfer: 0, total: 0 };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black">Cierre de Jornada</h2>
        <span className="text-[10px] font-bold bg-stone-200 px-2 py-1 rounded-full uppercase">
          ID: {reportData?.session.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-50 p-4 rounded-3xl border border-emerald-100 flex flex-col justify-center">
          <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1">Efectivo</div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 leading-none">${totals.cash.toFixed(2)}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100 flex flex-col justify-center">
          <div className="text-[10px] uppercase font-bold text-blue-600 mb-1">Transferencia</div>
          <div className="text-xl sm:text-2xl font-black text-blue-900 leading-none">${totals.transfer.toFixed(2)}</div>
        </div>
        <div className="col-span-2 bg-stone-900 p-6 rounded-3xl text-white shadow-xl">
          <div className="text-[10px] uppercase font-bold text-stone-400 mb-1">Total Actual</div>
          <div className="text-3xl sm:text-4xl font-black">${totals.total.toFixed(2)}</div>
        </div>
      </div>

      <div className="space-y-3">
        <button 
          disabled={isClosing}
          onClick={() => setShowConfirmClose(true)}
          className={cn(
            "w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
            "bg-rose-600 text-white shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50"
          )}
        >
          <XCircle size={20} />
          {isClosing ? "Cerrando..." : "Cerrar Jornada Actual"}
        </button>

        <button 
          onClick={() => reportData && exportSessionExcel(reportData.session.id, format(new Date(), 'yyyy-MM-dd'))}
          className="w-full py-4 rounded-2xl font-bold bg-white border-2 border-stone-200 text-stone-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <FileSpreadsheet size={20} />
          Excel Jornada Actual
        </button>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmClose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle size={32} />
              </div>
              <h3 className="text-xl font-black mb-2">¿Cerrar Jornada?</h3>
              <p className="text-stone-500 text-sm mb-8">
                Esta acción bloqueará las ventas actuales y reiniciará los totales para una nueva jornada.
              </p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleCloseDay}
                  className="w-full py-4 bg-rose-600 text-white rounded-2xl font-bold shadow-lg shadow-rose-100 active:scale-95 transition-transform"
                >
                  Sí, Cerrar Jornada
                </button>
                <button 
                  onClick={() => setShowConfirmClose(false)}
                  className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform"
                >
                  No, Continuar Vendiendo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-8 border-t border-stone-200">
        <h3 className="text-sm font-bold text-stone-400 uppercase tracking-widest mb-4">Historial de Jornadas</h3>
        <div className="space-y-3">
          {history.map(session => (
            <React.Fragment key={session.id}>
              <div className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
                <div>
                  <div className="font-bold text-stone-800">Jornada #{session.id}</div>
                  <div className="text-[10px] text-stone-400">
                    Cerrada: {session.end_time ? format(new Date(session.end_time), 'dd/MM/yyyy HH:mm') : 'N/A'}
                  </div>
                </div>
                <button 
                  onClick={() => exportSessionExcel(session.id, format(new Date(session.end_time || ''), 'yyyy-MM-dd'))}
                  className="text-emerald-600 p-2 bg-emerald-50 rounded-xl active:scale-90 transition-transform"
                >
                  <FileSpreadsheet size={20} />
                </button>
              </div>
            </React.Fragment>
          ))}
          {history.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-sm italic">Aún no hay jornadas cerradas</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'vender' | 'inventario' | 'reportes'>('vender');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'split' | null>(null);
  const [splitPayments, setSplitPayments] = useState<{ cash: number; transfer: number }>({ cash: 0, transfer: 0 });
  const [cashInput, setCashInput] = useState('');
  const [transferInput, setTransferInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (e) { console.error(e); }
  };

  const fetchSession = async () => {
    try {
      const data = await api.getCurrentReport();
      setCurrentSession(data.session);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await dbService.initializeDatabase();
        await MigrationService.migrate();
        await fetchProducts();
        await fetchSession();
      } catch (e) {
        console.error("Error initializing app:", e);
      }
    };
    init();
  }, []);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateCartQuantity = (productId: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, Math.min(item.quantity + delta, item.stock));
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Helper function to initialize split payments when selecting payment method
  const initializeSplitPayments = (method: 'cash' | 'transfer' | 'split') => {
    setPaymentMethod(method);
    if (method === 'cash') {
      setSplitPayments({ cash: cartTotal, transfer: 0 });
      setCashInput(cartTotal.toFixed(2));
      setTransferInput('');
    } else if (method === 'transfer') {
      setSplitPayments({ cash: 0, transfer: cartTotal });
      setCashInput('');
      setTransferInput(cartTotal.toFixed(2));
    } else if (method === 'split') {
      const halfCash = Math.round((cartTotal / 2) * 100) / 100;
      const halfTransfer = Math.round((cartTotal - halfCash) * 100) / 100;
      setSplitPayments({ cash: halfCash, transfer: halfTransfer });
      setCashInput(halfCash.toFixed(2));
      setTransferInput(halfTransfer.toFixed(2));
    }
  };

  // Helper function to handle cash input change
  const handleCashInputChange = (value: string) => {
    setCashInput(value);
    const cashNum = parseFloat(value) || 0;
    const transferNum = Math.max(0, Math.round((cartTotal - cashNum) * 100) / 100);
    setSplitPayments({ cash: cashNum, transfer: transferNum });
    setTransferInput(transferNum.toFixed(2));
  };

  // Helper function to handle transfer input change
  const handleTransferInputChange = (value: string) => {
    setTransferInput(value);
    const transferNum = parseFloat(value) || 0;
    const cashNum = Math.max(0, Math.round((cartTotal - transferNum) * 100) / 100);
    setSplitPayments({ cash: cashNum, transfer: transferNum });
    setCashInput(cashNum.toFixed(2));
  };

  const handleProcessSale = async () => {
    if (!paymentMethod) return;
    setLoading(true);
    try {
      // Calculate final amounts based on payment method
      let finalPaymentMethod = paymentMethod;
      let finalPayments = undefined;
      
      if (paymentMethod === 'split') {
        // For split payment, use the actual values from splitPayments state
        finalPayments = [
          { method: 'cash' as const, amount: splitPayments.cash },
          { method: 'transfer' as const, amount: splitPayments.transfer }
        ];
      } else if (paymentMethod === 'cash') {
        finalPayments = [{ method: 'cash' as const, amount: cartTotal }];
      } else if (paymentMethod === 'transfer') {
        finalPayments = [{ method: 'transfer' as const, amount: cartTotal }];
      }
      
      const saleData: any = {
        items: cart,
        payment_method: finalPaymentMethod,
        total: cartTotal,
        payments: finalPayments,
        timestamp: new Date().toISOString()
      };
      
      const res = await api.createSale(saleData);
      if (res) {
        setCart([]);
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setSplitPayments({ cash: 0, transfer: 0 });
        setCashInput('');
        setTransferInput('');
        await fetchProducts();
        alert("¡Venta realizada con éxito!");
      } else {
        alert("Error al procesar la venta");
      }
    } catch (error: any) {
      console.error("handlePay error:", error);
      const errorMsg = error.message || error.code || (typeof error === 'string' ? error : JSON.stringify(error));
      alert("Error al procesar el pago: " + errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-100 font-sans text-stone-900 pb-safe">
      <header className="bg-white border-b border-stone-200 p-4 pt-safe sticky top-0 z-30 shadow-sm">
        <div className="w-full max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">VentasPro</h1>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              activeTab === 'vender' ? "bg-emerald-500" : "bg-stone-300"
            )} />
            <span className="text-xs font-medium uppercase tracking-widest text-stone-500">
              {activeTab}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'vender' && (
            <motion.div
              key="vender"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar producto..."
                    className="w-full bg-white border border-stone-200 rounded-xl p-3 pl-10 focus:ring-2 ring-stone-900 font-medium text-sm"
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Category Filter */}
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
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

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {products
                    .filter(p => selectedCategory === 'all' || p.category === selectedCategory)
                    .filter(p => searchQuery === '' || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(product => (
                      <button
                        key={product.id}
                        onClick={() => addToCart(product)}
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
                              className="w-full h-20 object-cover rounded-2xl mb-2 bg-stone-100"
                            />
                          ) : (
                            <div className="w-full h-20 bg-stone-100 rounded-2xl mb-2 flex items-center justify-center">
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

              {/* Empty state */}
              {products.length === 0 && (
                <div className="text-center py-20 text-stone-400">
                  <Package className="mx-auto mb-4 opacity-20" size={48} />
                  <p className="font-medium">No hay productos registrados</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'inventario' && (
            <motion.div
              key="inventario"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <InventoryTab products={products} onUpdate={fetchProducts} />
            </motion.div>
          )}

          {activeTab === 'reportes' && (
            <motion.div
              key="reportes"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <ReportsTab products={products} onSessionClose={() => { fetchSession(); fetchProducts(); }} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around items-center z-40">
        <NavButton active={activeTab === 'vender'} onClick={() => setActiveTab('vender')} icon={<ShoppingCart size={20} />} label="Vender" />
        <NavButton active={activeTab === 'inventario'} onClick={() => setActiveTab('inventario')} icon={<Package size={20} />} label="Inventario" />
        <NavButton active={activeTab === 'reportes'} onClick={() => setActiveTab('reportes')} icon={<ClipboardList size={20} />} label="Cierre" />
      </nav>

      {/* Sticky Cart Summary */}
      <AnimatePresence>
        {activeTab === 'vender' && cart.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-[calc(64px+env(safe-area-inset-bottom))] left-0 right-0 p-4 z-30 pointer-events-none"
          >
            <div className="max-w-md mx-auto pointer-events-auto">
              <button 
                onClick={() => setShowCartModal(true)}
                className="w-full bg-stone-900 text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center active:scale-95 transition-transform"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                    {cart.reduce((acc, item) => acc + item.quantity, 0)}
                  </div>
                  <span className="font-bold">Ver Carrito</span>
                </div>
                <div className="text-xl font-black">${cartTotal.toFixed(2)}</div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {/* Cart Modal */}
        {showCartModal && (
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
                <button onClick={() => setShowCartModal(false)} className="text-stone-400 p-2"><XCircle size={24} /></button>
              </div>
              
              <div className="overflow-y-auto flex-1 space-y-3 mb-6 pr-1">
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl">
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-xl bg-stone-100 shrink-0"
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
                        <button onClick={() => updateCartQuantity(item.id, -1)} className="p-1 text-stone-400 hover:text-stone-600">
                          <Minus size={16} />
                        </button>
                        <span className="w-8 text-center font-bold">{item.quantity}</span>
                        <button onClick={() => updateCartQuantity(item.id, 1)} className="p-1 text-stone-400 hover:text-stone-600">
                          <Plus size={16} />
                        </button>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-rose-400 p-1">
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
                  onClick={() => { setShowCartModal(false); setShowPaymentModal(true); }}
                  className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-emerald-100 active:scale-95 transition-transform"
                >
                  Continuar al Pago
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[40px] p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6" />
              <h3 className="text-2xl font-black text-center mb-2">Método de Pago</h3>
              <p className="text-stone-500 text-center mb-6">Selecciona cómo pagará el cliente</p>
              
              {/* Payment Method Selection */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button 
                  onClick={() => initializeSplitPayments('cash')} 
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'cash' ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                >
                  <DollarSign size={28} />
                  <span className="font-bold text-xs">Efectivo</span>
                </button>
                <button 
                  onClick={() => initializeSplitPayments('transfer')} 
                  className={cn("flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all", paymentMethod === 'transfer' ? "border-blue-500 bg-blue-50 text-blue-700" : "border-stone-100 bg-stone-50 text-stone-500")}
                >
                  <CreditCard size={28} />
                  <span className="font-bold text-xs">Transferencia</span>
                </button>
                <button 
                  onClick={() => initializeSplitPayments('split')} 
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

              {/* Split Payment Inputs */}
              {paymentMethod === 'split' && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 mb-6 space-y-4">
                  <div className="text-center mb-2">
                    <p className="text-xs font-bold text-purple-600 uppercase tracking-widest">Total a pagar</p>
                    <p className="text-2xl font-black text-purple-700">${cartTotal.toFixed(2)}</p>
                  </div>
                  
                  <div>
                    <label className="text-[10px] uppercase font-bold text-stone-500 mb-1 block flex items-center gap-2">
                      <DollarSign size={12} /> Efectivo
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={cashInput}
                      onChange={(e) => handleCashInputChange(e.target.value)}
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
                      value={transferInput}
                      onChange={(e) => handleTransferInputChange(e.target.value)}
                      className="w-full bg-white border-2 border-blue-200 rounded-xl p-3 focus:ring-2 ring-blue-500 font-bold text-lg"
                    />
                  </div>

                  <div className="pt-3 border-t border-purple-200">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-purple-600 uppercase">Suma:</span>
                      <span className={cn("text-lg font-black", Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) < 0.01 ? "text-emerald-600" : "text-rose-500")}>
                        ${(splitPayments.cash + splitPayments.transfer).toFixed(2)}
                      </span>
                    </div>
                    {Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01 && (
                      <p className="text-xs text-rose-500 font-bold mt-1">
                        La suma debe ser igual al total (${cartTotal.toFixed(2)})
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-4 rounded-2xl font-bold text-stone-500 bg-stone-100">Cancelar</button>
                <button 
                  disabled={!paymentMethod || loading || (paymentMethod === 'split' && Math.abs((splitPayments.cash + splitPayments.transfer) - cartTotal) >= 0.01)} 
                  onClick={handleProcessSale} 
                  className="flex-[2] py-4 rounded-2xl font-bold text-white bg-emerald-600 shadow-lg shadow-emerald-100 disabled:opacity-50"
                >
                  {loading ? "Procesando..." : "Confirmar Venta"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
