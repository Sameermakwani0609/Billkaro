import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard as Edit,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
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
  Product,
  getAllProducts,
  insertProduct,
  updateProduct,
  deleteProduct,
  initDB,
  isSqliteAvailable,
} from '../../lib/db';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    mrp: '',
    sellPrice: '',
    purchasePrice: '',
    stock: '',
    unit: 'unit',
    category: '',
    minStock: '',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>('checking');

  // Initialize database and load products
  useEffect(() => {
    initializeDatabase();
  }, []);

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

      // Load products
      await loadProducts();
      setDbStatus('ready');
    } catch (error) {
      console.error('Error initializing database:', error);
      setDbStatus('error');
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
      product.category.toLowerCase().includes(searchQuery.toLowerCase()),
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
        category: product.category,
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
        category: '',
        minStock: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingProduct(null);
  };

  const saveProduct = async () => {
    if (
      !formData.name ||
      !formData.mrp ||
      !formData.sellPrice ||
      !formData.purchasePrice ||
      !formData.stock ||
      !formData.category
    ) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    try {
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
          formData.category,
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
          formData.category,
          parseInt(formData.minStock) || 10,
        );
      }

      // Reload products from database
      await loadProducts();
      closeModal();
      Alert.alert('Success', `Product ${editingProduct ? 'updated' : 'added'} successfully`);
    } catch (error) {
      console.error('Error saving product:', error);
      Alert.alert('Error', `Failed to ${editingProduct ? 'update' : 'add'} product`);
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0066CC" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#0066CC', '#0052A3']} style={styles.header}>
        <Text style={styles.headerTitle}>Inventory Management</Text>
        <Text style={styles.headerSubtitle}>Manage your products</Text>
        <Text style={styles.headerSubtitle}>Total Products: {products.length}</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Search and Add */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
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
              Unable to connect to database. Some features may not work properly.
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
                {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
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
                    <Text style={styles.productCategory}>{product.category}</Text>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.normalMrpText}>MRP: ₹{product.mrp}</Text>
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

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter product name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>MRP (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.mrp}
                  onChangeText={(text) =>
                    setFormData({ ...formData, mrp: text })
                  }
                  placeholder="Enter MRP"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Purchase Price (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.purchasePrice}
                  onChangeText={(text) =>
                    setFormData({ ...formData, purchasePrice: text })
                  }
                  placeholder="Enter purchase price"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sell Price (₹)</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.sellPrice}
                  onChangeText={(text) =>
                    setFormData({ ...formData, sellPrice: text })
                  }
                  placeholder="Enter sell price"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Stock Quantity</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.stock}
                  onChangeText={(text) =>
                    setFormData({ ...formData, stock: text })
                  }
                  placeholder="Enter stock quantity"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Unit</Text>
                <Picker
                  selectedValue={formData.unit}
                  style={styles.picker}
                  onValueChange={(itemValue: string) =>
                    setFormData({ ...formData, unit: itemValue })
                  }
                >
                  <Picker.Item label="Unit" value="unit" />
                  <Picker.Item label="Pieces" value="pcs" />
                  <Picker.Item label="Box" value="box" />
                  <Picker.Item label="Kg" value="kg" />
                  <Picker.Item label="Liter" value="ltr" />
                  <Picker.Item label="Gram" value="g" />
                  <Picker.Item label="Packet" value="packet" />
                </Picker>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.category}
                  onChangeText={(text) =>
                    setFormData({ ...formData, category: text })
                  }
                  placeholder="Enter category"
                />
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
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9, marginTop: 4 },
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
  },
  picker: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
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