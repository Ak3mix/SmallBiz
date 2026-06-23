import React, { useState, useEffect } from 'react';
import { XCircle, FileSpreadsheet, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils/cn';
import { format } from 'date-fns';
import { api } from '../services/api';
import { exportSessionExcel } from '../services/excelExportService';
import type { Product, Sale, Session, Movement, Card } from '../types';

export function ReportsTab({
  products,
  onSessionClose,
  onProductsChange,
}: {
  products: Product[];
  onSessionClose: () => void;
  onProductsChange: () => void;
}) {
  const [reportData, setReportData] = useState<{
    sales: Sale[];
    movements: Movement[];
    session: Session;
  } | null>(null);
  const [history, setHistory] = useState<Session[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [showSalesList, setShowSalesList] = useState(true);

  const fetchReport = async () => {
    try {
      const data = await api.getCurrentReport();
      setReportData(data);
    } catch (e) {
      console.error('Error fetching report', e);
    }
  };

  const fetchHistory = async () => {
    try {
      const data = await api.getSessionHistory();
      setHistory(data);
    } catch (e) {
      console.error('Error fetching history', e);
    }
  };

  useEffect(() => {
    fetchReport();
    fetchHistory();
  }, []);

  const handleEditSession = (session: Session) => {
    setEditSession(session);
    setEditSessionName(session.name || '');
  };

  const handleSaveSessionName = async () => {
    if (!editSession) return;
    try {
      await api.updateSession(editSession.id, { name: editSessionName });
      setEditSession(null);
      fetchHistory();
    } catch (e) {
      console.error(e);
      alert('Error al guardar el nombre');
    }
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('¿Eliminar esta jornada? Se ocultará del historial.')) return;
    try {
      await api.deleteSession(id);
      fetchHistory();
    } catch (e) {
      console.error(e);
      alert('Error al eliminar la jornada');
    }
  };

  const handleCancelSale = async (saleId: number) => {
    if (!confirm('¿Anular esta venta? Se restaurará el stock de los productos.')) return;
    try {
      await api.cancelSale(saleId);
      await fetchReport();
      onProductsChange();
      alert('Venta anulada correctamente');
    } catch (e) {
      console.error(e);
      alert('Error al anular la venta');
    }
  };

  const handleCloseDay = async () => {
    setShowConfirmClose(false);
    setIsClosing(true);
    try {
      const res = await api.closeSession();
      if (res) {
        await fetchReport();
        await fetchHistory();
        onSessionClose();
        alert('Jornada cerrada correctamente. Se ha iniciado una nueva.');
      } else {
        alert('No se pudo cerrar la jornada');
      }
    } catch {
      alert('Error al cerrar la jornada. Intente nuevamente.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleExportExcel = async (sessionId: number, dateStr: string) => {
    try {
      const data = await api.getSessionReport(sessionId);
      const cards: Card[] = await api.getCards();
      await exportSessionExcel({
        sessionId,
        sessionDate: dateStr,
        sales: data.sales,
        movements: data.movements,
        products,
        cards,
      });
    } catch (e: any) {
      console.error('Excel export error:', e);
      alert('Error al exportar Excel: ' + (e.message || 'Error desconocido'));
    }
  };

  const totals =
    reportData?.sales.reduce(
      (acc, s) => {
        if (s.cancelled) return acc;
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
            } catch (e) {
              console.error('JSON parse error', e);
            }
          }
          payments.forEach((p: any) => {
            if (p.method === 'cash') acc.cash += p.amount;
            else if (p.method === 'transfer') acc.transfer += p.amount;
          });
        }
        acc.total += s.total;
        return acc;
      },
      { cash: 0, transfer: 0, total: 0 }
    ) || { cash: 0, transfer: 0, total: 0 };

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

      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden">
        <button
          onClick={() => setShowSalesList(!showSalesList)}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <span className="font-bold text-stone-800">
            Ventas de la Jornada ({reportData?.sales.filter(s => !s.cancelled).length || 0})
          </span>
          <span className="text-stone-400 text-sm">{showSalesList ? '▲' : '▼'}</span>
        </button>
        {showSalesList && (
          <div className="max-h-40 overflow-y-auto border-t border-stone-100">
            {reportData?.sales.filter(s => !s.cancelled).length === 0 ? (
              <div className="p-4 text-center text-stone-400 text-sm italic">No hay ventas en esta jornada</div>
            ) : (
              reportData?.sales.filter(s => !s.cancelled).map(sale => {
                const itemSummary =
                  sale.items?.map((i: any) => `${i.quantity}x ${i.product_name || 'Producto'}`).join(', ') || '';
                const paymentLabel =
                  sale.payment_method === 'cash'
                    ? 'Efectivo'
                    : sale.payment_method === 'transfer'
                      ? 'Transferencia'
                      : sale.payments
                          ?.map(
                            (p: any) =>
                              `${p.method === 'cash' ? 'Efectivo' : 'Trans'}: $${p.amount.toFixed(2)}`
                          )
                          .join(' · ') || 'Combinado';
                return (
                  <div key={sale.id} className="flex items-center justify-between p-3 border-b border-stone-50 last:border-0">
                    <div className="min-w-0 flex-1 mr-2">
                      <div className="text-xs font-bold text-stone-800 truncate">{itemSummary}</div>
                      <div className="text-[10px] text-stone-400">
                        ${sale.total.toFixed(2)} · {paymentLabel}
                        {sale.created_at && ` · ${format(new Date(sale.created_at), 'HH:mm')}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelSale(sale.id)}
                      className="text-rose-400 p-1.5 bg-rose-50 rounded-lg active:scale-90 transition-transform shrink-0"
                      title="Anular venta"
                    >
                      <XCircle size={16} />
                    </button>
                  </div>
                );
              })
            )}
            {reportData?.sales.filter(s => s.cancelled).length > 0 && (
              <>
                <div className="px-3 py-2 text-[10px] uppercase font-bold text-stone-400 bg-stone-50">
                  Ventas Anuladas
                </div>
                {reportData?.sales
                  .filter(s => s.cancelled)
                  .map(sale => {
                    const itemSummary =
                      sale.items?.map((i: any) => `${i.quantity}x ${i.product_name || 'Producto'}`).join(', ') || '';
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 border-b border-stone-50 last:border-0 opacity-50"
                      >
                        <div className="min-w-0 flex-1 mr-2">
                          <div className="text-xs font-bold text-stone-500 line-through truncate">
                            {itemSummary}
                          </div>
                          <div className="text-[10px] text-stone-400">
                            ${sale.total.toFixed(2)} · Anulada
                            {sale.created_at && ` · ${format(new Date(sale.created_at), 'HH:mm')}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          disabled={isClosing}
          onClick={() => setShowConfirmClose(true)}
          className={cn(
            'w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all',
            'bg-rose-600 text-white shadow-lg shadow-rose-100 active:scale-95 disabled:opacity-50'
          )}
        >
          <XCircle size={20} />
          {isClosing ? 'Cerrando...' : 'Cerrar Jornada Actual'}
        </button>

        <button
          onClick={() =>
            reportData && handleExportExcel(reportData.session.id, format(new Date(), 'yyyy-MM-dd'))
          }
          className="w-full py-4 rounded-2xl font-bold bg-white border-2 border-stone-200 text-stone-700 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <FileSpreadsheet size={20} />
          Excel Jornada Actual
        </button>
      </div>

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
            <div key={session.id} className="bg-white p-4 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <div className="font-bold text-stone-800 truncate">{session.name || `Jornada #${session.id}`}</div>
                <div className="text-[10px] text-stone-400">
                  Cerrada: {session.end_time ? format(new Date(session.end_time), 'dd/MM/yyyy HH:mm') : 'N/A'}
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleEditSession(session)}
                  className="text-stone-500 p-2 bg-stone-100 rounded-xl active:scale-90 transition-transform"
                  title="Editar nombre"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="text-rose-500 p-2 bg-rose-50 rounded-xl active:scale-90 transition-transform"
                  title="Eliminar jornada"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() =>
                    handleExportExcel(
                      session.id,
                      format(new Date(session.end_time || ''), 'yyyy-MM-dd')
                    )
                  }
                  className="text-emerald-600 p-2 bg-emerald-50 rounded-xl active:scale-90 transition-transform"
                  title="Exportar Excel"
                >
                  <FileSpreadsheet size={18} />
                </button>
              </div>
            </div>
          ))}
          {history.length === 0 && (
            <div className="text-center py-8 text-stone-400 text-sm italic">Aún no hay jornadas cerradas</div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editSession && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
            >
              <h3 className="text-xl font-black mb-6">Editar Jornada</h3>
              <label className="text-xs font-bold text-stone-500 uppercase tracking-widest">Nombre</label>
              <input
                type="text"
                value={editSessionName}
                onChange={e => setEditSessionName(e.target.value)}
                className="w-full border border-stone-200 rounded-xl px-4 py-3 mt-1 mb-6 text-lg font-bold"
                placeholder="Jornada #..."
                autoFocus
              />
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSaveSessionName}
                  className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditSession(null)}
                  className="w-full py-4 text-stone-500 font-bold active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
