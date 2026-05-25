import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  CreditCard as Edit,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
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
  Product,
  deleteProduct,
  getAllCategories,
  getAllProducts,
  initDB,
  insertProduct,
  isSqliteAvailable,
  updateProduct,
} from '../../lib/db';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<Category[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showUnitPicker, setShowUnitPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    mrp: '',
    sellPrice: '',
    purchasePrice: '',
    stock: '',
    unit: 'unit',
    categoryId: '',
    minStock: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>(
    'checking',
  );

  // Units list
  const units = [
    { label: 'Unit', value: 'unit' },
    { label: 'Pieces', value: 'pcs' },
    { label: 'Box', value: 'box' },
    { label: 'Kilogram', value: 'kg' },
    { label: 'Liter', value: 'ltr' },
    { label: 'Gram', value: 'g' },
    { label: 'Packet', value: 'packet' },
    { label: 'Dozen', value: 'dozen' },
    { label: 'Set', value: 'set' },
    { label: 'Meter', value: 'm' },
    { label: 'Centimeter', value: 'cm' },
    { label: 'Inch', value: 'inch' },
    { label: 'Feet', value: 'ft' },
    { label: 'Square Feet', value: 'sqft' },
    { label: 'Pair', value: 'pair' },
    { label: 'Bottle', value: 'bottle' },
    { label: 'Can', value: 'can' },
    { label: 'Tube', value: 'tube' },
    { label: 'Roll', value: 'roll' },
  ];

  // Initialize database and load products
  useEffect(() => {
    initializeDatabase();
  }, []);

  // Filter categories when search query changes
  useEffect(() => {
    if (showCategoryPicker) {
      if (categorySearchQuery.trim() === '') {
        setFilteredCategories(categories);
      } else {
        const filtered = categories.filter((category) =>
          category.name
            .toLowerCase()
            .includes(categorySearchQuery.toLowerCase()),
        );
        setFilteredCategories(filtered);
      }
    }
  }, [categorySearchQuery, categories, showCategoryPicker]);

  const initializeDatabase = async () => {
    try {
      setDbStatus('checking');

      if (!isSqliteAvailable()) {
        console.warn('SQLite not available');
        setDbStatus('error');
        return;
      }

      // Initialize database
      initDB();

      // Load categories and products
      await loadCategories();
      await loadProducts();
      setDbStatus('ready');
    } catch (error) {
      console.error('Error initializing database:', error);
      setDbStatus('error');
    }
  };

  const loadCategories = async () => {
    try {
      const categoriesData = await getAllCategories();
      setCategories(categoriesData);
      setFilteredCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const productsData = await getAllProducts();
      setProducts(productsData);
    } catch (error) {
      console.error('Error loading products:', error);
      Alert.alert('Error', 'Failed to load products');
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.categoryName &&
        product.categoryName.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const lowStockItems = products.filter(
    (product) => product.stock <= product.minStock,
  );

  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        mrp: product.mrp.toString(),
        sellPrice: product.sellPrice.toString(),
        purchasePrice: product.purchasePrice.toString(),
        stock: product.stock.toString(),
        unit: product.unit,
        categoryId: product.categoryId ? product.categoryId.toString() : '',
        minStock: product.minStock.toString(),
      });
    } else {
      setEditingProduct(null);
      setFormData({
        name: '',
        mrp: '',
        sellPrice: '',
        purchasePrice: '',
        stock: '',
        unit: 'unit',
        categoryId: '',
        minStock: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
    setShowCategoryPicker(false);
    setShowUnitPicker(false);
    setCategorySearchQuery('');
  };

  const saveProduct = async () => {
    if (
      !formData.name ||
      !formData.mrp ||
      !formData.sellPrice ||
      !formData.purchasePrice ||
      !formData.stock
    ) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      const categoryIdValue = formData.categoryId
        ? parseInt(formData.categoryId)
        : null;

      if (editingProduct) {
        // Update existing product
        await updateProduct(
          editingProduct.id,
          formData.name,
          parseFloat(formData.mrp),
          parseFloat(formData.sellPrice),
          parseFloat(formData.purchasePrice),
          parseInt(formData.stock),
          formData.unit,
          categoryIdValue,
          parseInt(formData.minStock) || 10,
        );
      } else {
        // Insert new product
        await insertProduct(
          formData.name,
          parseFloat(formData.mrp),
          parseFloat(formData.sellPrice),
          parseFloat(formData.purchasePrice),
          parseInt(formData.stock),
          formData.unit,
          categoryIdValue,
          parseInt(formData.minStock) || 10,
        );
      }

      // Reload products from database
      await loadProducts();
      closeModal();
      Alert.alert(
        'Success',
        `Product ${editingProduct ? 'updated' : 'added'} successfully`,
      );
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert(
        'Error',
        `Failed to ${editingProduct ? 'update' : 'add'} product`,
      );
    }
  };

  const deleteProductHandler = async (id: number) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteProduct(id);
              await loadProducts();
              Alert.alert('Success', 'Product deleted successfully');
            } catch (error) {
              console.error('Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product');
            }
          },
        },
      ],
    );
  };

  // Get selected category name
  const getSelectedCategoryName = () => {
    if (!formData.categoryId) return 'Select Category';
    const category = categories.find(
      (c) => c.id.toString() === formData.categoryId,
    );
    return category ? category.name : 'Select Category';
  };

  // Get selected unit label
  const getSelectedUnitLabel = () => {
    const unit = units.find((u) => u.value === formData.unit);
    return unit ? unit.label : 'Select Unit';
  };

  // Category Picker Modal
  const CategoryPickerModal = () => (
    <Modal
      transparent={true}
      visible={showCategoryPicker}
      animationType="fade"
      onRequestClose={() => {
        setShowCategoryPicker(false);
        setCategorySearchQuery('');
      }}
    >
      <TouchableOpacity
        style={styles.pickerModalOverlay}
        activeOpacity={1}
        onPress={() => {
          setShowCategoryPicker(false);
          setCategorySearchQuery('');
        }}
      >
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>Select Category</Text>
            <TouchableOpacity
              onPress={() => {
                setShowCategoryPicker(false);
                setCategorySearchQuery('');
              }}
            >
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Search Bar for Categories */}
          <View style={styles.categorySearchContainer}>
            <View style={styles.categorySearchWrapper}>
              <Search
                size={20}
                color="#9CA3AF"
                style={styles.categorySearchIcon}
              />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#9CA3AF"
                value={categorySearchQuery}
                onChangeText={(text) => setCategorySearchQuery(text)}
                autoFocus={true}
              />
              {categorySearchQuery !== '' && (
                <TouchableOpacity
                  onPress={() => setCategorySearchQuery('')}
                  style={styles.clearButton}
                >
                  <X size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {filteredCategories.length === 0 ? (
            <View style={styles.emptyPickerState}>
              <Text style={styles.emptyPickerText}>
                {categorySearchQuery
                  ? 'No categories found'
                  : 'No categories available'}
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.pickerItem,
                  formData.categoryId === '' && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, categoryId: '' });
                  setShowCategoryPicker(false);
                  setCategorySearchQuery('');
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    formData.categoryId === '' && styles.pickerItemTextSelected,
                  ]}
                >
                  No Category
                </Text>
              </TouchableOpacity>

              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.pickerItem,
                    formData.categoryId === category.id.toString() &&
                      styles.pickerItemSelected,
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      categoryId: category.id.toString(),
                    });
                    setShowCategoryPicker(false);
                    setCategorySearchQuery('');
                  }}
                >
                  <Text
                    style={[
                      styles.pickerItemText,
                      formData.categoryId === category.id.toString() &&
                        styles.pickerItemTextSelected,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Unit Picker Modal
  const UnitPickerModal = () => (
    <Modal
      transparent={true}
      visible={showUnitPicker}
      animationType="fade"
      onRequestClose={() => setShowUnitPicker(false)}
    >
      <TouchableOpacity
        style={styles.pickerModalOverlay}
        activeOpacity={1}
        onPress={() => setShowUnitPicker(false)}
      >
        <View style={styles.pickerModalContent}>
          <View style={styles.pickerModalHeader}>
            <Text style={styles.pickerModalTitle}>Select Unit</Text>
            <TouchableOpacity onPress={() => setShowUnitPicker(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.pickerList}
            showsVerticalScrollIndicator={false}
          >
            {units.map((unit) => (
              <TouchableOpacity
                key={unit.value}
                style={[
                  styles.pickerItem,
                  formData.unit === unit.value && styles.pickerItemSelected,
                ]}
                onPress={() => {
                  setFormData({ ...formData, unit: unit.value });
                  setShowUnitPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.pickerItemText,
                    formData.unit === unit.value &&
                      styles.pickerItemTextSelected,
                  ]}
                >
                  {unit.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0066CC" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0066CC', '#0052A3']} style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <Text style={styles.headerSubtitle}>Manage your products</Text>
        <Text style={styles.headerSubtitle}>
          Total Products: {products.length}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search and Add */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
          >
            <LinearGradient
              colors={['#138808', '#0F6605']}
              style={styles.addButtonGradient}
            >
              <Plus size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Database Status */}
        {dbStatus === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Database Error</Text>
            <Text style={styles.errorText}>
              Unable to connect to database. Some features may not work
              properly.
            </Text>
          </View>
        )}

        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ Low Stock Alert</Text>
            <Text style={styles.alertText}>
              {lowStockItems.length} item(s) running low on stock
            </Text>
          </View>
        )}

        {/* Products List */}
        <ScrollView
          style={styles.productsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No products found' : 'No products available'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Add your first product to get started'}
              </Text>
            </View>
          ) : (
            filteredProducts.map((product) => (
              <View
                key={product.id}
                style={[
                  styles.productCard,
                  product.stock <= product.minStock && styles.lowStockCard,
                ]}
              >
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{product.name}</Text>
                    {product.categoryName && (
                      <Text style={styles.productCategory}>
                        {product.categoryName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.normalMrpText}>
                      MRP: ₹{product.mrp}
                    </Text>
                    <Text
                      style={[
                        styles.sellPriceText,
                        product.sellPrice < product.purchasePrice && {
                          color: '#EF4444',
                        },
                      ]}
                    >
                      Rate: ₹{product.sellPrice}
                    </Text>
                    <Text style={styles.stockText}>
                      Stock: {product.stock} {product.unit}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openModal(product)}
                  >
                    <Edit size={16} color="#0066CC" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteProductHandler(product.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Add/Edit Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter product name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MRP (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.mrp}
                  onChangeText={(text) =>
                    setFormData({ ...formData, mrp: text })
                  }
                  placeholder="Enter MRP"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Purchase Price (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.purchasePrice}
                  onChangeText={(text) =>
                    setFormData({ ...formData, purchasePrice: text })
                  }
                  placeholder="Enter purchase price"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sell Price (₹) *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.sellPrice}
                  onChangeText={(text) =>
                    setFormData({ ...formData, sellPrice: text })
                  }
                  placeholder="Enter sell price"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Quantity *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.stock}
                  onChangeText={(text) =>
                    setFormData({ ...formData, stock: text })
                  }
                  placeholder="Enter stock quantity"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit *</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => setShowUnitPicker(true)}
                >
                  <View style={styles.pickerButtonContent}>
                    <Text style={styles.pickerButtonText}>
                      {getSelectedUnitLabel()}
                    </Text>
                    <ChevronDown size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TouchableOpacity
                  style={styles.pickerButton}
                  onPress={() => {
                    setCategorySearchQuery('');
                    setFilteredCategories(categories);
                    setShowCategoryPicker(true);
                  }}
                >
                  <View style={styles.pickerButtonContent}>
                    <Text style={styles.pickerButtonText}>
                      {getSelectedCategoryName()}
                    </Text>
                    <ChevronDown size={20} color="#6B7280" />
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Minimum Stock</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.minStock}
                  onChangeText={(text) =>
                    setFormData({ ...formData, minStock: text })
                  }
                  placeholder="Enter minimum stock level"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProduct}>
                <LinearGradient
                  colors={['#138808', '#0F6605']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update' : 'Add'} Product
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <CategoryPickerModal />

      {/* Unit Picker Modal */}
      <UnitPickerModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  content: { flex: 1, paddingHorizontal: 20 },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#1F2937' },
  addButton: { borderRadius: 12, overflow: 'hidden' },
  addButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: { fontSize: 16, fontWeight: 'bold', color: '#DC2626' },
  errorText: { fontSize: 14, color: '#DC2626' },
  alertCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  alertTitle: { fontSize: 16, fontWeight: 'bold', color: '#92400E' },
  alertText: { fontSize: 14, color: '#92400E' },
  productsList: { flex: 1 },
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
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  productInfo: { flex: 1 },
  productHeader: { marginBottom: 8 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  productCategory: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  productDetails: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  normalMrpText: { fontSize: 14, color: '#6B7280' },
  sellPriceText: { fontSize: 18, fontWeight: 'bold', color: '#FF9933' },
  stockText: { fontSize: 14, color: '#6B7280' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  editButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  formContainer: { maxHeight: 400 },
  inputGroup: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  pickerButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    padding: 20,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  categorySearchContainer: {
    marginBottom: 15,
  },
  categorySearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categorySearchIcon: {
    marginRight: 10,
  },
  categorySearchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 5,
  },
  pickerList: {
    maxHeight: 400,
  },
  pickerItem: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerItemSelected: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#374151',
  },
  pickerItemTextSelected: {
    color: '#0066CC',
    fontWeight: '600',
  },
  emptyPickerState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  cancelButtonText: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
  saveButton: { flex: 1, marginLeft: 10 },
  saveButtonGradient: {
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
