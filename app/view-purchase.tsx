import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Edit3,
  Package,
  Plus,
  Search,
  Trash2,
  Truck,
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
  deletePurchaseBill,
  getAllCategories,
  getAllProducts,
  getAllPurchaseBills,
  getAllSuppliers,
  getPurchaseBillWithItems,
  PurchaseBill,
  PurchaseItem,
  Supplier,
  updateProductStock,
  updatePurchaseBill,
} from '../lib/db';

type FilterType = 'All' | 'Cash' | 'Credit';

export default function ViewPurchaseScreen() {
  const navigation = useNavigation();
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [filteredBills, setFilteredBills] = useState<PurchaseBill[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState<PurchaseBill | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Date filter states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isDateFilterActive, setIsDateFilterActive] = useState(false);

  // Edit form states
  const [supplierName, setSupplierName] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [billNo, setBillNo] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [date, setDate] = useState('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Add/Edit item form states
  const [itemForm, setItemForm] = useState({
    id: 0,
    name: '',
    mrp: '',
    purchasePrice: '',
    sellPrice: '',
    quantity: '',
    unit: 'pcs',
    categoryId: null as number | null,
  });
  const [showItemModal, setShowItemModal] = useState(false);
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  const units = ['pcs', 'unit', 'kg', 'g', 'ltr', 'box', 'packet', 'dozen'];

  useEffect(() => {
    loadPurchaseBills();
    loadSuppliers();
    loadCategories();
  }, []);

  useEffect(() => {
    filterBills();
  }, [searchQuery, purchaseBills, filterType, selectedDate]);

  const loadPurchaseBills = async () => {
    setLoading(true);
    try {
      const bills = await getAllPurchaseBills();
      const billsWithItems = await Promise.all(
        bills.map(async (bill) => {
          const fullBill = await getPurchaseBillWithItems(bill.id);
          return fullBill || bill;
        }),
      );
      setPurchaseBills(billsWithItems);
      setFilteredBills(billsWithItems);
    } catch (error) {
      console.error('Error loading purchase bills:', error);
      Alert.alert('Error', 'Failed to load purchase bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const supplierList = await getAllSuppliers();
      setSuppliers(supplierList);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const categoryList = await getAllCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const filterBills = () => {
    let filtered = [...purchaseBills];

    if (filterType !== 'All') {
      filtered = filtered.filter((bill) => bill.billType === filterType);
    }

    if (selectedDate && isDateFilterActive) {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter((bill) => {
        const billDate = bill.date.split('T')[0];
        return billDate === selectedDateString;
      });
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(
        (bill) =>
          bill.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.billNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bill.id.toString().includes(searchQuery),
      );
    }

    setFilteredBills(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPurchaseBills();
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

  const handleDeleteBill = (bill: PurchaseBill) => {
    Alert.alert(
      'Delete Purchase Bill',
      `Are you sure you want to delete purchase bill #${bill.billNo} from ${bill.supplierName}?\n\nThis will also reverse the stock updates.`,
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
      await deletePurchaseBill(billId);
      Alert.alert('Success', 'Purchase bill deleted successfully');
      loadPurchaseBills();
    } catch (error) {
      console.error('Error deleting purchase bill:', error);
      Alert.alert('Error', 'Failed to delete purchase bill');
    }
  };

  const handleEditBill = async (bill: PurchaseBill) => {
    try {
      setEditLoading(true);
      const completeBill = await getPurchaseBillWithItems(bill.id);
      if (!completeBill) {
        Alert.alert('Error', 'Could not load bill details');
        return;
      }

      setSelectedBill(completeBill);
      setSupplierName(completeBill.supplierName);
      setSupplierId(completeBill.supplierId);
      setBillNo(completeBill.billNo);
      setBillType(completeBill.billType);
      setDate(completeBill.date);
      setItems(completeBill.items || []);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading bill for edit:', error);
      Alert.alert('Error', 'Failed to load bill details');
    } finally {
      setEditLoading(false);
    }
  };

  const handleUpdateBill = async () => {
    if (!supplierName || !billNo || items.length === 0) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!supplierId) {
      Alert.alert('Error', 'Please select a valid supplier');
      return;
    }

    setEditLoading(true);
    try {
      const totalAmount = getTotalAmount();

      if (selectedBill?.items) {
        for (const oldItem of selectedBill.items) {
          const products = await getAllProducts();
          const product = products.find(
            (p) =>
              p.name === oldItem.name &&
              p.mrp === oldItem.mrp &&
              p.purchasePrice === oldItem.purchasePrice &&
              p.unit === oldItem.unit,
          );
          if (product) {
            const newStock = Math.max(0, product.stock - oldItem.quantity);
            await updateProductStock(product.id, newStock);
          }
        }
      }

      for (const newItem of items) {
        const products = await getAllProducts();
        const product = products.find(
          (p) =>
            p.name === newItem.name &&
            p.mrp === newItem.mrp &&
            p.purchasePrice === newItem.purchasePrice &&
            p.unit === newItem.unit,
        );
        if (product) {
          const newStock = product.stock + newItem.quantity;
          await updateProductStock(product.id, newStock);
        }
      }

      const updatedItems = items.map((item) => ({
        name: item.name,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        unit: item.unit,
        total: item.total,
        categoryId: item.categoryId || null,
      }));

      await updatePurchaseBill(
        selectedBill!.id,
        supplierName,
        supplierId,
        billNo,
        billType,
        date,
        totalAmount,
        updatedItems,
      );

      Alert.alert('Success', 'Purchase bill updated successfully');
      setShowEditModal(false);
      loadPurchaseBills();
    } catch (error) {
      console.error('Error updating purchase bill:', error);
      Alert.alert('Error', 'Failed to update purchase bill');
    } finally {
      setEditLoading(false);
    }
  };

  const addItem = () => {
    if (
      !itemForm.name ||
      !itemForm.mrp ||
      !itemForm.purchasePrice ||
      !itemForm.sellPrice ||
      !itemForm.quantity
    ) {
      Alert.alert('Error', 'Please fill all item fields');
      return;
    }

    const total =
      parseFloat(itemForm.sellPrice) * parseFloat(itemForm.quantity);

    if (isEditingItem && itemForm.id) {
      const updatedItems = items.map((item) =>
        item.id === itemForm.id
          ? {
              ...item,
              name: itemForm.name,
              mrp: parseFloat(itemForm.mrp),
              purchasePrice: parseFloat(itemForm.purchasePrice),
              sellPrice: parseFloat(itemForm.sellPrice),
              quantity: parseFloat(itemForm.quantity),
              unit: itemForm.unit,
              categoryId: itemForm.categoryId,
              total,
            }
          : item,
      );
      setItems(updatedItems);
    } else {
      const newItem: PurchaseItem = {
        id: Date.now(),
        purchaseBillId: selectedBill?.id || 0,
        name: itemForm.name,
        mrp: parseFloat(itemForm.mrp),
        purchasePrice: parseFloat(itemForm.purchasePrice),
        sellPrice: parseFloat(itemForm.sellPrice),
        quantity: parseFloat(itemForm.quantity),
        unit: itemForm.unit,
        categoryId: itemForm.categoryId,
        total,
      };
      setItems([...items, newItem]);
    }

    resetItemForm();
  };

  const editItem = (item: PurchaseItem) => {
    setItemForm({
      id: item.id,
      name: item.name,
      mrp: item.mrp.toString(),
      purchasePrice: item.purchasePrice.toString(),
      sellPrice: item.sellPrice.toString(),
      quantity: item.quantity.toString(),
      unit: item.unit,
      categoryId: item.categoryId || null,
    });
    setIsEditingItem(true);
    setShowItemModal(true);
  };

  const deleteItem = (id: number) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setItems(items.filter((item) => item.id !== id)),
      },
    ]);
  };

  const resetItemForm = () => {
    setItemForm({
      id: 0,
      name: '',
      mrp: '',
      purchasePrice: '',
      sellPrice: '',
      quantity: '',
      unit: 'pcs',
      categoryId: null,
    });
    setIsEditingItem(false);
    setShowItemModal(false);
  };

  const getTotalAmount = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  const getTotalQuantity = (items: PurchaseItem[]) => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getCategoryName = (categoryId: number | null | undefined): string => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((cat) => cat.id === categoryId);
    return category?.name || 'Uncategorized';
  };

  const getFilterCount = () => {
    let filtered = [...purchaseBills];
    if (filterType !== 'All') {
      filtered = filtered.filter((bill) => bill.billType === filterType);
    }
    if (selectedDate && isDateFilterActive) {
      const selectedDateString = selectedDate.toISOString().split('T')[0];
      filtered = filtered.filter((bill) => {
        const billDate = bill.date.split('T')[0];
        return billDate === selectedDateString;
      });
    }
    return filtered.length;
  };

  const renderPurchaseBill = ({ item }: { item: PurchaseBill }) => (
    <View style={styles.billCard}>
      <View style={styles.billHeader}>
        <View style={styles.billInfo}>
          <Text style={styles.billNo}>Bill: {item.billNo}</Text>
          <View style={styles.supplierRow}>
            <Truck size={14} color="#64748B" />
            <Text style={styles.supplierName}>{item.supplierName}</Text>
          </View>
          <View style={styles.billMeta}>
            <View style={styles.metaItem}>
              <Calendar size={12} color="#64748B" />
              <Text style={styles.metaText}>{formatDate(item.date)}</Text>
            </View>
            <View style={styles.metaItem}>
              <CreditCard size={12} color="#64748B" />
              <Text
                style={[
                  styles.metaText,
                  item.billType === 'Cash'
                    ? styles.cashText
                    : styles.creditText,
                ]}
              >
                {item.billType}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Package size={12} color="#64748B" />
              <Text style={styles.metaText}>
                {getTotalQuantity(item.items || [])} items
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.billActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => handleEditBill(item)}
          >
            <Edit3 size={18} color="#3B82F6" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteBill(item)}
          >
            <Trash2 size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {item.items && item.items.length > 0 && (
        <View style={styles.itemsSummary}>
          <Text style={styles.itemsTitle}>Items ({item.items.length}):</Text>
          {item.items.slice(0, 3).map((billItem, index) => (
            <View key={index} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {billItem.name}
              </Text>
              <Text style={styles.itemDetails}>
                {billItem.quantity} {billItem.unit} × ₹{billItem.purchasePrice}
              </Text>
              <Text style={styles.itemTotal}>₹{billItem.total.toFixed(2)}</Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.moreItems}>
              +{item.items.length - 3} more items
            </Text>
          )}
        </View>
      )}

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalAmount}>₹{item.totalAmount.toFixed(2)}</Text>
      </View>
    </View>
  );

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
            <Text style={styles.headerTitle}>Purchase Bills</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading purchase bills...</Text>
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
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Purchase Bills</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {purchaseBills.length} Total Bills
              </Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {/* Date Filter Section */}
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
              All ({purchaseBills.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'Cash' && styles.filterButtonCashActive,
            ]}
            onPress={() => setFilterType('Cash')}
          >
            <CreditCard
              size={14}
              color={filterType === 'Cash' ? '#FFF' : '#10B981'}
            />
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'Cash' && styles.filterButtonTextActive,
              ]}
            >
              Cash ({purchaseBills.filter((b) => b.billType === 'Cash').length})
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
              {purchaseBills.filter((b) => b.billType === 'Credit').length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by supplier name, bill number..."
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
      <FlatList
        data={filteredBills}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderPurchaseBill}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#3B82F6']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package size={48} color="#94A3B8" />
            <Text style={styles.emptyStateText}>
              {searchQuery || filterType !== 'All' || isDateFilterActive
                ? 'No purchase bills found'
                : 'No purchase bills available'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search term'
                : filterType !== 'All'
                  ? `No ${filterType} purchase bills available`
                  : isDateFilterActive
                    ? `No purchase bills found on ${formatDateForDisplay(selectedDate)}`
                    : 'Purchase bills will appear here'}
            </Text>
          </View>
        }
      />

      {/* Edit Bill Modal with U-Shaped Top Bar */}
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
                  Edit Purchase Bill #{selectedBill?.billNo}
                </Text>
              </View>
              <View style={styles.modalHeaderRight} />
            </View>
            <View style={styles.editModalStats}>
              <View style={styles.editStatItem}>
                <Text style={styles.editStatValue}>{items.length}</Text>
                <Text style={styles.editStatLabel}>Items in Bill</Text>
              </View>
              <View style={styles.editStatDivider} />
              <View style={styles.editStatItem}>
                <Text style={styles.editStatValue}>
                  {formatCurrency(getTotalAmount())}
                </Text>
                <Text style={styles.editStatLabel}>Total Amount</Text>
              </View>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            {/* Bill Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill Information</Text>

              <View style={styles.inputContainer}>
                <Truck size={20} color="#64748B" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={supplierName}
                  onChangeText={setSupplierName}
                  placeholder="Supplier Name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={billNo}
                  onChangeText={setBillNo}
                  placeholder="Bill Number"
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
                    value={date}
                    onChangeText={setDate}
                    placeholder="Date (YYYY-MM-DD)"
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
                  <CreditCard size={16} color="#FFF" />
                  <Text style={styles.billTypeText}>{billType}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Items Section */}
            <View style={styles.section}>
              <View style={styles.cartHeader}>
                <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                <TouchableOpacity
                  style={styles.addItemButton}
                  onPress={() => {
                    resetItemForm();
                    setShowItemModal(true);
                  }}
                >
                  <Plus size={20} color="#FFF" />
                  <Text style={styles.addItemButtonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <View style={styles.itemHeader}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemNameText}>{item.name}</Text>
                      <Text style={styles.itemUnit}>{item.unit}</Text>
                      {item.categoryId && (
                        <View style={styles.categoryBadge}>
                          <Text style={styles.categoryBadgeText}>
                            {getCategoryName(item.categoryId)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.itemActionsList}>
                      <TouchableOpacity
                        onPress={() => editItem(item)}
                        style={styles.editItemButton}
                      >
                        <Edit3 size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => deleteItem(item.id)}
                        style={styles.deleteItemButton}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.itemDetailsGrid}>
                    <View style={styles.itemDetailItem}>
                      <Text style={styles.itemDetailLabel}>MRP</Text>
                      <Text style={styles.itemDetailValue}>
                        ₹{item.mrp.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemDetailItem}>
                      <Text style={styles.itemDetailLabel}>Purchase</Text>
                      <Text style={styles.itemDetailValue}>
                        ₹{item.purchasePrice.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemDetailItem}>
                      <Text style={styles.itemDetailLabel}>Selling</Text>
                      <Text style={styles.itemDetailValue}>
                        ₹{item.sellPrice.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.itemDetailItem}>
                      <Text style={styles.itemDetailLabel}>Qty</Text>
                      <Text style={styles.itemDetailValue}>
                        {item.quantity} {item.unit}
                      </Text>
                    </View>
                    <View style={styles.itemDetailItem}>
                      <Text style={styles.itemDetailLabel}>Total</Text>
                      <Text style={styles.itemDetailValue}>
                        ₹{item.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}

              {items.length === 0 && (
                <View style={styles.emptyItems}>
                  <Package size={40} color="#94A3B8" />
                  <Text style={styles.emptyItemsText}>No items added</Text>
                  <Text style={styles.emptyItemsSubtext}>
                    Click "Add Item" to add products
                  </Text>
                </View>
              )}
            </View>

            {/* Total Amount */}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Bill Amount:</Text>
              <Text style={styles.totalValue}>
                ₹{getTotalAmount().toFixed(2)}
              </Text>
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
                  {editLoading ? 'Updating...' : 'Update Purchase Bill'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Add/Edit Item Modal */}
      <Modal
        visible={showItemModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => resetItemForm()}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.itemModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.itemModalHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.itemModalTitle}>
                {isEditingItem ? 'Edit Item' : 'Add New Item'}
              </Text>
              <TouchableOpacity
                onPress={resetItemForm}
                style={styles.modalCloseButton}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.itemModalBody}>
              <View style={styles.itemFormGroup}>
                <Text style={styles.itemLabel}>Item Name *</Text>
                <TextInput
                  style={styles.itemInput}
                  value={itemForm.name}
                  onChangeText={(text) =>
                    setItemForm({ ...itemForm, name: text })
                  }
                  placeholder="Enter item name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.itemFormRow}>
                <View style={[styles.itemFormGroup, { flex: 1 }]}>
                  <Text style={styles.itemLabel}>Unit</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={itemForm.unit}
                      onValueChange={(value) =>
                        setItemForm({ ...itemForm, unit: value })
                      }
                      style={styles.picker}
                    >
                      {units.map((u) => (
                        <Picker.Item
                          key={u}
                          label={u.toUpperCase()}
                          value={u}
                        />
                      ))}
                    </Picker>
                  </View>
                </View>

                <View style={[styles.itemFormGroup, { flex: 1 }]}>
                  <Text style={styles.itemLabel}>Quantity *</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={itemForm.quantity}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, quantity: text })
                    }
                    placeholder="0"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.itemFormRow}>
                <View style={[styles.itemFormGroup, { flex: 1 }]}>
                  <Text style={styles.itemLabel}>MRP *</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={itemForm.mrp}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, mrp: text })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.itemFormGroup, { flex: 1 }]}>
                  <Text style={styles.itemLabel}>Purchase Price *</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={itemForm.purchasePrice}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, purchasePrice: text })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.itemFormGroup, { flex: 1 }]}>
                  <Text style={styles.itemLabel}>Selling Price *</Text>
                  <TextInput
                    style={styles.itemInput}
                    value={itemForm.sellPrice}
                    onChangeText={(text) =>
                      setItemForm({ ...itemForm, sellPrice: text })
                    }
                    placeholder="0.00"
                    placeholderTextColor="#94A3B8"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.itemFormGroup}>
                <Text style={styles.itemLabel}>Category</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={
                      itemForm.categoryId ? itemForm.categoryId.toString() : ''
                    }
                    onValueChange={(value) => {
                      setItemForm({
                        ...itemForm,
                        categoryId: value ? parseInt(value) : null,
                      });
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Select Category" value="" />
                    {categories.map((cat) => (
                      <Picker.Item
                        key={cat.id}
                        label={cat.name}
                        value={cat.id.toString()}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              <TouchableOpacity style={styles.saveItemButton} onPress={addItem}>
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.saveItemButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.saveItemButtonText}>
                    {isEditingItem ? 'Update Item' : 'Add Item'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
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
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 48,
  },
  dateFilterSection: {
    backgroundColor: '#FFFFFF',
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
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
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    gap: 6,
  },
  clearDateText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  billCard: {
    backgroundColor: '#FFFFFF',
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
  billNo: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  supplierName: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
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
  },
  itemName: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  itemDetails: {
    fontSize: 12,
    color: '#64748B',
    marginHorizontal: 8,
  },
  itemTotal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    minWidth: 60,
    textAlign: 'right',
  },
  moreItems: {
    fontSize: 11,
    color: '#3B82F6',
    marginTop: 4,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
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
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
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
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
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
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  itemUnit: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '500',
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '600',
  },
  itemActionsList: {
    flexDirection: 'row',
    gap: 6,
  },
  editItemButton: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  deleteItemButton: {
    padding: 6,
    backgroundColor: '#FEF2F2',
    borderRadius: 6,
  },
  itemDetailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemDetailItem: {
    flex: 1,
    minWidth: 70,
  },
  itemDetailLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  itemDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  emptyItems: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyItemsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyItemsSubtext: {
    fontSize: 12,
    color: '#94A3B8',
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: 14,
    marginBottom: 24,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10B981',
  },
  updateButton: {
    marginBottom: 32,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  itemModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  itemModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  modalCloseButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  itemModalBody: {
    padding: 20,
  },
  itemFormGroup: {
    marginBottom: 16,
  },
  itemFormRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  itemLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  itemInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    color: '#0F172A',
  },
  saveItemButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveItemButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveItemButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },

  // Edit Modal U-Shaped Styles
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
});
