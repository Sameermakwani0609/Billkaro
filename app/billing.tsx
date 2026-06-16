import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  Calendar,
  ChevronDown,
  CreditCard,
  IndianRupee,
  MapPin,
  Package,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Tag,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Category,
  Customer,
  getAllCategories,
  getAllCustomers,
  getAllProducts,
  getCustomerLastPurchaseAmount,
  initDB,
  insertBill,
  insertCustomer,
  isSqliteAvailable,
  Product,
  searchCustomersByName,
  updateCustomerPurchases,
  updateProductStock,
} from '../lib/db';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface CartItem extends Product {
  quantity: number;
  customRate?: number;
  discount?: number;
  discountedPrice?: number;
  itemTotal?: number;
  discountAmount?: number;
}

interface ReceiptData {
  shopName?: string;
  shopAddress?: string;
  billType: string;
  date: string;
  customerName: string;
  phone?: string;
  items: {
    name: string;
    qty: number;
    rate: number;
    total: number;
    discount?: number;
    discAmt: number;
  }[];
  subtotal: number;
  itemDiscount: number;
  billDiscountPct: number;
  billDiscountAmt: number;
  finalAmount: number;
}

// ─────────────────────────────────────────────
// Bill Action Modal (Save / PDF / Print)
// ─────────────────────────────────────────────
interface BillActionModalProps {
  visible: boolean;
  onSave: () => void;
  onPDF: () => void;
  onPrint: () => void;
  onClose: () => void;
  printLoading?: boolean;
}

function BillActionModal({
  visible,
  onSave,
  onPDF,
  onPrint,
  onClose,
  printLoading = false,
}: BillActionModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={am.overlay}>
        <View style={am.card}>
          <Text style={am.title}>Bill Generated!</Text>
          <Text style={am.subtitle}>What would you like to do?</Text>

          <TouchableOpacity style={[am.btn, am.saveBtn]} onPress={onSave}>
            <Text style={am.btnText}>✅ Save Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[am.btn, am.pdfBtn]} onPress={onPDF}>
            <Text style={am.btnText}>📄 Save as PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[am.btn, am.printBtn]}
            onPress={onPrint}
            disabled={printLoading}
          >
            {printLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={am.btnText}>🖨️ Print (System Dialog)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={am.cancelBtn} onPress={onClose}>
            <Text style={am.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const am = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    alignItems: 'stretch',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  saveBtn: { backgroundColor: '#10B981' },
  pdfBtn: { backgroundColor: '#8B5CF6' },
  printBtn: { backgroundColor: '#2563EB' },
  btnText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#EF4444', fontSize: 14, fontWeight: '500' },
});

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function WholesaleBilling() {
  const [customerName, setCustomerName] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [billingDate, setBillingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<string>('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>(
    'checking',
  );
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [lastPurchaseAmount, setLastPurchaseAmount] = useState<number>(0);

  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [editableRates, setEditableRates] = useState<{ [key: number]: string }>(
    {},
  );
  const [itemDiscounts, setItemDiscounts] = useState<{ [key: number]: string }>(
    {},
  );

  // Bill action modal
  const [showActionModal, setShowActionModal] = useState(false);
  const [printLoading, setPrintLoading] = useState(false);
  const [pendingBillData, setPendingBillData] = useState<ReceiptData | null>(
    null,
  );

  useEffect(() => {
    initializeDatabase();
  }, []);
  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategoryId, allProducts]);
  useEffect(() => {
    if (selectedCustomer) loadLastPurchaseAmount(selectedCustomer.id);
    else setLastPurchaseAmount(0);
  }, [selectedCustomer]);

  const initializeDatabase = async () => {
    try {
      setDbStatus('checking');
      if (!(await isSqliteAvailable())) {
        setDbStatus('error');
        return;
      }
      await initDB();
      await loadCustomers();
      await loadCategories();
      await loadAllProducts();
      setDbStatus('ready');
    } catch {
      setDbStatus('error');
    }
  };

  const loadCategories = async () => {
    try {
      setCategories(await getAllCategories());
    } catch {}
  };

  const loadAllProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const list = await getAllProducts();
      setAllProducts(list);
      filterProducts();
    } catch {
      Alert.alert('Error', 'Failed to load products');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const filterProducts = () => {
    let f = [...allProducts];
    if (searchQuery.trim())
      f = f.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    if (selectedCategoryId !== null)
      f = f.filter((p) => p.categoryId === selectedCategoryId);
    setFilteredProducts(f);
  };

  const loadLastPurchaseAmount = async (id: number) => {
    try {
      setLastPurchaseAmount((await getCustomerLastPurchaseAmount(id)) || 0);
    } catch {
      setLastPurchaseAmount(0);
    }
  };

  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      const list = await getAllCustomers();
      setCustomers(list);
      setFilteredCustomers(list);
    } catch {
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const handleCustomerNameChange = (text: string) => {
    setCustomerName(text);
    if (text.length > 0) searchCustomers(text);
    else {
      setShowCustomerDropdown(false);
      setIsNewCustomer(false);
      setFilteredCustomers(customers);
      setSelectedCustomer(null);
      setLastPurchaseAmount(0);
    }
  };

  const searchCustomers = async (searchText: string) => {
    try {
      setIsLoadingCustomers(true);
      setShowCustomerDropdown(true);
      let results: Customer[] = [];
      if (await isSqliteAvailable()) {
        try {
          results = await searchCustomersByName(searchText);
        } catch {
          results = customers.filter((c) =>
            c.name.toLowerCase().includes(searchText.toLowerCase()),
          );
        }
      } else {
        results = customers.filter((c) =>
          c.name.toLowerCase().includes(searchText.toLowerCase()),
        );
      }
      setFilteredCustomers(results);
      setIsNewCustomer(results.length === 0 && searchText.length > 0);
    } catch {
      const r = customers.filter((c) =>
        c.name.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredCustomers(r);
      setIsNewCustomer(r.length === 0 && searchText.length > 0);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  const selectCustomer = async (customer: Customer) => {
    setCustomerName(customer.name);
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setIsNewCustomer(false);
    await loadLastPurchaseAmount(customer.id);
  };

  const handleAddNewCustomer = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    try {
      if (await isSqliteAvailable()) {
        const phone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        const id = await insertCustomer(
          customerName,
          phone,
          undefined,
          'Address not provided',
        );
        const newC: Customer = {
          id,
          name: customerName,
          phone,
          address: 'Address not provided',
          totalPurchases: 0,
          type: 'customer',
        };
        setSelectedCustomer(newC);
        setLastPurchaseAmount(0);
        await loadCustomers();
        Alert.alert('Success', `Customer "${customerName}" added!`);
      }
      setShowCustomerDropdown(false);
    } catch {
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  const handleCustomerInputFocus = () => {
    setFilteredCustomers(customers);
    setShowCustomerDropdown(true);
  };

  const handleRefresh = () => {
    loadCustomers();
    loadAllProducts();
    if (selectedCustomer) loadLastPurchaseAmount(selectedCustomer.id);
  };

  const updateWholesaleRate = (id: number, val: string) => {
    if (val === '') {
      setEditableRates((p) => {
        const u = { ...p };
        delete u[id];
        return u;
      });
      return;
    }
    const s = val.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2) return;
    setEditableRates((p) => ({ ...p, [id]: s }));
  };

  const updateItemDiscount = (id: number, val: string) => {
    if (val === '' || val === '0') {
      setItemDiscounts((p) => {
        const u = { ...p };
        delete u[id];
        return u;
      });
      setCart((c) =>
        c.map((i) =>
          i.id === id
            ? { ...i, discount: undefined, discountedPrice: undefined }
            : i,
        ),
      );
      return;
    }
    const s = val.replace(/[^0-9.]/g, '');
    if (s.split('.').length > 2 || parseFloat(s) > 100) return;
    setItemDiscounts((p) => ({ ...p, [id]: s }));
  };

  const applyDiscountToAll = () => {
    if (!billDiscount || parseFloat(billDiscount) === 0) {
      Alert.alert('Info', 'Enter a discount % first');
      return;
    }
    if (parseFloat(billDiscount) > 100) {
      Alert.alert('Error', 'Discount cannot exceed 100%');
      return;
    }
    const nd: { [k: number]: string } = {};
    cart.forEach((i) => {
      nd[i.id] = billDiscount;
    });
    setItemDiscounts(nd);
    Alert.alert('Success', `Applied ${billDiscount}% to all items`);
  };

  const updateCart = (product: Product, qty: number) => {
    if (qty <= 0) {
      setCart((c) => c.filter((i) => i.id !== product.id));
      setItemDiscounts((p) => {
        const u = { ...p };
        delete u[product.id];
        return u;
      });
      return;
    }
    if (qty > product.stock) {
      Alert.alert('Error', `Only ${product.stock} ${product.unit} in stock`);
      return;
    }

    const customRate = editableRates[product.id]
      ? parseFloat(editableRates[product.id])
      : undefined;
    const discount = itemDiscounts[product.id]
      ? parseFloat(itemDiscounts[product.id])
      : undefined;
    const basePrice = customRate || product.sellPrice;
    const discountedPrice =
      discount && discount > 0
        ? parseFloat((basePrice * (1 - discount / 100)).toFixed(2))
        : undefined;
    const itemTotal = parseFloat(
      ((discountedPrice || basePrice) * qty).toFixed(2),
    );
    const discountAmount =
      discount && discount > 0
        ? parseFloat(
            ((basePrice - (discountedPrice || basePrice)) * qty).toFixed(2),
          )
        : 0;

    const exists = cart.find((i) => i.id === product.id);
    const newItem = {
      ...product,
      quantity: qty,
      customRate,
      discount: discount && discount > 0 ? discount : undefined,
      discountedPrice,
      itemTotal,
      discountAmount,
    };
    if (exists)
      setCart((c) => c.map((i) => (i.id === product.id ? newItem : i)));
    else setCart((c) => [...c, newItem]);
  };

  const updateCartQuantity = (id: number, qty: number) => {
    if (qty <= 0) {
      setCart((c) => c.filter((i) => i.id !== id));
      setItemDiscounts((p) => {
        const u = { ...p };
        delete u[id];
        return u;
      });
      return;
    }
    const item = cart.find((i) => i.id === id);
    if (item && qty > item.stock) {
      Alert.alert('Error', `Only ${item.stock} ${item.unit} in stock`);
      return;
    }
    setCart((c) =>
      c.map((i) => {
        if (i.id !== id) return i;
        const base = i.customRate || i.sellPrice;
        const fp = i.discountedPrice || base;
        return {
          ...i,
          quantity: qty,
          itemTotal: parseFloat((fp * qty).toFixed(2)),
          discountAmount:
            i.discount && i.discount > 0
              ? parseFloat(((base - fp) * qty).toFixed(2))
              : 0,
        };
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart((c) => c.filter((i) => i.id !== id));
    setItemDiscounts((p) => {
      const u = { ...p };
      delete u[id];
      return u;
    });
  };

  const getTotalItems = () => cart.length;
  const getTotalQuantity = () => cart.reduce((s, i) => s + i.quantity, 0);
  const getItemTotal = (item: CartItem) =>
    parseFloat(
      (
        (item.discountedPrice || item.customRate || item.sellPrice) *
        item.quantity
      ).toFixed(2),
    );
  const getItemDiscountAmount = (item: CartItem) => {
    const base = item.customRate || item.sellPrice;
    const fp = item.discountedPrice || base;
    return parseFloat(((base - fp) * item.quantity).toFixed(2));
  };
  const getSubtotal = () =>
    parseFloat(
      cart
        .reduce((s, i) => s + (i.customRate || i.sellPrice) * i.quantity, 0)
        .toFixed(2),
    );
  const getTotalItemDiscount = () =>
    parseFloat(
      cart.reduce((s, i) => s + getItemDiscountAmount(i), 0).toFixed(2),
    );
  const getAmountAfterItemDiscount = () =>
    getSubtotal() - getTotalItemDiscount();
  const getBillDiscountAmount = () => {
    const pct = billDiscount ? parseFloat(billDiscount) : 0;
    return pct > 0
      ? parseFloat(((getAmountAfterItemDiscount() * pct) / 100).toFixed(2))
      : 0;
  };
  const getFinalAmount = () =>
    parseFloat(
      (getAmountAfterItemDiscount() - getBillDiscountAmount()).toFixed(2),
    );
  const getTotalCostPrice = () =>
    parseFloat(
      cart.reduce((s, i) => s + i.purchasePrice * i.quantity, 0).toFixed(2),
    );
  const getProfitBeforeAnyDiscount = () =>
    parseFloat((getSubtotal() - getTotalCostPrice()).toFixed(2));
  const getProfitAfterItemDiscount = () =>
    parseFloat((getAmountAfterItemDiscount() - getTotalCostPrice()).toFixed(2));
  const getFinalProfit = () =>
    parseFloat((getFinalAmount() - getTotalCostPrice()).toFixed(2));
  const getProfitMargin = () => {
    const fa = getFinalAmount();
    return fa === 0
      ? 0
      : parseFloat(((getFinalProfit() / fa) * 100).toFixed(2));
  };

  const updateProductStocks = async () => {
    for (const item of cart) {
      const ns = item.stock - item.quantity;
      if (ns < 0) throw new Error(`Insufficient stock for ${item.name}`);
      await updateProductStock(item.id, ns);
    }
  };

  // Build receipt data object
  const buildReceiptData = (): ReceiptData => ({
    shopName: 'Bill-Karo',
    shopAddress: 'Your Business Address',
    billType,
    date: billingDate.toLocaleDateString('en-IN'),
    customerName,
    phone: selectedCustomer?.phone,
    items: cart.map((item) => ({
      name: item.name,
      qty: item.quantity,
      rate: item.customRate || item.sellPrice,
      total: getItemTotal(item),
      discount: item.discount,
      discAmt: getItemDiscountAmount(item),
    })),
    subtotal: getSubtotal(),
    itemDiscount: getTotalItemDiscount(),
    billDiscountPct: billDiscount ? parseFloat(billDiscount) : 0,
    billDiscountAmt: getBillDiscountAmount(),
    finalAmount: getFinalAmount(),
  });

  // Build HTML for PDF / Print
  const buildHtml = (d: ReceiptData): string => `
  <html><head><style>
    body { font-family: monospace; font-size: 12px; margin: 20px; max-width: 300px; }
    h2 { text-align: center; font-size: 16px; margin: 0; }
    p  { text-align: center; margin: 2px 0; font-size: 11px; }
    hr { border: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { border-bottom: 1px solid #000; text-align: left; padding: 2px; }
    td { padding: 2px; }
    .right { text-align: right; }
    .total { font-size: 15px; font-weight: bold; }
    .section { margin-top: 8px; }
  </style></head><body>
    <h2>${d.shopName || 'Bill-Karo'}</h2>
    ${d.shopAddress ? `<p>${d.shopAddress}</p>` : ''}
    <hr/>
    <div class="section">
      <b>Customer:</b> ${d.customerName}<br/>
      ${d.phone ? `<b>Phone:</b> ${d.phone}<br/>` : ''}
      <b>Date:</b> ${d.date} &nbsp; <b>Type:</b> ${d.billType}
    </div>
    <hr/>
    <table>
      <tr><th>Item</th><th class="right">Qty</th><th class="right">Rate</th><th class="right">Total</th></tr>
      ${d.items
        .map(
          (i) => `
        <tr>
          <td>${i.name}</td>
          <td class="right">${i.qty}</td>
          <td class="right">₹${i.rate.toFixed(2)}</td>
          <td class="right">₹${i.total.toFixed(2)}</td>
        </tr>
        ${i.discount && i.discount > 0 ? `<tr><td colspan="3" style="font-size:10px;color:#555">  Discount ${i.discount}%</td><td class="right" style="color:red;font-size:10px">-₹${i.discAmt.toFixed(2)}</td>` : ''}
      `,
        )
        .join('')}
    </table>
    <hr/>
    <table>
      <tr><td><b>Subtotal</b></td><td class="right">₹${d.subtotal.toFixed(2)}</td></tr>
      ${d.itemDiscount > 0 ? `<tr><td>Item Discount</td><td class="right" style="color:red">-₹${d.itemDiscount.toFixed(2)}</td></tr>` : ''}
      ${d.billDiscountPct > 0 ? `<tr><td>Bill Disc (${d.billDiscountPct}%)</td><td class="right" style="color:red">-₹${d.billDiscountAmt.toFixed(2)}</td></tr>` : ''}
      <tr><td class="total">TOTAL</td><td class="right total">₹${d.finalAmount.toFixed(2)}</td></tr>
    </table>
    <hr/>
    <p style="text-align:center;margin-top:10px">Thank you for your business!</p>
  </body></html>`;

  // Print using Android system print dialog (via expo-print)
  const handlePrint = async () => {
    if (!pendingBillData) return;
    setPrintLoading(true);
    try {
      const html = buildHtml(pendingBillData);
      await Print.printAsync({ html });
    } catch (error: any) {
      Alert.alert('Print Error', error.message || 'Failed to print');
    } finally {
      setPrintLoading(false);
      setShowActionModal(false);
      resetForm();
    }
  };

  // Save only (already saved to DB)
  const handleSaveOnly = async () => {
    setShowActionModal(false);
    resetForm();
    Alert.alert('Saved', '✅ Bill saved successfully!');
  };

  // Save as PDF and share
  const handleSavePDF = async () => {
    setShowActionModal(false);
    if (!pendingBillData) return;
    try {
      const html = buildHtml(pendingBillData);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Save Bill PDF',
      });
    } catch (e: any) {
      Alert.alert('Error', 'Failed to generate PDF: ' + e.message);
    }
    resetForm();
  };

  // Generate Bill: validate → save DB → show action modal
  const generateBill = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Error', 'Please add items to cart');
      return;
    }
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer from the dropdown');
      return;
    }

    try {
      const rd = buildReceiptData();
      await updateProductStocks();

      if (await isSqliteAvailable()) {
        const cartItems = cart.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          rate: item.customRate || item.sellPrice,
          purchaseRate: item.purchasePrice,
          finalRate: item.discountedPrice || item.customRate || item.sellPrice,
          discountPercent: item.discount || 0,
          discountAmount: getItemDiscountAmount(item),
          total: getItemTotal(item),
        }));

        await insertBill(
          selectedCustomer.id,
          customerName,
          billType,
          billingDate.toISOString().split('T')[0],
          rd.finalAmount,
          cartItems,
          rd.billDiscountPct,
          rd.subtotal,
          rd.itemDiscount,
          rd.billDiscountAmt,
        );

        await updateCustomerPurchases(selectedCustomer.id, rd.finalAmount);
      }

      setPendingBillData(rd);
      setShowActionModal(true);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to generate bill');
    }
  };

  const resetForm = async () => {
    setCustomerName('');
    setCart([]);
    setShowCustomerDropdown(false);
    setSelectedCustomer(null);
    setEditableRates({});
    setItemDiscounts({});
    setBillDiscount('');
    setLastPurchaseAmount(0);
    setPendingBillData(null);
    await loadAllProducts();
  };

  const onDateChange = (_: any, d?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (d) setBillingDate(d);
  };

  const renderCustomerItem = (customer: Customer) => (
    <TouchableOpacity
      key={customer.id.toString()}
      style={styles.customerItem}
      onPress={() => selectCustomer(customer)}
    >
      <View style={styles.customerIcon}>
        <User size={16} color="#3B82F6" />
      </View>
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>{customer.name}</Text>
        <View style={styles.customerContactRow}>
          <View style={styles.contactInfo}>
            <Phone size={12} color="#6B7280" />
            <Text style={styles.customerPhone}>{customer.phone}</Text>
          </View>
        </View>
        {customer.address && customer.address !== 'Address not provided' && (
          <View style={styles.customerAddressRow}>
            <MapPin size={12} color="#6B7280" />
            <Text style={styles.customerAddress} numberOfLines={2}>
              {customer.address}
            </Text>
          </View>
        )}
        {customer.lastPurchase && (
          <View style={styles.lastPurchaseRow}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.lastPurchaseText}>
              {new Date(customer.lastPurchase).toLocaleDateString('en-GB')}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Action Modal */}
      <BillActionModal
        visible={showActionModal}
        onSave={handleSaveOnly}
        onPDF={handleSavePDF}
        onPrint={handlePrint}
        onClose={() => setShowActionModal(false)}
        printLoading={printLoading}
      />

      {/* Header with Dashboard Theme */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Bill-Karo</Text>
            <Text style={styles.headerSubtitle}>Create New Bill</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={handleRefresh}
            >
              <RefreshCw size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.cartBadge}>
              <ShoppingCart size={24} color="#FFF" />
              {getTotalItems() > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{getTotalItems()}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {dbStatus === 'checking' && (
          <View style={styles.statusBanner}>
            <Text style={styles.statusText}>Initializing database...</Text>
          </View>
        )}
        {dbStatus === 'error' && (
          <View style={[styles.statusBanner, styles.errorBanner]}>
            <Text style={styles.statusText}>
              Database not available. Using demo mode.
            </Text>
          </View>
        )}

        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            <TouchableOpacity onPress={handleRefresh}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.customerSection}>
            <View style={styles.inputContainer}>
              <User size={20} color="#6B7280" style={styles.inputIcon} />
              <TextInput
                style={styles.customerInput}
                placeholder="Search or enter customer name"
                placeholderTextColor="#9CA3AF"
                value={customerName}
                onChangeText={handleCustomerNameChange}
                onFocus={handleCustomerInputFocus}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.billTypeButton,
                billType === 'Cash' ? styles.cashActive : styles.creditActive,
              ]}
              onPress={() =>
                setBillType(billType === 'Cash' ? 'Credit' : 'Cash')
              }
            >
              {billType === 'Cash' ? (
                <IndianRupee size={18} color="#FFF" />
              ) : (
                <CreditCard size={18} color="#FFF" />
              )}
              <Text style={styles.billTypeText}>{billType}</Text>
            </TouchableOpacity>
          </View>

          {selectedCustomer && (
            <View style={styles.selectedCustomerInfo}>
              <Text style={styles.selectedCustomerLabel}>
                Selected Customer:
              </Text>
              <View style={styles.customerDetailRow}>
                <View style={styles.detailItem}>
                  <Phone size={16} color="#3B82F6" />
                  <Text style={styles.detailText}>
                    {selectedCustomer.phone}
                  </Text>
                </View>
                {selectedCustomer.address &&
                  selectedCustomer.address !== 'Address not provided' && (
                    <View style={styles.detailItem}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.detailText}>
                        {selectedCustomer.address}
                      </Text>
                    </View>
                  )}
              </View>
              <View style={styles.purchaseStats}>
                {lastPurchaseAmount > 0 && (
                  <Text style={styles.purchaseStatsText}>
                    Last Purchase Amount: ₹{lastPurchaseAmount.toFixed(2)}
                  </Text>
                )}
                {selectedCustomer.lastPurchase && (
                  <Text style={styles.purchaseStatsText}>
                    {(() => {
                      const d = new Date(selectedCustomer.lastPurchase);
                      return `Last Purchase Date: ${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
                    })()}
                  </Text>
                )}
              </View>
            </View>
          )}

          {showCustomerDropdown && (
            <View style={styles.customerDropdown}>
              {isLoadingCustomers ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Searching customers...</Text>
                </View>
              ) : isNewCustomer ? (
                <TouchableOpacity
                  style={styles.newCustomerItem}
                  onPress={handleAddNewCustomer}
                >
                  <View style={styles.newCustomerIcon}>
                    <Plus size={20} color="#059669" />
                  </View>
                  <View style={styles.newCustomerInfo}>
                    <Text style={styles.newCustomerText}>
                      Add "{customerName}" as new customer
                    </Text>
                    <Text style={styles.newCustomerSubtext}>
                      Click to create new customer profile
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : filteredCustomers.length > 0 ? (
                <ScrollView
                  style={styles.customerList}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredCustomers.map(renderCustomerItem)}
                </ScrollView>
              ) : (
                <View style={styles.noCustomersContainer}>
                  <Text style={styles.noCustomersText}>No customers found</Text>
                  <Text style={styles.noCustomersSubtext}>
                    Try different search or add new
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Date & Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Details</Text>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
              style={styles.dateIcon}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Calendar size={20} color="#FFF" />
            </LinearGradient>
            <View style={styles.dateTextContainer}>
              <Text style={styles.dateLabel}>Billing Date</Text>
              <Text style={styles.dateText}>{billingDate.toDateString()}</Text>
            </View>
            <ChevronDown size={20} color="#6B7280" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={billingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
            />
          )}
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Categories ({categories.length})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            <TouchableOpacity
              key="all"
              style={[
                styles.categoryBadge,
                selectedCategoryId === null && styles.categorySelected,
              ]}
              onPress={() => setSelectedCategoryId(null)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategoryId === null && styles.categoryTextSelected,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryBadge,
                  selectedCategoryId === cat.id && styles.categorySelected,
                ]}
                onPress={() => setSelectedCategoryId(cat.id)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryId === cat.id &&
                      styles.categoryTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Product List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Products ({filteredProducts.length})
            </Text>
            <TouchableOpacity onPress={loadAllProducts}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          {isLoadingProducts ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search'
                  : selectedCategoryId !== null
                    ? 'No products in this category'
                    : 'No products in database'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.id === product.id);
              const quantity = cartItem ? cartItem.quantity : 0;
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.categoryStockRow}>
                      <Text style={styles.productCategory}>
                        {product.categoryName || 'Uncategorized'}
                      </Text>
                      <Text style={styles.productStock}>
                        <Package size={12} color="#6B7280" /> {product.stock}{' '}
                        {product.unit}
                      </Text>
                    </View>
                    <View style={styles.priceContainer}>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>MRP</Text>
                        <Text style={styles.productMrp}>
                          ₹{product.mrp.toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>Wholesale Rate</Text>
                        <TextInput
                          style={[
                            styles.rateInput,
                            editableRates[product.id] !== undefined &&
                              styles.rateInputModified,
                          ]}
                          value={editableRates[product.id] || ''}
                          onChangeText={(t) =>
                            updateWholesaleRate(product.id, t)
                          }
                          keyboardType="decimal-pad"
                          placeholder={product.sellPrice.toFixed(2)}
                          placeholderTextColor="#6B7280"
                        />
                      </View>
                      <View style={styles.priceColumn}>
                        <Text style={styles.priceLabel}>Discount %</Text>
                        <TextInput
                          style={[
                            styles.discountInput,
                            itemDiscounts[product.id] !== undefined &&
                              styles.discountInputActive,
                          ]}
                          value={itemDiscounts[product.id] || ''}
                          onChangeText={(t) =>
                            updateItemDiscount(product.id, t)
                          }
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#6B7280"
                        />
                      </View>
                    </View>
                    <View style={styles.purchasePriceInfo}>
                      <Text style={styles.purchasePriceLabel}>
                        Cost Price: ₹{product.purchasePrice.toFixed(2)} per{' '}
                        {product.unit}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.quantityContainer}>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() =>
                          updateCart(product, Math.max(0, quantity - 1))
                        }
                      >
                        <Text style={styles.quantityButtonText}>-</Text>
                      </TouchableOpacity>
                      <View style={styles.qtyInputContainer}>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            quantity > 0 && styles.qtyInputActive,
                          ]}
                          keyboardType="numeric"
                          value={quantity > 0 ? quantity.toString() : ''}
                          onChangeText={(t) =>
                            updateCart(product, Number(t) || 0)
                          }
                          placeholder="0"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => updateCart(product, quantity + 1)}
                      >
                        <Text style={styles.quantityButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.qtyLabel}>QTY</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Cart Summary */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Cart Summary{' '}
              {getTotalItems() > 0 &&
                `(${getTotalItems()} items, ${getTotalQuantity()} qty)`}
            </Text>
          </View>

          {cart.length > 0 && (
            <View style={styles.billDiscountSection}>
              <View style={styles.billDiscountHeader}>
                <Text style={styles.billDiscountTitle}>Bill Discount</Text>
                <TouchableOpacity
                  style={styles.applyAllButton}
                  onPress={applyDiscountToAll}
                >
                  <Percent size={16} color="#FFF" />
                  <Text style={styles.applyAllText}>Apply to All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.billDiscountInputContainer}>
                <TextInput
                  style={styles.billDiscountInput}
                  value={billDiscount}
                  onChangeText={(t) => {
                    const s = t.replace(/[^0-9.]/g, '');
                    if (s.split('.').length <= 2) setBillDiscount(s);
                  }}
                  keyboardType="decimal-pad"
                  placeholder="Enter discount %"
                  placeholderTextColor="#9CA3AF"
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>
          )}

          {cart.length === 0 ? (
            <View style={styles.emptyCart}>
              <View style={styles.emptyCartIcon}>
                <ShoppingCart size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyCartText}>Your cart is empty</Text>
              <Text style={styles.emptyCartSubtext}>
                Add products from above to get started
              </Text>
            </View>
          ) : (
            <View>
              {cart.map((item) => {
                const basePrice = item.customRate || item.sellPrice;
                const finalPrice = item.discountedPrice || basePrice;
                const itemTotal = getItemTotal(item);
                const discountAmount = getItemDiscountAmount(item);
                const hasDiscount = item.discount && item.discount > 0;
                const costAmount = item.purchasePrice * item.quantity;
                const itemProfit = itemTotal - costAmount;

                return (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <View style={styles.cartItemDetails}>
                        <View style={styles.cartPriceRow}>
                          <Text style={styles.cartBasePrice}>
                            ₹{basePrice.toFixed(2)} × {item.quantity}
                          </Text>
                          {hasDiscount && (
                            <View style={styles.discountBadge}>
                              <Tag size={12} color="#FFF" />
                              <Text style={styles.discountBadgeText}>
                                {item.discount}% OFF
                              </Text>
                            </View>
                          )}
                        </View>
                        {hasDiscount && (
                          <View style={styles.discountRow}>
                            <Text style={styles.discountText}>
                              -₹{discountAmount.toFixed(2)}
                            </Text>
                            <Text style={styles.finalPriceText}>
                              ₹{finalPrice.toFixed(2)} each
                            </Text>
                          </View>
                        )}
                        <View style={styles.profitRow}>
                          <Text style={styles.profitLabel}>
                            Cost: ₹{costAmount.toFixed(2)}
                          </Text>
                          <Text
                            style={[
                              styles.profitValue,
                              itemProfit >= 0
                                ? styles.profitPositive
                                : styles.profitNegative,
                            ]}
                          >
                            Item Profit: ₹{itemProfit.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cartItemRow}>
                        <View style={styles.cartQuantityContainer}>
                          <Text style={styles.cartQuantityLabel}>
                            Quantity:{' '}
                          </Text>
                          <View style={styles.cartQuantityControls}>
                            <TouchableOpacity
                              style={styles.cartQuantityButton}
                              onPress={() =>
                                updateCartQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <Text style={styles.cartQuantityButtonText}>
                                -
                              </Text>
                            </TouchableOpacity>
                            <View style={styles.cartQtyInputContainer}>
                              <TextInput
                                style={styles.cartQtyInput}
                                value={item.quantity.toString()}
                                onChangeText={(t) =>
                                  updateCartQuantity(item.id, Number(t) || 0)
                                }
                                keyboardType="numeric"
                              />
                            </View>
                            <TouchableOpacity
                              style={styles.cartQuantityButton}
                              onPress={() =>
                                updateCartQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <Text style={styles.cartQuantityButtonText}>
                                +
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.cartTotalContainer}>
                          <Text style={styles.cartItemTotal}>
                            ₹{itemTotal.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.removeItemBtn}
                      onPress={() => removeFromCart(item.id)}
                    >
                      <X size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* Price Summary */}
              <View style={styles.priceSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{getSubtotal().toFixed(2)}
                  </Text>
                </View>
                {getTotalItemDiscount() > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Item Discount:</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -₹{getTotalItemDiscount().toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>After Item Discount:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{getAmountAfterItemDiscount().toFixed(2)}
                  </Text>
                </View>
                {billDiscount && parseFloat(billDiscount) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Bill Discount ({billDiscount}%):
                    </Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -₹{getBillDiscountAmount().toFixed(2)}
                    </Text>
                  </View>
                )}
                <View style={[styles.summaryRow, styles.finalTotalRow]}>
                  <Text style={styles.finalTotalLabel}>Final Amount:</Text>
                  <Text style={styles.finalTotalValue}>
                    ₹{getFinalAmount().toFixed(2)}
                  </Text>
                </View>

                <View style={styles.profitSection}>
                  <Text style={styles.profitSectionTitle}>Profit Analysis</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Cost:</Text>
                    <Text style={styles.summaryValue}>
                      ₹{getTotalCostPrice().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Profit Before Discount:
                    </Text>
                    <Text style={[styles.summaryValue, styles.profitPositive]}>
                      ₹{getProfitBeforeAnyDiscount().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Profit After Item Disc:
                    </Text>
                    <Text style={[styles.summaryValue, styles.profitPositive]}>
                      ₹{getProfitAfterItemDiscount().toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.summaryRow, styles.finalProfitRow]}>
                    <Text style={styles.finalProfitLabel}>
                      Final Net Profit:
                    </Text>
                    <Text style={styles.finalProfitValue}>
                      ₹{getFinalProfit().toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Profit Margin:</Text>
                    <Text style={[styles.summaryValue, styles.profitPositive]}>
                      {getProfitMargin()}%
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={generateBill}>
          <Text style={styles.generateBtnText}>Generate Bill</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles - Updated with Dashboard Theme
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  // Updated Header with Dashboard Theme
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTextContainer: {},
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  refreshButton: { padding: 8 },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#93C5FD',
    marginTop: 2,
    fontWeight: '500',
  },
  cartBadge: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  refreshText: { fontSize: 13, color: '#3B82F6', fontWeight: '600' },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 1000,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputIcon: { marginRight: 8 },
  customerInput: { flex: 1, height: 44, color: '#0F172A', fontSize: 15 },
  billTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  cashActive: { backgroundColor: '#10B981' },
  creditActive: { backgroundColor: '#F59E0B' },
  billTypeText: {
    color: '#FFF',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 13,
  },
  selectedCustomerInfo: {
    backgroundColor: '#EFF6FF',
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  selectedCustomerLabel: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '700',
    marginBottom: 8,
  },
  customerDetailRow: { flexDirection: 'column', gap: 8 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#1E40AF', fontWeight: '500', flex: 1 },
  purchaseStats: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  purchaseStatsText: { fontSize: 12, color: '#059669', fontWeight: '600' },
  statusBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  errorBanner: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, color: '#92400E', textAlign: 'center' },
  customerDropdown: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1001,
  },
  customerList: { maxHeight: 200 },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  customerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  customerInfo: { flex: 1 },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  customerContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerPhone: { fontSize: 12, color: '#64748B' },
  customerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  customerAddress: { fontSize: 11, color: '#64748B', flex: 1, lineHeight: 14 },
  lastPurchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lastPurchaseText: { fontSize: 10, color: '#64748B', fontStyle: 'italic' },
  newCustomerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
  },
  newCustomerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  newCustomerInfo: { flex: 1 },
  newCustomerText: { fontSize: 14, color: '#059669', fontWeight: '500' },
  newCustomerSubtext: { fontSize: 11, color: '#64748B', marginTop: 2 },
  loadingContainer: { padding: 16, alignItems: 'center' },
  loadingText: { fontSize: 14, color: '#64748B' },
  noCustomersContainer: { padding: 16, alignItems: 'center' },
  noCustomersText: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  noCustomersSubtext: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  emptyStateSubtext: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTextContainer: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  dateText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: { flex: 1, marginLeft: 8, height: 40, color: '#0F172A' },
  categoryScroll: { flexDirection: 'row', gap: 8, marginTop: 8 },
  categoryBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  categorySelected: { backgroundColor: '#3B82F6' },
  categoryText: { color: '#475569', fontWeight: '500', fontSize: 13 },
  categoryTextSelected: { color: '#FFF' },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  categoryStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productCategory: { fontSize: 11, color: '#64748B' },
  productStock: { fontSize: 11, color: '#64748B', marginRight: 60 },
  priceContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  priceColumn: {},
  priceLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  productMrp: { fontSize: 12, fontWeight: '600', color: '#0F172A' },
  purchasePriceInfo: { marginTop: 4, paddingTop: 2 },
  purchasePriceLabel: { fontSize: 10, color: '#10B981', fontWeight: '600' },
  quantityContainer: { width: 100, alignItems: 'center' },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 15,
  },
  quantityButton: {
    width: 32,
    height: 32,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  qtyInputContainer: { width: 50, height: 32 },
  qtyInput: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    textAlign: 'center',
    color: '#0F172A',
    backgroundColor: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  qtyInputActive: {
    borderColor: '#3B82F6',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
  },
  qtyLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#0F172A',
    minWidth: 50,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  discountInputActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    fontWeight: '700',
    color: '#047857',
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
    minWidth: 70,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  rateInputModified: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    fontWeight: '700',
    color: '#1E40AF',
  },
  billDiscountSection: {
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billDiscountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billDiscountTitle: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  applyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  applyAllText: { color: '#FFF', fontSize: 12, fontWeight: '600' },
  billDiscountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billDiscountInput: {
    flex: 1,
    height: 40,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '500',
  },
  percentSymbol: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyCart: { alignItems: 'center', marginTop: 24 },
  emptyCartIcon: { marginBottom: 12 },
  emptyCartText: { fontSize: 16, fontWeight: '600', color: '#64748B' },
  emptyCartSubtext: { fontSize: 12, color: '#94A3B8' },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cartItemInfo: { flex: 1 },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  cartItemDetails: { marginBottom: 8 },
  cartPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cartBasePrice: { fontSize: 12, color: '#64748B' },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  discountBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountText: { fontSize: 11, color: '#EF4444', fontWeight: '600' },
  finalPriceText: { fontSize: 11, color: '#10B981', fontWeight: '600' },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  profitLabel: { fontSize: 11, color: '#64748B' },
  profitValue: { fontSize: 11, fontWeight: '600' },
  profitPositive: { color: '#10B981' },
  profitNegative: { color: '#EF4444' },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartQuantityContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartQuantityLabel: { fontSize: 12, color: '#64748B' },
  cartQuantityControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartQuantityButton: {
    width: 28,
    height: 28,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQuantityButtonText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  cartQtyInputContainer: { width: 40, height: 28 },
  cartQtyInput: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 6,
    textAlign: 'center',
    color: '#0F172A',
    backgroundColor: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    padding: 0,
  },
  cartTotalContainer: { marginLeft: 16 },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 60,
    textAlign: 'right',
  },
  removeItemBtn: {
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  priceSummary: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  summaryValue: { fontSize: 14, color: '#334155', fontWeight: '600' },
  discountValue: { color: '#EF4444' },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalLabel: { fontSize: 16, color: '#0F172A', fontWeight: '700' },
  finalTotalValue: { fontSize: 18, color: '#0F172A', fontWeight: '700' },
  profitSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#10B981',
  },
  profitSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
    marginBottom: 8,
    textAlign: 'center',
  },
  finalProfitRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  finalProfitLabel: { fontSize: 15, color: '#10B981', fontWeight: '800' },
  finalProfitValue: { fontSize: 16, color: '#10B981', fontWeight: '800' },
  generateBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    marginVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
