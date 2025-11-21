import { Picker } from '@react-native-picker/picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
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
  findExistingProduct,
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
  const [formData, setFormData] = useState({
    name: '',
    mrp: '',
    sellPrice: '',
    purchasePrice: '',
    stock: '',
    unit: 'unit',
    category: '',
    minStock: '10',
  });

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dbStatus, setDbStatus] = useState<'checking' | 'ready' | 'error'>(
    'checking',
  );

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

      initDB();
      await loadProducts();
      await loadCategories();
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

  const loadCategories = async () => {
    try {
      const categoriesData = await getAllCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading categories:', error);
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
        category: categories.length > 0 ? categories[0].name : '',
        minStock: '10',
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

    if (
      isNaN(parseFloat(formData.mrp)) ||
      isNaN(parseFloat(formData.sellPrice)) ||
      isNaN(parseFloat(formData.purchasePrice)) ||
      isNaN(parseInt(formData.stock))
    ) {
      Alert.alert('Error', 'Please enter valid numbers for prices and stock');
      return;
    }

    try {
      if (editingProduct) {
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
        Alert.alert('Success', 'Product updated successfully');
      } else {
        const existingProduct = await findExistingProduct(
          formData.name,
          parseFloat(formData.mrp),
          parseFloat(formData.purchasePrice),
          formData.category,
        );

        if (existingProduct) {
          const newStock = existingProduct.stock + parseInt(formData.stock);
          await updateProduct(
            existingProduct.id,
            existingProduct.name,
            existingProduct.mrp,
            existingProduct.sellPrice,
            existingProduct.purchasePrice,
            newStock,
            existingProduct.unit,
            existingProduct.category,
            existingProduct.minStock,
          );
          Alert.alert(
            'Success',
            `Product quantity updated successfully! New stock: ${newStock}`,
          );
        } else {
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
          Alert.alert('Success', 'Product added successfully');
        }
      }

      await loadProducts();
      closeModal();
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

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#1E3A8A" barStyle="light-content" />

      <LinearGradient
        colors={['#2563EB', '#1D4ED8', '#3730A3']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Inventory Management</Text>
          <Text style={styles.headerSubtitle}>Manage Your Products</Text>
          <Text style={styles.headerCount}>
            Total Products: {products.length}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#64748B"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => openModal()}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.addButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Plus size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {dbStatus === 'error' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>⚠️ Database Error</Text>
            <Text style={styles.errorText}>
              Unable to connect to database. Some features may not work
              properly.
            </Text>
          </View>
        )}

        {lowStockItems.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertTitle}>⚠️ Low Stock Alert</Text>
            <Text style={styles.alertText}>
              {lowStockItems.length} item(s) running low on stock
            </Text>
          </View>
        )}

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
                    <Text style={styles.productCategory}>
                      {product.category}
                    </Text>
                  </View>
                  <View style={styles.productDetails}>
                    <Text style={styles.normalMrpText}>
                      MRP: ₹{product.mrp}
                    </Text>
                    <Text
                      style={[
                        styles.rateText,
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
                    <Edit size={16} color="#2563EB" />
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

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Product Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter product name"
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                <Text style={styles.inputLabel}>Category *</Text>
                <Picker
                  selectedValue={formData.category}
                  style={styles.picker}
                  onValueChange={(itemValue: string) =>
                    setFormData({ ...formData, category: itemValue })
                  }
                >
                  {categories.length === 0 ? (
                    <Picker.Item label="No categories available" value="" />
                  ) : (
                    categories.map((category) => (
                      <Picker.Item
                        key={category.id}
                        label={category.name}
                        value={category.name}
                      />
                    ))
                  )}
                </Picker>
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
                  placeholderTextColor="#64748B"
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
                  colors={['#2563EB', '#1D4ED8']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
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
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    marginTop: 4,
    textAlign: 'center',
  },
  headerCount: {
    fontSize: 14,
    color: '#E0E7FF',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
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
    borderRadius: 20,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 50,
    fontSize: 16,
    color: '#1E293B',
  },
  addButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#DC2626',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
  },
  alertCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#065F46',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#065F46',
  },
  productsList: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lowStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  productCategory: {
    fontSize: 12,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  productDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  normalMrpText: {
    fontSize: 14,
    color: '#64748B',
  },
  rateText: {
    fontSize: 14,
    color: '#2563EB',
  },
  stockText: {
    fontSize: 14,
    color: '#64748B',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  picker: {
    height: 50,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
