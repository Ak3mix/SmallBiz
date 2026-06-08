import { dbService } from '../database';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

async function resolveImagePath(path: string | null | undefined): Promise<string | undefined> {
  if (!path) return undefined;
  if (path.startsWith('data:image') || path.startsWith('http')) return path;

  if (Capacitor.isNativePlatform()) {
    try {
      const uri = await Filesystem.getUri({
        path: path,
        directory: Directory.Data,
      });
      return Capacitor.convertFileSrc(uri.uri);
    } catch (e) {
      console.error('Error resolving image path', e);
      return undefined;
    }
  }
  return path;
}

export const ProductRepository = {
  async getAll() {
    const result = await dbService.query('SELECT * FROM products WHERE deleted = 0');
    const products = result.values || [];
    
    // Resolve paths for UI
    for (const p of products) {
      p.image = await resolveImagePath(p.image_path);
    }
    return products;
  },

  async add(product: any) {
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
