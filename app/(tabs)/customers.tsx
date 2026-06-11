import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard as Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  Users,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
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
    id: 0,
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
        id: 0,
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
          await updateCustomer(
            editingItem.id,
            formData.name,
            formData.phone,
            formData.email || undefined,
            formData.address || undefined,
          );
          Alert.alert('Success', 'Customer updated successfully');
        } else {
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
          <View style={styles.itemHeaderLeft}>
            <View style={styles.avatar}>
              <Users size={20} color="#3B82F6" />
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#3B82F6" />
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
          <Phone size={14} color="#64748B" />
          <Text style={styles.itemDetailText}>{item.phone}</Text>
        </View>

        {item.email && (
          <View style={styles.itemDetail}>
            <Mail size={14} color="#64748B" />
            <Text style={styles.itemDetailText}>{item.email}</Text>
          </View>
        )}

        {item.address && (
          <View style={styles.itemDetail}>
            <MapPin size={14} color="#64748B" />
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
          <View style={styles.itemHeaderLeft}>
            <View style={styles.avatar}>
              <Truck size={20} color="#3B82F6" />
            </View>
            <View>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.companyName}>{item.company}</Text>
            </View>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#3B82F6" />
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
          <Phone size={14} color="#64748B" />
          <Text style={styles.itemDetailText}>{item.phone}</Text>
        </View>

        {item.email && (
          <View style={styles.itemDetail}>
            <Mail size={14} color="#64748B" />
            <Text style={styles.itemDetailText}>{item.email}</Text>
          </View>
        )}

        {item.address && (
          <View style={styles.itemDetail}>
            <MapPin size={14} color="#64748B" />
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
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      {/* Header with Dashboard Theme */}
      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <View style={styles.headerIconContainer}>
            {activeTab === 'customers' ? (
              <Users size={28} color="#FFFFFF" />
            ) : (
              <Truck size={28} color="#FFFFFF" />
            )}
          </View>
          <Text style={styles.headerTitle}>
            {activeTab === 'customers' ? 'Customers' : 'Suppliers'}
          </Text>
        </View>

        <View style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {activeTab === 'customers' ? customers.length : suppliers.length}
            </Text>
            <Text style={styles.statLabel}>
              Total {activeTab === 'customers' ? 'Customers' : 'Suppliers'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'customers' && styles.activeTab]}
            onPress={() => setActiveTab('customers')}
          >
            <Users
              size={16}
              color={activeTab === 'customers' ? '#FFFFFF' : '#64748B'}
            />
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
            <Truck
              size={16}
              color={activeTab === 'suppliers' ? '#FFFFFF' : '#64748B'}
            />
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
            <Search size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
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

        {/* Conditional Lists */}
        {activeTab === 'customers' ? (
          filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <Users size={64} color="#94A3B8" />
              <Text style={styles.emptyStateText}>No customers found</Text>
              <Text style={styles.emptyStateSubtext}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Tap the + button to add a customer'}
              </Text>
            </View>
          ) : (
            <FlatList<Customer>
              data={filteredCustomers}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderCustomerCard}
              showsVerticalScrollIndicator={false}
              style={styles.list}
            />
          )
        ) : filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Truck size={64} color="#94A3B8" />
            <Text style={styles.emptyStateText}>No suppliers found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Tap the + button to add a supplier'}
            </Text>
          </View>
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
                <X size={24} color="#64748B" />
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                  placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
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
                      placeholderTextColor="#94A3B8"
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
                  colors={['#3B82F6', '#1D4ED8']}
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
    backgroundColor: '#F1F5F9',
  },
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
    marginBottom: 16,
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
    justifyContent: 'center',
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
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#93C5FD',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#0F172A',
  },
  addButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
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
  list: {
    flex: 1,
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
  itemCard: {
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
  itemInfo: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  companyName: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetailText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
    flex: 1,
  },
  customerStats: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  productsContainer: {
    marginTop: 10,
  },
  productsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  productsTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  productTag: {
    fontSize: 11,
    backgroundColor: '#EFF6FF',
    color: '#3B82F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontWeight: '500',
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
  formContainer: {
    maxHeight: 450,
  },
  inputGroup: {
    marginBottom: 18,
  },
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
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
