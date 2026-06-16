import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit3,
  IndianRupee,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bill,
  BillItem,
  Category,
  Customer,
  deleteBill,
  getAllBills,
  getAllCategories,
  getAllCustomers,
  getAllProducts,
  getBillWithItems,
  Product,
  updateBill,
  updateProductStock,
} from '../lib/db';

// Define CartItem interface that extends Product
interface CartItem extends Product {
  quantity: number;
  customRate?: number;
  discount?: number;
  discountedPrice?: number;
  itemTotal?: number;
  discountAmount?: number;
}

type FilterType = 'All' | 'Cash' | 'Credit';

export default function ViewBillsScreen() {
  const navigation = useNavigation();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Date filter states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // Edit form states
  const [customerName, setCustomerName] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [billingDate, setBillingDate] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editableRates, setEditableRates] = useState<{ [key: number]: string }>(
    {},
  );
  const [itemDiscounts, setItemDiscounts] = useState<{ [key: number]: string }>(
    {},
  );

  // Add item modal states
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Load bills on component mount
  useEffect(() => {
    loadBills();
    loadCustomersAndProducts();
    loadCategories();
  }, []);

  // Filter bills when search query, filter type, or date changes
  useEffect(() => {
    filterBills();
  }, [searchQuery, bills, filterType, selectedDate]);

  // Filter products when search query or category changes
  useEffect(() => {
    if (productSearchQuery.trim() === '' && selectedCategory === 'All') {
      setFilteredProducts(products);
    } else {
      let filtered = products;

      if (selectedCategory !== 'All') {
        filtered = filtered.filter(
          (product: Product) =>
            product.categoryId === parseInt(selectedCategory),
        );
      }

      if (productSearchQuery.trim() !== '') {
        filtered = filtered.filter(
          (product: Product) =>
            product.name
              .toLowerCase()
              .includes(productSearchQuery.toLowerCase()) ||
            (product.categoryName &&
              product.categoryName
                .toLowerCase()
                .includes(productSearchQuery.toLowerCase())),
        );
      }

      setFilteredProducts(filtered);
    }
  }, [productSearchQuery, products, selectedCategory]);

  const loadCategories = async () => {
    try {
      const categoryList = await getAllCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterBills = () => {
    let filtered = [...bills];

    // Apply bill type filter
    if (filterType !== 'All') {
      filtered = filtered.filter((bill: Bill) => bill.billType === filterType);
    }

    // Apply date filter
    if (selectedDate && isDateFilterActive) {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter((bill: Bill) => {
        const billDate = bill.billingDate.split('T')[0];
        return billDate === selectedDateString;
      });
    }

    // Apply search query filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (bill: Bill) =>
          bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.id.toString().includes(searchQuery) ||
          bill.billType.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }

    setFilteredBills(filtered);
  };

  const loadBills = async () => {
    try {
      setLoading(true);
      const billsList = await getAllBills();

      // Fetch items for each bill
      const billsWithItems = await Promise.all(
        billsList.map(async (bill: Bill) => {
          const items = await getBillWithItems(bill.id);
          return items || bill;
        }),
      );

      setBills(billsWithItems);
      setFilteredBills(billsWithItems);
    } catch (error) {
      console.error('Error loading bills:', error);
      Alert.alert('Error', 'Failed to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadCustomersAndProducts = async () => {
    try {
      const [customersList, productsList] = await Promise.all([
        getAllCustomers(),
        getAllProducts(),
      ]);
      setCustomers(customersList);
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error loading customers and products:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBills();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setSelectedDate(selectedDate);
      setIsDateFilterActive(true);
    }
  };

  const clearDateFilter = () => {
    setSelectedDate(null);
    setIsDateFilterActive(false);
  };

  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-GB');
  };

  const handleDeleteBill = (bill: Bill) => {
    Alert.alert(
      'Delete Bill',
      `Are you sure you want to delete bill #${bill.id} for ${bill.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteBill(bill.id),
        },
      ],
    );
  };

  const confirmDeleteBill = async (billId: number) => {
    try {
      // Get the complete bill with items
      const completeBill = await getBillWithItems(billId);

      if (!completeBill) {
        Alert.alert('Error', 'Bill not found');
        return;
      }

      // Restore stock for all items in the bill
      if (completeBill.items) {
        for (const item of completeBill.items) {
          const product = products.find(
            (p: Product) => p.name === item.itemName,
          );
          if (product) {
            const newStock = product.stock + item.quantity;
            await updateProductStock(product.id, newStock);
          }
        }
      }

      // Delete the bill
      await deleteBill(billId);

      Alert.alert('Success', 'Bill deleted successfully');
      loadBills(); // Refresh the list
    } catch (error) {
      console.error('Error deleting bill:', error);
      Alert.alert('Error', 'Failed to delete bill');
    }
  };

  const handleEditBill = async (bill: Bill) => {
    try {
      setEditLoading(true);

      // Fetch complete bill data with items
      const completeBill = await getBillWithItems(bill.id);
      if (!completeBill || !completeBill.items) {
        Alert.alert('Error', 'Could not load bill details');
        return;
      }

      setSelectedBill(completeBill);
      setCustomerName(completeBill.customerName);
      setBillType(completeBill.billType as 'Cash' | 'Credit');
      setBillingDate(completeBill.billingDate);
      setBillDiscount(completeBill.billDiscountPercent?.toString() || '');

      // Convert bill items to cart items
      const cartItems: CartItem[] = await Promise.all(
        completeBill.items.map(async (item: BillItem) => {
          // Find the original product
          const product = products.find(
            (p: Product) => p.name === item.itemName,
          );

          if (!product) {
            // If product not found, create a temporary product
            return {
              id: Date.now() + Math.random(),
              name: item.itemName,
              mrp: item.rate,
              sellPrice: item.rate,
              purchasePrice: item.purchaseRate || 0,
              stock: 0,
              unit: 'pcs',
              categoryId: 0,
              minStock: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              quantity: item.quantity,
              customRate: item.rate,
              discount: item.discountPercent,
              discountedPrice: item.finalRate,
              itemTotal: item.total,
              discountAmount: item.discountAmount,
            };
          }

          return {
            ...product,
            quantity: item.quantity,
            customRate: item.rate,
            discount: item.discountPercent,
            discountedPrice: item.finalRate,
            itemTotal: item.total,
            discountAmount: item.discountAmount,
          };
        }),
      );

      setCart(cartItems);

      // Set editable rates and discounts
      const rates: { [key: number]: string } = {};
      const discounts: { [key: number]: string } = {};

      cartItems.forEach((item: CartItem) => {
        if (item.customRate !== undefined) {
          rates[item.id] = item.customRate.toString();
        }
        if (item.discount !== undefined && item.discount > 0) {
          discounts[item.id] = item.discount.toString();
        }
      });

      setEditableRates(rates);
      setItemDiscounts(discounts);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading bill for edit:', error);
      Alert.alert('Error', 'Failed to load bill details');
    } finally {
      setEditLoading(false);
    }
  };

  // Add new item to cart
  const addItemToCart = (product: Product) => {
    // Check if item already exists in cart
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      // If item exists, increase quantity
      updateCartQuantity(product.id, existingItem.quantity + 1);
    } else {
      // Add new item to cart
      const newCartItem: CartItem = {
        ...product,
        quantity: 1,
        customRate: product.sellPrice,
        discount: 0,
        discountedPrice: product.sellPrice,
        itemTotal: product.sellPrice,
        discountAmount: 0,
      };

      setCart((prevCart) => [...prevCart, newCartItem]);

      // Set initial editable rate
      setEditableRates((prev) => ({
        ...prev,
        [product.id]: product.sellPrice.toString(),
      }));
    }

    setShowAddItemModal(false);
    setProductSearchQuery('');
    setSelectedCategory('All');
  };

  const updateWholesaleRate = (productId: number, newRate: string) => {
    if (newRate === '') {
      setEditableRates((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });
      return;
    }

    const sanitizedValue = newRate.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) return;

    let finalValue = sanitizedValue;
    if (
      sanitizedValue.length > 1 &&
      sanitizedValue.startsWith('0') &&
      !sanitizedValue.startsWith('0.')
    ) {
      finalValue = sanitizedValue.substring(1);
    }

    setEditableRates((prev) => ({
      ...prev,
      [productId]: finalValue,
    }));

    // Update cart item with new rate and recalculate
    setCart((prevCart) =>
      prevCart.map((item: CartItem) => {
        if (item.id === productId) {
          const basePrice = parseFloat(finalValue) || item.sellPrice;
          const discount = itemDiscounts[productId]
            ? parseFloat(itemDiscounts[productId])
            : item.discount || 0;
          const discountedPrice =
            discount > 0
              ? parseFloat((basePrice * (1 - discount / 100)).toFixed(2))
              : basePrice;
          const itemTotal = parseFloat(
            (discountedPrice * item.quantity).toFixed(2),
          );
          const discountAmount =
            discount > 0
              ? parseFloat(
                  ((basePrice - discountedPrice) * item.quantity).toFixed(2),
                )
              : 0;

          return {
            ...item,
            customRate: basePrice,
            discountedPrice,
            itemTotal,
            discountAmount,
            discount,
          };
        }
        return item;
      }),
    );
  };

  const updateItemDiscount = (productId: number, discount: string) => {
    if (discount === '' || discount === '0') {
      setItemDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });

      // Remove discount from cart item
      setCart((prevCart) =>
        prevCart.map((item: CartItem) => {
          if (item.id === productId) {
            const basePrice = item.customRate || item.sellPrice;
            const itemTotal = parseFloat(
              (basePrice * item.quantity).toFixed(2),
            );

            return {
              ...item,
              discount: 0,
              discountedPrice: basePrice,
              itemTotal,
              discountAmount: 0,
            };
          }
          return item;
        }),
      );
      return;
    }

    const sanitizedValue = discount.replace(/[^0-9.]/g, '');
    const parts = sanitizedValue.split('.');
    if (parts.length > 2) return;

    const discountValue = parseFloat(sanitizedValue);
    if (discountValue > 100) return;

    setItemDiscounts((prev) => ({
      ...prev,
      [productId]: sanitizedValue,
    }));

    // Update cart item with new discount and recalculate
    setCart((prevCart) =>
      prevCart.map((item: CartItem) => {
        if (item.id === productId) {
          const basePrice = item.customRate || item.sellPrice;
          const discountedPrice =
            discountValue > 0
              ? parseFloat((basePrice * (1 - discountValue / 100)).toFixed(2))
              : basePrice;
          const itemTotal = parseFloat(
            (discountedPrice * item.quantity).toFixed(2),
          );
          const discountAmount =
            discountValue > 0
              ? parseFloat(
                  ((basePrice - discountedPrice) * item.quantity).toFixed(2),
                )
              : 0;

          return {
            ...item,
            discount: discountValue,
            discountedPrice,
            itemTotal,
            discountAmount,
          };
        }
        return item;
      }),
    );
  };

  const updateCartQuantity = (itemId: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((item: CartItem) => item.id !== itemId));
      setItemDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
      return;
    }

    // Check stock if it's a known product
    const item = cart.find((i: CartItem) => i.id === itemId);
    if (item && item.stock > 0 && qty > item.stock) {
      Alert.alert(
        'Error',
        `Only ${item.stock} ${item.unit} available in stock`,
      );
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item: CartItem) => {
        if (item.id === itemId) {
          const basePrice = item.customRate || item.sellPrice;
          const discount = itemDiscounts[itemId]
            ? parseFloat(itemDiscounts[itemId])
            : item.discount || 0;
          const discountedPrice =
            discount > 0
              ? parseFloat((basePrice * (1 - discount / 100)).toFixed(2))
              : basePrice;
          const itemTotal = parseFloat((discountedPrice * qty).toFixed(2));
          const discountAmount =
            discount > 0
              ? parseFloat(((basePrice - discountedPrice) * qty).toFixed(2))
              : 0;

          return {
            ...item,
            quantity: qty,
            discountedPrice,
            itemTotal,
            discountAmount,
            discount,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item: CartItem) => item.id !== id));
    setItemDiscounts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Calculate pricing functions
  const getItemTotal = (item: CartItem) => {
    return item.itemTotal || 0;
  };

  const getItemDiscountAmount = (item: CartItem) => {
    return item.discountAmount || 0;
  };

  const getSubtotal = () => {
    const subtotal = cart.reduce((sum: number, item: CartItem) => {
      const basePrice = item.customRate || item.sellPrice;
      return sum + basePrice * item.quantity;
    }, 0);
    return parseFloat(subtotal.toFixed(2));
  };

  const getTotalItemDiscount = () => {
    const totalDiscount = cart.reduce((sum: number, item: CartItem) => {
      return sum + getItemDiscountAmount(item);
    }, 0);
    return parseFloat(totalDiscount.toFixed(2));
  };

  const getBillDiscountAmount = () => {
    const subtotal = getSubtotal();
    const itemDiscount = getTotalItemDiscount();
    const amountAfterItemDiscount = subtotal - itemDiscount;

    const billDiscountValue = billDiscount ? parseFloat(billDiscount) : 0;
    if (billDiscountValue > 0) {
      return parseFloat(
        (amountAfterItemDiscount * (billDiscountValue / 100)).toFixed(2),
      );
    }
    return 0;
  };

  const getAmountAfterItemDiscount = () => {
    return getSubtotal() - getTotalItemDiscount();
  };

  const getFinalAmount = () => {
    const subtotal = getSubtotal();
    const itemDiscount = getTotalItemDiscount();
    const billDiscountAmount = getBillDiscountAmount();

    return parseFloat(
      (subtotal - itemDiscount - billDiscountAmount).toFixed(2),
    );
  };

  const handleUpdateBill = async () => {
    if (!selectedBill) return;

    if (cart.length === 0) {
      Alert.alert('Error', 'Please add items to cart');
      return;
    }

    try {
      setEditLoading(true);

      const subtotal = getSubtotal();
      const totalItemDiscount = getTotalItemDiscount();
      const billDiscountAmount = getBillDiscountAmount();
      const finalAmount = getFinalAmount();

      // Prepare cart items with detailed pricing information
      const cartItems = cart.map((item: CartItem) => {
        const basePrice = item.customRate || item.sellPrice;
        const finalPrice = item.discountedPrice || basePrice;
        const itemTotal = getItemTotal(item);
        const itemDiscountAmount = getItemDiscountAmount(item);
        const discountPercent = itemDiscounts[item.id]
          ? parseFloat(itemDiscounts[item.id])
          : item.discount || 0;

        return {
          name: item.name,
          quantity: item.quantity,
          rate: basePrice,
          purchaseRate: item.purchasePrice,
          finalRate: finalPrice,
          discountPercent: discountPercent,
          discountAmount: itemDiscountAmount,
          total: itemTotal,
        };
      });

      // Find customer ID
      const customer = customers.find((c: Customer) => c.name === customerName);
      if (!customer) {
        Alert.alert('Error', 'Customer not found');
        return;
      }

      await updateBill(
        selectedBill.id,
        customer.id,
        customerName,
        billType,
        billingDate,
        finalAmount,
        cartItems,
        billDiscount ? parseFloat(billDiscount) : 0,
        subtotal,
        totalItemDiscount,
        billDiscountAmount,
      );

      // Update product stocks for all items in cart
      for (const item of cart) {
        // Skip temporary IDs (unknown products)
        if (item.id > 1000000) continue;

        const originalProduct = products.find((p: Product) => p.id === item.id);
        if (originalProduct) {
          // Find if this item was in the original bill
          const originalBillItem = selectedBill.items?.find(
            (bi: BillItem) => bi.itemName === item.name,
          );
          const originalQty = originalBillItem?.quantity || 0;
          const stockDifference = originalQty - item.quantity;

          if (stockDifference !== 0) {
            const newStock = originalProduct.stock + stockDifference;
            if (newStock >= 0) {
              await updateProductStock(item.id, newStock);
            } else {
              console.warn(
                `Cannot update stock for ${item.name}: insufficient stock`,
              );
            }
          }
        }
      }

      Alert.alert(
        'Success',
        `✅ Bill Updated Successfully!\n\n` +
          `Bill #${selectedBill.id}\n` +
          `Customer: ${customerName}\n` +
          `Final Amount: ₹${finalAmount.toFixed(2)}`,
      );

      setShowEditModal(false);
      loadBills(); // Refresh the list
    } catch (error) {
      console.error('Error updating bill:', error);
      Alert.alert('Error', 'Failed to update bill');
    } finally {
      setEditLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getTotalItems = (bill: Bill) => {
    return (
      bill.items?.reduce(
        (sum: number, item: BillItem) => sum + item.quantity,
        0,
      ) || 0
    );
  };

  const getFilterCount = () => {
    if (filterType === 'All') return bills.length;
    return bills.filter((bill: Bill) => bill.billType === filterType).length;
  };

  // Get product MRP by item name
  const getProductMRP = (itemName: string) => {
    const product = products.find((p) => p.name === itemName);
    return product ? product.mrp : null;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>View Bills</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Header with Dashboard Theme */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>View Bills</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{bills.length}</Text>
            <Text style={styles.statLabel}>Total Bills</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {bills.filter((b: Bill) => b.billType === 'Cash').length}
            </Text>
            <Text style={styles.statLabel}>Cash</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {bills.filter((b: Bill) => b.billType === 'Credit').length}
            </Text>
            <Text style={styles.statLabel}>Credit</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Single Date Filter */}
      <View style={styles.dateFilterSection}>
        <Text style={styles.filterLabel}>Filter by Date:</Text>
        <View style={styles.dateContainer}>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Calendar size={16} color="#3B82F6" />
            <Text style={styles.dateButtonText}>
              {selectedDate
                ? formatDateForDisplay(selectedDate)
                : 'Select Date'}
            </Text>
          </TouchableOpacity>
          {isDateFilterActive && (
            <TouchableOpacity
              style={styles.clearDateButton}
              onPress={clearDateFilter}
            >
              <X size={16} color="#EF4444" />
              <Text style={styles.clearDateText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate || new Date()}
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      )}

      {/* Bill Type Filter */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filter by Bill Type:</Text>
        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'All' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType('All')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'All' && styles.filterButtonTextActive,
              ]}
            >
              All ({bills.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Cash' && styles.filterButtonCashActive,
            ]}
            onPress={() => setFilterType('Cash')}
          >
            <IndianRupee
              size={14}
              color={filterType === 'Cash' ? '#FFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'Cash' && styles.filterButtonTextActive,
              ]}
            >
              Cash ({bills.filter((b: Bill) => b.billType === 'Cash').length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Credit' && styles.filterButtonCreditActive,
            ]}
            onPress={() => setFilterType('Credit')}
          >
            <CreditCard
              size={14}
              color={filterType === 'Credit' ? '#FFF' : '#F59E0B'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'Credit' && styles.filterButtonTextActive,
              ]}
            >
              Credit (
              {bills.filter((b: Bill) => b.billType === 'Credit').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name, bill ID..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results Count */}
      <View style={styles.resultsCount}>
        <Text style={styles.resultsCountText}>
          Showing {filteredBills.length} of {getFilterCount()} bills
          {filterType !== 'All' && ` (${filterType})`}
          {isDateFilterActive && ` on ${formatDateForDisplay(selectedDate)}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </Text>
      </View>

      {/* Bills List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery || filterType !== 'All' || isDateFilterActive
                ? 'No bills found'
                : 'No bills available'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search term'
                : filterType !== 'All'
                  ? `No ${filterType} bills available`
                  : isDateFilterActive
                    ? `No bills found on ${formatDateForDisplay(selectedDate)}`
                    : 'All bills will appear here'}
            </Text>
          </View>
        ) : (
          filteredBills.map((bill: Bill) => (
            <View key={bill.id} style={styles.billCard}>
              <View style={styles.billHeader}>
                <View style={styles.billInfo}>
                  <Text style={styles.billId}>Bill #{bill.id}</Text>
                  <Text style={styles.customerName}>{bill.customerName}</Text>
                  <View style={styles.billMeta}>
                    <View style={styles.metaItem}>
                      <Calendar size={12} color="#64748B" />
                      <Text style={styles.metaText}>
                        {formatDate(bill.billingDate)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <CreditCard size={12} color="#64748B" />
                      <Text
                        style={[
                          styles.metaText,
                          bill.billType === 'Cash'
                            ? styles.cashText
                            : styles.creditText,
                        ]}
                      >
                        {bill.billType}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <IndianRupee size={12} color="#64748B" />
                      <Text style={styles.metaText}>
                        {formatCurrency(bill.totalAmount)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.billActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditBill(bill)}
                  >
                    <Edit3 size={18} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBill(bill)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bill Items Summary - Show ALL items with MRP */}
              {bill.items && bill.items.length > 0 && (
                <View style={styles.itemsSummary}>
                  <Text style={styles.itemsTitle}>
                    Items ({getTotalItems(bill)} items):
                  </Text>
                  {bill.items.map((item: BillItem, index: number) => {
                    const productMRP = getProductMRP(item.itemName);
                    return (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfoContainer}>
                          <Text style={styles.itemName} numberOfLines={1}>
                            {item.itemName}
                          </Text>
                          <View style={styles.itemPriceRow}>
                            {productMRP && (
                              <Text style={styles.itemMrpText}>
                                MRP: ₹{productMRP.toFixed(2)}
                              </Text>
                            )}
                            <Text style={styles.itemRateText}>
                              Rate: ₹{item.finalRate.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.itemQuantityContainer}>
                          <Text style={styles.itemDetails}>
                            {item.quantity} × ₹{item.finalRate.toFixed(2)}
                          </Text>
                          <Text style={styles.itemTotal}>
                            ₹{item.total.toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* Discount Summary */}
              {(bill.itemDiscountAmount > 0 ||
                bill.billDiscountPercent > 0) && (
                <View style={styles.discountSummary}>
                  {bill.itemDiscountAmount > 0 && (
                    <Text style={styles.discountText}>
                      Item Discount: -{formatCurrency(bill.itemDiscountAmount)}
                    </Text>
                  )}
                  {bill.billDiscountPercent > 0 && (
                    <Text style={styles.discountText}>
                      Bill Discount: {bill.billDiscountPercent}% (-
                      {formatCurrency(bill.billDiscountAmount)})
                    </Text>
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Bill Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.editModalHeader}
          >
            <View style={styles.editModalHeaderContent}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => setShowEditModal(false)}
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter}>
                <Edit3 size={24} color="#FFFFFF" />
                <Text style={styles.editModalTitle}>
                  Edit Bill #{selectedBill?.id}
                </Text>
              </View>
              <View style={styles.modalHeaderRight} />
            </View>
            <View style={styles.editModalStats}>
              <View style={styles.editStatItem}>
                <Text style={styles.editStatValue}>{cart.length}</Text>
                <Text style={styles.editStatLabel}>Items in Bill</Text>
              </View>
              <View style={styles.editStatDivider} />
              <View style={styles.editStatItem}>
                <Text style={styles.editStatValue}>
                  {formatCurrency(getFinalAmount())}
                </Text>
                <Text style={styles.editStatLabel}>Total Amount</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Customer Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Calendar
                    size={20}
                    color="#64748B"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={billingDate}
                    onChangeText={setBillingDate}
                    placeholder="Billing Date (YYYY-MM-DD)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.billTypeButton,
                    billType === 'Cash'
                      ? styles.cashActive
                      : styles.creditActive,
                  ]}
                  onPress={() =>
                    setBillType(billType === 'Cash' ? 'Credit' : 'Cash')
                  }
                >
                  {billType === 'Cash' ? (
                    <IndianRupee size={16} color="#FFF" />
                  ) : (
                    <CreditCard size={16} color="#FFF" />
                  )}
                  <Text style={styles.billTypeText}>{billType}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Bill Discount */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill Discount</Text>
              <View style={styles.billDiscountInputContainer}>
                <TextInput
                  style={styles.billDiscountInput}
                  value={billDiscount}
                  onChangeText={setBillDiscount}
                  keyboardType="decimal-pad"
                  placeholder="Bill discount %"
                  placeholderTextColor="#94A3B8"
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>

            {/* Cart Items with MRP Display */}
            <View style={styles.section}>
              <View style={styles.cartHeader}>
                <Text style={styles.sectionTitle}>
                  Cart Items ({cart.length})
                </Text>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => setShowAddItemModal(true)}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {cart.map((item: CartItem) => {
                const currentRate = editableRates[item.id] || '';
                const currentDiscount = itemDiscounts[item.id] || '';
                const basePrice = item.customRate || item.sellPrice;
                const finalPrice = item.discountedPrice || basePrice;
                const hasDiscount =
                  currentDiscount && parseFloat(currentDiscount) > 0;

                return (
                  <View key={item.id} style={styles.editCartItem}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemStock}>
                          Stock: {item.stock} {item.unit}
                        </Text>
                        <Text style={styles.itemMrpInfo}>
                          MRP: ₹{item.mrp.toFixed(2)} | Selling: ₹
                          {item.sellPrice.toFixed(2)}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeItemBtn}
                        onPress={() => removeFromCart(item.id)}
                      >
                        <X size={16} color="#FFF" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.priceRow}>
                      <View style={styles.priceInputContainer}>
                        <Text style={styles.priceLabel}>Rate</Text>
                        <TextInput
                          style={[
                            styles.rateInput,
                            editableRates[item.id] !== undefined &&
                              styles.rateInputModified,
                          ]}
                          value={currentRate}
                          onChangeText={(text) =>
                            updateWholesaleRate(item.id, text)
                          }
                          keyboardType="decimal-pad"
                          placeholder={item.sellPrice.toFixed(2)}
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.priceInputContainer}>
                        <Text style={styles.priceLabel}>Discount %</Text>
                        <TextInput
                          style={[
                            styles.discountInput,
                            itemDiscounts[item.id] !== undefined &&
                              styles.discountInputActive,
                          ]}
                          value={currentDiscount}
                          onChangeText={(text) =>
                            updateItemDiscount(item.id, text)
                          }
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#94A3B8"
                        />
                      </View>

                      <View style={styles.quantityContainer}>
                        <Text style={styles.priceLabel}>Quantity</Text>
                        <View style={styles.quantityControls}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              updateCartQuantity(item.id, item.quantity - 1)
                            }
                          >
                            <Minus size={16} color="#FFF" />
                          </TouchableOpacity>
                          <TextInput
                            style={styles.quantityInput}
                            value={item.quantity.toString()}
                            onChangeText={(text) => {
                              const newQty = parseInt(text) || 0;
                              if (newQty >= 0) {
                                updateCartQuantity(item.id, newQty);
                              }
                            }}
                            keyboardType="numeric"
                            placeholderTextColor="#94A3B8"
                          />
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() =>
                              updateCartQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus size={16} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    <View style={styles.itemTotalRow}>
                      <Text style={styles.itemTotalLabel}>Item Total:</Text>
                      <Text style={styles.itemTotalAmount}>
                        {formatCurrency(getItemTotal(item))}
                      </Text>
                    </View>

                    {hasDiscount && (
                      <View style={styles.discountInfo}>
                        <Text style={styles.discountInfoText}>
                          After {currentDiscount}% discount: ₹
                          {finalPrice.toFixed(2)} each
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Price Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price Summary</Text>
              <View style={styles.priceSummary}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal:</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(getSubtotal())}
                  </Text>
                </View>

                {getTotalItemDiscount() > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Item Discount:</Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -{formatCurrency(getTotalItemDiscount())}
                    </Text>
                  </View>
                )}

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>After Item Discount:</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(getAmountAfterItemDiscount())}
                  </Text>
                </View>

                {billDiscount && parseFloat(billDiscount) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>
                      Bill Discount ({billDiscount}%):
                    </Text>
                    <Text style={[styles.summaryValue, styles.discountValue]}>
                      -{formatCurrency(getBillDiscountAmount())}
                    </Text>
                  </View>
                )}

                <View style={[styles.summaryRow, styles.finalTotalRow]}>
                  <Text style={styles.finalTotalLabel}>Final Amount:</Text>
                  <Text style={styles.finalTotalValue}>
                    {formatCurrency(getFinalAmount())}
                  </Text>
                </View>
              </View>
            </View>

            {/* Update Button */}
            <TouchableOpacity
              style={[
                styles.updateButton,
                editLoading && styles.updateButtonDisabled,
              ]}
              onPress={handleUpdateBill}
              disabled={editLoading}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.updateButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.updateButtonText}>
                  {editLoading ? 'Updating...' : 'Update Bill'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowAddItemModal(false);
          setSelectedCategory('All');
          setProductSearchQuery('');
        }}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addItemModalHeader}
          >
            <View style={styles.addItemModalHeaderContent}>
              <TouchableOpacity
                style={styles.modalBackButton}
                onPress={() => {
                  setShowAddItemModal(false);
                  setSelectedCategory('All');
                  setProductSearchQuery('');
                }}
              >
                <ArrowLeft size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.modalHeaderCenter}>
                <Package size={24} color="#FFFFFF" />
                <Text style={styles.addItemModalTitle}>Add Items</Text>
              </View>
              <View style={styles.modalHeaderRight} />
            </View>
            <View style={styles.addItemHeaderStats}>
              <View style={styles.addItemStatItem}>
                <Text style={styles.addItemStatValue}>
                  {filteredProducts.length}
                </Text>
                <Text style={styles.addItemStatLabel}>Products Available</Text>
              </View>
              <View style={styles.addItemStatDivider} />
              <View style={styles.addItemStatItem}>
                <Text style={styles.addItemStatValue}>{cart.length}</Text>
                <Text style={styles.addItemStatLabel}>Items in Cart</Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.addItemModalContent}>
            {/* Category Filter Chips */}
            <View style={styles.categoryFilterWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryFilterContainer}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryChip,
                    selectedCategory === 'All' && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategory('All')}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategory === 'All' &&
                        styles.categoryChipTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryChip,
                      selectedCategory === category.id.toString() &&
                        styles.categoryChipActive,
                    ]}
                    onPress={() => setSelectedCategory(category.id.toString())}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        selectedCategory === category.id.toString() &&
                          styles.categoryChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Search Bar */}
            <View style={styles.addItemSearchContainer}>
              <Search size={20} color="#64748B" />
              <TextInput
                style={styles.addItemSearchInput}
                placeholder="Search products by name..."
                placeholderTextColor="#94A3B8"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
              />
              {productSearchQuery !== '' && (
                <TouchableOpacity onPress={() => setProductSearchQuery('')}>
                  <X size={20} color="#64748B" />
                </TouchableOpacity>
              )}
            </View>

            {/* Products List with MRP Display */}
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.addItemProductCard}
                  onPress={() => addItemToCart(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.addItemProductRow}>
                    <View style={styles.addItemProductIcon}>
                      <Package size={22} color="#3B82F6" />
                    </View>
                    <View style={styles.addItemProductContent}>
                      <Text style={styles.addItemProductName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.addItemProductCategory}>
                        {item.categoryName || 'Uncategorized'}
                      </Text>
                      <View style={styles.addItemProductMeta}>
                        <View style={styles.addItemStockBadge}>
                          <Text style={styles.addItemStockText}>
                            Stock: {item.stock} {item.unit}
                          </Text>
                        </View>
                        <View style={styles.addItemMrpBadge}>
                          <Text style={styles.addItemMrpText}>
                            MRP: ₹{item.mrp}
                          </Text>
                        </View>
                        <View style={styles.addItemPriceBadge}>
                          <Text style={styles.addItemPriceText}>
                            Sell: ₹{item.sellPrice}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.addItemProductAction}>
                      <LinearGradient
                        colors={['#3B82F6', '#1D4ED8']}
                        style={styles.addItemAddButton}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Plus size={18} color="#FFF" />
                      </LinearGradient>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.addItemEmptyState}>
                  <Package size={64} color="#CBD5E1" />
                  <Text style={styles.addItemEmptyTitle}>
                    No products found
                  </Text>
                  <Text style={styles.addItemEmptySubtitle}>
                    {productSearchQuery
                      ? 'Try a different search term'
                      : 'No products available in this category'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.addItemListContent}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 1,
  },
  headerRight: {
    width: 40,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dateFilterSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  clearDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 6,
  },
  clearDateText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flex: 1,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonCashActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  filterButtonCreditActive: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  filterButtonTextActive: {
    color: '#FFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  resultsCount: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsCountText: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billInfo: {
    flex: 1,
  },
  billId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 8,
  },
  billMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  cashText: {
    color: '#10B981',
    fontWeight: '700',
  },
  creditText: {
    color: '#F59E0B',
    fontWeight: '700',
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  itemsSummary: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  itemInfoContainer: {
    flex: 2,
  },
  itemName: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 2,
  },
  itemPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemMrpText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  itemRateText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  itemQuantityContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  itemDetails: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 60,
    textAlign: 'right',
  },
  discountSummary: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 8,
  },
  discountText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
    marginBottom: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  addItemButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  billTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cashActive: {
    backgroundColor: '#10B981',
  },
  creditActive: {
    backgroundColor: '#F59E0B',
  },
  billTypeText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  billDiscountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billDiscountInput: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  percentSymbol: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginLeft: 8,
  },
  editCartItem: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
  },
  itemStock: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  itemMrpInfo: {
    fontSize: 11,
    color: '#D97706',
    marginTop: 2,
    fontWeight: '500',
  },
  removeItemBtn: {
    backgroundColor: '#EF4444',
    width: 26,
    height: 26,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  rateInputModified: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
    fontWeight: '700',
    color: '#1E40AF',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  discountInputActive: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
    fontWeight: '700',
    color: '#047857',
  },
  quantityContainer: {
    flex: 1,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quantityButton: {
    width: 28,
    height: 28,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '500',
    color: '#0F172A',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  itemTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  itemTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  discountInfo: {
    marginTop: 4,
  },
  discountInfoText: {
    fontSize: 11,
    color: '#10B981',
    fontStyle: 'italic',
  },
  priceSummary: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  discountValue: {
    color: '#EF4444',
  },
  finalTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
    marginTop: 4,
  },
  finalTotalLabel: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '800',
  },
  finalTotalValue: {
    fontSize: 17,
    color: '#0F172A',
    fontWeight: '800',
  },
  updateButton: {
    marginVertical: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  updateButtonDisabled: {
    opacity: 0.6,
  },
  updateButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Edit Modal Styles
  editModalHeader: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  editModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalBackButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  modalHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalHeaderRight: {
    width: 44,
  },
  editModalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
  },
  editStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  editStatValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  editStatLabel: {
    fontSize: 10,
    color: '#93C5FD',
    fontWeight: '500',
  },
  editStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Add Item Modal Styles
  addItemModalHeader: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  addItemModalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  addItemModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  addItemHeaderStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 20,
  },
  addItemStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  addItemStatValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  addItemStatLabel: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '500',
  },
  addItemStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  addItemModalContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F1F5F9',
  },
  categoryFilterWrapper: {
    marginBottom: 16,
  },
  categoryFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },
  addItemSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addItemSearchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: '#0F172A',
  },
  addItemListContent: {
    paddingBottom: 30,
  },
  addItemProductCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  addItemProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemProductIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addItemProductContent: {
    flex: 1,
  },
  addItemProductName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  addItemProductCategory: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 6,
  },
  addItemProductMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  addItemStockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  addItemStockText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  addItemMrpBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  addItemMrpText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  addItemPriceBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  addItemPriceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  addItemProductAction: {
    marginLeft: 8,
  },
  addItemAddButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addItemEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  addItemEmptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 16,
    marginBottom: 8,
  },
  addItemEmptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
