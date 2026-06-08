import { dbService } from '../database';

export const MovementRepository = {
  async add(movement: any) {
    const timestamp = movement.timestamp || new Date().toISOString();
    await dbService.run(
      'INSERT INTO movements (product_id, product_name, type, quantity, reason, session_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [movement.product_id, movement.product_name, movement.type, movement.quantity, movement.reason, movement.session_id, timestamp]
    );

    // Actualizar stock de productos correspondientemente
    if (movement.type === 'entry') {
      await dbService.run(
        'UPDATE products SET stock = stock + ? WHERE id = ?',
        [movement.quantity, movement.product_id]
      );
    } else if (movement.type === 'waste') {
      await dbService.run(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [movement.quantity, movement.product_id]
      );
    }
  },

  async getBySession(sessionId: number) {
    const result = await dbService.query('SELECT * FROM movements WHERE session_id = ?', [sessionId]);
    return result.values || [];
  }
};
