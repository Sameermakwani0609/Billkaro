import { LinearGradient } from 'expo-linear-gradient';
import {
  ChevronDown,
  CreditCard as Edit,
  Package,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
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
  Product,
  deleteProduct,
  getAllCategories,
  getAllProducts,
  initDB,
  insertProduct,
  isSqliteAvailable,
  updateProduct,
} from '../lib/db';

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
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Search Bar for Categories */}
          <View style={styles.categorySearchContainer}>
            <View style={styles.categorySearchWrapper}>
              <Search
                size={20}
                color="#94A3B8"
                style={styles.categorySearchIcon}
              />
              <TextInput
                style={styles.categorySearchInput}
                placeholder="Search categories..."
                placeholderTextColor="#94A3B8"
                value={categorySearchQuery}
                onChangeText={(text) => setCategorySearchQuery(text)}
                autoFocus={true}
              />
              {categorySearchQuery !== '' && (
                <TouchableOpacity
                  onPress={() => setCategorySearchQuery('')}
                  style={styles.clearButton}
                >
                  <X size={18} color="#94A3B8" />
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
              <X size={24} color="#64748B" />
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
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Header with Dashboard Theme - Improved Design */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerIconContainer}>
            <Package size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.headerTitle}>Inventory</Text>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{products.length}</Text>
            <Text style={styles.statLabel}>Total Products</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{lowStockItems.length}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search and Add */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
          >
            <LinearGradient
              colors={['#3B82F6', '#1D4ED8']}
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

        {/* Products List */}
        <ScrollView
          style={styles.productsList}
          showsVerticalScrollIndicator={false}
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={64} color="#94A3B8" />
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No products found' : 'No products available'}
              </Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Tap the + button to add your first product'}
              </Text>
            </View>
          ) : (
            <>
              {/* Results Count */}
              <View style={styles.resultsCount}>
                <Text style={styles.resultsCountText}>
                  Showing {filteredProducts.length} of {products.length}{' '}
                  products
                </Text>
              </View>

              {filteredProducts.map((product) => (
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
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>MRP:</Text>
                        <Text style={styles.detailValue}>₹{product.mrp}</Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Rate:</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            styles.sellPriceText,
                            product.sellPrice < product.purchasePrice && {
                              color: '#EF4444',
                            },
                          ]}
                        >
                          ₹{product.sellPrice}
                        </Text>
                      </View>
                      <View style={styles.detailItem}>
                        <Text style={styles.detailLabel}>Stock:</Text>
                        <Text
                          style={[
                            styles.detailValue,
                            product.stock <= product.minStock &&
                              styles.lowStockText,
                          ]}
                        >
                          {product.stock} {product.unit}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => openModal(product)}
                    >
                      <Edit size={16} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => deleteProductHandler(product.id)}
                    >
                      <Trash2 size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
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
                <X size={24} color="#64748B" />
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                    <ChevronDown size={20} color="#64748B" />
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
                    <ChevronDown size={20} color="#64748B" />
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
                  placeholderTextColor="#94A3B8"
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
                  colors={['#3B82F6', '#1D4ED8']}
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
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, height: 48, fontSize: 16, color: '#0F172A' },
  addButton: { borderRadius: 14, overflow: 'hidden' },
  addButtonGradient: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: { fontSize: 14, color: '#DC2626' },
  productsList: { flex: 1 },
  resultsCount: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  resultsCountText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
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
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  productInfo: { flex: 1 },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  productName: { fontSize: 16, fontWeight: '700', color: '#0F172A', flex: 1 },
  productCategory: {
    fontSize: 11,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '600',
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  sellPriceText: {
    color: '#3B82F6',
    fontWeight: '700',
  },
  lowStockText: {
    color: '#EF4444',
  },
  actionButtons: { flexDirection: 'row', gap: 8, marginLeft: 12 },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
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
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  formContainer: { maxHeight: 450 },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  pickerButton: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  pickerButtonContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    fontSize: 15,
    color: '#0F172A',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
    borderBottomColor: '#F1F5F9',
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  categorySearchContainer: {
    marginBottom: 15,
  },
  categorySearchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categorySearchIcon: {
    marginRight: 10,
  },
  categorySearchInput: {
    flex: 1,
    height: 45,
    fontSize: 15,
    color: '#0F172A',
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
    borderBottomColor: '#F1F5F9',
  },
  pickerItemSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
  },
  pickerItemText: {
    fontSize: 15,
    color: '#475569',
  },
  pickerItemTextSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  emptyPickerState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPickerText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: { flex: 1 },
  saveButtonGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
