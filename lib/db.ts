import * as SQLite from 'expo-sqlite';

// --- Types ---
export type User = {
  id: number;
  name: string;
  email?: string;
};

export type BillItem = {
  id: number;
  billId: number;
  itemName: string;
  quantity: number;
  rate: number;
  finalRate: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
};

export type Bill = {
  id: number;
  customerId: number;
  customerName: string;
  billType: string;
  billingDate: string;
  totalAmount: number;
  billDiscountPercent: number;
  billDiscountAmount: number;
  subtotal: number;
  itemDiscountAmount: number;
  items?: BillItem[];
};

export type Customer = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  totalPurchases: number;
  lastPurchase?: string;
  type: 'customer';
};

export type Supplier = {
  id: number;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  company: string;
  products: string;
  type: 'supplier';
};

export type Product = {
  id: number;
  name: string;
  mrp: number;
  sellPrice: number;
  purchasePrice: number;
  stock: number;
  unit: string;
  category: string;
  minStock: number;
  categoryId?: number;
  createdAt: string;
  updatedAt: string;
};

export type Contact = Customer | Supplier;

// --- Purchase Types ---
export type PurchaseBill = {
  id: number;
  supplierId: number;
  supplierName: string;
  billNo: string;
  billType: 'Cash' | 'Credit';
  date: string;
  totalAmount: number;
  createdAt: string;
};

export type PurchaseItem = {
  id: number;
  purchaseBillId: number;
  name: string;
  mrp: number;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  category: string;
  total: number;
  categoryId?: number;
};

// --- Category Types ---
export type Category = {
  id: number;
  name: string;
  createdAt: string;
};

// --- Shop Settings Types ---
export type ShopSettings = {
  id?: number;
  name: string;
  address: string;
  phone: string;
  email: string;
  topTagline: string;
  bottomTagline: string;
  logo: string | null;
  created_at?: string;
  updated_at?: string;
};

// --- Database ---
let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export function initDB() {
  if (isInitialized && db) {
    return;
  }
  try {
    db = SQLite.openDatabaseSync('wholesale.db');

    // Users table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
      );
    `);

    // Bills table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customerId INTEGER NOT NULL,
        customerName TEXT NOT NULL,
        billType TEXT,
        billingDate TEXT,
        totalAmount REAL,
        billDiscountPercent REAL DEFAULT 0,
        billDiscountAmount REAL DEFAULT 0,
        subtotal REAL DEFAULT 0,
        itemDiscountAmount REAL DEFAULT 0,
        FOREIGN KEY(customerId) REFERENCES customers(id)
      );
    `);

    // Bill Items table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billId INTEGER,
        itemName TEXT,
        quantity INTEGER,
        rate REAL,
        finalRate REAL,
        discountPercent REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        total REAL,
        FOREIGN KEY(billId) REFERENCES bills(id)
      );
    `);

    // Customers table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        totalPurchases REAL DEFAULT 0,
        lastPurchase TEXT
      );
    `);

    // Suppliers table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        address TEXT,
        company TEXT NOT NULL,
        products TEXT
      );
    `);

    // Products table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mrp REAL NOT NULL,
        sellPrice REAL NOT NULL,
        purchasePrice REAL NOT NULL,
        stock INTEGER NOT NULL,
        unit TEXT NOT NULL,
        category TEXT NOT NULL,
        minStock INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Purchase Bills table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS purchase_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplierId INTEGER NOT NULL,
        supplierName TEXT NOT NULL,
        billNo TEXT NOT NULL UNIQUE,
        billType TEXT DEFAULT 'Cash',
        date TEXT,
        totalAmount REAL DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplierId) REFERENCES suppliers(id)
      );
    `);

    // Purchase Items table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseBillId INTEGER,
        name TEXT NOT NULL,
        mrp REAL DEFAULT 0,
        purchasePrice REAL DEFAULT 0,
        sellPrice REAL DEFAULT 0,
        quantity REAL DEFAULT 0,
        unit TEXT DEFAULT 'pcs',
        category TEXT DEFAULT 'General',
        total REAL DEFAULT 0,
        FOREIGN KEY(purchaseBillId) REFERENCES purchase_bills(id)
      );
    `);

    // Categories table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Shop Settings table
    db.execSync(`
      CREATE TABLE IF NOT EXISTS shop_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT,
        topTagline TEXT,
        bottomTagline TEXT,
        logo TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check and add category column if missing (for existing installations)
    try {
      const result = db.getAllSync<any>('PRAGMA table_info(purchase_items);');
      const hasCategory = result.some(
        (column: any) => column.name === 'category',
      );

      if (!hasCategory) {
        console.log('Adding category column to purchase_items table...');
        db.execSync(
          'ALTER TABLE purchase_items ADD COLUMN category TEXT DEFAULT "General";',
        );
      }
    } catch (error) {
      console.error('Error checking/adding category column:', error);
    }

    isInitialized = true;
    console.log('DB initialized successfully');
  } catch (error) {
    console.error('Error initializing DB:', error);
    throw error;
  }
}

export function isSqliteAvailable(): boolean {
  try {
    return !!SQLite.openDatabaseSync;
  } catch {
    return false;
  }
}

function ensureDBInitialized() {
  if (!db || !isInitialized) {
    initDB();
  }
}

// ====================================================================
// SHOP SETTINGS FUNCTIONS
// ====================================================================

export function getShopSettings(): Promise<ShopSettings | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM shop_settings ORDER BY id DESC LIMIT 1;',
      );

      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting shop settings:', error);
      resolve(null);
    }
  });
}

export function saveShopSettings(settings: ShopSettings): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      // Check if settings already exist
      const existing = db!.getAllSync<any>(
        'SELECT id FROM shop_settings ORDER BY id DESC LIMIT 1;',
      );

      if (existing.length > 0) {
        // Update existing settings
        const statement = db!.prepareSync(
          `UPDATE shop_settings 
           SET name = ?, address = ?, phone = ?, email = ?, 
               topTagline = ?, bottomTagline = ?, logo = ?, 
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
        );
        statement.executeSync([
          settings.name,
          settings.address,
          settings.phone,
          settings.email,
          settings.topTagline,
          settings.bottomTagline,
          settings.logo,
          existing[0].id,
        ]);
        statement.finalizeSync();
      } else {
        // Insert new settings
        const statement = db!.prepareSync(
          `INSERT INTO shop_settings (name, address, phone, email, topTagline, bottomTagline, logo)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );
        statement.executeSync([
          settings.name,
          settings.address,
          settings.phone,
          settings.email,
          settings.topTagline,
          settings.bottomTagline,
          settings.logo,
        ]);
        statement.finalizeSync();
      }
      resolve(true);
    } catch (error) {
      console.error('Failed to save shop settings:', error);
      reject(error);
    }
  });
}

export function deleteShopSettings(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync('DELETE FROM shop_settings');
      statement.executeSync();
      statement.finalizeSync();
      resolve(true);
    } catch (error) {
      console.error('Failed to delete shop settings:', error);
      reject(error);
    }
  });
}

// ====================================================================
// CUSTOMER FUNCTIONS
// ====================================================================

export function insertCustomer(
  name: string,
  phone: string,
  email?: string,
  address?: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'INSERT INTO customers (name, phone, email, address, totalPurchases) VALUES (?, ?, ?, ?, ?)',
      );
      const result = statement.executeSync([
        name,
        phone,
        email || null,
        address || null,
        0,
      ]);
      const insertId = result.lastInsertRowId;
      statement.finalizeSync();
      resolve(insertId);
    } catch (error) {
      reject(error);
    }
  });
}

export function updateCustomer(
  id: number,
  name: string,
  phone: string,
  email?: string,
  address?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'UPDATE customers SET name = ?, phone = ?, email = ?, address = ? WHERE id = ?',
      );
      statement.executeSync([name, phone, email || null, address || null, id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteCustomer(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync('DELETE FROM customers WHERE id = ?');
      statement.executeSync([id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllCustomers(): Promise<Customer[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM customers ORDER BY name;',
      );
      const customers: Customer[] = result.map((customer) => ({
        ...customer,
        type: 'customer' as const,
      }));
      resolve(customers);
    } catch (error) {
      console.error('Error getting customers:', error);
      resolve([]);
    }
  });
}

export function searchCustomersByName(name: string): Promise<Customer[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM customers WHERE name LIKE ? ORDER BY name;',
        [`%${name}%`],
      );
      const customers: Customer[] = result.map((customer) => ({
        ...customer,
        type: 'customer' as const,
      }));
      resolve(customers);
    } catch (error) {
      console.error('Error searching customers:', error);
      resolve([]);
    }
  });
}

export function updateCustomerPurchases(
  customerId: number,
  amount: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const current = db!.getAllSync<any>(
        'SELECT totalPurchases FROM customers WHERE id = ?;',
        [customerId],
      );
      const currentTotal = current.length > 0 ? current[0].totalPurchases : 0;
      const newTotal = currentTotal + amount;
      const statement = db!.prepareSync(
        'UPDATE customers SET totalPurchases = ?, lastPurchase = ? WHERE id = ?',
      );
      statement.executeSync([
        newTotal,
        new Date().toISOString().split('T')[0],
        customerId,
      ]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getCustomerById(id: number): Promise<Customer | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM customers WHERE id = ?;',
        [id],
      );
      if (result.length > 0) {
        resolve({
          ...result[0],
          type: 'customer' as const,
        });
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting customer by id:', error);
      resolve(null);
    }
  });
}

// ====================================================================
// BILL FUNCTIONS
// ====================================================================

export function insertBill(
  customerId: number,
  customerName: string,
  billType: string,
  billingDate: string,
  totalAmount: number,
  cart: {
    name: string;
    quantity: number;
    rate: number;
    finalRate: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
  }[],
  billDiscountPercent: number = 0,
  subtotal: number = 0,
  itemDiscountAmount: number = 0,
  billDiscountAmount: number = 0,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      db!.withTransactionSync(() => {
        const billStatement = db!.prepareSync(
          'INSERT INTO bills (customerId, customerName, billType, billingDate, totalAmount, billDiscountPercent, billDiscountAmount, subtotal, itemDiscountAmount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        const billResult = billStatement.executeSync([
          customerId,
          customerName,
          billType,
          billingDate,
          totalAmount,
          billDiscountPercent,
          billDiscountAmount,
          subtotal,
          itemDiscountAmount,
        ]);
        const billId = billResult.lastInsertRowId;
        billStatement.finalizeSync();

        if (!billId) throw new Error('Failed to insert bill');

        const itemStatement = db!.prepareSync(
          'INSERT INTO bill_items (billId, itemName, quantity, rate, finalRate, discountPercent, discountAmount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );

        cart.forEach((item) => {
          itemStatement.executeSync([
            billId,
            item.name,
            item.quantity,
            item.rate,
            item.finalRate,
            item.discountPercent,
            item.discountAmount,
            item.total,
          ]);
        });
        itemStatement.finalizeSync();
        resolve(billId);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllBills(): Promise<Bill[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT id, customerId, customerName, billType, billingDate, totalAmount, billDiscountPercent, billDiscountAmount, subtotal, itemDiscountAmount FROM bills ORDER BY id DESC;',
      );

      const bills: Bill[] = result.map((bill: any) => ({
        id: bill.id,
        customerId: bill.customerId,
        customerName: bill.customerName,
        billType: bill.billType,
        billingDate: bill.billingDate,
        totalAmount: bill.totalAmount,
        billDiscountPercent: bill.billDiscountPercent || 0,
        billDiscountAmount: bill.billDiscountAmount || 0,
        subtotal: bill.subtotal || 0,
        itemDiscountAmount: bill.itemDiscountAmount || 0,
      }));

      resolve(bills);
    } catch (error) {
      console.error('Error getting bills:', error);
      resolve([]);
    }
  });
}

export function getBillItems(billId: number): Promise<BillItem[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT id, billId, itemName, quantity, rate, finalRate, discountPercent, discountAmount, total FROM bill_items WHERE billId = ?;',
        [billId],
      );

      const items: BillItem[] = result.map((item: any) => ({
        id: item.id,
        billId: item.billId,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        finalRate: item.finalRate,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      }));

      resolve(items);
    } catch (error) {
      console.error('Error getting bill items:', error);
      resolve([]);
    }
  });
}

export function getBillWithItems(billId: number): Promise<Bill | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      const billResult = db!.getAllSync<any>(
        'SELECT id, customerId, customerName, billType, billingDate, totalAmount, billDiscountPercent, billDiscountAmount, subtotal, itemDiscountAmount FROM bills WHERE id = ?;',
        [billId],
      );

      if (billResult.length === 0) {
        resolve(null);
        return;
      }

      const bill: Bill = {
        id: billResult[0].id,
        customerId: billResult[0].customerId,
        customerName: billResult[0].customerName,
        billType: billResult[0].billType,
        billingDate: billResult[0].billingDate,
        totalAmount: billResult[0].totalAmount,
        billDiscountPercent: billResult[0].billDiscountPercent || 0,
        billDiscountAmount: billResult[0].billDiscountAmount || 0,
        subtotal: billResult[0].subtotal || 0,
        itemDiscountAmount: billResult[0].itemDiscountAmount || 0,
      };

      const itemsResult = db!.getAllSync<any>(
        'SELECT id, billId, itemName, quantity, rate, finalRate, discountPercent, discountAmount, total FROM bill_items WHERE billId = ?;',
        [billId],
      );

      bill.items = itemsResult.map((item: any) => ({
        id: item.id,
        billId: item.billId,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        finalRate: item.finalRate,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        total: item.total,
      }));

      resolve(bill);
    } catch (error) {
      console.error('Error getting bill with items:', error);
      resolve(null);
    }
  });
}

export function deleteBill(billId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      const bill = db!.getAllSync<any>(
        'SELECT customerId, totalAmount FROM bills WHERE id = ?;',
        [billId],
      );

      if (bill.length === 0) {
        throw new Error('Bill not found');
      }

      const customerId = bill[0].customerId;
      const totalAmount = bill[0].totalAmount;

      db!.withTransactionSync(() => {
        const deleteItemsStatement = db!.prepareSync(
          'DELETE FROM bill_items WHERE billId = ?',
        );
        deleteItemsStatement.executeSync([billId]);
        deleteItemsStatement.finalizeSync();

        const deleteBillStatement = db!.prepareSync(
          'DELETE FROM bills WHERE id = ?',
        );
        deleteBillStatement.executeSync([billId]);
        deleteBillStatement.finalizeSync();

        const current = db!.getAllSync<any>(
          'SELECT totalPurchases FROM customers WHERE id = ?;',
          [customerId],
        );

        if (current.length > 0) {
          const currentTotal = current[0].totalPurchases;
          const newTotal = Math.max(0, currentTotal - totalAmount);

          const updateCustomerStatement = db!.prepareSync(
            'UPDATE customers SET totalPurchases = ? WHERE id = ?',
          );
          updateCustomerStatement.executeSync([newTotal, customerId]);
          updateCustomerStatement.finalizeSync();
        }
      });

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function updateBill(
  billId: number,
  customerId: number,
  customerName: string,
  billType: string,
  billingDate: string,
  totalAmount: number,
  cart: {
    name: string;
    quantity: number;
    rate: number;
    finalRate: number;
    discountPercent: number;
    discountAmount: number;
    total: number;
  }[],
  billDiscountPercent: number = 0,
  subtotal: number = 0,
  itemDiscountAmount: number = 0,
  billDiscountAmount: number = 0,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      db!.withTransactionSync(() => {
        const updateBillStatement = db!.prepareSync(
          'UPDATE bills SET customerId = ?, customerName = ?, billType = ?, billingDate = ?, totalAmount = ?, billDiscountPercent = ?, billDiscountAmount = ?, subtotal = ?, itemDiscountAmount = ? WHERE id = ?',
        );
        updateBillStatement.executeSync([
          customerId,
          customerName,
          billType,
          billingDate,
          totalAmount,
          billDiscountPercent,
          billDiscountAmount,
          subtotal,
          itemDiscountAmount,
          billId,
        ]);
        updateBillStatement.finalizeSync();

        const deleteItemsStatement = db!.prepareSync(
          'DELETE FROM bill_items WHERE billId = ?',
        );
        deleteItemsStatement.executeSync([billId]);
        deleteItemsStatement.finalizeSync();

        const insertItemStatement = db!.prepareSync(
          'INSERT INTO bill_items (billId, itemName, quantity, rate, finalRate, discountPercent, discountAmount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        );
        cart.forEach((item) => {
          insertItemStatement.executeSync([
            billId,
            item.name,
            item.quantity,
            item.rate,
            item.finalRate,
            item.discountPercent,
            item.discountAmount,
            item.total,
          ]);
        });
        insertItemStatement.finalizeSync();
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getBills(): Promise<Bill[]> {
  return getAllBills();
}

// ====================================================================
// PRODUCT FUNCTIONS
// ====================================================================

export function getAllProducts(): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<Product>(
        'SELECT * FROM products ORDER BY name;',
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting products:', error);
      resolve([]);
    }
  });
}

export function insertProduct(
  name: string,
  mrp: number,
  sellPrice: number,
  purchasePrice: number,
  stock: number,
  unit: string,
  category: string,
  minStock: number = 10,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'INSERT INTO products (name, mrp, sellPrice, purchasePrice, stock, unit, category, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      const result = statement.executeSync([
        name,
        mrp,
        sellPrice,
        purchasePrice,
        stock,
        unit,
        category,
        minStock,
      ]);
      const insertId = result.lastInsertRowId;
      statement.finalizeSync();
      resolve(insertId);
    } catch (error) {
      reject(error);
    }
  });
}

export function updateProduct(
  id: number,
  name: string,
  mrp: number,
  sellPrice: number,
  purchasePrice: number,
  stock: number,
  unit: string,
  category: string,
  minStock: number = 10,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'UPDATE products SET name = ?, mrp = ?, sellPrice = ?, purchasePrice = ?, stock = ?, unit = ?, category = ?, minStock = ?, updatedAt = ? WHERE id = ?',
      );
      statement.executeSync([
        name,
        mrp,
        sellPrice,
        purchasePrice,
        stock,
        unit,
        category,
        minStock,
        new Date().toISOString(),
        id,
      ]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteProduct(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync('DELETE FROM products WHERE id = ?');
      statement.executeSync([id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getProductById(id: number): Promise<Product | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM products WHERE id = ?;',
        [id],
      );
      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting product by id:', error);
      resolve(null);
    }
  });
}

export function searchProductsByName(name: string): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM products WHERE name LIKE ? ORDER BY name;',
        [`%${name}%`],
      );
      resolve(result);
    } catch (error) {
      console.error('Error searching products:', error);
      resolve([]);
    }
  });
}

export function getProductsByCategory(category: string): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM products WHERE category = ? ORDER BY name;',
        [category],
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting products by category:', error);
      resolve([]);
    }
  });
}

export function getLowStockProducts(): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM products WHERE stock <= minStock ORDER BY stock ASC;',
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting low stock products:', error);
      resolve([]);
    }
  });
}

export function updateProductStock(
  id: number,
  newStock: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'UPDATE products SET stock = ?, updatedAt = ? WHERE id = ?',
      );
      statement.executeSync([newStock, new Date().toISOString(), id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export const getProductByNameAndDetails = async (
  name: string,
  category: string,
  mrp: number,
  purchasePrice: number
): Promise<Product | null> => {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      
      // Use a tolerance for floating-point comparisons to handle precision issues
      const tolerance = 0.01; // 0.01 rupees tolerance

      const result = db!.getAllSync<any>(
        `SELECT * FROM products 
         WHERE name = ? 
         AND category = ?
         AND ABS(mrp - ?) < ?
         AND ABS(purchasePrice - ?) < ?`,
        [name, category, mrp, tolerance, purchasePrice, tolerance],
      );

      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error finding product by name and details:', error);
      reject(error);
    }
  });
};

// ====================================================================
// SUPPLIER FUNCTIONS
// ====================================================================

export function insertSupplier(
  name: string,
  phone: string,
  company: string,
  products: string,
  email?: string,
  address?: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'INSERT INTO suppliers (name, phone, email, address, company, products) VALUES (?, ?, ?, ?, ?, ?)',
      );
      const result = statement.executeSync([
        name,
        phone,
        email || null,
        address || null,
        company,
        products,
      ]);
      const insertId = result.lastInsertRowId;
      statement.finalizeSync();
      resolve(insertId);
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllSuppliers(): Promise<Supplier[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM suppliers ORDER BY name;',
      );
      const suppliers: Supplier[] = result.map((supplier) => ({
        ...supplier,
        type: 'supplier' as const,
      }));
      resolve(suppliers);
    } catch (error) {
      console.error('Error getting suppliers:', error);
      resolve([]);
    }
  });
}

export function searchSuppliersByName(name: string): Promise<Supplier[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM suppliers WHERE name LIKE ? ORDER BY name;',
        [`%${name}%`],
      );
      const suppliers: Supplier[] = result.map((supplier) => ({
        ...supplier,
        type: 'supplier' as const,
      }));
      resolve(suppliers);
    } catch (error) {
      console.error('Error searching suppliers:', error);
      resolve([]);
    }
  });
}

export function updateSupplier(
  id: number,
  name: string,
  phone: string,
  company: string,
  products: string,
  email?: string,
  address?: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'UPDATE suppliers SET name = ?, phone = ?, email = ?, address = ?, company = ?, products = ? WHERE id = ?',
      );
      statement.executeSync([
        name,
        phone,
        email || null,
        address || null,
        company,
        products,
        id,
      ]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteSupplier(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync('DELETE FROM suppliers WHERE id = ?');
      statement.executeSync([id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getSupplierById(id: number): Promise<Supplier | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM suppliers WHERE id = ?;',
        [id],
      );
      if (result.length > 0) {
        resolve({
          ...result[0],
          type: 'supplier' as const,
        });
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting supplier by id:', error);
      resolve(null);
    }
  });
}

// ====================================================================
// CONTACT FUNCTIONS
// ====================================================================

export function getCustomerLastPurchaseAmount(
  customerId: number,
): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        `SELECT totalAmount FROM bills 
         WHERE customerId = ? 
         ORDER BY billingDate DESC, id DESC 
         LIMIT 1;`,
        [customerId],
      );

      if (result.length > 0) {
        resolve(result[0].totalAmount);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting customer last purchase amount:', error);
      resolve(null);
    }
  });
}

export function getAllContacts(): Promise<Contact[]> {
  return new Promise(async (resolve) => {
    try {
      ensureDBInitialized();
      const customers = await getAllCustomers();
      const suppliers = await getAllSuppliers();
      const contacts: Contact[] = [...customers, ...suppliers];
      contacts.sort((a, b) => a.name.localeCompare(b.name));
      resolve(contacts);
    } catch (error) {
      console.error('Error getting contacts:', error);
      resolve([]);
    }
  });
}

export function searchContactsByName(name: string): Promise<Contact[]> {
  return new Promise(async (resolve) => {
    try {
      ensureDBInitialized();
      const customers = await searchCustomersByName(name);
      const suppliers = await searchSuppliersByName(name);
      const contacts: Contact[] = [...customers, ...suppliers];
      contacts.sort((a, b) => a.name.localeCompare(b.name));
      resolve(contacts);
    } catch (error) {
      console.error('Error searching contacts:', error);
      resolve([]);
    }
  });
}

// ====================================================================
// SALES FUNCTIONS
// ====================================================================

export function getTodaysSales(): Promise<{
  totalSales: number;
  trendPercentage: number;
}> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Get today's total sales
      const todayResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as todayTotal FROM bills WHERE billingDate = ?;',
        [today],
      );

      const todayTotal = todayResult[0]?.todayTotal || 0;

      // Get yesterday's date
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayFormatted = yesterday.toISOString().split('T')[0];

      // Get yesterday's total sales
      const yesterdayResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as yesterdayTotal FROM bills WHERE billingDate = ?;',
        [yesterdayFormatted],
      );

      const yesterdayTotal = yesterdayResult[0]?.yesterdayTotal || 0;

      // Calculate trend percentage
      let trendPercentage = 0;
      if (yesterdayTotal > 0) {
        trendPercentage =
          ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
      } else if (todayTotal > 0) {
        trendPercentage = 100; // If no sales yesterday but sales today
      }

      resolve({
        totalSales: todayTotal,
        trendPercentage: Math.round(trendPercentage * 100) / 100, // Round to 2 decimal places
      });
    } catch (error) {
      console.error("Error getting today's sales:", error);
      resolve({ totalSales: 0, trendPercentage: 0 });
    }
  });
}

// ====================================================================
// PRODUCT SEARCH FUNCTIONS
// ====================================================================

export function findExistingProduct(
  name: string,
  mrp: number,
  purchasePrice: number,
  category: string,
): Promise<Product | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      // Use a tolerance for floating-point comparisons to handle precision issues
      const tolerance = 0.01; // 0.01 rupees tolerance

      const result = db!.getAllSync<any>(
        `SELECT * FROM products 
         WHERE name = ? 
         AND category = ?
         AND ABS(mrp - ?) < ?
         AND ABS(purchasePrice - ?) < ?`,
        [name, category, mrp, tolerance, purchasePrice, tolerance],
      );

      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error finding existing product:', error);
      resolve(null);
    }
  });
}

// ====================================================================
// PURCHASE FUNCTIONS - IMPROVED WITH PROPER PRODUCT UPDATES
// ====================================================================

// Helper function to update or create product from purchase WITH CATEGORY
function updateOrCreateProductFromPurchase(item: {
  name: string;
  mrp: number;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  category: string;
}): void {
  try {
    // Check if product exists with same name and category
    const existingProduct = db!.getAllSync<any>(
      'SELECT * FROM products WHERE name = ? AND category = ?',
      [item.name, item.category],
    );

    if (existingProduct.length > 0) {
      // Update existing product stock, prices, and category
      const currentStock = existingProduct[0].stock;
      const newStock = currentStock + item.quantity;

      // Update product with new prices and stock
      const updateStatement = db!.prepareSync(
        'UPDATE products SET stock = ?, mrp = ?, purchasePrice = ?, sellPrice = ?, unit = ?, category = ?, updatedAt = ? WHERE name = ? AND category = ?',
      );
      updateStatement.executeSync([
        newStock,
        item.mrp,
        item.purchasePrice,
        item.sellPrice,
        item.unit,
        item.category,
        new Date().toISOString(),
        item.name,
        item.category,
      ]);
      updateStatement.finalizeSync();
      
      console.log(`Updated product: ${item.name}, New stock: ${newStock}`);
    } else {
      // Create new product
      const insertStatement = db!.prepareSync(
        'INSERT INTO products (name, mrp, sellPrice, purchasePrice, stock, unit, category, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      insertStatement.executeSync([
        item.name,
        item.mrp,
        item.sellPrice,
        item.purchasePrice,
        item.quantity,
        item.unit,
        item.category,
        10, // Default minStock
      ]);
      insertStatement.finalizeSync();
      
      console.log(`Created new product: ${item.name}, Stock: ${item.quantity}`);
    }
  } catch (error) {
    console.error('Error updating/creating product from purchase:', error);
    throw error; // Re-throw to handle in transaction
  }
}

export function insertPurchaseBill(
  supplierId: number,
  supplierName: string,
  billNo: string,
  billType: 'Cash' | 'Credit',
  date: string,
  totalAmount: number,
  items: {
    name: string;
    mrp: number;
    purchasePrice: number;
    sellPrice: number;
    quantity: number;
    unit: string;
    category: string;
    total: number;
  }[],
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      db!.withTransactionSync(() => {
        // Insert purchase bill
        const billStatement = db!.prepareSync(
          'INSERT INTO purchase_bills (supplierId, supplierName, billNo, billType, date, totalAmount) VALUES (?, ?, ?, ?, ?, ?)',
        );
        const billResult = billStatement.executeSync([
          supplierId,
          supplierName,
          billNo,
          billType,
          date,
          totalAmount,
        ]);
        const purchaseBillId = billResult.lastInsertRowId;
        billStatement.finalizeSync();

        if (!purchaseBillId) throw new Error('Failed to insert purchase bill');

        // Insert purchase items WITH CATEGORY
        const itemStatement = db!.prepareSync(
          'INSERT INTO purchase_items (purchaseBillId, name, mrp, purchasePrice, sellPrice, quantity, unit, category, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );

        items.forEach((item) => {
          itemStatement.executeSync([
            purchaseBillId,
            item.name,
            item.mrp,
            item.purchasePrice,
            item.sellPrice,
            item.quantity,
            item.unit,
            item.category,
            item.total,
          ]);
        });
        itemStatement.finalizeSync();

        // Update product stock or create new products WITH CATEGORY
        items.forEach((item) => {
          updateOrCreateProductFromPurchase(item);
        });

        resolve(purchaseBillId);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllPurchaseBills(): Promise<PurchaseBill[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM purchase_bills ORDER BY date DESC, id DESC;',
      );

      const purchaseBills: PurchaseBill[] = result.map((bill: any) => ({
        id: bill.id,
        supplierId: bill.supplierId,
        supplierName: bill.supplierName,
        billNo: bill.billNo,
        billType: bill.billType,
        date: bill.date,
        totalAmount: bill.totalAmount,
        createdAt: bill.createdAt,
      }));

      resolve(purchaseBills);
    } catch (error) {
      console.error('Error getting purchase bills:', error);
      resolve([]);
    }
  });
}

export function getPurchaseBillItems(
  purchaseBillId: number,
): Promise<PurchaseItem[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
        [purchaseBillId],
      );

      const items: PurchaseItem[] = result.map((item: any) => ({
        id: item.id,
        purchaseBillId: item.purchaseBillId,
        name: item.name,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || 'General',
        total: item.total,
      }));

      resolve(items);
    } catch (error) {
      console.error('Error getting purchase bill items:', error);
      resolve([]);
    }
  });
}

export function getPurchaseBillWithItems(
  purchaseBillId: number,
): Promise<{ bill: PurchaseBill; items: PurchaseItem[] } | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      // Get purchase bill
      const billResult = db!.getAllSync<any>(
        'SELECT * FROM purchase_bills WHERE id = ?;',
        [purchaseBillId],
      );

      if (billResult.length === 0) {
        resolve(null);
        return;
      }

      const bill: PurchaseBill = {
        id: billResult[0].id,
        supplierId: billResult[0].supplierId,
        supplierName: billResult[0].supplierName,
        billNo: billResult[0].billNo,
        billType: billResult[0].billType,
        date: billResult[0].date,
        totalAmount: billResult[0].totalAmount,
        createdAt: billResult[0].createdAt,
      };

      // Get purchase items WITH CATEGORY
      const itemsResult = db!.getAllSync<any>(
        'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
        [purchaseBillId],
      );

      const items: PurchaseItem[] = itemsResult.map((item: any) => ({
        id: item.id,
        purchaseBillId: item.purchaseBillId,
        name: item.name,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || 'General',
        total: item.total,
      }));

      resolve({ bill, items });
    } catch (error) {
      console.error('Error getting purchase bill with items:', error);
      resolve(null);
    }
  });
}

export function deletePurchaseBill(purchaseBillId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      // First get the items to reverse stock updates
      const items = db!.getAllSync<any>(
        'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
        [purchaseBillId],
      );

      db!.withTransactionSync(() => {
        // Reverse stock updates for products
        items.forEach((item) => {
          const existingProduct = db!.getAllSync<any>(
            'SELECT * FROM products WHERE name = ? AND category = ?',
            [item.name, item.category || 'General'],
          );

          if (existingProduct.length > 0) {
            const currentStock = existingProduct[0].stock;
            const newStock = Math.max(0, currentStock - item.quantity);

            const updateStatement = db!.prepareSync(
              'UPDATE products SET stock = ?, updatedAt = ? WHERE name = ? AND category = ?',
            );
            updateStatement.executeSync([
              newStock,
              new Date().toISOString(),
              item.name,
              item.category || 'General',
            ]);
            updateStatement.finalizeSync();
          }
        });

        // Delete purchase items
        const deleteItemsStatement = db!.prepareSync(
          'DELETE FROM purchase_items WHERE purchaseBillId = ?',
        );
        deleteItemsStatement.executeSync([purchaseBillId]);
        deleteItemsStatement.finalizeSync();

        // Delete purchase bill
        const deleteBillStatement = db!.prepareSync(
          'DELETE FROM purchase_bills WHERE id = ?',
        );
        deleteBillStatement.executeSync([purchaseBillId]);
        deleteBillStatement.finalizeSync();
      });

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function updatePurchaseBill(
  purchaseBillId: number,
  supplierId: number,
  supplierName: string,
  billNo: string,
  billType: 'Cash' | 'Credit',
  date: string,
  totalAmount: number,
  items: {
    name: string;
    mrp: number;
    purchasePrice: number;
    sellPrice: number;
    quantity: number;
    unit: string;
    category: string;
    total: number;
  }[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      db!.withTransactionSync(() => {
        // First get the original items to calculate stock differences
        const oldItems = db!.getAllSync<any>(
          'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
          [purchaseBillId],
        );

        // Restore original stock levels by subtracting old purchase quantities
        oldItems.forEach((oldItem) => {
          const existingProduct = db!.getAllSync<any>(
            'SELECT * FROM products WHERE name = ? AND category = ?',
            [oldItem.name, oldItem.category || 'General'],
          );

          if (existingProduct.length > 0) {
            const currentStock = existingProduct[0].stock;
            const newStock = Math.max(0, currentStock - oldItem.quantity);

            const updateStatement = db!.prepareSync(
              'UPDATE products SET stock = ?, updatedAt = ? WHERE name = ? AND category = ?',
            );
            updateStatement.executeSync([
              newStock,
              new Date().toISOString(),
              oldItem.name,
              oldItem.category || 'General',
            ]);
            updateStatement.finalizeSync();
          }
        });

        // Update purchase bill
        const updateBillStatement = db!.prepareSync(
          'UPDATE purchase_bills SET supplierId = ?, supplierName = ?, billNo = ?, billType = ?, date = ?, totalAmount = ? WHERE id = ?',
        );
        updateBillStatement.executeSync([
          supplierId,
          supplierName,
          billNo,
          billType,
          date,
          totalAmount,
          purchaseBillId,
        ]);
        updateBillStatement.finalizeSync();

        // Delete old purchase items
        const deleteItemsStatement = db!.prepareSync(
          'DELETE FROM purchase_items WHERE purchaseBillId = ?',
        );
        deleteItemsStatement.executeSync([purchaseBillId]);
        deleteItemsStatement.finalizeSync();

        // Insert new purchase items
        const insertItemStatement = db!.prepareSync(
          'INSERT INTO purchase_items (purchaseBillId, name, mrp, purchasePrice, sellPrice, quantity, unit, category, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        items.forEach((item) => {
          insertItemStatement.executeSync([
            purchaseBillId,
            item.name,
            item.mrp,
            item.purchasePrice,
            item.sellPrice,
            item.quantity,
            item.unit,
            item.category,
            item.total,
          ]);
        });
        insertItemStatement.finalizeSync();

        // Update product stock and prices with new items
        items.forEach((item) => {
          updateOrCreateProductFromPurchase(item);
        });
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function checkBillNoExists(billNo: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT id FROM purchase_bills WHERE billNo = ?;',
        [billNo],
      );
      resolve(result.length > 0);
    } catch (error) {
      console.error('Error checking bill no existence:', error);
      resolve(false);
    }
  });
}

export function getPurchaseSummary(): Promise<{
  totalPurchases: number;
  cashPurchases: number;
  creditPurchases: number;
  monthlyPurchases: number;
}> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      // Total purchases
      const totalResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as total FROM purchase_bills;',
      );
      const totalPurchases = totalResult[0]?.total || 0;

      // Cash purchases
      const cashResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as total FROM purchase_bills WHERE billType = "Cash";',
      );
      const cashPurchases = cashResult[0]?.total || 0;

      // Credit purchases
      const creditResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as total FROM purchase_bills WHERE billType = "Credit";',
      );
      const creditPurchases = creditResult[0]?.total || 0;

      // Monthly purchases (current month)
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const monthlyResult = db!.getAllSync<any>(
        'SELECT COALESCE(SUM(totalAmount), 0) as total FROM purchase_bills WHERE strftime("%Y-%m", date) = ?;',
        [currentMonth],
      );
      const monthlyPurchases = monthlyResult[0]?.total || 0;

      resolve({
        totalPurchases,
        cashPurchases,
        creditPurchases,
        monthlyPurchases,
      });
    } catch (error) {
      console.error('Error getting purchase summary:', error);
      resolve({
        totalPurchases: 0,
        cashPurchases: 0,
        creditPurchases: 0,
        monthlyPurchases: 0,
      });
    }
  });
}

// ====================================================================
// CATEGORY FUNCTIONS
// ====================================================================

export function insertCategory(name: string): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'INSERT INTO categories (name) VALUES (?)',
      );
      const result = statement.executeSync([name]);
      const insertId = result.lastInsertRowId;
      statement.finalizeSync();
      resolve(insertId);
    } catch (error) {
      reject(error);
    }
  });
}

export function getAllCategories(): Promise<Category[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM categories ORDER BY name;',
      );
      const categories: Category[] = result.map((category: any) => ({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
      }));
      resolve(categories);
    } catch (error) {
      console.error('Error getting categories:', error);
      resolve([]);
    }
  });
}

export function searchCategoriesByName(name: string): Promise<Category[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM categories WHERE name LIKE ? ORDER BY name;',
        [`%${name}%`],
      );
      const categories: Category[] = result.map((category: any) => ({
        id: category.id,
        name: category.name,
        createdAt: category.createdAt,
      }));
      resolve(categories);
    } catch (error) {
      console.error('Error searching categories:', error);
      resolve([]);
    }
  });
}

export function updateCategory(id: number, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      // First check if category exists
      const existingCategory = db!.getAllSync<any>(
        'SELECT id FROM categories WHERE id = ?;',
        [id],
      );

      if (existingCategory.length === 0) {
        reject(new Error('Category not found'));
        return;
      }

      // Check if new name already exists (excluding current category)
      const duplicateCategory = db!.getAllSync<any>(
        'SELECT id FROM categories WHERE name = ? AND id != ?;',
        [name, id],
      );

      if (duplicateCategory.length > 0) {
        reject(new Error('Category name already exists'));
        return;
      }

      const statement = db!.prepareSync(
        'UPDATE categories SET name = ? WHERE id = ?',
      );
      statement.executeSync([name, id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deleteCategory(id: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      // First check if category exists
      const existingCategory = db!.getAllSync<any>(
        'SELECT id FROM categories WHERE id = ?;',
        [id],
      );

      if (existingCategory.length === 0) {
        reject(new Error('Category not found'));
        return;
      }

      // Check if category is being used by any products
      const productsUsingCategory = db!.getAllSync<any>(
        'SELECT id FROM products WHERE category = (SELECT name FROM categories WHERE id = ?) LIMIT 1;',
        [id],
      );

      if (productsUsingCategory.length > 0) {
        reject(
          new Error('Cannot delete category: It is being used by products'),
        );
        return;
      }

      // Check if category is being used by any purchase items
      const purchaseItemsUsingCategory = db!.getAllSync<any>(
        'SELECT id FROM purchase_items WHERE category = (SELECT name FROM categories WHERE id = ?) LIMIT 1;',
        [id],
      );

      if (purchaseItemsUsingCategory.length > 0) {
        reject(
          new Error(
            'Cannot delete category: It is being used by purchase items',
          ),
        );
        return;
      }

      const statement = db!.prepareSync('DELETE FROM categories WHERE id = ?');
      statement.executeSync([id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function getCategoryById(id: number): Promise<Category | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM categories WHERE id = ?;',
        [id],
      );
      if (result.length > 0) {
        resolve({
          id: result[0].id,
          name: result[0].name,
          createdAt: result[0].createdAt,
        });
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting category by id:', error);
      resolve(null);
    }
  });
}

export function getCategoryUsageCount(
  id: number,
): Promise<{ products: number; purchaseItems: number }> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      // Get category name first
      const categoryResult = db!.getAllSync<any>(
        'SELECT name FROM categories WHERE id = ?;',
        [id],
      );

      if (categoryResult.length === 0) {
        resolve({ products: 0, purchaseItems: 0 });
        return;
      }

      const categoryName = categoryResult[0].name;

      // Count products using this category
      const productsResult = db!.getAllSync<any>(
        'SELECT COUNT(*) as count FROM products WHERE category = ?;',
        [categoryName],
      );

      // Count purchase items using this category
      const purchaseItemsResult = db!.getAllSync<any>(
        'SELECT COUNT(*) as count FROM purchase_items WHERE category = ?;',
        [categoryName],
      );

      resolve({
        products: productsResult[0]?.count || 0,
        purchaseItems: purchaseItemsResult[0]?.count || 0,
      });
    } catch (error) {
      console.error('Error getting category usage count:', error);
      resolve({ products: 0, purchaseItems: 0 });
    }
  });
}

// ====================================================================
// DATA MANAGEMENT FUNCTIONS
// ====================================================================

export function backupData(): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      // Get all data from all tables
      const shopSettings = db!.getAllSync<any>('SELECT * FROM shop_settings;');
      const customers = db!.getAllSync<any>('SELECT * FROM customers;');
      const suppliers = db!.getAllSync<any>('SELECT * FROM suppliers;');
      const products = db!.getAllSync<any>('SELECT * FROM products;');
      const categories = db!.getAllSync<any>('SELECT * FROM categories;');
      const bills = db!.getAllSync<any>('SELECT * FROM bills;');
      const billItems = db!.getAllSync<any>('SELECT * FROM bill_items;');
      const purchaseBills = db!.getAllSync<any>(
        'SELECT * FROM purchase_bills;',
      );
      const purchaseItems = db!.getAllSync<any>(
        'SELECT * FROM purchase_items;',
      );

      const backupData = {
        shopSettings,
        customers,
        suppliers,
        products,
        categories,
        bills,
        billItems,
        purchaseBills,
        purchaseItems,
        backupDate: new Date().toISOString(),
        version: '1.0.0',
      };

      resolve(JSON.stringify(backupData, null, 2));
    } catch (error) {
      console.error('Failed to backup data:', error);
      reject(error);
    }
  });
}

export function restoreData(backupJson: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const backupData = JSON.parse(backupJson);

      db!.withTransactionSync(() => {
        // Clear existing data
        db!.execSync(`
          DELETE FROM shop_settings;
          DELETE FROM customers;
          DELETE FROM suppliers;
          DELETE FROM products;
          DELETE FROM categories;
          DELETE FROM bills;
          DELETE FROM bill_items;
          DELETE FROM purchase_bills;
          DELETE FROM purchase_items;
        `);

        // Restore shop settings
        if (backupData.shopSettings) {
          backupData.shopSettings.forEach((settings: any) => {
            const stmt = db!.prepareSync(
              'INSERT INTO shop_settings (id, name, address, phone, email, topTagline, bottomTagline, logo, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            );
            stmt.executeSync([
              settings.id,
              settings.name,
              settings.address,
              settings.phone,
              settings.email,
              settings.topTagline,
              settings.bottomTagline,
              settings.logo,
              settings.created_at,
              settings.updated_at,
            ]);
            stmt.finalizeSync();
          });
        }

        // Note: Add similar restoration for other tables as needed
      });

      resolve(true);
    } catch (error) {
      console.error('Failed to restore data:', error);
      reject(error);
    }
  });
}

export function clearAllData(): Promise<boolean> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      db!.withTransactionSync(() => {
        db!.execSync(`
          DELETE FROM shop_settings;
          DELETE FROM customers;
          DELETE FROM suppliers;
          DELETE FROM products;
          DELETE FROM categories;
          DELETE FROM bills;
          DELETE FROM bill_items;
          DELETE FROM purchase_bills;
          DELETE FROM purchase_items;
        `);
      });

      resolve(true);
    } catch (error) {
      console.error('Failed to clear all data:', error);
      reject(error);
    }
  });
}

// Default shop settings
export const defaultShopSettings: ShopSettings = {
  name: 'Bill-Karo General Store',
  address: '123 Main Street, Delhi - 110001',
  phone: '+91 9876543210',
  email: 'info@billkaro.com',
  topTagline: 'Estimate',
  bottomTagline:
    'Thank you for your business! Items once purchased cannot be returned.',
  logo: null,
};