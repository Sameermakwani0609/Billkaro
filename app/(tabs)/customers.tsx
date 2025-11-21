import { LinearGradient } from 'expo-linear-gradient';
import {
  CreditCard as Edit,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
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
          <Text style={styles.itemName}>{item.name}</Text>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#2563EB" />
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
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.companyName}>{item.company}</Text>
          </View>
          <View style={styles.itemActions}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => openModal(item)}
            >
              <Edit size={16} color="#2563EB" />
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
      <StatusBar backgroundColor="#1E3A8A" barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={['#2563EB', '#1D4ED8', '#3730A3']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {activeTab === 'customers'
              ? 'Manage Your Customers'
              : 'Manage Your Suppliers'}
          </Text>
          <Text style={styles.headerSubtitle}>
            {activeTab === 'customers'
              ? 'Customer Management Portal'
              : 'Supplier Management Portal'}
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={[
              styles.statCard,
              activeTab === 'customers' && styles.activeStatCard,
            ]}
            onPress={() => setActiveTab('customers')}
          >
            <View style={styles.statIconContainer}>
              <User
                size={24}
                color={activeTab === 'customers' ? '#2563EB' : '#64748B'}
              />
            </View>
            <View style={styles.statInfo}>
              <Text
                style={[
                  styles.statNumber,
                  activeTab === 'customers' && styles.activeStatNumber,
                ]}
              >
                {customers.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  activeTab === 'customers' && styles.activeStatLabel,
                ]}
              >
                Total Customers
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.statCard,
              activeTab === 'suppliers' && styles.activeStatCard,
            ]}
            onPress={() => setActiveTab('suppliers')}
          >
            <View style={styles.statIconContainer}>
              <Users
                size={24}
                color={activeTab === 'suppliers' ? '#2563EB' : '#64748B'}
              />
            </View>
            <View style={styles.statInfo}>
              <Text
                style={[
                  styles.statNumber,
                  activeTab === 'suppliers' && styles.activeStatNumber,
                ]}
              >
                {suppliers.length}
              </Text>
              <Text
                style={[
                  styles.statLabel,
                  activeTab === 'suppliers' && styles.activeStatLabel,
                ]}
              >
                Total Suppliers
              </Text>
            </View>
          </TouchableOpacity>
        </View>

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
              Customers ({customers.length})
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
              Suppliers ({suppliers.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search and Add Button */}
        <View style={styles.topSection}>
          <View style={styles.searchContainer}>
            <Search size={20} color="#64748B" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}... (${activeTab === 'customers' ? filteredCustomers.length : filteredSuppliers.length} found)`}
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

        {/* Conditional Lists */}
        {activeTab === 'customers' ? (
          filteredCustomers.length === 0 ? (
            <View style={styles.emptyState}>
              <User size={48} color="#64748B" />
              <Text style={styles.emptyStateTitle}>No Customers Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Get started by adding your first customer'}
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
            <Users size={48} color="#64748B" />
            <Text style={styles.emptyStateTitle}>No Suppliers Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery
                ? 'Try a different search term'
                : 'Get started by adding your first supplier'}
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                  placeholderTextColor="#64748B"
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
                      placeholderTextColor="#64748B"
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
                      placeholderTextColor="#64748B"
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
                  colors={['#2563EB', '#1D4ED8']}
                  style={styles.saveButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
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
    marginBottom: 5,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    opacity: 0.9,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeStatCard: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statInfo: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#64748B',
    marginBottom: 2,
  },
  activeStatNumber: {
    color: '#2563EB',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  activeStatLabel: {
    color: '#2563EB',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: '#2563EB',
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
  list: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
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
    marginBottom: 12,
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E293B',
  },
  companyName: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  itemDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemDetailText: {
    fontSize: 14,
    color: '#64748B',
    marginLeft: 8,
  },
  customerStats: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  statText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  productsContainer: {
    marginTop: 12,
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
    fontSize: 10,
    backgroundColor: '#EFF6FF',
    color: '#2563EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
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
