import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

class DatabaseService {
  private sqlite: SQLiteConnection = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private readonly DB_NAME = 'sales_app.db';

  async initializeDatabase() {
    try {
      this.db = await this.sqlite.createConnection(
        this.DB_NAME,
        false,
        'no-encryption',
        1,
        false
      );
      await this.db.open();

      await this.createSchema();
      await this.fixSchema();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Error initializing database', error);
      throw error;
    }
  }

  private async fixSchema() {
    try {
      // Products table fix
      const prodResult = await this.db.query('PRAGMA table_info(products);');
      const prodColumns = prodResult.values || [];
      const hasOldStock = prodColumns.some((col: any) => col.name === 'stocks');
      const hasNewStock = prodColumns.some((col: any) => col.name === 'stock');
      
      if (hasOldStock && !hasNewStock) {
        console.log('Renaming column "stocks" to "stock" in "products" table...');
        await this.db.execute('ALTER TABLE products RENAME COLUMN stocks TO stock;');
      }

      // Payments table fix: add card_id
      const payResult = await this.db.query('PRAGMA table_info(payments);');
      const payColumns = payResult.values || [];
      const hasCardId = payColumns.some((col: any) => col.name === 'card_id');
      
      if (!hasCardId) {
        console.log('Adding column "card_id" to "payments" table...');
        await this.db.execute('ALTER TABLE payments ADD COLUMN card_id INTEGER;');
      }

      // Sales table fix: add card_id
      const saleResult = await this.db.query('PRAGMA table_info(sales);');
      const saleColumns = saleResult.values || [];
      const hasSaleCardId = saleColumns.some((col: any) => col.name === 'card_id');
      
      if (!hasSaleCardId) {
        console.log('Adding column "card_id" to "sales" table...');
        await this.db.execute('ALTER TABLE sales ADD COLUMN card_id INTEGER;');
      }

      // Sessions table fix: add name and deleted columns
      const sessResult = await this.db.query('PRAGMA table_info(sessions);');
      const sessColumns = sessResult.values || [];
      const hasSessName = sessColumns.some((col: any) => col.name === 'name');
      const hasSessDeleted = sessColumns.some((col: any) => col.name === 'deleted');
      
      if (!hasSessName) {
        console.log('Adding column "name" to "sessions" table...');
        await this.db.execute('ALTER TABLE sessions ADD COLUMN name TEXT;');
      }
      if (!hasSessDeleted) {
        console.log('Adding column "deleted" to "sessions" table...');
        await this.db.execute('ALTER TABLE sessions ADD COLUMN deleted INTEGER DEFAULT 0;');
      }
    } catch (error) {
      console.error('Error fixing schema:', error);
    }
  }

  private async createSchema() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        cost REAL DEFAULT 0,
        stock INTEGER NOT NULL,
        initial_stock INTEGER DEFAULT 0,
        category TEXT,
        image_path TEXT,
        deleted INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        email TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );`,
      `CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER,
        session_id INTEGER,
        total REAL NOT NULL,
        payment_method TEXT,
        status TEXT,
        card_id INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(customer_id) REFERENCES customers(id),
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );`,
      `CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES sales(id),
        FOREIGN KEY(product_id) REFERENCES products(id)
      );`,
      `CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER,
        amount REAL NOT NULL,
        payment_method TEXT,
        payment_date TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sale_id) REFERENCES sales(id)
      );`,
      `CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        end_time TEXT,
        is_closed INTEGER DEFAULT 0,
        name TEXT,
        deleted INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS movements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        product_name TEXT,
        type TEXT,
        quantity INTEGER,
        reason TEXT,
        session_id INTEGER,
        timestamp TEXT,
        FOREIGN KEY(product_id) REFERENCES products(id),
        FOREIGN KEY(session_id) REFERENCES sessions(id)
      );`,
      `CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        bank TEXT,
        account_number TEXT,
        deleted INTEGER DEFAULT 0
      );`,
      `CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );`
    ];

    for (const table of tables) {
      await this.db.execute(table);
    }
  }

  async query(sql: string, params?: any[]) {
    try {
      return await this.db.query(sql, params);
    } catch (error) {
      console.error('Database Query Error:', sql, params, error);
      throw error;
    }
  }

  async run(sql: string, params?: any[]) {
    try {
      return await this.db.run(sql, params);
    } catch (error) {
      console.error('Database Run Error:', sql, params, error);
      throw error;
    }
  }
}

export const dbService = new DatabaseService();
