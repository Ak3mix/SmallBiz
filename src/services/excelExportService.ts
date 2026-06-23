import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { format } from 'date-fns';
import type { Sale, Movement, Product, Card } from '../types';

export interface ExcelExportParams {
  sessionId: number;
  sessionDate: string;
  sales: Sale[];
  movements: Movement[];
  products: Product[];
  cards: Card[];
}

export async function exportSessionExcel(params: ExcelExportParams): Promise<void> {
  const { sessionId, sessionDate, sales, movements, products, cards } = params;

  const totals = sales.reduce(
    (acc, s) => {
      if (s.cancelled) return acc;
      if (s.payment_method === 'cash') {
        acc.cash += s.total;
      } else if (s.payment_method === 'transfer') {
        acc.transfer += s.total;
      } else if (s.payment_method === 'split' && s.payments && Array.isArray(s.payments)) {
        for (const payment of s.payments) {
          if (payment.method === 'cash') acc.cash += payment.amount;
          else if (payment.method === 'transfer') acc.transfer += payment.amount;
        }
      }
      acc.total += s.total;
      return acc;
    },
    { cash: 0, transfer: 0, total: 0 }
  );

  const combinedData: any[] = [
    { Col1: 'RESUMEN DE JORNADA', Col2: `#${sessionId}` },
    { Col1: 'Fecha', Col2: sessionDate },
    { Col1: 'Total Efectivo', Col2: totals.cash },
    { Col1: 'Total Transferencia', Col2: totals.transfer },
    { Col1: 'TOTAL VENDIDO', Col2: totals.total },
    { Col1: '', Col2: '' },
    { Col1: 'DETALLE DE VENTAS POR PRODUCTO', Col2: '' },
    {
      Col1: 'Producto',
      Col2: 'Cant. Vendida',
      Col3: 'Precio Unit.',
      Col4: 'Costo Unit.',
      Col5: 'Subtotal',
      Col6: 'Costo Total',
      Col7: 'Ganancia Neta',
      Col8: 'Stock Restante',
    },
  ];

  const productInfo: Record<number, { name: string; sold: number; price: number; cost: number; stock: number }> = {};
  movements.forEach(m => {
    if (!productInfo[m.product_id]) {
      productInfo[m.product_id] = {
        name: m.product_name || 'Producto Desconocido',
        sold: 0,
        price: 0,
        cost: 0,
        stock: 0,
      };
    }
    if (m.type === 'sale') {
      productInfo[m.product_id].sold += m.quantity;
    } else if (m.type === 'cancellation') {
      productInfo[m.product_id].sold -= m.quantity;
    }
  });

  const cardMap = cards.reduce<Record<number, Card>>((acc, c) => ({ ...acc, [c.id]: c }), {});

  products.forEach(p => {
    if (productInfo[p.id]) {
      productInfo[p.id].price = p.price;
      productInfo[p.id].cost = p.cost || 0;
      productInfo[p.id].stock = p.stock;
    }
  });

  let totalNetProfit = 0;
  Object.values(productInfo).forEach(p => {
    const subtotal = p.price ? p.sold * p.price : 0;
    const totalCost = p.cost ? p.sold * p.cost : 0;
    const netProfit = subtotal - totalCost;
    if (netProfit > 0) {
      totalNetProfit += netProfit;
    }
    combinedData.push({
      Col1: p.name,
      Col2: p.sold,
      Col3: p.price || '-',
      Col4: p.cost || '-',
      Col5: p.price ? p.sold * p.price : '-',
      Col6: p.cost ? p.sold * p.cost : '-',
      Col7: netProfit > 0 ? netProfit : '-',
      Col8: p.stock || '-',
    });
  });

  combinedData.push({ Col1: '', Col2: '' });
  combinedData.push({ Col1: 'GANANCIA NETA TOTAL', Col2: totalNetProfit.toFixed(2) });

  combinedData.push({ Col1: '', Col2: '' });
  combinedData.push({ Col1: 'VENTAS POR TARJETA', Col2: '' });
  combinedData.push({ Col1: 'Tarjeta', Col2: 'Banco', Col3: 'Total', Col4: 'Transacciones' });

  const cardStats: Record<number, { name: string; bank: string; total: number; count: number }> = {};
  sales.forEach(s => {
    if (s.cancelled) return;
    if (s.card_id && cardMap[s.card_id]) {
      const card = cardMap[s.card_id];
      if (!cardStats[card.id])
        cardStats[card.id] = { name: card.name, bank: card.bank, total: 0, count: 0 };
      let amountForCard = s.total;
      if (s.payment_method === 'split' && s.payments?.length) {
        const transferPayment = s.payments.find(p => p.method === 'transfer');
        amountForCard = transferPayment ? transferPayment.amount : 0;
      }
      cardStats[card.id].total += amountForCard;
      cardStats[card.id].count += 1;
    }
  });

  Object.values(cardStats).forEach(cs => {
    combinedData.push({ Col1: cs.name, Col2: cs.bank, Col3: cs.total.toFixed(2), Col4: cs.count });
  });

  combinedData.push({ Col1: '', Col2: '' });
  combinedData.push({ Col1: 'DETALLE DE MERMAS Y BAJAS', Col2: '' });
  combinedData.push({ Col1: 'Producto', Col2: 'Cant. Perdida', Col3: 'Motivo', Col4: 'Fecha/Hora' });

  movements
    .filter(m => m.type === 'waste')
    .forEach(m => {
      combinedData.push({
        Col1: m.product_name || 'Producto Desconocido',
        Col2: m.quantity,
        Col3: m.reason,
        Col4: format(new Date(m.timestamp), 'dd/MM/yyyy HH:mm'),
      });
    });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(combinedData, { skipHeader: true });
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte Completo');

  const fileName = `Reporte_VentasPro_Jornada_${sessionId}_${sessionDate}.xlsx`;

  if (Capacitor.isNativePlatform()) {
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
    XLSX.writeFile(wb, fileName);
  }
}
