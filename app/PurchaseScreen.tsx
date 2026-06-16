import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getAllCategories,
  getAllProducts,
  getAllSuppliers,
  insertProduct,
  insertPurchaseBill,
  Supplier,
  updateProduct,
} from '../lib/db';

interface PurchaseItem {
  id: string;
  name: string;
  mrp: number;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  total: number;
  categoryId?: number | null;
  categoryName?: string;
}

export default function PurchaseScreen() {
  const [supplier, setSupplier] = useState('');
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [billNo, setBillNo] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

  // Supplier autocomplete states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [isSupplierSelected, setIsSupplierSelected] = useState(false);
  const [modalSearchText, setModalSearchText] = useState('');

  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    mrp: '',
    purchasePrice: '',
    sellPrice: '',
    quantity: '',
    unit: 'pcs',
    categoryId: null as number | null,
    categoryName: '',
  });

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const units = ['pcs', 'unit', 'kg', 'g', 'ltr', 'box', 'packet', 'dozen'];

  // Load suppliers and categories on component mount
  useEffect(() => {
    loadSuppliers();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const categoryList = await getAllCategories();
      setCategories(categoryList);
      console.log('📦 Categories loaded:', categoryList);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadSuppliers = async () => {
    setLoadingSuppliers(true);
    try {
      const supplierList = await getAllSuppliers();
      setSuppliers(supplierList);
      setFilteredSuppliers(supplierList);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoadingSuppliers(false);
    }
  };

  const handleSupplierFocus = () => {
    if (!isSupplierSelected) {
      setModalSearchText('');
      setFilteredSuppliers(suppliers);
      setShowSupplierModal(true);
    }
  };

  const handleModalSearch = (text: string) => {
    setModalSearchText(text);
    if (text.trim().length > 0) {
      const filtered = suppliers.filter(
        (sup) =>
          sup.name.toLowerCase().includes(text.toLowerCase()) ||
          (sup.company &&
            sup.company.toLowerCase().includes(text.toLowerCase())) ||
          (sup.phone && sup.phone.includes(text)),
      );
      setFilteredSuppliers(filtered);
    } else {
      setFilteredSuppliers(suppliers);
    }
  };

  const handleSupplierInputChange = (text: string) => {
    setSupplier(text);
    setSupplierId(null);
    setIsSupplierSelected(false);

    if (text.trim().length > 0) {
      const filtered = suppliers.filter((sup) =>
        sup.name.toLowerCase().includes(text.toLowerCase()),
      );
      setFilteredSuppliers(filtered);
      setShowSupplierModal(true);
    } else {
      setFilteredSuppliers(suppliers);
      setShowSupplierModal(false);
    }
  };

  const handleSelectSupplier = (selectedSupplier: Supplier) => {
    setSupplier(selectedSupplier.name);
    setSupplierId(selectedSupplier.id);
    setIsSupplierSelected(true);
    setShowSupplierModal(false);
    setModalSearchText('');
  };

  const clearSupplier = () => {
    setSupplier('');
    setSupplierId(null);
    setIsSupplierSelected(false);
    setShowSupplierModal(false);
  };

  const addItem = () => {
    // Debug logging
    console.log('🔍 Adding item - Form Data:', {
      name: itemForm.name,
      mrp: itemForm.mrp,
      purchasePrice: itemForm.purchasePrice,
      sellPrice: itemForm.sellPrice,
      quantity: itemForm.quantity,
      unit: itemForm.unit,
      categoryId: itemForm.categoryId,
      categoryName: itemForm.categoryName,
    });

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

    // Get category name if categoryId is selected
    const selectedCategory = categories.find(
      (c) => c.id === itemForm.categoryId,
    );
    const categoryName = selectedCategory ? selectedCategory.name : '';

    console.log('📌 Selected Category:', {
      id: itemForm.categoryId,
      name: categoryName,
      availableCategories: categories,
    });

    if (itemForm.id) {
      // Edit existing item
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
              categoryName: categoryName,
              total,
            }
          : item,
      );
      setItems(updatedItems);
      console.log(
        '✏️ Item updated:',
        updatedItems.find((i) => i.id === itemForm.id),
      );
    } else {
      // Add new item
      const newItem: PurchaseItem = {
        id: Date.now().toString(),
        name: itemForm.name,
        mrp: parseFloat(itemForm.mrp),
        purchasePrice: parseFloat(itemForm.purchasePrice),
        sellPrice: parseFloat(itemForm.sellPrice),
        quantity: parseFloat(itemForm.quantity),
        unit: itemForm.unit,
        categoryId: itemForm.categoryId,
        categoryName: categoryName,
        total,
      };
      setItems([...items, newItem]);
      console.log('➕ New item added:', newItem);
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
      categoryId: null,
      categoryName: '',
    });
  };

  const editItem = (item: PurchaseItem) => {
    console.log('✏️ Editing item:', item);
    setItemForm({
      id: item.id,
      name: item.name,
      mrp: item.mrp.toString(),
      purchasePrice: item.purchasePrice.toString(),
      sellPrice: item.sellPrice.toString(),
      quantity: item.quantity.toString(),
      unit: item.unit,
      categoryId: item.categoryId || null,
      categoryName: item.categoryName || '',
    });
  };

  const deleteItem = (id: string) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems(items.filter((item) => item.id !== id));
          console.log('🗑️ Item deleted, ID:', id);
        },
      },
    ]);
  };

  // Function to update or add product stock with EXACT MATCHING
  const updateOrAddProductStock = async (
    item: PurchaseItem,
  ): Promise<{
    action: string;
    name: string;
    oldStock?: number;
    newStock?: number;
    reason?: string;
  }> => {
    try {
      // Get all existing products
      const allProducts = await getAllProducts();

      // Check if product exists with EXACT SAME properties:
      // - Same name (case-insensitive)
      // - Same MRP
      // - Same Purchase Price
      // - Same Unit
      const exactMatch = allProducts.find(
        (product) =>
          product.name.toLowerCase() === item.name.toLowerCase() &&
          product.mrp === item.mrp &&
          product.purchasePrice === item.purchasePrice &&
          product.unit.toLowerCase() === item.unit.toLowerCase(),
      );

      if (exactMatch) {
        // EXACT match found - just add quantity to stock
        const oldStock = exactMatch.stock;
        const newStock = oldStock + item.quantity;

        await updateProduct(
          exactMatch.id,
          exactMatch.name,
          exactMatch.mrp,
          exactMatch.sellPrice,
          exactMatch.purchasePrice,
          newStock,
          exactMatch.unit,
          exactMatch.categoryId,
          exactMatch.minStock,
        );

        console.log(`✅ Updated ${item.name}: Stock ${oldStock} → ${newStock}`);
        return {
          action: 'updated',
          name: item.name,
          oldStock,
          newStock,
          reason: 'Exact match found - quantity added',
        };
      } else {
        // Check if product exists with same name but different details
        const nameMatch = allProducts.find(
          (product) => product.name.toLowerCase() === item.name.toLowerCase(),
        );

        if (nameMatch) {
          // Same name but different MRP, price, or unit - create as new product variant
          const variantName = `${item.name} (${item.unit} - ₹${item.mrp})`;

          await insertProduct(
            variantName,
            item.mrp,
            item.sellPrice,
            item.purchasePrice,
            item.quantity,
            item.unit,
            item.categoryId || null,
            10,
          );

          console.log(
            `✅ Added variant: ${variantName} with stock ${item.quantity}`,
          );
          return {
            action: 'added',
            name: variantName,
            newStock: item.quantity,
            reason: 'Different price/unit - created as variant',
          };
        } else {
          // Completely new product
          await insertProduct(
            item.name,
            item.mrp,
            item.sellPrice,
            item.purchasePrice,
            item.quantity,
            item.unit,
            item.categoryId || null,
            10,
          );

          console.log(
            `✅ Added new product: ${item.name} with stock ${item.quantity}`,
          );
          return {
            action: 'added',
            name: item.name,
            newStock: item.quantity,
            reason: 'New product',
          };
        }
      }
    } catch (error) {
      console.error(`❌ Error processing ${item.name}:`, error);
      throw error;
    }
  };

  const saveBill = async () => {
    // Validation
    if (!supplier || !billNo || !date || items.length === 0) {
      Alert.alert(
        'Error',
        'Please fill all bill details and add at least one item',
      );
      return;
    }

    if (!supplierId) {
      Alert.alert('Error', 'Please select a valid supplier');
      return;
    }

    setProcessing(true);

    try {
      // Process each item to update/add stock
      const results = [];
      let hasError = false;

      for (const item of items) {
        try {
          const result = await updateOrAddProductStock(item);
          results.push(result);
        } catch (error) {
          hasError = true;
          console.error(`Failed to process ${item.name}:`, error);
        }
      }

      // Save purchase bill to database
      const totalAmount = getTotalBillAmount();
      const formattedDate = date.toISOString().split('T')[0];

      const billItems = items.map((item) => ({
        name: item.name,
        mrp: item.mrp,
        purchasePrice: item.purchasePrice,
        sellPrice: item.sellPrice,
        quantity: item.quantity,
        unit: item.unit,
        total: item.total,
        categoryId: item.categoryId || null,
        categoryName: item.categoryName || '',
      }));

      await insertPurchaseBill(
        supplier,
        supplierId,
        billNo,
        billType,
        formattedDate,
        totalAmount,
        billItems,
      );

      if (hasError) {
        Alert.alert(
          'Partial Success',
          `Some items failed to process. Please check the console for details.\n\nSuccessful: ${results.length}/${items.length}`,
        );
      } else {
        // Count results
        const addedCount = results.filter((r) => r.action === 'added').length;
        const updatedCount = results.filter(
          (r) => r.action === 'updated',
        ).length;

        // Create detailed summary
        let stockSummary = '';
        if (addedCount > 0) {
          stockSummary += `📦 New Products/Variants Added: ${addedCount}\n`;
          const addedItems = results.filter((r) => r.action === 'added');
          addedItems.forEach((item) => {
            stockSummary += `   • ${item.name}\n`;
          });
        }
        if (updatedCount > 0) {
          stockSummary += `🔄 Products Updated: ${updatedCount}\n`;
          const updatedItems = results.filter((r) => r.action === 'updated');
          updatedItems.forEach((item) => {
            stockSummary += `   • ${item.name}: ${item.oldStock} → ${item.newStock}\n`;
          });
        }

        Alert.alert(
          '✅ Success!',
          `Purchase bill saved successfully!\n\n${stockSummary}\nTotal Items: ${items.length}\nBill Amount: ₹${totalAmount.toFixed(2)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Reset form after successful save
                setSupplier('');
                setSupplierId(null);
                setIsSupplierSelected(false);
                setBillNo('');
                setDate(new Date());
                setBillType('Cash');
                setItems([]);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('Error saving bill:', error);
      Alert.alert(
        'Error',
        'Failed to save bill. Please check your connection and try again.',
      );
    } finally {
      setProcessing(false);
    }
  };

  const getTotalBillAmount = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const getCategoryName = (categoryId: number | null | undefined): string => {
    if (!categoryId) return 'Uncategorized';
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : 'Uncategorized';
  };

  const renderSupplierItem = ({ item }: { item: Supplier }) => (
    <TouchableOpacity
      style={styles.supplierItem}
      onPress={() => handleSelectSupplier(item)}
    >
      <View style={styles.supplierItemContent}>
        <Text style={styles.supplierName}>{item.name}</Text>
        {item.company && (
          <Text style={styles.supplierCompany}>{item.company}</Text>
        )}
        {item.phone && (
          <Text style={styles.supplierPhone}>📞 {item.phone}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderItem = (item: PurchaseItem, index: number) => (
    <View style={styles.itemCard} key={item.id}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIndex}>#{index + 1}</Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
        {(item.categoryId || item.categoryName) && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryBadgeText}>
              {item.categoryName || getCategoryName(item.categoryId)}
            </Text>
          </View>
        )}
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
          <Text style={styles.actionText}>✏️ Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => deleteItem(item.id)}
          style={[styles.actionButton, styles.deleteButton]}
        >
          <Text style={styles.actionText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Header animation values
  const headerHeight = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [120, 90],
    extrapolate: 'clamp',
  });

  const titleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [28, 22],
    extrapolate: 'clamp',
  });

  const subtitleFontSize = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [14, 12],
    extrapolate: 'clamp',
  });

  const subtitleOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Sticky Header with Dashboard Theme */}
      <Animated.View style={[styles.stickyHeader, { height: headerHeight }]}>
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.Text
          style={[styles.stickyTitle, { fontSize: titleFontSize }]}
        >
          Purchase Management
        </Animated.Text>
        <Animated.Text
          style={[
            styles.stickySubtitle,
            {
              fontSize: subtitleFontSize,
              opacity: subtitleOpacity,
            },
          ]}
        >
          Create and manage purchase bills
        </Animated.Text>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >
        {/* Bill Details Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Bill Information</Text>
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
            <View style={styles.formGroup}>
              <Text style={styles.label}>Supplier Name *</Text>
              <View style={styles.supplierInputContainer}>
                <TextInput
                  style={[
                    styles.input,
                    isSupplierSelected && styles.selectedSupplierInput,
                  ]}
                  value={supplier}
                  onChangeText={handleSupplierInputChange}
                  onFocus={handleSupplierFocus}
                  placeholder={
                    isSupplierSelected
                      ? 'Select Supplier'
                      : 'Enter supplier name'
                  }
                  placeholderTextColor="#94A3B8"
                  returnKeyType="next"
                  editable={!isSupplierSelected}
                />
                {isSupplierSelected && (
                  <TouchableOpacity
                    onPress={clearSupplier}
                    style={styles.clearButton}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill No *</Text>
              <TextInput
                style={styles.input}
                value={billNo}
                onChangeText={setBillNo}
                placeholder="Enter bill number"
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
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
                <Text style={styles.dateText}>📅 {date.toDateString()}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDate(selectedDate);
                  }}
                />
              )}
            </View>
          </View>
        </View>

        {/* Add Item Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {itemForm.id ? '✏️ Edit Item' : '➕ Add New Item'}
            </Text>
            {itemForm.categoryId && (
              <View style={styles.selectedCategoryHint}>
                <Text style={styles.selectedCategoryHintText}>
                  Selected:{' '}
                  {itemForm.categoryName ||
                    getCategoryName(itemForm.categoryId)}
                </Text>
              </View>
            )}
          </View>

          {/* Item Name and Unit in same row */}
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
                returnKeyType="next"
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
                    <Picker.Item key={u} label={u.toUpperCase()} value={u} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>

          {/* Price Fields - All in same row */}
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
                returnKeyType="next"
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
                returnKeyType="next"
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
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Quantity and Category and Add Button */}
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
                returnKeyType="done"
                onSubmitEditing={addItem}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={
                    itemForm.categoryId ? itemForm.categoryId.toString() : ''
                  }
                  onValueChange={(value) => {
                    const selectedId = value ? parseInt(value) : null;
                    const selectedCategory = categories.find(
                      (c) => c.id === selectedId,
                    );
                    console.log('📋 Category Selected:', {
                      id: selectedId,
                      name: selectedCategory?.name,
                      allCategories: categories,
                    });
                    setItemForm({
                      ...itemForm,
                      categoryId: selectedId,
                      categoryName: selectedCategory?.name || '',
                    });
                  }}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select Category --" value="" />
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

            <View
              style={[
                styles.formGroup,
                { flex: 1.5, justifyContent: 'flex-end' },
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

        {/* Items Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.cardTitle}>📦 Items in Bill</Text>
            <View style={styles.itemsCount}>
              <Text style={styles.itemsCountText}>{items.length} items</Text>
            </View>
          </View>

          {items.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No items added yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add items to see them here
              </Text>
            </View>
          ) : (
            <View style={styles.billSummary}>
              <Text style={styles.totalAmount}>
                Total Bill Amount: ₹{getTotalBillAmount().toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        {/* Items List */}
        {items.map((item, index) => renderItem(item, index))}

        {/* Save Button */}
        {items.length > 0 && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, processing && styles.disabledButton]}
              onPress={saveBill}
              disabled={processing}
            >
              <Text style={styles.saveButtonText}>
                {processing
                  ? '⏳ Processing...'
                  : '💾 Save Purchase Bill & Update Stock'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </Animated.ScrollView>

      {/* Supplier Selection Modal with Search Bar */}
      <Modal
        visible={showSupplierModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Supplier</Text>
              <TouchableOpacity
                onPress={() => setShowSupplierModal(false)}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Bar inside Modal */}
            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="🔍 Search by name, company or phone..."
                placeholderTextColor="#94A3B8"
                value={modalSearchText}
                onChangeText={handleModalSearch}
                autoFocus={true}
              />
              {modalSearchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => handleModalSearch('')}
                  style={styles.modalClearButton}
                >
                  <Text style={styles.modalClearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {loadingSuppliers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading suppliers...</Text>
              </View>
            ) : filteredSuppliers.length === 0 ? (
              <View style={styles.emptyModalState}>
                <Text style={styles.emptyModalText}>No suppliers found</Text>
                <Text style={styles.emptyModalSubtext}>
                  Try searching with different keywords
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.resultCountContainer}>
                  <Text style={styles.resultCountText}>
                    {filteredSuppliers.length} supplier
                    {filteredSuppliers.length !== 1 ? 's' : ''} found
                  </Text>
                </View>
                <FlatList
                  data={filteredSuppliers}
                  renderItem={renderSupplierItem}
                  keyExtractor={(item) => item.id.toString()}
                  style={styles.supplierList}
                  keyboardShouldPersistTaps="handled"
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: '#1E3A8A',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 1000,
    paddingHorizontal: 24,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stickyTitle: {
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  stickySubtitle: {
    color: '#93C5FD',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    marginTop: 100,
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#94A3B8',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#94A3B8',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedCategoryHint: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  selectedCategoryHintText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
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
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#0F172A',
  },
  selectedSupplierInput: {
    backgroundColor: '#EFF6FF',
    color: '#0F172A',
    borderColor: '#3B82F6',
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#0F172A',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    color: '#0F172A',
  },
  dateButton: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cashBadge: {
    backgroundColor: '#D1FAE5',
  },
  creditBadge: {
    backgroundColor: '#FEF3C7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  updateButton: {
    backgroundColor: '#8B5CF6',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  itemsCount: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  itemsCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
  },
  billSummary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#3B82F6',
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
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
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
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 30,
  },
  saveButton: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  disabledButton: {
    backgroundColor: '#94A3B8',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  supplierInputContainer: {
    position: 'relative',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  modalSearchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    position: 'relative',
  },
  modalSearchInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    backgroundColor: '#ffffff',
    color: '#0F172A',
    paddingRight: 35,
  },
  modalClearButton: {
    position: 'absolute',
    right: 22,
    top: 22,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalClearButtonText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  resultCountContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  resultCountText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  supplierList: {
    maxHeight: 400,
  },
  supplierItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  supplierItemContent: {
    gap: 4,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  supplierCompany: {
    fontSize: 14,
    color: '#64748B',
  },
  supplierPhone: {
    fontSize: 12,
    color: '#94A3B8',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748B',
  },
  emptyModalState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyModalText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  emptyModalSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
