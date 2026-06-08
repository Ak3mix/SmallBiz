import { dbService } from '../database';

export const ProductRepository = {
  async getAll() {
    const result = await dbService.query('SELECT * FROM products WHERE deleted = 0');
    return result.values || [];
  },

  async add(product: any) {
    console.log('ProductRepository.add - product data:', JSON.stringify(product));
    const result = await dbService.run(
      'INSERT INTO products (name, price, cost, stock, initial_stock, category, image_path, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, 0)',
      [product.name, product.price, product.cost, product.stock, product.initial_stock, product.category, product.image]
    );
    return { ...product, id: result.changes?.lastId };
  },

  async update(id: number, product: any) {
    await dbService.run(
      'UPDATE products SET name = ?, price = ?, cost = ?, stock = ?, category = ?, image_path = ? WHERE id = ?',
      [product.name, product.price, product.cost, product.stock, product.category, product.image, id]
    );
    return { success: true };
  },

  async delete(id: number) {
    await dbService.run('UPDATE products SET deleted = 1 WHERE id = ?', [id]);
    return { success: true };
  }
};
