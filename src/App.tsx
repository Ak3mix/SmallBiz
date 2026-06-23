import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, ClipboardList } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from './services/api';
import { dbService } from './services/database';
import { MigrationService } from './services/migration';
import { cn } from './utils/cn';
import { NavButton } from './components/NavButton';
import { InventoryTab } from './components/InventoryTab';
import { ReportsTab } from './components/ReportsTab';
import { VenderGrid } from './components/VenderGrid';
import { CartModal } from './components/CartModal';
import { PaymentModal } from './components/PaymentModal';
import type { Product, CartItem, Session } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'vender' | 'inventario' | 'reportes'>('vender');
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCartModal, setShowCartModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'split' | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [cards, setCards] = useState<any[]>([]);

  useEffect(() => {
    api.getCards().then(setCards);
  }, []);

  useEffect(() => {
    if (showPaymentModal) {
      api.getCards().then(setCards);
    }
  }, [showPaymentModal]);

  const [splitPayments, setSplitPayments] = useState<{ cash: number; transfer: number }>({ cash: 0, transfer: 0 });
  const [cashInput, setCashInput] = useState('');
  const [transferInput, setTransferInput] = useState('');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))] as string[];

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
    if ((paymentMethod === 'transfer' || paymentMethod === 'split') && !selectedCardId) {
      alert("Por favor selecciona una tarjeta de destino.");
      return;
    }
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
        timestamp: new Date().toISOString(),
        card_id: (paymentMethod === 'transfer' || paymentMethod === 'split') ? selectedCardId : null
      };
      
      const res = await api.createSale(saleData);
      if (res) {
        setCart([]);
        setShowPaymentModal(false);
        setPaymentMethod(null);
        setSelectedCardId(null);
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
        <div className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold tracking-tight text-stone-800">VentasPro</h1>
          <div className="flex items-center gap-2">
            <div className={cn(
              "w-3 h-3 rounded-full",
              "bg-emerald-500"
            )} />
            <span className="text-xs font-medium uppercase tracking-widest text-stone-500">
              {activeTab}
            </span>
          </div>
        </div>
      </header>

      <main className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'vender' && (
            <VenderGrid
              products={products}
              searchQuery={searchQuery}
              selectedCategory={selectedCategory}
              categories={categories}
              onSearchChange={setSearchQuery}
              onCategoryChange={setSelectedCategory}
              onAddToCart={addToCart}
            />
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
              <ReportsTab products={products} onSessionClose={() => { fetchSession(); fetchProducts(); }} onProductsChange={fetchProducts} />
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
            <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto pointer-events-auto">
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

      <CartModal
        show={showCartModal}
        cart={cart}
        cartTotal={cartTotal}
        onClose={() => setShowCartModal(false)}
        onRemove={removeFromCart}
        onUpdateQuantity={updateCartQuantity}
        onProceedToPayment={() => { setShowCartModal(false); setShowPaymentModal(true); }}
      />

      <PaymentModal
        show={showPaymentModal}
        cartTotal={cartTotal}
        cards={cards}
        paymentMethod={paymentMethod}
        selectedCardId={selectedCardId}
        splitPayments={splitPayments}
        cashInput={cashInput}
        transferInput={transferInput}
        loading={loading}
        onClose={() => setShowPaymentModal(false)}
        onPaymentMethodChange={initializeSplitPayments}
        onCardChange={setSelectedCardId}
        onCashInputChange={handleCashInputChange}
        onTransferInputChange={handleTransferInputChange}
        onProcessSale={handleProcessSale}
      />
    </div>
  );
}
