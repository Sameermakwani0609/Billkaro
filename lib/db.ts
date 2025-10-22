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
// --- Supplier Functions ---
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
  createdAt: string;
  updatedAt: string;
};

export type Contact = Customer | Supplier;

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

// --- Product Functions ---
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
