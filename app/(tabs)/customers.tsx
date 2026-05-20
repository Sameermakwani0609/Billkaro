import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard as Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
  Customer,
  Supplier,
  deleteCustomer,
  deleteSupplier,
  getAllCustomers,
  getAllSuppliers,
  initDB,
  insertCustomer,
  insertSupplier,
  isSqliteAvailable,
  updateCustomer,
  updateSupplier,
} from '../../lib/db';

// Type guards to check if an item is Customer or Supplier
const isCustomer = (item: Customer | Supplier): item is Customer => {
  return 'totalPurchases' in item;
};

const isSupplier = (item: Customer | Supplier): item is Supplier => {
  return 'company' in item;
};

export default function Customers() {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(
    'customers',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | Supplier | null>(
    null,
  );
  const [formData, setFormData] = useState({
    id: 0, // Changed back to number
    name: '',
    phone: '',
    email: '',
    address: '',
    company: '',
    products: '',
  });

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  // Initialize database and load data
  useEffect(() => {
    const initializeData = async () => {
      if (isSqliteAvailable()) {
        try {
          initDB();
          await loadCustomers();
          await loadSuppliers();
        } catch (error) {
          console.error('Error initializing data:', error);
          Alert.alert('Error', 'Failed to load data');
        }
      } else {
        console.warn('SQLite not available');
      }
    };

    initializeData();
  }, []);

  const loadCustomers = async () => {
    try {
      const customersData = await getAllCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadSuppliers = async () => {
    try {
      const suppliersData = await getAllSuppliers();
      setSuppliers(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone.includes(searchQuery),
  );

  const openModal = (item?: Customer | Supplier) => {
    if (item) {
      setEditingItem(item);
      if (isCustomer(item)) {
        setFormData({
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email || '',
          address: item.address || '',
          company: '',
          products: '',
        });
      } else {
        setFormData({
          id: item.id,
          name: item.name,
          phone: item.phone,
          email: item.email || '',
          address: item.address || '',
          company: item.company,
          products: item.products,
        });
      }
    } else {
      setEditingItem(null);
      setFormData({
        id: 0, // Set to 0 for new items
        name: '',
        phone: '',
        email: '',
        address: '',
        company: '',
        products: '',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingItem(null);
  };

  const saveItem = async () => {
    if (!formData.name || !formData.phone) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    try {
      if (activeTab === 'customers') {
        if (editingItem && isCustomer(editingItem)) {
          // Update existing customer
          await updateCustomer(
            editingItem.id,
            formData.name,
            formData.phone,
            formData.email || undefined,
            formData.address || undefined,
          );
          Alert.alert('Success', 'Customer updated successfully');
        } else {
          // Insert new customer - don't pass ID
          await insertCustomer(
            formData.name,
            formData.phone,
            formData.email || undefined,
            formData.address || undefined,
          );
          Alert.alert('Success', 'Customer added successfully');
        }
        await loadCustomers();
      } else {
        if (!formData.company) {
          Alert.alert('Error', 'Please enter company name');
          return;
        }

        if (editingItem && isSupplier(editingItem)) {
          // Update existing supplier
          await updateSupplier(
            editingItem.id,
            formData.name,
            formData.phone,
            formData.company,
            formData.products,
            formData.email || undefined,
            formData.address || undefined,
          );
          Alert.alert('Success', 'Supplier updated successfully');
        } else {
          // Insert new supplier - don't pass ID
          await insertSupplier(
            formData.name,
            formData.phone,
            formData.company,
            formData.products,
            formData.email || undefined,
            formData.address || undefined,
          );
          Alert.alert('Success', 'Supplier added successfully');
        }
        await loadSuppliers();
      }

      closeModal();
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save data');
    }
  };

  const deleteItem = async (id: number) => {
    // Changed back to number
    Alert.alert(
      `Delete ${activeTab === 'customers' ? 'Customer' : 'Supplier'}`,
      `Are you sure you want to delete this ${activeTab === 'customers' ? 'customer' : 'supplier'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeTab === 'customers') {
                await deleteCustomer(id);
                await loadCustomers();
              } else {
                await deleteSupplier(id);
                await loadSuppliers();
              }
              Alert.alert(
                'Success',
                `${activeTab === 'customers' ? 'Customer' : 'Supplier'} deleted successfully`,
              );
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert(
                'Error',
                `Failed to delete ${activeTab === 'customers' ? 'customer' : 'supplier'}`,
              );
            }
          },
        },
      ],
    );
  };

  const renderCustomerCard = ({ item }: { item: Customer }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemDetail}>
          <Phone size={14} color="#6B7280" />
          <Text style={styles.itemDetailText}>{item.phone}</Text>
        </View>

        {item.email && (
          <View style={styles.itemDetail}>
            <Mail size={14} color="#6B7280" />
            <Text style={styles.itemDetailText}>{item.email}</Text>
          </View>
        )}

        {item.address && (
          <View style={styles.itemDetail}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.itemDetailText}>{item.address}</Text>
          </View>
        )}

        <View style={styles.customerStats}>
          <Text style={styles.statText}>
            Total Purchases: ₹{item.totalPurchases || 0}
          </Text>
          {item.lastPurchase && (
            <Text style={styles.statText}>
              Last Purchase: {item.lastPurchase}
            </Text>
          )}
        </View>
      </View>
    </View>
  );

  const renderSupplierCard = ({ item }: { item: Supplier }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemInfo}>
        <View style={styles.itemHeader}>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.companyName}>{item.company}</Text>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#0066CC" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteItem(item.id)}
            >
              <Trash2 size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.itemDetail}>
          <Phone size={14} color="#6B7280" />
          <Text style={styles.itemDetailText}>{item.phone}</Text>
        </View>

        {item.email && (
          <View style={styles.itemDetail}>
            <Mail size={14} color="#6B7280" />
            <Text style={styles.itemDetailText}>{item.email}</Text>
          </View>
        )}

        {item.address && (
          <View style={styles.itemDetail}>
            <MapPin size={14} color="#6B7280" />
            <Text style={styles.itemDetailText}>{item.address}</Text>
          </View>
        )}

        <View style={styles.productsContainer}>
          <Text style={styles.productsLabel}>Products:</Text>
          <View style={styles.productsTags}>
            {item.products.split(',').map((product, index) => (
              <Text key={index} style={styles.productTag}>
                {product.trim()}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#8B5CF6" barStyle="light-content" />

      {/* Header */}
      <LinearGradient colors={['#8B5CF6', '#7C3AED']} style={styles.header}>
        <Text style={styles.headerTitle}>
          {activeTab === 'customers' ? 'Customers' : 'Suppliers'}
        </Text>
        <Text style={styles.headerSubtitle}>
          Manage your {activeTab === 'customers' ? 'customers' : 'suppliers'}
        </Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
            onPress={() => setActiveTab('customers')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'customers' && styles.activeTabText,
              ]}
            >
              Customers
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'suppliers' && styles.activeTab]}
            onPress={() => setActiveTab('suppliers')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'suppliers' && styles.activeTabText,
              ]}
            >
              Suppliers
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Add Button */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#6B7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
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

        {/* Conditional Lists */}
        {activeTab === 'customers' ? (
          <FlatList<Customer>
            data={filteredCustomers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderCustomerCard}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        ) : (
          <FlatList<Supplier>
            data={filteredSuppliers}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderSupplierCard}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        )}
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
                {editingItem ? 'Edit' : 'Add'}{' '}
                {activeTab === 'customers' ? 'Customer' : 'Supplier'}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Name *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.name}
                  onChangeText={(text) =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="Enter name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone *</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phone}
                  onChangeText={(text) =>
                    setFormData({ ...formData, phone: text })
                  }
                  placeholder="Enter phone number"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.email}
                  onChangeText={(text) =>
                    setFormData({ ...formData, email: text })
                  }
                  placeholder="Enter email"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.textInput, styles.multilineInput]}
                  value={formData.address}
                  onChangeText={(text) =>
                    setFormData({ ...formData, address: text })
                  }
                  placeholder="Enter address"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {activeTab === 'suppliers' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Company *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={formData.company}
                      onChangeText={(text) =>
                        setFormData({ ...formData, company: text })
                      }
                      placeholder="Enter company name"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      Products (comma separated)
                    </Text>
                    <TextInput
                      style={[styles.textInput, styles.multilineInput]}
                      value={formData.products}
                      onChangeText={(text) =>
                        setFormData({ ...formData, products: text })
                      }
                      placeholder="e.g., Rice, Wheat, Pulses"
                      multiline
                      numberOfLines={2}
                    />
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveItem}>
                <LinearGradient
                  colors={['#138808', '#0F6605']}
                  style={styles.saveButtonGradient}
                >
                  <Text style={styles.saveButtonText}>
                    {editingItem ? 'Update' : 'Add'}{' '}
                    {activeTab === 'customers' ? 'Customer' : 'Supplier'}
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
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 15,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 15,
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
    color: '#1F2937',
  },
  addButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  companyName: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemDetailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  customerStats: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  productsContainer: {
    marginTop: 10,
  },
  productsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 5,
  },
  productsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  productTag: {
    fontSize: 10,
    backgroundColor: '#EDE9FE',
    color: '#7C3AED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
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
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
