import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit3,
  IndianRupee,
  Minus,
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
  Customer,
  deleteBill,
  getAllBills,
  getAllCustomers,
  getAllProducts,
  getBillWithItems,
  Product,
  updateBill,
  updateProductStock,
} from '../../lib/db';

// Define CartItem interface that extends Product
interface CartItem extends Product {
  quantity: number;
  customRate?: number;
  discount?: number;
  discountedPrice?: number;
  itemTotal?: number;
  discountAmount?: number;
}

export default function ViewBillsScreen() {
  const navigation = useNavigation();
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Edit form states
  const [customerName, setCustomerName] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [billingDate, setBillingDate] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billDiscount, setBillDiscount] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
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

  // Load bills on component mount
  useEffect(() => {
    loadBills();
    loadCustomersAndProducts();
  }, []);

  // Filter bills when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredBills(bills);
    } else {
      const filtered = bills.filter(
        (bill: Bill) =>
          bill.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.id.toString().includes(searchQuery) ||
          bill.billType.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredBills(filtered);
    }
  }, [searchQuery, bills]);

  // Filter products when search query changes
  useEffect(() => {
    if (productSearchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product: Product) =>
          product.name
            .toLowerCase()
            .includes(productSearchQuery.toLowerCase()) ||
          product.category
            .toLowerCase()
            .includes(productSearchQuery.toLowerCase()),
      );
      setFilteredProducts(filtered);
    }
  }, [productSearchQuery, products]);

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
        const product = products.find((p: Product) => p.name === item.itemName);
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
          ) || {
            id: Date.now() + Math.random(), // Temporary ID for unknown products
            name: item.itemName,
            mrp: 0,
            sellPrice: item.rate, // Use original rate as sell price
            purchasePrice: 0,
            stock: 0,
            unit: 'pcs',
            category: 'Unknown',
            minStock: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          return {
            ...product,
            quantity: item.quantity,
            customRate: item.rate, // Original rate
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
        if (item.discount !== undefined) {
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
          rate: basePrice, // Original rate before discount
          finalRate: finalPrice, // Rate after item discount
          discountPercent: discountPercent, // Item discount percentage
          discountAmount: itemDiscountAmount, // Item discount amount
          total: itemTotal, // Final total for this item
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

      Alert.alert('Success', 'Bill updated successfully');
      setShowEditModal(false);
      loadBills();
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

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2563EB" barStyle="light-content" />
        <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
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
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name, bill ID, or type..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Bills List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredBills.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No bills found' : 'No bills available'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search term'
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
                      <Calendar size={12} color="#6B7280" />
                      <Text style={styles.metaText}>
                        {formatDate(bill.billingDate)}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <CreditCard size={12} color="#6B7280" />
                      <Text style={styles.metaText}>{bill.billType}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <IndianRupee size={12} color="#6B7280" />
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
                    <Edit3 size={18} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBill(bill)}
                  >
                    <Trash2 size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bill Items Summary - Show ALL items */}
              {bill.items && bill.items.length > 0 && (
                <View style={styles.itemsSummary}>
                  <Text style={styles.itemsTitle}>
                    Items ({getTotalItems(bill)} items):
                  </Text>
                  {bill.items.map((item: BillItem, index: number) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.itemName}
                      </Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity} × ₹{item.finalRate.toFixed(2)}
                      </Text>
                      <Text style={styles.itemTotal}>
                        ₹{item.total.toFixed(2)}
                      </Text>
                    </View>
                  ))}
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
            colors={['#2563EB', '#1D4ED8']}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>
                Edit Bill #{selectedBill?.id}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowEditModal(false)}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Information</Text>
              <View style={styles.inputContainer}>
                <User size={20} color="#6B7280" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Customer Name"
                />
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <TextInput
                    style={styles.input}
                    value={billingDate}
                    onChangeText={setBillingDate}
                    placeholder="Billing Date (YYYY-MM-DD)"
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
                />
                <Text style={styles.percentSymbol}>%</Text>
              </View>
            </View>

            {/* Cart Items */}
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
                          Stock: {item.stock} {item.unit} | MRP: ₹{item.mrp} |
                          Rate: ₹{item.sellPrice}
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
                        <Text style={styles.discountInfoText}>
                          Discount Amount: -
                          {formatCurrency(getItemDiscountAmount(item))}
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
              <Text style={styles.updateButtonText}>
                {editLoading ? 'Updating...' : 'Update Bill'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add Item Modal */}
      <Modal
        visible={showAddItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddItemModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Add Items to Bill</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddItemModal(false)}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View style={styles.addItemModalContent}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#6B7280" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products by name or category..."
                placeholderTextColor="#9CA3AF"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
              />
            </View>

            {/* Products List */}
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.productItem}
                  onPress={() => addItemToCart(item)}
                >
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{item.name}</Text>
                    <Text style={styles.productDetails}>
                      {item.category} | Stock: {item.stock} {item.unit}
                    </Text>
                    <View style={styles.productPricing}>
                      <Text style={styles.productMrp}>MRP: ₹{item.mrp}</Text>
                      <Text style={styles.productSellPrice}>
                        Rate: ₹{item.sellPrice}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.addProductButton}>
                    <Plus size={20} color="#FFF" />
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No products found</Text>
                  <Text style={styles.emptyStateSubtext}>
                    {productSearchQuery
                      ? 'Try a different search term'
                      : 'No products available'}
                  </Text>
                </View>
              }
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
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    width: 32,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
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
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
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
    color: '#6B7280',
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  itemsSummary: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  itemDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginHorizontal: 8,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    minWidth: 60,
    textAlign: 'right',
  },
  discountSummary: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
    marginTop: 8,
  },
  discountText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
    marginBottom: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  addItemModalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
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
    backgroundColor: '#10B981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addItemButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  billTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  billDiscountInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  percentSymbol: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 4,
  },
  editCartItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemStock: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  removeItemBtn: {
    backgroundColor: '#EF4444',
    width: 24,
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  priceInputContainer: {
    flex: 1,
  },
  priceLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  rateInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    backgroundColor: '#FFF',
  },
  rateInputModified: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
    fontWeight: '700',
    color: '#1E40AF',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
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
    backgroundColor: '#2563EB',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
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
    borderTopColor: '#E2E8F0',
  },
  itemTotalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  itemTotalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  discountInfo: {
    marginTop: 4,
  },
  discountInfoText: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
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
  updateButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  updateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  updateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Add Item Modal Styles
  productItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  productPricing: {
    flexDirection: 'row',
    gap: 12,
  },
  productMrp: {
    fontSize: 12,
    color: '#6B7280',
  },
  productSellPrice: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  addProductButton: {
    backgroundColor: '#10B981',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
