import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Category,
  checkBillNoExists,
  getAllCategories,
  getAllSuppliers,
  insertPurchaseBill,
  searchSuppliersByName,
  updatePurchaseBill,
} from '../../lib/db';

interface Supplier {
  id: number;
  name: string;
  type: 'supplier';
  phone?: string;
  email?: string;
  address?: string;
}

interface PurchaseItem {
  id: string;
  name: string;
  mrp: number;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  category: string;
  total: number;
}

const { width, height } = Dimensions.get('window');

export default function PurchaseScreen() {
  const params = useLocalSearchParams();
  
  // Debug the received params
  console.log('📨 Received params in PurchaseScreen:', params);
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [editBillId, setEditBillId] = useState<number | null>(null);
  const [supplier, setSupplier] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [billNo, setBillNo] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sticky header animation
  const [scrollY] = useState(new Animated.Value(0));
  const [isStickyVisible, setIsStickyVisible] = useState(false);

  // Supplier search states
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Category states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [categorySearch, setCategorySearch] = useState('');
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);
  const [categoryFadeAnim] = useState(new Animated.Value(0));

  // Initialize with empty category
  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    mrp: '',
    purchasePrice: '',
    sellPrice: '',
    quantity: '',
    unit: 'pcs',
    category: '',
  });

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const units = ['pcs', 'unit', 'har', 'box', 'kg', 'g', 'ltr', 'packet'];

  // FIXED: Load all suppliers and categories with proper dependencies
  const loadAllSuppliers = useCallback(async () => {
    try {
      setIsLoadingSuppliers(true);
      const allSuppliers = await getAllSuppliers();
      setSuppliers(allSuppliers);
      setFilteredSuppliers(allSuppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
      Alert.alert('Error', 'Failed to load suppliers');
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, []);

  const loadAllCategories = useCallback(async () => {
    try {
      setIsLoadingCategories(true);
      const categoriesData = await getAllCategories();
      setCategories(categoriesData);
      setFilteredCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setIsLoadingCategories(false);
    }
  }, []);

  // Function to load edit data - properly memoized
  const loadEditData = useCallback(() => {
    try {
      console.log('📥 Loading edit data from params...');
      
      if (params.editBillId) {
        setEditBillId(Number(params.editBillId));
        console.log('📋 Edit Bill ID:', params.editBillId);
      }
      
      if (params.billNo) {
        setBillNo(params.billNo as string);
        console.log('📋 Bill No:', params.billNo);
      }
      
      if (params.supplierId && params.supplierName) {
        const supplierData = {
          id: Number(params.supplierId),
          name: params.supplierName as string,
          type: 'supplier' as const
        };
        setSelectedSupplier(supplierData);
        setSupplier(params.supplierName as string);
        console.log('👥 Supplier:', supplierData);
      }
      
      if (params.billType) {
        setBillType(params.billType as 'Cash' | 'Credit');
        console.log('💰 Bill Type:', params.billType);
      }
      
      if (params.date) {
        const newDate = new Date(params.date as string);
        setDate(newDate);
        console.log('📅 Date:', params.date, newDate);
      }
      
      // Load items data
      if (params.itemsData) {
        try {
          const parsedItems = JSON.parse(params.itemsData as string);
          console.log('📦 Parsed items data:', parsedItems);
          
          const formattedItems: PurchaseItem[] = parsedItems.map((item: any, index: number) => ({
            id: `edit-${index}-${Date.now()}`,
            name: item.name,
            mrp: item.mrp,
            purchasePrice: item.purchasePrice,
            sellPrice: item.sellPrice,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            total: item.total
          }));
          
          setItems(formattedItems);
          console.log('✅ Items loaded:', formattedItems.length);
        } catch (error) {
          console.error('❌ Error parsing items data:', error);
          Alert.alert('Error', 'Failed to load items data for editing');
        }
      }
    } catch (error) {
      console.error('❌ Error loading edit data:', error);
      Alert.alert('Error', 'Failed to load bill data for editing');
    }
  }, [params]);

  // FIXED: Load data on component mount with proper dependencies
  useEffect(() => {
    loadAllSuppliers();
    loadAllCategories();
    
    // Check if we're in edit mode
    if (params.editMode === 'true') {
      console.log('🎯 EDIT MODE DETECTED');
      setIsEditMode(true);
      loadEditData();
    }
  }, []); // Empty dependency array - only run once on mount

  // FIXED: Animation effects with stable dependencies
  useEffect(() => {
    if (showSupplierDropdown) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showSupplierDropdown, fadeAnim]);

  useEffect(() => {
    if (showCategoryDropdown) {
      Animated.timing(categoryFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      categoryFadeAnim.setValue(0);
    }
  }, [showCategoryDropdown, categoryFadeAnim]);

  const handleCategorySearch = useCallback((text: string) => {
    setCategorySearch(text);
    if (text.length === 0) {
      setFilteredCategories(categories);
      return;
    }

    const filtered = categories.filter((category) =>
      category.name.toLowerCase().includes(text.toLowerCase()),
    );
    setFilteredCategories(filtered);
  }, [categories]);

  const handleSupplierSearch = useCallback(async (text: string) => {
    setSupplier(text);

    if (text.length === 0) {
      setFilteredSuppliers(suppliers);
      return;
    }

    try {
      setIsLoadingSuppliers(true);
      const searchResults = await searchSuppliersByName(text);
      setFilteredSuppliers(searchResults);
    } catch (error) {
      console.error('Error searching suppliers:', error);
      const localResults = suppliers.filter((s) =>
        s.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredSuppliers(localResults);
    } finally {
      setIsLoadingSuppliers(false);
    }
  }, [suppliers]);

  const handleSupplierSelect = useCallback((selectedSupplier: Supplier) => {
    setSelectedSupplier(selectedSupplier);
    setSupplier(selectedSupplier.name);
    setShowSupplierDropdown(false);
  }, []);

  const clearSupplier = useCallback(() => {
    setSelectedSupplier(null);
    setSupplier('');
    setFilteredSuppliers(suppliers);
  }, [suppliers]);

  const openSupplierDropdown = useCallback(() => {
    setShowSupplierDropdown(true);
    setFilteredSuppliers(suppliers);
  }, [suppliers]);

  const closeSupplierDropdown = useCallback(() => {
    setShowSupplierDropdown(false);
  }, []);

  const handleCategorySelect = useCallback((categoryName: string) => {
    setItemForm(prev => ({ ...prev, category: categoryName }));
    setShowCategoryDropdown(false);
    setCategorySearch('');
    setFilteredCategories(categories);
  }, [categories]);

  const openCategoryDropdown = useCallback(() => {
    setShowCategoryDropdown(true);
    setCategorySearch('');
    setFilteredCategories(categories);
  }, [categories]);

  const closeCategoryDropdown = useCallback(() => {
    setShowCategoryDropdown(false);
    setCategorySearch('');
    setFilteredCategories(categories);
  }, [categories]);

  const clearCategory = useCallback(() => {
    setItemForm(prev => ({ ...prev, category: '' }));
  }, []);

  // FIXED: Enhanced addItem function with newQuantity error resolved
  const addItem = useCallback(() => {
    if (
      !itemForm.name ||
      !itemForm.mrp ||
      !itemForm.purchasePrice ||
      !itemForm.sellPrice ||
      !itemForm.quantity ||
      !itemForm.category
    ) {
      Alert.alert('Error', 'Please fill all fields including category');
      return;
    }

    // Validate numeric fields
    const mrp = parseFloat(itemForm.mrp);
    const purchasePrice = parseFloat(itemForm.purchasePrice);
    const sellPrice = parseFloat(itemForm.sellPrice);
    const quantity = parseFloat(itemForm.quantity);

    if (
      isNaN(mrp) ||
      isNaN(purchasePrice) ||
      isNaN(sellPrice) ||
      isNaN(quantity)
    ) {
      Alert.alert(
        'Error',
        'Please enter valid numbers for price and quantity fields',
      );
      return;
    }

    if (mrp <= 0 || purchasePrice <= 0 || sellPrice <= 0 || quantity <= 0) {
      Alert.alert('Error', 'Prices and quantity must be greater than 0');
      return;
    }

    const total = purchasePrice * quantity;

    if (itemForm.id) {
      // Edit existing item
      setItems(prevItems => prevItems.map((item) =>
        item.id === itemForm.id
          ? {
              ...item,
              name: itemForm.name,
              mrp: mrp,
              purchasePrice: purchasePrice,
              sellPrice: sellPrice,
              quantity: quantity,
              unit: itemForm.unit,
              category: itemForm.category,
              total,
            }
          : item,
      ));
    } else {
      // Check if item already exists with same name, category, mrp, and purchase price
      const existingItemIndex = items.findIndex(
        (item) =>
          item.name.toLowerCase() === itemForm.name.toLowerCase() &&
          item.category.toLowerCase() === itemForm.category.toLowerCase() &&
          item.mrp === mrp &&
          item.purchasePrice === purchasePrice,
      );

      if (existingItemIndex !== -1) {
        // Item exists, update quantity and total
        const existingItem = items[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;
        const newTotal = existingItem.purchasePrice * newQuantity;

        setItems(prevItems => {
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
            total: newTotal,
          };
          return updatedItems;
        });

        // Show success message - now newQuantity is accessible
        Alert.alert(
          'Item Updated',
          `Quantity updated for "${itemForm.name}"\nNew quantity: ${newQuantity} ${itemForm.unit}`,
          [{ text: 'OK' }],
        );
      } else {
        // Add new item
        const newItem: PurchaseItem = {
          id: Date.now().toString(),
          name: itemForm.name,
          mrp: mrp,
          purchasePrice: purchasePrice,
          sellPrice: sellPrice,
          quantity: quantity,
          unit: itemForm.unit,
          category: itemForm.category,
          total,
        };
        setItems(prevItems => [...prevItems, newItem]);
      }
    }

    // Reset form
    setItemForm({
      id: '',
      name: '',
      mrp: '',
      purchasePrice: '',
      sellPrice: '',
      quantity: '',
      unit: 'pcs',
      category: '',
    });
  }, [itemForm, items]);

  const editItem = useCallback((item: PurchaseItem) => {
    setItemForm({
      id: item.id,
      name: item.name,
      mrp: item.mrp.toString(),
      purchasePrice: item.purchasePrice.toString(),
      sellPrice: item.sellPrice.toString(),
      quantity: item.quantity.toString(),
      unit: item.unit,
      category: item.category,
    });
  }, []);

  const deleteItem = useCallback((id: string) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setItems(prevItems => prevItems.filter((item) => item.id !== id)),
      },
    ]);
  }, []);

  const getTotalBillAmount = useCallback(() => {
    return items.reduce((sum, item) => sum + item.total, 0);
  }, [items]);

  const getTotalItems = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const resetForm = useCallback(() => {
    setSelectedSupplier(null);
    setSupplier('');
    setBillNo('');
    setDate(new Date());
    setBillType('Cash');
    setItems([]);
    setItemForm({
      id: '',
      name: '',
      mrp: '',
      purchasePrice: '',
      sellPrice: '',
      quantity: '',
      unit: 'pcs',
      category: '',
    });
    setIsEditMode(false);
    setEditBillId(null);
  }, []);

  const saveBill = useCallback(async () => {
    if (!selectedSupplier || !billNo || !date || items.length === 0) {
      Alert.alert(
        'Error',
        'Please select a supplier, fill all bill details and add at least one item',
      );
      return;
    }

    // Check if bill number already exists (only for new bills)
    if (!isEditMode) {
      try {
        const billExists = await checkBillNoExists(billNo.trim());
        if (billExists) {
          Alert.alert(
            'Error',
            'Bill number already exists. Please use a different bill number.',
          );
          return;
        }
      } catch (error) {
        console.error('Error checking bill number:', error);
      }
    }

    setIsSaving(true);

    try {
      if (isEditMode && editBillId) {
        // Update existing bill
        console.log('🔄 Updating purchase bill:', editBillId);
        await updatePurchaseBill(
          editBillId,
          selectedSupplier.id,
          selectedSupplier.name,
          billNo.trim(),
          billType,
          date.toISOString().split('T')[0],
          getTotalBillAmount(),
          items.map((item) => ({
            name: item.name,
            mrp: item.mrp,
            purchasePrice: item.purchasePrice,
            sellPrice: item.sellPrice,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            total: item.total,
          })),
        );

        Alert.alert(
          'Success',
          `Purchase bill #${billNo} updated successfully!\n\nTotal Amount: ₹${getTotalBillAmount().toFixed(2)}\n\nInventory has been updated automatically.`,
          [
            {
              text: 'OK',
              onPress: () => resetForm(),
            },
          ],
        );
      } else {
        // Create new bill
        const billId = await insertPurchaseBill(
          selectedSupplier.id,
          selectedSupplier.name,
          billNo.trim(),
          billType,
          date.toISOString().split('T')[0],
          getTotalBillAmount(),
          items.map((item) => ({
            name: item.name,
            mrp: item.mrp,
            purchasePrice: item.purchasePrice,
            sellPrice: item.sellPrice,
            quantity: item.quantity,
            unit: item.unit,
            category: item.category,
            total: item.total,
          })),
        );

        Alert.alert(
          'Success',
          `Purchase bill #${billNo} saved successfully!\n\nTotal Amount: ₹${getTotalBillAmount().toFixed(2)}\n\nInventory has been updated automatically.`,
          [
            {
              text: 'OK',
              onPress: () => resetForm(),
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error saving purchase bill:', error);
      Alert.alert('Error', 'Failed to save purchase bill. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [selectedSupplier, billNo, date, items, isEditMode, editBillId, billType, getTotalBillAmount, resetForm]);

  const onChangeDate = useCallback((event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  }, [date]);

  const handleScroll = useCallback((event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    scrollY.setValue(offsetY);

    // Show sticky header when scrolled past the main header
    if (offsetY > 120) {
      setIsStickyVisible(true);
    } else {
      setIsStickyVisible(false);
    }
  }, [scrollY]);

  const renderSupplierItem = useCallback(({ item, index }: { item: Supplier; index: number }) => (
    <TouchableOpacity
      style={[
        styles.supplierItem,
        index % 2 === 0 ? styles.supplierItemEven : styles.supplierItemOdd,
      ]}
      onPress={() => handleSupplierSelect(item)}
    >
      <View style={styles.supplierAvatar}>
        <Text style={styles.supplierAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.supplierInfo}>
        <Text style={styles.supplierName}>{item.name}</Text>
        <Text style={styles.supplierType}>{item.type}</Text>
      </View>
      <View style={styles.selectIndicator}>
        <Text style={styles.selectIndicatorText}>→</Text>
      </View>
    </TouchableOpacity>
  ), [handleSupplierSelect]);

  // Fixed Category Box Item - Direct category names in a box layout
  const renderCategoryItem = useCallback(({ item, index }: { item: Category; index: number }) => (
    <TouchableOpacity
      style={styles.categoryBoxItem}
      onPress={() => handleCategorySelect(item.name)}
    >
      <View style={styles.categoryBoxContent}>
        <View style={styles.categoryBoxIcon}>
          <Text style={styles.categoryBoxIconText}>
            {item.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.categoryBoxName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  ), [handleCategorySelect]);

  const renderItem = useCallback((item: PurchaseItem, index: number) => (
    <View style={styles.itemCard} key={item.id}>
      <View style={styles.itemHeader}>
        <View style={styles.itemIndexBadge}>
          <Text style={styles.itemIndex}>#{index + 1}</Text>
        </View>
        <View style={styles.itemTitleContainer}>
          <Text style={styles.itemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>{item.category}</Text>
          </View>
        </View>
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>MRP</Text>
            <Text style={styles.detailValue}>₹{item.mrp.toFixed(2)}</Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Purchase</Text>
            <Text style={styles.detailValue}>
              ₹{item.purchasePrice.toFixed(2)}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Selling</Text>
            <Text style={styles.detailValue}>₹{item.sellPrice.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <View style={styles.detailColumn}>
            <Text style={styles.detailLabel}>Total</Text>
            <Text style={[styles.detailValue, styles.totalText]}>
              ₹{item.total.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.itemActions}>
        <TouchableOpacity
          onPress={() => editItem(item)}
          style={[styles.actionButton, styles.editButton]}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteItem(item.id)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  ), [editItem, deleteItem]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Sticky Header */}
      {isStickyVisible && (
        <Animated.View
          style={[
            styles.stickyHeader,
            {
              opacity: scrollY.interpolate({
                inputRange: [120, 140],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  translateY: scrollY.interpolate({
                    inputRange: [120, 140],
                    outputRange: [-20, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.stickyHeaderContent}>
            <View style={styles.stickyHeaderInfo}>
              <Text style={styles.stickyTitle}>
                {isEditMode ? 'Edit Purchase Bill' : 'Purchase Bill'}
              </Text>
              {selectedSupplier && (
                <Text style={styles.stickySupplier}>
                  {selectedSupplier.name}
                </Text>
              )}
            </View>
            <View style={styles.stickyStats}>
              <View style={styles.stickyStatItem}>
                <Text style={styles.stickyStatValue}>{items.length}</Text>
                <Text style={styles.stickyStatLabel}>Items</Text>
              </View>
              <View style={styles.stickyStatItem}>
                <Text style={styles.stickyStatValue}>{getTotalItems()}</Text>
                <Text style={styles.stickyStatLabel}>Qty</Text>
              </View>
              <View style={styles.stickyStatItem}>
                <Text style={styles.stickyStatValue}>
                  ₹{getTotalBillAmount().toFixed(0)}
                </Text>
                <Text style={styles.stickyStatLabel}>Total</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Enhanced Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>
              {isEditMode ? 'Edit Purchase Bill' : 'Purchase Management'}
            </Text>
            <Text style={styles.subtitle}>
              {isEditMode 
                ? `Editing bill #${billNo} - ${selectedSupplier?.name || ''}` 
                : 'Create and manage purchase bills'
              }
            </Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{items.length}</Text>
              <Text style={styles.statLabel}>Items</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{getTotalItems()}</Text>
              <Text style={styles.statLabel}>Qty</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                ₹{getTotalBillAmount().toFixed(2)}
              </Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        {/* Bill Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardIcon}>
                {isEditMode ? '✏️' : '📋'}
              </Text>
              <Text style={styles.cardTitle}>
                {isEditMode ? 'Edit Bill Information' : 'Bill Information'}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                billType === 'Cash' ? styles.cashBadge : styles.creditBadge,
              ]}
            >
              <Text style={styles.statusText}>{billType}</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 2 }]}>
              <Text style={styles.label}>Supplier Name *</Text>
              <TouchableOpacity
                style={styles.supplierInputContainer}
                onPress={openSupplierDropdown}
                activeOpacity={0.7}
              >
                <View pointerEvents="none">
                  <TextInput
                    style={[
                      styles.supplierInput,
                      selectedSupplier && styles.selectedSupplierInput,
                    ]}
                    value={supplier}
                    onChangeText={handleSupplierSearch}
                    placeholder="Tap to select supplier"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                {supplier ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearSupplier}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dropdownButton}>
                    <Text style={styles.dropdownButtonText}>▼</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill No *</Text>
              <TextInput
                style={styles.input}
                value={billNo}
                onChangeText={setBillNo}
                placeholder="Enter bill no"
                placeholderTextColor="#94A3B8"
                editable={!isEditMode}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill Type</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={billType}
                  onValueChange={(value) => setBillType(value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Credit" value="Credit" />
                </Picker>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  <Text style={styles.dateIcon}>📅</Text> {date.toDateString()}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onChangeDate}
                />
              )}
            </View>
          </View>
        </View>

        {/* Supplier Dropdown Modal */}
        <Modal
          visible={showSupplierDropdown}
          transparent
          animationType="fade"
          onRequestClose={closeSupplierDropdown}
        >
          <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeSupplierDropdown}
            >
              <View style={styles.modalContent}>
                <Animated.View
                  style={[
                    styles.dropdownContainer,
                    {
                      transform: [
                        {
                          translateY: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.dropdownHeader}>
                    <View style={styles.dropdownTitleContainer}>
                      <Text style={styles.dropdownIcon}>👥</Text>
                      <View>
                        <Text style={styles.dropdownTitle}>
                          Select Supplier
                        </Text>
                        <Text style={styles.dropdownSubtitle}>
                          {filteredSuppliers.length} suppliers found
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={closeSupplierDropdown}
                      style={styles.closeButton}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.searchContainer}>
                    <Text style={styles.searchIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search suppliers..."
                      placeholderTextColor="#94A3B8"
                      value={supplier}
                      onChangeText={handleSupplierSearch}
                      autoFocus
                    />
                  </View>

                  {isLoadingSuppliers ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color="#2563EB" />
                      <Text style={styles.loadingText}>
                        Loading suppliers...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredSuppliers}
                      renderItem={renderSupplierItem}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.supplierList}
                      showsVerticalScrollIndicator={false}
                      ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                          <Text style={styles.emptyIcon}>👥</Text>
                          <Text style={styles.emptyText}>
                            No suppliers found
                          </Text>
                          <Text style={styles.emptySubtext}>
                            Try searching with different keywords
                          </Text>
                        </View>
                      }
                    />
                  )}
                </Animated.View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Modal>

        {/* Add Item Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Text style={styles.cardIcon}>{itemForm.id ? '✏️' : '➕'}</Text>
              <Text style={styles.cardTitle}>
                {itemForm.id ? 'Edit Item' : 'Add New Item'}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 2 }]}>
              <Text style={styles.label}>Item Name *</Text>
              <TextInput
                style={styles.input}
                value={itemForm.name}
                onChangeText={(text) =>
                  setItemForm({ ...itemForm, name: text })
                }
                placeholder="Enter item name"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={itemForm.unit}
                  onValueChange={(value) =>
                    setItemForm({ ...itemForm, unit: value })
                  }
                  style={styles.picker}
                >
                  {units.map((u) => (
                    <Picker.Item key={u} label={u} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Enhanced Category Field */}
          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity
                style={[
                  styles.categoryInputContainer,
                  itemForm.category && styles.categoryInputContainerSelected,
                ]}
                onPress={openCategoryDropdown}
                activeOpacity={0.7}
              >
                <View style={styles.categoryInputContent} pointerEvents="none">
                  {itemForm.category ? (
                    <View style={styles.selectedCategoryContent}>
                      <View style={styles.categoryBadgePreview}>
                        <Text style={styles.categoryBadgePreviewText}>
                          {itemForm.category.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.selectedCategoryText}>
                        {itemForm.category}
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.categoryPlaceholder}>
                      Tap to select category
                    </Text>
                  )}
                </View>
                {itemForm.category ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={clearCategory}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.dropdownButton}>
                    <Text style={styles.dropdownButtonText}>▼</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Price fields */}
          <View style={styles.formRow}>
            <View style={styles.priceGroup}>
              <Text style={styles.label}>MRP *</Text>
              <TextInput
                style={styles.priceInput}
                value={itemForm.mrp}
                onChangeText={(text) => setItemForm({ ...itemForm, mrp: text })}
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.priceGroup}>
              <Text style={styles.label}>Purchase Price *</Text>
              <TextInput
                style={styles.priceInput}
                value={itemForm.purchasePrice}
                onChangeText={(text) =>
                  setItemForm({ ...itemForm, purchasePrice: text })
                }
                placeholder="0.00"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.priceGroup}>
              <Text style={styles.label}>Selling Price *</Text>
              <TextInput
                style={styles.priceInput}
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

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={styles.input}
                value={itemForm.quantity}
                onChangeText={(text) =>
                  setItemForm({ ...itemForm, quantity: text })
                }
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="decimal-pad"
              />
            </View>

            <View
              style={[
                styles.formGroup,
                { flex: 1, justifyContent: 'flex-end' },
              ]}
            >
              <TouchableOpacity
                style={[
                  styles.addButton,
                  itemForm.id ? styles.updateButton : styles.addButton,
                ]}
                onPress={addItem}
              >
                <Text style={styles.addButtonText}>
                  {itemForm.id ? 'Update' : 'Add Item'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* FIXED: Category Dropdown Modal with Box Layout */}
        <Modal
          visible={showCategoryDropdown}
          transparent
          animationType="fade"
          onRequestClose={closeCategoryDropdown}
        >
          <Animated.View
            style={[styles.modalOverlay, { opacity: categoryFadeAnim }]}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeCategoryDropdown}
            >
              <View style={styles.modalContent}>
                <Animated.View
                  style={[
                    styles.categoryBoxContainer,
                    {
                      transform: [
                        {
                          translateY: categoryFadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [50, 0],
                          }),
                        },
                      ],
                    },
                  ]}
                >
                  <View style={styles.categoryBoxHeader}>
                    <View style={styles.dropdownTitleContainer}>
                      <Text style={styles.dropdownIcon}>📂</Text>
                      <View>
                        <Text style={styles.categoryBoxTitle}>
                          Select Category
                        </Text>
                        <Text style={styles.categoryBoxSubtitle}>
                          Choose a category for your product
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={closeCategoryDropdown}
                      style={styles.categoryBoxCloseButton}
                    >
                      <Text style={styles.categoryBoxCloseButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.categoryBoxSearchContainer}>
                    <Text style={styles.categoryBoxSearchIcon}>🔍</Text>
                    <TextInput
                      style={styles.categoryBoxSearchInput}
                      placeholder="Search categories..."
                      placeholderTextColor="#94A3B8"
                      value={categorySearch}
                      onChangeText={handleCategorySearch}
                      autoFocus
                    />
                    {categorySearch ? (
                      <TouchableOpacity
                        onPress={() => setCategorySearch('')}
                        style={styles.clearSearchButton}
                      >
                        <Text style={styles.clearSearchButtonText}>✕</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {isLoadingCategories ? (
                    <View style={styles.categoryBoxLoadingContainer}>
                      <ActivityIndicator size="large" color="#2563EB" />
                      <Text style={styles.categoryBoxLoadingText}>
                        Loading categories...
                      </Text>
                    </View>
                  ) : (
                    <FlatList
                      data={filteredCategories}
                      renderItem={renderCategoryItem}
                      keyExtractor={(item) => item.id.toString()}
                      style={styles.categoryBoxList}
                      numColumns={2}
                      columnWrapperStyle={styles.categoryBoxRow}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.categoryBoxContentContainer}
                      ListEmptyComponent={
                        <View style={styles.categoryBoxEmptyContainer}>
                          <Text style={styles.categoryBoxEmptyIcon}>📂</Text>
                          <Text style={styles.categoryBoxEmptyText}>
                            No categories found
                          </Text>
                          <Text style={styles.categoryBoxEmptySubtext}>
                            {categorySearch
                              ? 'Try a different search term'
                              : 'No categories available'}
                          </Text>
                        </View>
                      }
                    />
                  )}
                </Animated.View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </Modal>

        {/* Enhanced Items Summary */}
        {items.length > 0 && (
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardIcon}>📊</Text>
                <Text style={styles.cardTitle}>Bill Summary</Text>
              </View>
              <View style={styles.itemsCount}>
                <Text style={styles.itemsCountText}>{items.length} items</Text>
              </View>
            </View>

            <View style={styles.enhancedSummary}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Items</Text>
                  <Text style={styles.summaryValue}>{items.length}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Total Quantity</Text>
                  <Text style={styles.summaryValue}>{getTotalItems()}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Bill Type</Text>
                  <View
                    style={[
                      styles.billTypeBadge,
                      billType === 'Cash'
                        ? styles.cashTypeBadge
                        : styles.creditTypeBadge,
                    ]}
                  >
                    <Text style={styles.billTypeText}>{billType}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.grandTotalContainer}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>
                  ₹{getTotalBillAmount().toFixed(2)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Items List */}
        {items.map((item, index) => renderItem(item, index))}

        {/* Save Button */}
        {items.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={saveBill}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.saveButtonIcon}>
                    {isEditMode ? '💾' : '💾'}
                  </Text>
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update Purchase Bill' : 'Save Purchase Bill'}
                  </Text>
                  <Text style={styles.saveButtonAmount}>
                    ₹{getTotalBillAmount().toFixed(2)}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  // Sticky Header Styles
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    zIndex: 1000,
  },
  stickyHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stickyHeaderInfo: {
    flex: 1,
  },
  stickyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stickySupplier: {
    fontSize: 14,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  stickyStats: {
    flexDirection: 'row',
    gap: 12,
  },
  stickyStatItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  stickyStatValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stickyStatLabel: {
    fontSize: 10,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  // Enhanced Header
  header: {
    padding: 24,
    paddingBottom: 20,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  headerContent: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#E0E7FF',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 0.5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  // Enhanced Summary Styles
  enhancedSummary: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
  },
  billTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  cashTypeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  creditTypeBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  billTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  grandTotalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#10B981',
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  formGroup: {
    flex: 1,
  },
  priceGroup: {
    flex: 1,
    minWidth: 100,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    fontWeight: '600',
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#1E293B',
    textAlign: 'center',
    fontWeight: '600',
  },
  // Enhanced Category Input
  categoryInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    minHeight: 50,
    paddingHorizontal: 12,
  },
  categoryInputContainerSelected: {
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  categoryInputContent: {
    flex: 1,
  },
  selectedCategoryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryBadgePreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  categoryBadgePreviewText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2563EB',
  },
  selectedCategoryText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E40AF',
  },
  categoryPlaceholder: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    color: '#1E293B',
    fontWeight: '600',
  },
  dateButton: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  dateIcon: {
    fontSize: 14,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  cashBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  creditBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  updateButton: {
    backgroundColor: '#1D4ED8',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  itemsCount: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  itemsCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  billSummary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10B981',
    letterSpacing: 0.5,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIndexBadge: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  itemTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    letterSpacing: 0.3,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: '#DBEAFE',
    borderColor: '#93C5FD',
  },
  categoryBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    color: '#1E40AF',
  },
  itemDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailColumn: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  totalText: {
    color: '#10B981',
    fontSize: 15,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  editButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 30,
  },
  saveButton: {
    backgroundColor: '#1E3A8A',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    fontSize: 18,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  saveButtonAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  // Supplier Input Styles
  supplierInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  supplierInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  selectedSupplierInput: {
    backgroundColor: '#F0F9FF',
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  dropdownButton: {
    padding: 8,
    marginRight: 8,
  },
  dropdownButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  modalContent: {
    width: width * 0.9,
    height: height * 0.7,
    maxHeight: '80%',
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    height: '100%',
  },
  // FIXED: Category Box Dropdown Styles
  categoryBoxContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 15,
    height: '100%',
    width: '100%',
  },
  categoryBoxHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  categoryBoxTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  categoryBoxSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryBoxCloseButton: {
    padding: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryBoxCloseButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryBoxSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    marginTop: 0,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
  },
  categoryBoxSearchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  categoryBoxSearchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  clearSearchButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearSearchButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  categoryBoxLoadingContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBoxLoadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 12,
  },
  categoryBoxList: {
    flex: 1,
  },
  categoryBoxRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryBoxContentContainer: {
    paddingBottom: 20,
  },
  // FIXED: Category Box Item Styles
  categoryBoxItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryBoxContent: {
    alignItems: 'center',
  },
  categoryBoxIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#93C5FD',
  },
  categoryBoxIconText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2563EB',
  },
  categoryBoxName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    lineHeight: 18,
  },
  categoryBoxEmptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryBoxEmptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  categoryBoxEmptyText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  categoryBoxEmptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  dropdownTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dropdownIcon: {
    fontSize: 24,
  },
  dropdownTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  dropdownSubtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  searchIcon: {
    padding: 12,
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    fontWeight: '600',
  },
  supplierList: {
    flex: 1,
  },
  supplierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  supplierItemEven: {
    backgroundColor: '#FFFFFF',
  },
  supplierItemOdd: {
    backgroundColor: '#F8FAFC',
  },
  supplierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  supplierType: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  selectIndicator: {
    padding: 4,
  },
  selectIndicatorText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
    textAlign: 'center',
  },
});