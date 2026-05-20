import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
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
  Alert,
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
  Customer,
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
} from '../../lib/db';

interface CartItem extends Product {
  quantity: number;
  customRate?: number;
  discount?: number;
  discountedPrice?: number;
  itemTotal?: number;
  discountAmount?: number;
}

export default function WholesaleBilling() {
  // States
  const [customerName, setCustomerName] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [billingDate, setBillingDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<string>('');

  // Categories from database
  const [categories, setCategories] = useState<string[]>(['All']);

  // Customer search states
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

  // Products from database
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Editable rates state
  const [editableRates, setEditableRates] = useState<{ [key: number]: string }>(
    {},
  );

  // Item discounts state
  const [itemDiscounts, setItemDiscounts] = useState<{ [key: number]: string }>(
    {},
  );

  // Initialize database and load customers & products
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Extract categories from products when products change
  useEffect(() => {
    if (products.length > 0) {
      const categoriesFromProducts = products
        .map((product) => product.category)
        .filter(
          (category): category is string =>
            category !== undefined &&
            category !== null &&
            category.trim() !== '',
        );

      const uniqueCategories = ['All', ...new Set(categoriesFromProducts)];
      setCategories(uniqueCategories);

      if (
        selectedCategory !== 'All' &&
        !uniqueCategories.includes(selectedCategory)
      ) {
        setSelectedCategory('All');
      }
    } else {
      setCategories(['All']);
    }
  }, [products, selectedCategory]);

  // Load last purchase amount when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      loadLastPurchaseAmount(selectedCustomer.id);
    } else {
      setLastPurchaseAmount(0);
    }
  }, [selectedCustomer]);

  const initializeDatabase = async () => {
    try {
      setDbStatus('checking');

      if (!(await isSqliteAvailable())) {
        console.warn('SQLite not available');
        setDbStatus('error');
        return;
      }

      await initDB();
      await loadCustomers();
      await loadProducts();
      setDbStatus('ready');
    } catch (error) {
      console.error('Error initializing database:', error);
      setDbStatus('error');
    }
  };

  // Load last purchase amount for customer
  const loadLastPurchaseAmount = async (customerId: number) => {
    try {
      const amount = await getCustomerLastPurchaseAmount(customerId);
      setLastPurchaseAmount(amount || 0);
    } catch (error) {
      console.error('Error loading last purchase amount:', error);
      setLastPurchaseAmount(0);
    }
  };

  // Load customers from database
  const loadCustomers = async () => {
    try {
      setIsLoadingCustomers(true);
      console.log('Loading customers...');

      const customersList = await getAllCustomers();
      console.log('Customers loaded from DB:', customersList);

      setCustomers(customersList);
      setFilteredCustomers(customersList);
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Load products from database
  const loadProducts = async () => {
    try {
      setIsLoadingProducts(true);
      console.log('Loading products from database...');

      const productsList = await getAllProducts();
      console.log('Products loaded from DB:', productsList);

      setProducts(productsList);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products from database');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  // Handle customer name input change
  const handleCustomerNameChange = (text: string) => {
    console.log('Customer input changed:', text);
    setCustomerName(text);

    if (text.length > 0) {
      searchCustomers(text);
    } else {
      setShowCustomerDropdown(false);
      setIsNewCustomer(false);
      setFilteredCustomers(customers);
      setSelectedCustomer(null);
      setLastPurchaseAmount(0);
    }
  };

  // Search customers in database
  const searchCustomers = async (searchText: string) => {
    try {
      setIsLoadingCustomers(true);
      setShowCustomerDropdown(true);

      console.log('Searching for:', searchText);
      let searchResults: Customer[] = [];

      if (await isSqliteAvailable()) {
        try {
          searchResults = await searchCustomersByName(searchText);
        } catch (error) {
          console.error('DB search failed, using local filter:', error);
          searchResults = customers.filter((customer) =>
            customer.name.toLowerCase().includes(searchText.toLowerCase()),
          );
        }
      } else {
        searchResults = customers.filter((customer) =>
          customer.name.toLowerCase().includes(searchText.toLowerCase()),
        );
      }

      console.log('Search results:', searchResults);
      setFilteredCustomers(searchResults);
      setIsNewCustomer(searchResults.length === 0 && searchText.length > 0);
    } catch (error) {
      console.error('Error searching customers:', error);
      const localResults = customers.filter((customer) =>
        customer.name.toLowerCase().includes(searchText.toLowerCase()),
      );
      setFilteredCustomers(localResults);
      setIsNewCustomer(localResults.length === 0 && searchText.length > 0);
    } finally {
      setIsLoadingCustomers(false);
    }
  };

  // Select customer from dropdown
  const selectCustomer = async (customer: Customer) => {
    console.log('Customer selected:', customer);
    setCustomerName(customer.name);
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setIsNewCustomer(false);

    // Load last purchase amount for the selected customer
    await loadLastPurchaseAmount(customer.id);
  };

  // Add new customer to database
  const handleAddNewCustomer = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Please enter customer name');
      return;
    }
    try {
      if (await isSqliteAvailable()) {
        const randomPhone = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
        const address = 'Address not provided';

        const customerId = await insertCustomer(
          customerName,
          randomPhone,
          undefined,
          address,
        );

        const newCustomer: Customer = {
          id: customerId,
          name: customerName,
          phone: randomPhone,
          address: address,
          totalPurchases: 0,
          type: 'customer',
        };

        setSelectedCustomer(newCustomer);
        setLastPurchaseAmount(0); // New customer has no last purchase
        await loadCustomers();

        Alert.alert(
          'Success',
          `Customer "${customerName}" added successfully!`,
        );
      }

      setShowCustomerDropdown(false);
    } catch (error) {
      console.error('Error adding customer:', error);
      Alert.alert('Error', 'Failed to add customer');
    }
  };

  // Focus on customer input
  const handleCustomerInputFocus = () => {
    console.log('Customer input focused, current customers:', customers.length);
    if (customers.length > 0) {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(true);
    } else {
      setShowCustomerDropdown(true);
    }
  };

  // Refresh customers and products
  const handleRefresh = () => {
    loadCustomers();
    loadProducts();
    if (selectedCustomer) {
      loadLastPurchaseAmount(selectedCustomer.id);
    }
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      (selectedCategory === 'All' || p.category === selectedCategory),
  );

  // Update wholesale rate for a product
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
  };

  // Update discount for a product
  const updateItemDiscount = (productId: number, discount: string) => {
    if (discount === '' || discount === '0') {
      setItemDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[productId];
        return updated;
      });

      setCart((prevCart) =>
        prevCart.map((item) =>
          item.id === productId
            ? { ...item, discount: undefined, discountedPrice: undefined }
            : item,
        ),
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
  };

  // Apply discount to all items
  const applyDiscountToAll = () => {
    if (!billDiscount || parseFloat(billDiscount) === 0) {
      Alert.alert('Info', 'Please enter a discount percentage first');
      return;
    }

    const discountValue = parseFloat(billDiscount);
    if (discountValue > 100) {
      Alert.alert('Error', 'Discount cannot exceed 100%');
      return;
    }

    const newItemDiscounts: { [key: number]: string } = {};
    cart.forEach((item) => {
      newItemDiscounts[item.id] = billDiscount;
    });

    setItemDiscounts(newItemDiscounts);
    Alert.alert('Success', `Applied ${discountValue}% discount to all items`);
  };

  const updateCart = (product: Product, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((item) => item.id !== product.id));
      setItemDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[product.id];
        return updated;
      });
      return;
    }

    const currentStock = product.stock;
    if (qty > currentStock) {
      Alert.alert(
        'Error',
        `Only ${currentStock} ${product.unit} available in stock`,
      );
      return;
    }

    const existingItem = cart.find((i) => i.id === product.id);
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

    const itemTotal = discountedPrice
      ? parseFloat((discountedPrice * qty).toFixed(2))
      : parseFloat((basePrice * qty).toFixed(2));

    const discountAmount =
      discount && discount > 0
        ? parseFloat(
            ((basePrice - (discountedPrice || basePrice)) * qty).toFixed(2),
          )
        : 0;

    if (existingItem) {
      setCart(
        cart.map((i) =>
          i.id === product.id
            ? {
                ...i,
                quantity: qty,
                customRate: customRate,
                discount: discount && discount > 0 ? discount : undefined,
                discountedPrice: discountedPrice,
                itemTotal: itemTotal,
                discountAmount: discountAmount,
              }
            : i,
        ),
      );
    } else {
      setCart([
        ...cart,
        {
          ...product,
          quantity: qty,
          customRate: customRate,
          discount: discount && discount > 0 ? discount : undefined,
          discountedPrice: discountedPrice,
          itemTotal: itemTotal,
          discountAmount: discountAmount,
        },
      ]);
    }
  };

  // Update cart quantity
  const updateCartQuantity = (itemId: number, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter((item) => item.id !== itemId));
      setItemDiscounts((prev) => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
      return;
    }

    const item = cart.find((i) => i.id === itemId);
    if (item && qty > item.stock) {
      Alert.alert(
        'Error',
        `Only ${item.stock} ${item.unit} available in stock`,
      );
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === itemId) {
          const basePrice = item.customRate || item.sellPrice;
          const discountedPrice = item.discountedPrice || basePrice;
          const itemTotal = parseFloat((discountedPrice * qty).toFixed(2));
          const discountAmount =
            item.discount && item.discount > 0
              ? parseFloat(((basePrice - discountedPrice) * qty).toFixed(2))
              : 0;

          return {
            ...item,
            quantity: qty,
            itemTotal: itemTotal,
            discountAmount: discountAmount,
          };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((item) => item.id !== id));
    setItemDiscounts((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const getTotalItems = () => cart.length;
  const getTotalQuantity = () =>
    cart.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate item total with discount
  const getItemTotal = (item: CartItem) => {
    const basePrice = item.customRate || item.sellPrice;
    const finalPrice = item.discountedPrice || basePrice;
    const total = finalPrice * item.quantity;
    return parseFloat(total.toFixed(2));
  };

  // Calculate individual item discount amount
  const getItemDiscountAmount = (item: CartItem) => {
    const basePrice = item.customRate || item.sellPrice;
    const finalPrice = item.discountedPrice || basePrice;
    const discountAmount = (basePrice - finalPrice) * item.quantity;
    return parseFloat(discountAmount.toFixed(2));
  };

  // Calculate subtotal (before any bill discount)
  const getSubtotal = () => {
    const subtotal = cart.reduce((sum, item) => {
      const basePrice = item.customRate || item.sellPrice;
      return sum + basePrice * item.quantity;
    }, 0);
    return parseFloat(subtotal.toFixed(2));
  };

  // Calculate total discount amount from items
  const getTotalItemDiscount = () => {
    const totalDiscount = cart.reduce((sum, item) => {
      return sum + getItemDiscountAmount(item);
    }, 0);
    return parseFloat(totalDiscount.toFixed(2));
  };

  // Calculate bill discount amount
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

  // Calculate final amount after bill discount
  const getFinalAmount = () => {
    const subtotal = getSubtotal();
    const itemDiscount = getTotalItemDiscount();
    const billDiscountAmount = getBillDiscountAmount();

    return parseFloat(
      (subtotal - itemDiscount - billDiscountAmount).toFixed(2),
    );
  };

  // Update product stock in database
  const updateProductStocks = async () => {
    try {
      for (const item of cart) {
        const newStock = item.stock - item.quantity;
        if (newStock < 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }

        await updateProductStock(item.id, newStock);
        console.log(
          `Updated stock for ${item.name}: ${item.stock} -> ${newStock}`,
        );
      }
    } catch (error) {
      console.error('Error updating product stocks:', error);
      throw error;
    }
  };

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
      const subtotal = getSubtotal();
      const totalItemDiscount = getTotalItemDiscount();
      const billDiscountAmount = getBillDiscountAmount();
      const finalAmount = getFinalAmount();

      await updateProductStocks();

      if (await isSqliteAvailable()) {
        // Prepare cart items with detailed pricing information
        const cartItems = cart.map((item) => {
          const basePrice = item.customRate || item.sellPrice;
          const finalPrice = item.discountedPrice || basePrice;
          const itemTotal = getItemTotal(item);
          const itemDiscountAmount = getItemDiscountAmount(item);

          return {
            name: item.name,
            quantity: item.quantity,
            rate: basePrice, // Original rate before discount
            finalRate: finalPrice, // Rate after item discount
            discountPercent: item.discount || 0, // Item discount percentage
            discountAmount: itemDiscountAmount, // Item discount amount
            total: itemTotal, // Final total for this item
          };
        });

        await insertBill(
          selectedCustomer.id,
          customerName,
          billType,
          billingDate.toISOString().split('T')[0],
          finalAmount,
          cartItems,
          billDiscount ? parseFloat(billDiscount) : 0, // Bill discount percentage
          subtotal, // Subtotal before any discounts
          totalItemDiscount, // Total item discount amount
          billDiscountAmount, // Bill discount amount
        );

        await updateCustomerPurchases(selectedCustomer.id, finalAmount);
      }

      console.log('Bill Generated:', {
        customerId: selectedCustomer.id,
        customerName,
        billType,
        billingDate,
        cart: cart.map((item) => ({
          ...item,
          baseRate: item.customRate || item.sellPrice,
          finalRate: item.discountedPrice || item.customRate || item.sellPrice,
          discount: item.discount,
          itemTotal: getItemTotal(item),
          itemDiscountAmount: getItemDiscountAmount(item),
        })),
        subtotal: subtotal,
        itemDiscount: totalItemDiscount,
        billDiscount: billDiscount,
        billDiscountAmount: billDiscountAmount,
        final: finalAmount,
      });

      const discountSummary = [];
      if (totalItemDiscount > 0) {
        discountSummary.push(`Item Discount: ₹${totalItemDiscount.toFixed(2)}`);
      }
      if (billDiscount && parseFloat(billDiscount) > 0) {
        discountSummary.push(
          `Bill Discount: ${billDiscount}% (₹${billDiscountAmount.toFixed(2)})`,
        );
      }

      Alert.alert(
        'Success',
        `Bill generated successfully!\n\nCustomer: ${customerName}\nSubtotal: ₹${subtotal.toFixed(2)}\n${discountSummary.join('\n')}\nFinal Amount: ₹${finalAmount.toFixed(2)}`,
      );

      // Reset form and reload
      setCustomerName('');
      setCart([]);
      setShowCustomerDropdown(false);
      setSelectedCustomer(null);
      setEditableRates({});
      setItemDiscounts({});
      setBillDiscount('');
      setLastPurchaseAmount(0);

      await loadProducts();
    } catch (error) {
      console.error('Error generating bill:', error);
      Alert.alert('Error', 'Failed to generate bill');
    }
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setBillingDate(selectedDate);
  };

  // Render customer item for the dropdown
  const renderCustomerItem = (customer: Customer) => (
    <TouchableOpacity
      key={customer.id.toString()}
      style={styles.customerItem}
      onPress={() => selectCustomer(customer)}
    >
      <View style={styles.customerIcon}>
        <User size={16} color="#2563EB" />
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
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      {/* Header - Fixed with proper top margin */}
      <LinearGradient
        colors={['#2563EB', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Wholesale POS</Text>
            <Text style={styles.headerSubtitle}>
              Professional Billing System
            </Text>
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
        {/* Database Status */}
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

          {/* Selected Customer Details */}
          {selectedCustomer && (
            <View style={styles.selectedCustomerInfo}>
              <Text style={styles.selectedCustomerLabel}>
                Selected Customer:
              </Text>
              <View style={styles.customerDetailRow}>
                <View style={styles.detailItem}>
                  <Phone size={16} color="#2563EB" />
                  <Text style={styles.detailText}>
                    {selectedCustomer.phone}
                  </Text>
                </View>
                {selectedCustomer.address &&
                  selectedCustomer.address !== 'Address not provided' && (
                    <View style={styles.detailItem}>
                      <MapPin size={16} color="#2563EB" />
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
                      const day = String(d.getDate()).padStart(2, '0');
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const year = d.getFullYear();
                      return `Last Purchase Date: ${day}-${month}-${year}`;
                    })()}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Customer Dropdown */}
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
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredCustomers.map(renderCustomerItem)}
                </ScrollView>
              ) : (
                <View style={styles.noCustomersContainer}>
                  <Text style={styles.noCustomersText}>No customers found</Text>
                  <Text style={styles.noCustomersSubtext}>
                    Try a different search term or add a new customer
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Rest of the component remains the same */}
        {/* Date & Search */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Billing Details</Text>
          <TouchableOpacity
            style={styles.datePicker}
            onPress={() => setShowDatePicker(true)}
          >
            <LinearGradient
              colors={['#8B5CF6', '#EC4899']}
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
            Categories ({categories.length - 1})
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryBadge,
                  selectedCategory === cat && styles.categorySelected,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategory === cat && styles.categoryTextSelected,
                  ]}
                >
                  {cat}
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
            <TouchableOpacity onPress={loadProducts}>
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
                  : 'No products available in database'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => {
              const cartItem = cart.find((i) => i.id === product.id);
              const quantity = cartItem ? cartItem.quantity : 0;
              const currentRate = editableRates[product.id] || '';
              const currentDiscount = itemDiscounts[product.id] || '';

              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <View style={styles.categoryStockRow}>
                      <Text style={styles.productCategory}>
                        {product.category}
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
                          value={currentRate}
                          onChangeText={(text) =>
                            updateWholesaleRate(product.id, text)
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
                          value={currentDiscount}
                          onChangeText={(text) =>
                            updateItemDiscount(product.id, text)
                          }
                          keyboardType="decimal-pad"
                          placeholder="0"
                          placeholderTextColor="#6B7280"
                        />
                      </View>
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

          {/* Bill Discount Section */}
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
                  onChangeText={(text) => {
                    const sanitized = text.replace(/[^0-9.]/g, '');
                    const parts = sanitized.split('.');
                    if (parts.length <= 2) {
                      setBillDiscount(sanitized);
                    }
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

                return (
                  <View key={item.id} style={styles.cartItem}>
                    <View style={styles.cartItemInfo}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemName}>
                        MRP : ₹{item.mrp.toFixed(2)}
                      </Text>
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

// Styles remain exactly the same as in your original code
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  headerTextContainer: {},
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refreshButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E0E7FF',
    marginTop: 2,
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
  content: { flex: 1, paddingHorizontal: 16 },
  section: { marginTop: 16, zIndex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  refreshText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '500',
  },
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
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  inputIcon: { marginRight: 8 },
  customerInput: {
    flex: 1,
    height: 40,
    color: '#111827',
    fontSize: 14,
  },
  billTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cashActive: { backgroundColor: '#10B981' },
  creditActive: { backgroundColor: '#F59E0B' },
  billTypeText: {
    color: '#FFF',
    marginLeft: 6,
    fontWeight: '600',
    fontSize: 12,
  },
  selectedCustomerInfo: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#2563EB',
  },
  selectedCustomerLabel: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginBottom: 8,
  },
  customerDetailRow: {
    flexDirection: 'column',
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#1E40AF',
    fontWeight: '500',
    flex: 1,
  },
  purchaseStats: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
  },
  purchaseStatsText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  statusBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  errorBanner: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  customerDropdown: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1001,
  },
  customerList: {
    maxHeight: 200,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
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
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  customerContactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerPhone: {
    fontSize: 12,
    color: '#6B7280',
  },
  purchaseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  purchaseText: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
  },
  customerAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 11,
    color: '#6B7280',
    flex: 1,
    lineHeight: 14,
  },
  lastPurchaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  lastPurchaseText: {
    fontSize: 10,
    color: '#6B7280',
    fontStyle: 'italic',
  },
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
  newCustomerInfo: {
    flex: 1,
  },
  newCustomerText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  newCustomerSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noCustomersContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noCustomersText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  noCustomersSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  dateTextContainer: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#6B7280' },
  dateText: { fontSize: 14, fontWeight: '500', color: '#111827' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, height: 40, color: '#111827' },
  categoryScroll: { flexDirection: 'row', gap: 8 },
  categoryBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categorySelected: { backgroundColor: '#2563EB' },
  categoryText: { color: '#374151', fontWeight: '500' },
  categoryTextSelected: { color: '#FFF' },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  categoryStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
  },
  productStock: {
    fontSize: 12,
    color: '#6B7280',
    marginRight: 60,
  },
  priceContainer: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
    flexWrap: 'wrap',
  },
  priceColumn: {},
  priceLabel: { fontSize: 10, color: '#6B7280', marginBottom: 4 },
  productMrp: { fontSize: 12, fontWeight: '600', color: '#111827' },
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
    backgroundColor: '#2563EB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  qtyInputContainer: {
    width: 50,
    height: 32,
  },
  qtyInput: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  qtyInputActive: {
    borderColor: '#2563EB',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
  },
  qtyLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '500',
    color: '#111827',
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
  billDiscountSection: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  billDiscountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  billDiscountTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  applyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  applyAllText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  billDiscountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  billDiscountInput: {
    flex: 1,
    height: 40,
    color: '#111827',
    fontSize: 14,
    fontWeight: '500',
  },
  percentSymbol: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyCart: { alignItems: 'center', marginTop: 24 },
  emptyCartIcon: { marginBottom: 12 },
  emptyCartText: { fontSize: 16, fontWeight: '600', color: '#6B7280' },
  emptyCartSubtext: { fontSize: 12, color: '#9CA3AF' },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  cartItemInfo: { flex: 1 },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  cartItemDetails: {
    marginBottom: 8,
  },
  cartPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cartBasePrice: {
    fontSize: 12,
    color: '#6B7280',
  },
  discountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  discountBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discountText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },
  finalPriceText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartQuantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartQuantityLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  cartQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cartQuantityButton: {
    width: 28,
    height: 28,
    backgroundColor: '#2563EB',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQuantityButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cartQtyInputContainer: {
    width: 40,
    height: 28,
  },
  cartQtyInput: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    textAlign: 'center',
    color: '#111827',
    backgroundColor: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    padding: 0,
  },
  cartTotalContainer: {
    marginLeft: 16,
  },
  cartItemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    minWidth: 60,
    textAlign: 'right',
  },
  removeItemBtn: {
    backgroundColor: '#EF4444',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  priceSummary: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 8,
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
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
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
    fontSize: 16,
    color: '#111827',
    fontWeight: '700',
  },
  finalTotalValue: {
    fontSize: 18,
    color: '#111827',
    fontWeight: '700',
  },
  cartTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cartTotalText: { fontSize: 16, fontWeight: '700', color: '#111827' },
  generateBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  rateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    minWidth: 70,
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  rateInputModified: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    fontWeight: '700',
    color: '#1E40AF',
  },
});
