import { dbService } from './database';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { compressImage } from '../utils/imageUtils';

export const MigrationService = {
  async migrate() {
    console.log('Starting migration...');
    try {
      const migrated = await this.isMigrated();
      if (migrated) return;

      // 1. Migrate Products
      await this.migrateProducts();
      
      // 2. Migrate Customers
      await this.migrateCustomers();
      
      // 3. Migrate Sales
      await this.migrateSales();

      // 4. Mark as migrated
      await this.markAsMigrated();
      
      // 5. Clean localStorage
      this.clearLocalStorage();
      
      console.log('Migration completed.');
    } catch (error) {
      console.error('Migration Process Failed:', error);
      throw error; // Re-throw to handle or stop init
    }
  },

  async migrateProducts() {
    try {
      const oldProducts = JSON.parse(localStorage.getItem('vpro_products') || '[]');
      
      for (const p of oldProducts) {
        let imagePath = null;
        if (p.image) {
          imagePath = await this.saveImage(p.id, p.image);
        }

        await dbService.run(
          'INSERT INTO products (id, name, price, cost, stock, initial_stock, category, image_path, deleted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [p.id, p.name, p.price, p.cost || 0, p.stock || 0, p.initial_stock || 0, p.category, imagePath, p.deleted ? 1 : 0]
        );
      }
    } catch (error) {
      console.error('Migration Error (Products):', error);
      throw error;
    }
  },

  async saveImage(base64Data: string, productId?: number) {
    const id = productId || Date.now();
    const fileName = `images/product_${id}.jpg`;
    try {
      // Compress to max 300px before saving
      const compressed = await compressImage(base64Data);
      
      // Ensure directory exists
      try {
        await Filesystem.mkdir({
          path: 'images',
          directory: Directory.Data,
        });
      } catch (e) {
        // Directory might already exist
      }
      
      await Filesystem.writeFile({
        path: fileName,
        data: compressed,
        directory: Directory.Data,
      });
      return fileName;
    } catch (error) {
      // If compression fails, try saving original
      try {
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data,
          directory: Directory.Data,
        });
        return fileName;
      } catch (e) {
        console.error('Filesystem Error (Saving Image):', fileName, e);
        return null;
      }
    }
  },

  async migrateCustomers() {
    try {
      const oldCustomers = JSON.parse(localStorage.getItem('vpro_customers') || '[]');
      for (const c of oldCustomers) {
        await dbService.run(
          'INSERT INTO customers (id, name, phone, address, email) VALUES (?, ?, ?, ?, ?)',
          [c.id, c.name, c.phone, c.address, c.email]
        );
      }
    } catch (error) {
      console.error('Migration Error (Customers):', error);
      throw error;
    }
  },

  async migrateSales() {
    try {
      const oldSales = JSON.parse(localStorage.getItem('vpro_sales') || '[]');
      for (const s of oldSales) {
        // Migrate sale
        await dbService.run(
          'INSERT INTO sales (id, customer_id, session_id, total, payment_method, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [s.id, s.customer_id, s.session_id, s.total, s.payment_method, s.status, s.timestamp]
        );
        
        // Migrate items
        if (s.items) {
          for (const item of s.items) {
            await dbService.run(
              'INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)',
              [s.id, item.id, item.quantity, item.price, item.quantity * item.price]
            );
          }
        }

        // Migrate payments if exist
        if (s.payments) {
          for (const p of s.payments) {
            await dbService.run(
              'INSERT INTO payments (sale_id, amount, payment_method, payment_date) VALUES (?, ?, ?, ?)',
              [s.id, p.amount, p.method, s.timestamp]
            );
          }
        }
      }
    } catch (error) {
      console.error('Migration Error (Sales):', error);
      throw error;
    }
  },

  clearLocalStorage() {
    const keysToKeep = ['vpro_settings']; // Keep settings if needed
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('vpro_') && !keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
  },


  async isMigrated() {
    const result = await dbService.query('SELECT value FROM settings WHERE key = "migrated"');
    return result.values && result.values.length > 0;
  },

  async markAsMigrated() {
    await dbService.run('INSERT INTO settings (key, value) VALUES ("migrated", "true")');
  }
};
