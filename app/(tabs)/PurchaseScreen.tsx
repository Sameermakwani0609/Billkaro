import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface PurchaseItem {
  id: string;
  name: string;
  mrp: number;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  unit: string;
  total: number;
}

export default function PurchaseScreen() {
  const [supplier, setSupplier] = useState('');
  const [billNo, setBillNo] = useState('');
  const [billType, setBillType] = useState<'Cash' | 'Credit'>('Cash');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [itemForm, setItemForm] = useState({
    id: '',
    name: '',
    mrp: '',
    purchasePrice: '',
    sellPrice: '',
    quantity: '',
    unit: 'pcs',
  });

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const units = ['pcs', 'unit', 'har', 'box'];

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
              total,
            }
          : item,
      );
      setItems(updatedItems);
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
        total,
      };
      setItems([...items, newItem]);
    }

    setItemForm({
      id: '',
      name: '',
      mrp: '',
      purchasePrice: '',
      sellPrice: '',
      quantity: '',
      unit: 'pcs',
    });
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
    });
  };

  const deleteItem = (id: string) => {
    Alert.alert('Confirm', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setItems(items.filter((item) => item.id !== id)),
      },
    ]);
  };

  const saveBill = () => {
    if (!supplier || !billNo || !date || items.length === 0) {
      Alert.alert(
        'Error',
        'Please fill all bill details and add at least one item',
      );
      return;
    }
    Alert.alert('Success', 'Bill saved successfully!');
    setSupplier('');
    setBillNo('');
    setDate(new Date());
    setBillType('Cash');
    setItems([]);
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const getTotalBillAmount = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const renderItem = (item: PurchaseItem, index: number) => (
    <View style={styles.itemCard} key={item.id}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemIndex}>#{index + 1}</Text>
        <Text style={styles.itemName} numberOfLines={1}>
          {item.name}
        </Text>
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Purchase Management</Text>
          <Text style={styles.subtitle}>Create and manage purchase bills</Text>
        </View>

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
              <TextInput
                style={styles.input}
                value={supplier}
                onChangeText={setSupplier}
                placeholder="Enter supplier name"
                placeholderTextColor="#999"
                returnKeyType="next"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Bill No *</Text>
              <TextInput
                style={styles.input}
                value={billNo}
                onChangeText={setBillNo}
                placeholder="Enter bill number"
                placeholderTextColor="#999"
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
                  onChange={onChangeDate}
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
                placeholderTextColor="#999"
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
                    <Picker.Item key={u} label={u} value={u} />
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
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
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Quantity and Add Button */}
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
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
                returnKeyType="done"
                onSubmitEditing={addItem}
              />
            </View>

            <View
              style={[
                styles.formGroup,
                { flex: 2, justifyContent: 'flex-end' },
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
                  {itemForm.id ? 'Update Item' : 'Add Item to Bill'}
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
            <TouchableOpacity style={styles.saveButton} onPress={saveBill}>
              <Text style={styles.saveButtonText}>💾 Save Purchase Bill</Text>
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
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
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
    minWidth: 100, // Ensure price fields don't get too small
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#475569',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1e293b',
  },
  priceInput: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#ffffff',
    color: '#1e293b',
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  picker: {
    color: '#1e293b',
  },
  dateButton: {
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  dateText: {
    fontSize: 16,
    color: '#1e293b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cashBadge: {
    backgroundColor: '#dcfce7',
  },
  creditBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
  },
  addButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  updateButton: {
    backgroundColor: '#8b5cf6',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  itemsCount: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  itemsCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94a3b8',
  },
  billSummary: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#059669',
  },
  itemCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
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
    color: '#6b7280',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  totalText: {
    color: '#059669',
    fontSize: 15,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#dbeafe',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    paddingTop: 8,
    marginBottom: 30,
  },
  saveButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
});
