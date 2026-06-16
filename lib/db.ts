import * as FileSystem from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

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
  purchaseRate: number;
  finalRate: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  profit?: number;
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
  totalProfit?: number;
};

export type BillWithPaymentStatus = Bill & {
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: 'Paid' | 'Partial' | 'Unpaid';
  payments?: Payment[];
};

export type CustomerCreditSummary = {
  customerId: number;
  customerName: string;
  totalCreditAmount: number;
  totalPaidAmount: number;
  remainingAmount: number;
  bills: BillWithPaymentStatus[];
};

export type Payment = {
  id: number;
  billId: number;
  customerId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer';
  note?: string;
  createdAt: string;
};

export type CustomerStatementItem = {
  id: number;
  date: string;
  billNo: string;
  billType: string;
  description: string;
  billAmount: number;
  received: number;
  balance: number;
};

export type CustomerStatement = {
  customerId: number;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  openingBalance: number;
  closingBalance: number;
  totalCreditAmount: number;
  totalReceivedAmount: number;
  transactions: CustomerStatementItem[];
  startDate: string;
  endDate: string;
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
  categoryId: number;
  categoryName?: string;
  minStock: number;
  createdAt: string;
  updatedAt: string;
};

export type Category = {
  id: number;
  name: string;
};

export type Contact = Customer | Supplier;

export type ProfitSummary = {
  totalSales: number;
  totalProfit: number;
  profitMargin: number;
  totalCost: number;
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
  total: number;
  categoryId?: number | null;
  categoryName?: string;
};

export type PurchaseBill = {
  id: number;
  supplierName: string;
  supplierId: number;
  billNo: string;
  billType: 'Cash' | 'Credit';
  date: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items?: PurchaseItem[];
};

export interface AppSettings {
  shopName: string;
  shopAddress: string;
  shopPhone: string;
  shopEmail: string;
  topTagline: string;
  bottomTagline: string;
}

export interface ItemSalesSummary {
  productName: string;
  totalQuantity: number;
  totalAmount: number;
  pricePerUnit?: number;
}

export type PartySummaryBill = {
  id: number;
  billNo: string;
  customerName: string;
  billType: string;
  totalAmount: number;
};

// --- Activation Types ---
export type ActivationPlan = {
  id: number;
  planName: string;
  duration: number;
  price: number;
  keyPrefix: string;
};

export type Activation = {
  id: number;
  activationKey: string;
  planId: number;
  planName: string;
  duration: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  deviceId: string;
  deviceName: string;
  activatedBy: string;
  createdAt: string;
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

    db.execSync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
      );
    `);

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

    db.execSync(`
      CREATE TABLE IF NOT EXISTS bill_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billId INTEGER,
        itemName TEXT,
        quantity INTEGER,
        rate REAL,
        purchaseRate REAL DEFAULT 0,
        finalRate REAL,
        discountPercent REAL DEFAULT 0,
        discountAmount REAL DEFAULT 0,
        total REAL,
        FOREIGN KEY(billId) REFERENCES bills(id) ON DELETE CASCADE
      );
    `);

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

    db.execSync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        mrp REAL NOT NULL,
        sellPrice REAL NOT NULL,
        purchasePrice REAL NOT NULL,
        stock INTEGER NOT NULL,
        unit TEXT NOT NULL,
        categoryId INTEGER,
        minStock INTEGER DEFAULT 0,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS purchase_bills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplierName TEXT NOT NULL,
        supplierId INTEGER NOT NULL,
        billNo TEXT NOT NULL UNIQUE,
        billType TEXT CHECK(billType IN ('Cash', 'Credit')),
        date TEXT NOT NULL,
        totalAmount REAL NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(supplierId) REFERENCES suppliers(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS purchase_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        purchaseBillId INTEGER NOT NULL,
        name TEXT NOT NULL,
        mrp REAL NOT NULL,
        purchasePrice REAL NOT NULL,
        sellPrice REAL NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        total REAL NOT NULL,
        categoryId INTEGER,
        FOREIGN KEY(purchaseBillId) REFERENCES purchase_bills(id) ON DELETE CASCADE,
        FOREIGN KEY(categoryId) REFERENCES categories(id) ON DELETE SET NULL
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        billId INTEGER NOT NULL,
        customerId INTEGER NOT NULL,
        amount REAL NOT NULL,
        paymentDate TEXT NOT NULL,
        paymentMethod TEXT CHECK(paymentMethod IN ('Cash', 'Card', 'UPI', 'Bank Transfer')) NOT NULL,
        note TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(billId) REFERENCES bills(id) ON DELETE CASCADE,
        FOREIGN KEY(customerId) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    db.execSync(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
    `);

    // CREATE ACTIVATION TABLE
    db.execSync(`
      CREATE TABLE IF NOT EXISTS activations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        activationKey TEXT UNIQUE NOT NULL,
        planId INTEGER NOT NULL,
        planName TEXT NOT NULL,
        duration INTEGER NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        isActive INTEGER DEFAULT 1,
        deviceId TEXT NOT NULL,
        deviceName TEXT NOT NULL,
        activatedBy TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations
    try {
      const tableInfo = db!.getAllSync<any>('PRAGMA table_info(bill_items)');
      const hasPurchaseRate = tableInfo.some(
        (col) => col.name === 'purchaseRate',
      );

      if (!hasPurchaseRate) {
        console.log('Migrating bill_items table to add purchaseRate column...');
        db!.execSync(
          'ALTER TABLE bill_items ADD COLUMN purchaseRate REAL DEFAULT 0;',
        );
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Error migrating bill_items table:', error);
    }

    try {
      const purchaseItemsInfo = db!.getAllSync<any>(
        'PRAGMA table_info(purchase_items)',
      );
      const hasCategoryId = purchaseItemsInfo.some(
        (col) => col.name === 'categoryId',
      );

      if (!hasCategoryId) {
        console.log(
          'Migrating purchase_items table to add categoryId column...',
        );
        db!.execSync(
          'ALTER TABLE purchase_items ADD COLUMN categoryId INTEGER REFERENCES categories(id) ON DELETE SET NULL;',
        );
        console.log('Purchase items migration completed successfully');
      }
    } catch (error) {
      console.error('Error migrating purchase_items table:', error);
    }

    try {
      const billsInfo = db!.getAllSync<any>('PRAGMA table_info(bills)');
      const hasIsFullyPaid = billsInfo.some(
        (col) => col.name === 'isFullyPaid',
      );

      if (!hasIsFullyPaid) {
        console.log('Migrating bills table to add isFullyPaid column...');
        db!.execSync(
          'ALTER TABLE bills ADD COLUMN isFullyPaid INTEGER DEFAULT 0;',
        );
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Error migrating bills table:', error);
    }

    try {
      const billsInfo = db!.getAllSync<any>('PRAGMA table_info(bills)');
      const hasRemainingAmount = billsInfo.some(
        (col) => col.name === 'remainingAmount',
      );

      if (!hasRemainingAmount) {
        console.log('Migrating bills table to add remainingAmount column...');
        db!.execSync(
          'ALTER TABLE bills ADD COLUMN remainingAmount REAL DEFAULT 0;',
        );
        console.log('Migration completed successfully');
      }
    } catch (error) {
      console.error('Error migrating bills table:', error);
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

// --- Backup and Restore Functions ---
const getAllTableData = async () => {
  const tables = [
    'customers',
    'suppliers',
    'products',
    'categories',
    'bills',
    'bill_items',
    'payments',
    'purchase_bills',
    'purchase_items',
    'app_settings',
    'activations',
  ];
  const data: Record<string, any[]> = {};
  for (const table of tables) {
    try {
      data[table] = db!.getAllSync(`SELECT * FROM ${table}`);
    } catch {
      data[table] = [];
    }
  }
  return data;
};

export const backupDatabase = async (): Promise<string> => {
  ensureDBInitialized();
  if (!db) throw new Error('Database not initialised');

  const tables = await getAllTableData();
  const payload = JSON.stringify(
    { version: '1.0', timestamp: new Date().toISOString(), data: tables },
    null,
    2,
  );

  if (Platform.OS === 'web') {
    const blob = new Blob([payload], { type: 'application/json' });
    return URL.createObjectURL(blob);
  }

  const fileUri = `${FileSystem.documentDirectory}backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(fileUri, payload, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return fileUri;
};

export const restoreDatabase = async (backupPath: string): Promise<void> => {
  ensureDBInitialized();
  if (!db) throw new Error('Database not initialised');

  let payload: string;

  if (Platform.OS === 'web') {
    const res = await fetch(backupPath);
    if (!res.ok) throw new Error(`Could not read backup: HTTP ${res.status}`);
    payload = await res.text();
  } else {
    payload = await FileSystem.readAsStringAsync(backupPath, {
      encoding: FileSystem.EncodingType.UTF8,
    });
  }

  const backup = JSON.parse(payload);
  if (!backup?.data) throw new Error('Invalid backup: missing "data" field');

  const deleteOrder = [
    'payments',
    'bill_items',
    'bills',
    'purchase_items',
    'purchase_bills',
    'products',
    'categories',
    'suppliers',
    'customers',
    'app_settings',
    'activations',
  ];

  db!.withTransactionSync(() => {
    for (const table of deleteOrder) {
      try {
        db!.execSync(`DELETE FROM ${table}`);
        db!.execSync(`DELETE FROM sqlite_sequence WHERE name='${table}'`);
      } catch {
        // Table may not exist yet on a fresh install — safe to skip
      }
    }

    for (const [table, rows] of Object.entries(backup.data) as [
      string,
      any[],
    ][]) {
      if (!Array.isArray(rows) || rows.length === 0) continue;

      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;

        const placeholders = cols.map(() => '?').join(', ');
        const values = cols.map((c) => {
          const v = row[c];
          if (v === null || v === undefined) return null;
          if (typeof v === 'boolean') return v ? 1 : 0;
          if (typeof v === 'object') return JSON.stringify(v);
          return v;
        });

        try {
          const stmt = db!.prepareSync(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`,
          );
          stmt.executeSync(values);
          stmt.finalizeSync();
        } catch (err) {
          console.warn(`Skipping row in "${table}":`, err);
        }
      }
    }
  });
};

// --- Category Functions ---
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
        'SELECT id, name FROM categories ORDER BY name;',
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting categories:', error);
      resolve([]);
    }
  });
}

export function getCategoryById(id: number): Promise<Category | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT id, name FROM categories WHERE id = ?;',
        [id],
      );
      if (result.length > 0) {
        resolve(result[0]);
      } else {
        resolve(null);
      }
    } catch (error) {
      console.error('Error getting category by id:', error);
      resolve(null);
    }
  });
}

export function updateCategory(id: number, name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
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

      const checkResult = db!.getAllSync<any>(
        'SELECT COUNT(*) as count FROM products WHERE categoryId = ?;',
        [id],
      );

      if (checkResult[0].count > 0) {
        reject(
          new Error('Cannot delete category as it is used by some products'),
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

export function searchCategoriesByName(name: string): Promise<Category[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT id, name FROM categories WHERE name LIKE ? ORDER BY name;',
        [`%${name}%`],
      );
      resolve(result);
    } catch (error) {
      console.error('Error searching categories:', error);
      resolve([]);
    }
  });
}

// --- Customer Functions ---
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

// --- Bill Functions ---
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
    purchaseRate: number;
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
        const remainingAmount = billType === 'Credit' ? totalAmount : 0;
        const isFullyPaid = billType === 'Credit' ? 0 : 1;

        const billStatement = db!.prepareSync(
          'INSERT INTO bills (customerId, customerName, billType, billingDate, totalAmount, billDiscountPercent, billDiscountAmount, subtotal, itemDiscountAmount, remainingAmount, isFullyPaid) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
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
          remainingAmount,
          isFullyPaid,
        ]);
        const billId = billResult.lastInsertRowId;
        billStatement.finalizeSync();

        if (!billId) throw new Error('Failed to insert bill');

        const itemStatement = db!.prepareSync(
          'INSERT INTO bill_items (billId, itemName, quantity, rate, purchaseRate, finalRate, discountPercent, discountAmount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );

        for (const item of cart) {
          itemStatement.executeSync([
            billId,
            item.name,
            item.quantity,
            item.rate,
            item.purchaseRate,
            item.finalRate,
            item.discountPercent,
            item.discountAmount,
            item.total,
          ]);
        }
        itemStatement.finalizeSync();
        resolve(billId);
      });
    } catch (error) {
      console.error('Error inserting bill:', error);
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
        'SELECT id, billId, itemName, quantity, rate, purchaseRate, finalRate, discountPercent, discountAmount, total FROM bill_items WHERE billId = ?;',
        [billId],
      );

      const items: BillItem[] = result.map((item: any) => ({
        id: item.id,
        billId: item.billId,
        itemName: item.itemName,
        quantity: item.quantity,
        rate: item.rate,
        purchaseRate: item.purchaseRate || 0,
        finalRate: item.finalRate,
        discountPercent: item.discountPercent || 0,
        discountAmount: item.discountAmount || 0,
        total: item.total,
        profit: item.total - item.purchaseRate * item.quantity,
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
        'SELECT id, billId, itemName, quantity, rate, purchaseRate, finalRate, discountPercent, discountAmount, total FROM bill_items WHERE billId = ?;',
        [billId],
      );

      let totalProfit = 0;
      bill.items = itemsResult.map((item: any) => {
        const profit = item.total - item.purchaseRate * item.quantity;
        totalProfit += profit;
        return {
          id: item.id,
          billId: item.billId,
          itemName: item.itemName,
          quantity: item.quantity,
          rate: item.rate,
          purchaseRate: item.purchaseRate || 0,
          finalRate: item.finalRate,
          discountPercent: item.discountPercent || 0,
          discountAmount: item.discountAmount || 0,
          total: item.total,
          profit: profit,
        };
      });

      bill.totalProfit = totalProfit;

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

        const deletePaymentsStatement = db!.prepareSync(
          'DELETE FROM payments WHERE billId = ?',
        );
        deletePaymentsStatement.executeSync([billId]);
        deletePaymentsStatement.finalizeSync();

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
    purchaseRate: number;
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
          'INSERT INTO bill_items (billId, itemName, quantity, rate, purchaseRate, finalRate, discountPercent, discountAmount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );
        for (const item of cart) {
          insertItemStatement.executeSync([
            billId,
            item.name,
            item.quantity,
            item.rate,
            item.purchaseRate,
            item.finalRate,
            item.discountPercent,
            item.discountAmount,
            item.total,
          ]);
        }
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

// --- Payment Functions ---
export function insertPayment(
  billId: number,
  customerId: number,
  amount: number,
  paymentMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer',
  note?: string,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      db!.withTransactionSync(() => {
        const paymentDate = new Date().toISOString().split('T')[0];

        const paymentStatement = db!.prepareSync(
          'INSERT INTO payments (billId, customerId, amount, paymentDate, paymentMethod, note) VALUES (?, ?, ?, ?, ?, ?)',
        );
        const result = paymentStatement.executeSync([
          billId,
          customerId,
          amount,
          paymentDate,
          paymentMethod,
          note || null,
        ]);
        const paymentId = result.lastInsertRowId;
        paymentStatement.finalizeSync();

        const bill = db!.getAllSync<any>(
          'SELECT totalAmount, remainingAmount FROM bills WHERE id = ?;',
          [billId],
        );

        if (bill.length > 0) {
          const totalAmount = bill[0].totalAmount;
          const currentRemaining =
            bill[0].remainingAmount !== undefined
              ? bill[0].remainingAmount
              : totalAmount;
          const newRemaining = currentRemaining - amount;
          const isFullyPaid = newRemaining <= 0 ? 1 : 0;

          const updateBillStatement = db!.prepareSync(
            'UPDATE bills SET remainingAmount = ?, isFullyPaid = ? WHERE id = ?',
          );
          updateBillStatement.executeSync([
            Math.max(0, newRemaining),
            isFullyPaid,
            billId,
          ]);
          updateBillStatement.finalizeSync();
        }

        resolve(paymentId);
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getPaymentsByBillId(billId: number): Promise<Payment[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM payments WHERE billId = ? ORDER BY paymentDate DESC, id DESC;',
        [billId],
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting payments:', error);
      resolve([]);
    }
  });
}

export function getBillWithPaymentStatus(
  billId: number,
): Promise<BillWithPaymentStatus | null> {
  return new Promise(async (resolve) => {
    try {
      ensureDBInitialized();
      const bill = await getBillWithItems(billId);

      if (!bill) {
        resolve(null);
        return;
      }

      const payments = await getPaymentsByBillId(billId);
      const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
      const remainingAmount = bill.totalAmount - paidAmount;

      let paymentStatus: 'Paid' | 'Partial' | 'Unpaid' = 'Unpaid';
      if (remainingAmount <= 0) {
        paymentStatus = 'Paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'Partial';
      }

      resolve({
        ...bill,
        paidAmount,
        remainingAmount: Math.max(0, remainingAmount),
        paymentStatus,
        payments,
      });
    } catch (error) {
      console.error('Error getting bill with payment status:', error);
      resolve(null);
    }
  });
}

export function getAllCreditBillsUnpaid(): Promise<CustomerCreditSummary[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      const bills = db!.getAllSync<any>(
        `SELECT 
          b.*, 
          COALESCE((SELECT SUM(amount) FROM payments WHERE billId = b.id), 0) as paidAmount,
          CASE 
            WHEN b.remainingAmount IS NOT NULL AND b.remainingAmount > 0 THEN b.remainingAmount
            WHEN b.remainingAmount IS NULL THEN b.totalAmount
            ELSE b.totalAmount - COALESCE((SELECT SUM(amount) FROM payments WHERE billId = b.id), 0)
          END as calculatedRemaining
         FROM bills b
         WHERE b.billType = 'Credit' 
         AND (b.isFullyPaid = 0 OR b.isFullyPaid IS NULL)
         AND b.totalAmount > COALESCE((SELECT SUM(amount) FROM payments WHERE billId = b.id), 0)
         ORDER BY b.customerName, b.billingDate DESC;`,
      );

      const customerMap = new Map<number, CustomerCreditSummary>();

      for (const bill of bills) {
        const remainingAmount = bill.calculatedRemaining;
        const paidAmount = bill.paidAmount || 0;

        if (remainingAmount <= 0) continue;

        if (!customerMap.has(bill.customerId)) {
          customerMap.set(bill.customerId, {
            customerId: bill.customerId,
            customerName: bill.customerName,
            totalCreditAmount: 0,
            totalPaidAmount: 0,
            remainingAmount: 0,
            bills: [],
          });
        }

        const customerSummary = customerMap.get(bill.customerId)!;
        customerSummary.totalCreditAmount += bill.totalAmount;
        customerSummary.totalPaidAmount += paidAmount;
        customerSummary.remainingAmount += remainingAmount;
        customerSummary.bills.push({
          ...bill,
          paidAmount,
          remainingAmount,
          paymentStatus:
            remainingAmount <= 0
              ? 'Paid'
              : paidAmount > 0
                ? 'Partial'
                : 'Unpaid',
        });
      }

      resolve(Array.from(customerMap.values()));
    } catch (error) {
      console.error('Error getting unpaid credit bills:', error);
      resolve([]);
    }
  });
}

export function getCustomerCreditDetails(
  customerId: number,
): Promise<CustomerCreditSummary | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      const bills = db!.getAllSync<any>(
        `SELECT b.*, 
                COALESCE((SELECT SUM(amount) FROM payments WHERE billId = b.id), 0) as paidAmount,
                COALESCE(b.remainingAmount, b.totalAmount - COALESCE((SELECT SUM(amount) FROM payments WHERE billId = b.id), 0)) as remainingAmount
         FROM bills b
         WHERE b.customerId = ? AND b.billType = 'Credit'
         ORDER BY b.billingDate DESC, b.id DESC;`,
        [customerId],
      );

      if (bills.length === 0) {
        resolve(null);
        return;
      }

      const customerName = bills[0].customerName;
      let totalCreditAmount = 0;
      let totalPaidAmount = 0;
      let remainingAmount = 0;
      const billsWithStatus = [];

      for (const bill of bills) {
        const paidAmount = bill.paidAmount;
        const billRemaining = bill.remainingAmount;

        totalCreditAmount += bill.totalAmount;
        totalPaidAmount += paidAmount;
        remainingAmount += billRemaining;

        billsWithStatus.push({
          ...bill,
          paidAmount,
          remainingAmount: billRemaining,
          paymentStatus:
            billRemaining <= 0 ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Unpaid',
        });
      }

      resolve({
        customerId,
        customerName,
        totalCreditAmount,
        totalPaidAmount,
        remainingAmount,
        bills: billsWithStatus,
      });
    } catch (error) {
      console.error('Error getting customer credit details:', error);
      resolve(null);
    }
  });
}

export function getCustomerPaymentHistory(
  customerId: number,
): Promise<Payment[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        `SELECT p.*, b.billNo, b.totalAmount as billTotalAmount
         FROM payments p
         JOIN bills b ON p.billId = b.id
         WHERE p.customerId = ?
         ORDER BY p.paymentDate DESC, p.id DESC;`,
        [customerId],
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting customer payment history:', error);
      resolve([]);
    }
  });
}

// --- Customer Statement Functions ---
export function getCustomerStatement(
  customerId: number,
  startDate: string,
  endDate: string,
): Promise<CustomerStatement> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      const customer = db!.getAllSync<any>(
        'SELECT id, name, phone, address FROM customers WHERE id = ?;',
        [customerId],
      );

      if (customer.length === 0) {
        reject(new Error('Customer not found'));
        return;
      }

      const openingBills = db!.getAllSync<any>(
        `SELECT COALESCE(SUM(totalAmount), 0) as total 
         FROM bills 
         WHERE customerId = ? 
         AND billType = 'Credit'
         AND date(billingDate) < date(?);`,
        [customerId, startDate],
      );

      const openingPayments = db!.getAllSync<any>(
        `SELECT COALESCE(SUM(amount), 0) as total 
         FROM payments 
         WHERE customerId = ? 
         AND date(paymentDate) < date(?);`,
        [customerId, startDate],
      );

      const openingBalance =
        (openingBills[0]?.total || 0) - (openingPayments[0]?.total || 0);

      const bills = db!.getAllSync<any>(
        `SELECT 
          b.id,
          b.billingDate as date,
          b.totalAmount as amount,
          b.billType
         FROM bills b
         WHERE b.customerId = ? 
         AND date(b.billingDate) BETWEEN date(?) AND date(?)
         ORDER BY b.billingDate ASC, b.id ASC;`,
        [customerId, startDate, endDate],
      );

      const payments = db!.getAllSync<any>(
        `SELECT 
          p.id,
          p.paymentDate as date,
          p.amount,
          p.paymentMethod
         FROM payments p
         WHERE p.customerId = ? 
         AND date(p.paymentDate) BETWEEN date(?) AND date(?)
         ORDER BY p.paymentDate ASC, p.id ASC;`,
        [customerId, startDate, endDate],
      );

      const transactions: CustomerStatementItem[] = [];
      let runningBalance = openingBalance;
      let totalCreditAmount = 0;
      let totalReceivedAmount = 0;

      transactions.push({
        id: 0,
        date: startDate,
        billNo: '-',
        billType: 'Opening',
        description: 'Opening Balance',
        billAmount: 0,
        received: 0,
        balance: openingBalance,
      });

      let billIndex = 0;
      let paymentIndex = 0;

      while (billIndex < bills.length || paymentIndex < payments.length) {
        let billDate = billIndex < bills.length ? bills[billIndex].date : null;
        let paymentDate =
          paymentIndex < payments.length ? payments[paymentIndex].date : null;

        if (billDate && (!paymentDate || billDate <= paymentDate)) {
          const bill = bills[billIndex];

          if (bill.billType === 'Cash') {
            transactions.push({
              id: bill.id,
              date: bill.date,
              billNo: bill.id.toString(),
              billType: 'Cash',
              description: `Cash Bill`,
              billAmount: bill.amount,
              received: bill.amount,
              balance: runningBalance,
            });
            totalReceivedAmount += bill.amount;
          } else {
            runningBalance = runningBalance + bill.amount;
            transactions.push({
              id: bill.id,
              date: bill.date,
              billNo: bill.id.toString(),
              billType: 'Credit',
              description: `Credit Bill`,
              billAmount: bill.amount,
              received: 0,
              balance: runningBalance,
            });
            totalCreditAmount += bill.amount;
          }
          billIndex++;
        } else if (paymentDate) {
          const payment = payments[paymentIndex];
          runningBalance = runningBalance - payment.amount;
          transactions.push({
            id: payment.id,
            date: payment.date,
            billNo: '-',
            billType: 'Receipt',
            description: `Payment (${payment.paymentMethod})`,
            billAmount: 0,
            received: payment.amount,
            balance: runningBalance,
          });
          totalReceivedAmount += payment.amount;
          paymentIndex++;
        }
      }

      const closingBalance = runningBalance;

      resolve({
        customerId: customer[0].id,
        customerName: customer[0].name,
        customerPhone: customer[0].phone,
        customerAddress: customer[0].address,
        openingBalance: openingBalance,
        closingBalance: closingBalance,
        totalCreditAmount: totalCreditAmount,
        totalReceivedAmount: totalReceivedAmount,
        transactions: transactions,
        startDate: startDate,
        endDate: endDate,
      });
    } catch (error) {
      console.error('Error getting customer statement:', error);
      reject(error);
    }
  });
}

export const getItemSalesSummary = async (
  startDate: string,
  endDate: string,
): Promise<ItemSalesSummary[]> => {
  try {
    ensureDBInitialized();
    const query = `
      SELECT 
        bi.itemName as productName,
        SUM(bi.quantity) as totalQuantity,
        SUM(bi.total) as totalAmount,
        AVG(bi.rate) as pricePerUnit
      FROM bill_items bi
      INNER JOIN bills b ON bi.billId = b.id
      WHERE date(b.billingDate) BETWEEN date(?) AND date(?)
      GROUP BY bi.itemName
      ORDER BY bi.itemName ASC
    `;
    const result = db!.getAllSync<any>(query, [startDate, endDate]);
    return result.map((row) => ({
      productName: row.productName,
      totalQuantity: row.totalQuantity,
      totalAmount: row.totalAmount,
      pricePerUnit: row.pricePerUnit || undefined,
    }));
  } catch (error) {
    console.error('Error getting item sales summary:', error);
    return [];
  }
};

export const getBillsByDate = async (
  date: string,
): Promise<PartySummaryBill[]> => {
  try {
    ensureDBInitialized();
    const query = `
      SELECT 
        b.id,
        b.id as billNo,
        b.customerName,
        b.billType,
        b.totalAmount
      FROM bills b
      WHERE date(b.billingDate) = date(?)
      ORDER BY b.id DESC
    `;
    const result = db!.getAllSync<any>(query, [date]);
    return result.map((row) => ({
      id: row.id,
      billNo: row.billNo.toString(),
      customerName: row.customerName,
      billType: row.billType,
      totalAmount: row.totalAmount,
    }));
  } catch (error) {
    console.error('Error getting bills by date:', error);
    return [];
  }
};

// --- Product Functions ---
export function getAllProducts(): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        `SELECT p.*, c.name as categoryName 
         FROM products p
         LEFT JOIN categories c ON p.categoryId = c.id
         ORDER BY p.name;`,
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
  categoryId: number | null,
  minStock: number = 10,
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'INSERT INTO products (name, mrp, sellPrice, purchasePrice, stock, unit, categoryId, minStock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      );
      const result = statement.executeSync([
        name,
        mrp,
        sellPrice,
        purchasePrice,
        stock,
        unit,
        categoryId,
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
  categoryId: number | null,
  minStock: number = 10,
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      const statement = db!.prepareSync(
        'UPDATE products SET name = ?, mrp = ?, sellPrice = ?, purchasePrice = ?, stock = ?, unit = ?, categoryId = ?, minStock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      );
      statement.executeSync([
        name,
        mrp,
        sellPrice,
        purchasePrice,
        stock,
        unit,
        categoryId,
        minStock,
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
        `SELECT p.*, c.name as categoryName 
         FROM products p
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE p.id = ?;`,
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
        `SELECT p.*, c.name as categoryName 
         FROM products p
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE p.name LIKE ? 
         ORDER BY p.name;`,
        [`%${name}%`],
      );
      resolve(result);
    } catch (error) {
      console.error('Error searching products:', error);
      resolve([]);
    }
  });
}

export function getProductsByCategory(categoryId: number): Promise<Product[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        `SELECT p.*, c.name as categoryName 
         FROM products p
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE p.categoryId = ? 
         ORDER BY p.name;`,
        [categoryId],
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
        `SELECT p.*, c.name as categoryName 
         FROM products p
         LEFT JOIN categories c ON p.categoryId = c.id
         WHERE p.stock <= p.minStock 
         ORDER BY p.stock ASC;`,
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
        'UPDATE products SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      );
      statement.executeSync([newStock, id]);
      statement.finalizeSync();
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// --- Profit Calculation Functions ---
export function getBillProfit(billId: number): Promise<{
  totalProfit: number;
  items: { itemName: string; profit: number; quantity: number }[];
}> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const items = db!.getAllSync<any>(
        'SELECT itemName, quantity, purchaseRate, total FROM bill_items WHERE billId = ?;',
        [billId],
      );

      let totalProfit = 0;
      const profitItems = items.map((item) => {
        const purchaseTotal = item.purchaseRate * item.quantity;
        const profit = item.total - purchaseTotal;
        totalProfit += profit;
        return {
          itemName: item.itemName,
          quantity: item.quantity,
          profit: profit,
        };
      });

      resolve({
        totalProfit: totalProfit,
        items: profitItems,
      });
    } catch (error) {
      console.error('Error calculating bill profit:', error);
      resolve({ totalProfit: 0, items: [] });
    }
  });
}

export function getProfitSummary(
  startDate: string,
  endDate: string,
): Promise<ProfitSummary> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        `SELECT 
          SUM(b.totalAmount) as totalSales,
          SUM(bi.total - (bi.purchaseRate * bi.quantity)) as totalProfit,
          SUM(bi.purchaseRate * bi.quantity) as totalCost
         FROM bills b
         JOIN bill_items bi ON b.id = bi.billId
         WHERE b.billingDate BETWEEN ? AND ?;`,
        [startDate, endDate],
      );

      const totalSales = result[0]?.totalSales || 0;
      const totalProfit = result[0]?.totalProfit || 0;
      const totalCost = result[0]?.totalCost || 0;
      const profitMargin =
        totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      resolve({
        totalSales: totalSales,
        totalProfit: totalProfit,
        profitMargin: profitMargin,
        totalCost: totalCost,
      });
    } catch (error) {
      console.error('Error getting profit summary:', error);
      resolve({ totalSales: 0, totalProfit: 0, profitMargin: 0, totalCost: 0 });
    }
  });
}

export function getAllBillsWithProfit(): Promise<Bill[]> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const bills = db!.getAllSync<any>(
        `SELECT DISTINCT b.*, 
          (SELECT SUM(bi.total - (bi.purchaseRate * bi.quantity)) 
           FROM bill_items bi WHERE bi.billId = b.id) as totalProfit
         FROM bills b
         ORDER BY b.id DESC;`,
      );

      const result: Bill[] = bills.map((bill: any) => ({
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
        totalProfit: bill.totalProfit || 0,
      }));

      resolve(result);
    } catch (error) {
      console.error('Error getting bills with profit:', error);
      resolve([]);
    }
  });
}

// --- Supplier Functions ---
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

// --- Contact Functions ---
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

// --- Purchase Bill Functions ---
export function insertPurchaseBill(
  supplierName: string,
  supplierId: number,
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
    total: number;
    categoryId?: number | null;
  }[],
): Promise<number> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      db!.withTransactionSync(() => {
        const billStatement = db!.prepareSync(
          'INSERT INTO purchase_bills (supplierName, supplierId, billNo, billType, date, totalAmount) VALUES (?, ?, ?, ?, ?, ?)',
        );
        const billResult = billStatement.executeSync([
          supplierName,
          supplierId,
          billNo,
          billType,
          date,
          totalAmount,
        ]);
        const purchaseBillId = billResult.lastInsertRowId;
        billStatement.finalizeSync();

        if (!purchaseBillId) throw new Error('Failed to insert purchase bill');

        const itemStatement = db!.prepareSync(
          'INSERT INTO purchase_items (purchaseBillId, name, mrp, purchasePrice, sellPrice, quantity, unit, total, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );

        for (const item of items) {
          itemStatement.executeSync([
            purchaseBillId,
            item.name,
            item.mrp,
            item.purchasePrice,
            item.sellPrice,
            item.quantity,
            item.unit,
            item.total,
            item.categoryId || null,
          ]);
        }
        itemStatement.finalizeSync();

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
        'SELECT * FROM purchase_bills ORDER BY id DESC;',
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting purchase bills:', error);
      resolve([]);
    }
  });
}

export function getPurchaseBillWithItems(
  billId: number,
): Promise<PurchaseBill | null> {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();

      const billResult = db!.getAllSync<any>(
        'SELECT * FROM purchase_bills WHERE id = ?;',
        [billId],
      );

      if (billResult.length === 0) {
        resolve(null);
        return;
      }

      const bill: PurchaseBill = {
        id: billResult[0].id,
        supplierName: billResult[0].supplierName,
        supplierId: billResult[0].supplierId,
        billNo: billResult[0].billNo,
        billType: billResult[0].billType,
        date: billResult[0].date,
        totalAmount: billResult[0].totalAmount,
        createdAt: billResult[0].createdAt,
        updatedAt: billResult[0].updatedAt,
      };

      const itemsResult = db!.getAllSync<any>(
        'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
        [billId],
      );

      bill.items = itemsResult.map((item: any) => ({
        id: item.id,
        purchaseBillId: item.purchaseBillId,
        name: item.name,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        unit: item.unit,
        total: item.total,
        categoryId: item.categoryId || null,
      }));

      resolve(bill);
    } catch (error) {
      console.error('Error getting purchase bill with items:', error);
      resolve(null);
    }
  });
}

export function updatePurchaseBill(
  billId: number,
  supplierName: string,
  supplierId: number,
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
    total: number;
    categoryId?: number | null;
  }[],
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();
      db!.withTransactionSync(() => {
        const updateBillStatement = db!.prepareSync(
          'UPDATE purchase_bills SET supplierName = ?, supplierId = ?, billNo = ?, billType = ?, date = ?, totalAmount = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
        );
        updateBillStatement.executeSync([
          supplierName,
          supplierId,
          billNo,
          billType,
          date,
          totalAmount,
          billId,
        ]);
        updateBillStatement.finalizeSync();

        const deleteItemsStatement = db!.prepareSync(
          'DELETE FROM purchase_items WHERE purchaseBillId = ?',
        );
        deleteItemsStatement.executeSync([billId]);
        deleteItemsStatement.finalizeSync();

        const insertItemStatement = db!.prepareSync(
          'INSERT INTO purchase_items (purchaseBillId, name, mrp, purchasePrice, sellPrice, quantity, unit, total, categoryId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        );

        for (const item of items) {
          insertItemStatement.executeSync([
            billId,
            item.name,
            item.mrp,
            item.purchasePrice,
            item.sellPrice,
            item.quantity,
            item.unit,
            item.total,
            item.categoryId || null,
          ]);
        }
        insertItemStatement.finalizeSync();
      });
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

export function deletePurchaseBill(billId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      ensureDBInitialized();

      const items = db!.getAllSync<any>(
        'SELECT * FROM purchase_items WHERE purchaseBillId = ?;',
        [billId],
      );

      for (const item of items) {
        const product = db!.getAllSync<any>(
          'SELECT * FROM products WHERE name = ? AND mrp = ? AND purchasePrice = ? AND unit = ?;',
          [item.name, item.mrp, item.purchasePrice, item.unit],
        );

        if (product.length > 0) {
          const newStock = Math.max(0, product[0].stock - item.quantity);
          const updateStockStatement = db!.prepareSync(
            'UPDATE products SET stock = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
          );
          updateStockStatement.executeSync([newStock, product[0].id]);
          updateStockStatement.finalizeSync();
        }
      }

      const statement = db!.prepareSync(
        'DELETE FROM purchase_bills WHERE id = ?',
      );
      statement.executeSync([billId]);
      statement.finalizeSync();

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// --- Settings Functions ---
export const getAppSettings = async (): Promise<AppSettings> => {
  ensureDBInitialized();
  try {
    const defaultSettings: AppSettings = {
      shopName: 'My General Store',
      shopAddress: 'Your Address Here',
      shopPhone: '+91 9876543210',
      shopEmail: 'info@mystore.com',
      topTagline: 'ESTIMATE',
      bottomTagline:
        'Thank you for your business! Items once purchased cannot be returned.',
    };

    const result = db!.getAllSync<any>('SELECT key, value FROM app_settings');
    if (result.length === 0) {
      const stmt = db!.prepareSync(
        'INSERT INTO app_settings (key, value) VALUES (?, ?)',
      );
      for (const [key, value] of Object.entries(defaultSettings)) {
        stmt.executeSync([key, JSON.stringify(value)]);
      }
      stmt.finalizeSync();
      return defaultSettings;
    }

    const settings: any = {};
    for (const row of result) {
      settings[row.key] = JSON.parse(row.value);
    }
    return settings as AppSettings;
  } catch (error) {
    console.error('Error loading app settings:', error);
    return {
      shopName: 'My General Store',
      shopAddress: 'Your Address Here',
      shopPhone: '+91 9876543210',
      shopEmail: 'info@mystore.com',
      topTagline: 'ESTIMATE',
      bottomTagline:
        'Thank you for your business! Items once purchased cannot be returned.',
    };
  }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  ensureDBInitialized();
  try {
    const stmt = db!.prepareSync(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const [key, value] of Object.entries(settings)) {
      stmt.executeSync([key, JSON.stringify(value)]);
    }
    stmt.finalizeSync();
  } catch (error) {
    console.error('Error saving app settings:', error);
    throw error;
  }
};

// ==================== ACTIVATION FUNCTIONS ====================

// Plans definition
export const ACTIVATION_PLANS = [
  {
    id: 1,
    planName: '1 Month Plan',
    duration: 30,
    price: 200,
    keyPrefix: 'MTH',
  },
  {
    id: 2,
    planName: '6 Months Plan',
    duration: 180,
    price: 1499,
    keyPrefix: 'SIX',
  },
  {
    id: 3,
    planName: '3 Years Plan',
    duration: 1095,
    price: 7000,
    keyPrefix: 'YER',
  },
];

// Generate activation key (ADMIN ONLY)
export function generateActivationKey(planId: number): string {
  const plan = ACTIVATION_PLANS.find((p) => p.id === planId);
  if (!plan) return '';

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();

  const dataToHash = `${plan.keyPrefix}-${timestamp}-${random}`;
  let hash = 0;
  for (let i = 0; i < dataToHash.length; i++) {
    hash = (hash << 5) - hash + dataToHash.charCodeAt(i);
    hash = hash & hash;
  }
  const hashStr = Math.abs(hash).toString(36).substring(0, 8).toUpperCase();

  return `${plan.keyPrefix}-${random}-${hashStr}`;
}

// Validate and activate key (USER)
export function validateAndActivateKey(
  activationKey: string,
  deviceId: string,
  deviceName: string,
): {
  success: boolean;
  message: string;
  plan?: any;
  endDate?: string;
  daysAdded?: number;
} {
  ensureDBInitialized();

  try {
    // Check if key already used
    const existing = db!.getAllSync<any>(
      'SELECT * FROM activations WHERE activationKey = ?',
      [activationKey],
    );

    if (existing.length > 0) {
      return {
        success: false,
        message: 'This activation key has already been used',
      };
    }

    // Parse the key to determine plan
    const keyParts = activationKey.split('-');
    if (keyParts.length !== 3) {
      return { success: false, message: 'Invalid activation key format' };
    }

    let planId: number;
    const planPrefix = keyParts[0];
    if (planPrefix === 'MTH') planId = 1;
    else if (planPrefix === 'SIX') planId = 2;
    else if (planPrefix === 'YER') planId = 3;
    else return { success: false, message: 'Invalid activation key' };

    const plan = ACTIVATION_PLANS.find((p) => p.id === planId);
    if (!plan) return { success: false, message: 'Invalid plan' };

    // Check if there's an existing activation to extend
    const currentActivation = db!.getAllSync<any>(
      'SELECT * FROM activations WHERE isActive = 1 ORDER BY id DESC LIMIT 1',
    );

    let startDate = new Date();
    let endDate = new Date();

    if (
      currentActivation.length > 0 &&
      new Date(currentActivation[0].endDate) > new Date()
    ) {
      // Extend existing activation
      startDate = new Date(currentActivation[0].endDate);
      endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + plan.duration);

      // Deactivate old activation - FIXED ✅
      const deactivateStmt = db!.prepareSync(
        'UPDATE activations SET isActive = 0 WHERE id = ?',
      );
      deactivateStmt.executeSync([currentActivation[0].id]);
      deactivateStmt.finalizeSync();
    } else {
      // New activation
      endDate.setDate(endDate.getDate() + plan.duration);
    }

    // Save activation
    const stmt = db!.prepareSync(`
      INSERT INTO activations (activationKey, planId, planName, duration, startDate, endDate, isActive, deviceId, deviceName, activatedBy)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.executeSync([
      activationKey,
      planId,
      plan.planName,
      plan.duration,
      startDate.toISOString(),
      endDate.toISOString(),
      1,
      deviceId,
      deviceName,
      'User',
    ]);
    stmt.finalizeSync();

    const daysAdded = Math.ceil(
      (endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      success: true,
      message: `✅ Successfully activated!\n\n📋 Plan: ${plan.planName}\n📅 Valid until: ${endDate.toLocaleDateString()}\n➕ ${daysAdded} days added to your license`,
      plan,
      endDate: endDate.toLocaleDateString(),
      daysAdded,
    };
  } catch (error) {
    console.error('Error validating activation key:', error);
    return { success: false, message: 'Error validating activation key' };
  }
}

// Get current activation status
export function getCurrentActivation(): {
  isValid: boolean;
  plan?: string;
  daysLeft?: number;
  endDate?: string;
  activatedBy?: string;
} | null {
  ensureDBInitialized();

  try {
    const result = db!.getAllSync<any>(
      'SELECT * FROM activations WHERE isActive = 1 ORDER BY id DESC LIMIT 1',
    );

    if (result.length === 0) return null;

    const activation = result[0];
    const endDate = new Date(activation.endDate);
    const now = new Date();

    if (endDate < now) {
      // Deactivate expired activation - FIXED ✅
      const deactivateStmt = db!.prepareSync(
        'UPDATE activations SET isActive = 0 WHERE id = ?',
      );
      deactivateStmt.executeSync([activation.id]);
      deactivateStmt.finalizeSync();
      return { isValid: false };
    }

    const daysLeft = Math.ceil(
      (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      isValid: true,
      plan: activation.planName,
      daysLeft,
      endDate: endDate.toLocaleDateString(),
      activatedBy: activation.activatedBy,
    };
  } catch (error) {
    console.error('Error getting activation:', error);
    return null;
  }
}

// Get installation date
export function getInstallationDate(): Date | null {
  ensureDBInitialized();

  try {
    const result = db!.getAllSync<any>(
      "SELECT value FROM app_settings WHERE key = 'installationDate'",
    );

    if (result.length > 0) {
      return new Date(JSON.parse(result[0].value));
    }

    const installDate = new Date();
    const stmt = db!.prepareSync(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.executeSync([
      'installationDate',
      JSON.stringify(installDate.toISOString()),
    ]);
    stmt.finalizeSync();

    return installDate;
  } catch (error) {
    console.error('Error getting installation date:', error);
    return new Date();
  }
}

// Check trial status (30 days free)
export function getTrialStatus(): {
  isActive: boolean;
  daysLeft: number;
  startDate: Date;
  endDate: Date;
} {
  const installDate = getInstallationDate();
  if (!installDate) {
    return {
      isActive: true,
      daysLeft: 30,
      startDate: new Date(),
      endDate: new Date(),
    };
  }

  const endDate = new Date(installDate);
  endDate.setDate(endDate.getDate() + 30);
  const now = new Date();
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return {
    isActive: daysLeft > 0,
    daysLeft,
    startDate: installDate,
    endDate,
  };
}

// Check if app is accessible
export function isAppAccessible(): {
  accessible: boolean;
  message: string;
  daysLeft?: number;
  type?: 'trial' | 'activated' | 'expired';
} {
  const activation = getCurrentActivation();

  if (activation && activation.isValid) {
    return {
      accessible: true,
      message: `Activated - ${activation.daysLeft} days remaining`,
      daysLeft: activation.daysLeft,
      type: 'activated',
    };
  }

  const trial = getTrialStatus();
  if (trial.isActive) {
    return {
      accessible: true,
      message: `Trial - ${trial.daysLeft} days remaining`,
      daysLeft: trial.daysLeft,
      type: 'trial',
    };
  }

  return {
    accessible: false,
    message: 'Your trial has expired. Please purchase a license to continue.',
    type: 'expired',
  };
}
// Add to lib/db.ts
export const getAllPayments = (): Promise<Payment[]> => {
  return new Promise((resolve) => {
    try {
      ensureDBInitialized();
      const result = db!.getAllSync<any>(
        'SELECT * FROM payments ORDER BY paymentDate DESC, id DESC;',
      );
      resolve(result);
    } catch (error) {
      console.error('Error getting payments:', error);
      resolve([]);
    }
  });
};