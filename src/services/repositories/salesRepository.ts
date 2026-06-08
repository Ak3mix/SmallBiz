import { dbService } from '../database';

export const SalesRepository = {
  async getCurrentSession() {
    const result = await dbService.query('SELECT * FROM sessions WHERE is_closed = 0 LIMIT 1');
    return result.values && result.values.length > 0 ? result.values[0] : null;
  },

  async createSession(session: any) {
    await dbService.run('INSERT INTO sessions (start_time, is_closed) VALUES (?, 0)', [session.start_time]);
    return this.getCurrentSession();
  },

  async closeSession(id: number, endTime: string) {
    await dbService.run('UPDATE sessions SET is_closed = 1, end_time = ? WHERE id = ?', [endTime, id]);
  },

  async createSale(sale: any) {
    const result = await dbService.run(
      'INSERT INTO sales (customer_id, total, payment_method, status, created_at, session_id) VALUES (?, ?, ?, ?, ?, ?)',
      [sale.customer_id, sale.total, sale.payment_method, sale.status, sale.timestamp, sale.session_id]
    );
    const saleId = result.changes?.lastId;

    // Guardar ítems
    for (const item of sale.items) {
      await dbService.run(
        'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
        [saleId, item.id, item.quantity, item.price, item.quantity * item.price]
      );
      // Actualizar stock
      await dbService.run('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.id]);
    }
    
    // Guardar pagos (CORRECCIÓN DE PAGOS COMBINADOS)
    if (sale.payments && Array.isArray(sale.payments)) {
      for (const p of sale.payments) {
        await dbService.run(
          'INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
          [saleId, p.amount, p.method, sale.timestamp]
        );
      }
    } else {
      // Fallback para pagos simples
      await dbService.run(
        'INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
        [saleId, sale.total, sale.payment_method, sale.timestamp]
      );
    }
    
    return saleId;
  },

  async getSalesBySession(sessionId: number) {
    const result = await dbService.query('SELECT * FROM sales WHERE session_id = ?', [sessionId]);
    return result.values || [];
  },

  async getSessionHistory() {
    const result = await dbService.query('SELECT * FROM sessions WHERE is_closed = 1 ORDER BY id DESC');
    return result.values || [];
  }
};
