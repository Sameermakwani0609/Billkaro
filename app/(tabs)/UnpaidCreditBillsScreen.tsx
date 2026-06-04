import { useNavigation } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Search,
  User,
  X,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
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
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  CustomerCreditSummary,
  getAllCreditBillsUnpaid,
  getCustomerCreditDetails,
  insertPayment,
  getAllBills,
} from '../../lib/db';

export default function UnpaidCreditBillsScreen() {
  const navigation = useNavigation();
  const [creditSummaries, setCreditSummaries] = useState<CustomerCreditSummary[]>([]);
  const [filteredSummaries, setFilteredSummaries] = useState<CustomerCreditSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerCreditSummary | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    loadUnpaidCreditBills();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, creditSummaries]);

  const loadUnpaidCreditBills = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      // First, check all bills to see what's in the database
      const allBills = await getAllBills();
      console.log('========== DEBUG INFO ==========');
      console.log('All bills in database:', JSON.stringify(allBills, null, 2));
      
      const creditBills = allBills.filter(bill => bill.billType === 'Credit');
      console.log('Credit bills only:', JSON.stringify(creditBills, null, 2));
      
      setDebugInfo(`Total Bills: ${allBills.length} | Credit Bills: ${creditBills.length}`);
      
      // Now get unpaid credit bills
      const summaries = await getAllCreditBillsUnpaid();
      console.log('Unpaid credit summaries:', JSON.stringify(summaries, null, 2));
      
      setCreditSummaries(summaries || []);
      setFilteredSummaries(summaries || []);
      
      if (summaries.length === 0) {
        if (creditBills.length === 0) {
          setDebugInfo(prev => prev + '\n\nNo credit bills found in database. Create some credit bills first!');
        } else {
          setDebugInfo(prev => prev + `\n\nFound ${creditBills.length} credit bill(s), but all are fully paid.`);
        }
      } else {
        setDebugInfo(prev => prev + `\n\nFound ${summaries.length} customer(s) with unpaid bills.`);
      }
    } catch (error) {
      console.error('Error loading unpaid credit bills:', error);
      setDebugInfo(`Error: ${error}`);
      Alert.alert('Error', 'Failed to load credit bills');
      setCreditSummaries([]);
      setFilteredSummaries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterCustomers = () => {
    if (!creditSummaries || creditSummaries.length === 0) {
      setFilteredSummaries([]);
      return;
    }
    
    if (searchQuery.trim() === '') {
      setFilteredSummaries(creditSummaries);
    } else {
      const filtered = creditSummaries.filter(
        (summary) =>
          summary.customerName && summary.customerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSummaries(filtered);
    }
  };

  const handleCustomerPress = async (customerId: number) => {
    try {
      const details = await getCustomerCreditDetails(customerId);
      if (details) {
        setSelectedCustomer(details);
      } else {
        Alert.alert('Info', 'No credit details found for this customer');
      }
    } catch (error) {
      console.error('Error loading customer details:', error);
      Alert.alert('Error', 'Failed to load customer details');
    }
  };

  const handleMakePayment = (bill: any) => {
    setSelectedBillForPayment(bill);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentNote('');
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedBillForPayment) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    
    const remainingAmount = selectedBillForPayment.remainingAmount || selectedBillForPayment.totalAmount || 0;
    if (amount > remainingAmount) {
      Alert.alert('Error', `Amount cannot exceed remaining amount of ${formatCurrency(remainingAmount)}`);
      return;
    }

    setProcessing(true);
    try {
      await insertPayment(
        selectedBillForPayment.id,
        selectedBillForPayment.customerId,
        amount,
        paymentMethod,
        paymentNote || undefined
      );
      
      Alert.alert('Success', `Payment of ${formatCurrency(amount)} recorded successfully`);
      setShowPaymentModal(false);
      await loadUnpaidCreditBills();
      
      if (selectedCustomer) {
        const updatedDetails = await getCustomerCreditDetails(selectedCustomer.customerId);
        if (updatedDetails) {
          setSelectedCustomer(updatedDetails);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      Alert.alert('Error', 'Failed to process payment');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid':
        return (
          <View style={[styles.statusBadge, styles.statusPaid]}>
            <CheckCircle size={12} color="#FFF" />
            <Text style={styles.statusText}>Paid</Text>
          </View>
        );
      case 'Partial':
        return (
          <View style={[styles.statusBadge, styles.statusPartial]}>
            <Clock size={12} color="#FFF" />
            <Text style={styles.statusText}>Partial</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, styles.statusUnpaid]}>
            <AlertCircle size={12} color="#FFF" />
            <Text style={styles.statusText}>Unpaid</Text>
          </View>
        );
    }
  };

  const renderCustomerCard = ({ item }: { item: CustomerCreditSummary }) => {
    const remainingAmount = item.remainingAmount || 0;
    const totalCreditAmount = item.totalCreditAmount || 0;
    const totalPaidAmount = item.totalPaidAmount || 0;
    const billsCount = item.bills?.length || 0;
    
    return (
      <TouchableOpacity style={styles.customerCard} onPress={() => handleCustomerPress(item.customerId)}>
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <User size={20} color="#2563EB" />
            <Text style={styles.customerName}>{item.customerName || 'Unknown'}</Text>
          </View>
          <View style={styles.totalAmount}>
            <Text style={styles.totalAmountLabel}>Total Due</Text>
            <Text style={styles.totalAmountValue}>{formatCurrency(remainingAmount)}</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Credit</Text>
            <Text style={styles.statValue}>{formatCurrency(totalCreditAmount)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={styles.statValue}>{formatCurrency(totalPaidAmount)}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Bills Count</Text>
            <Text style={styles.statValue}>{billsCount}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderBillItem = (bill: any) => {
    const billAmount = bill.totalAmount || 0;
    const paidAmount = bill.paidAmount || 0;
    const remainingAmount = bill.remainingAmount || 0;
    const paymentStatus = bill.paymentStatus || 'Unpaid';
    
    return (
      <View key={bill.id} style={styles.billDetailCard}>
        <View style={styles.billDetailHeader}>
          <View>
            <Text style={styles.billNo}>Bill #{bill.id || 'N/A'}</Text>
            <Text style={styles.billDate}>
              <Calendar size={12} color="#6B7280" /> {formatDate(bill.billingDate)}
            </Text>
          </View>
          {getStatusBadge(paymentStatus)}
        </View>

        <View style={styles.billAmounts}>
          <View>
            <Text style={styles.amountLabel}>Bill Amount</Text>
            <Text style={styles.billAmount}>{formatCurrency(billAmount)}</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={styles.paidAmount}>{formatCurrency(paidAmount)}</Text>
          </View>
          <View>
            <Text style={styles.amountLabel}>Remaining</Text>
            <Text style={styles.remainingAmount}>{formatCurrency(remainingAmount)}</Text>
          </View>
        </View>

        {remainingAmount > 0 && (
          <TouchableOpacity
            style={styles.payButton}
            onPress={() => handleMakePayment(bill)}
          >
            <Wallet size={16} color="#FFF" />
            <Text style={styles.payButtonText}>Make Payment</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#2563EB" barStyle="light-content" />
        <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payments</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </View>
      </View>
    );
  }

  const totalDueAmount = creditSummaries.reduce((sum, c) => sum + (c.remainingAmount || 0), 0);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#2563EB" barStyle="light-content" />

      <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payments</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={loadUnpaidCreditBills}>
            <RefreshCw size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Debug Info - Remove this after testing */}
      {debugInfo !== '' && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Search size={20} color="#6B7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name..."
          placeholderTextColor="#9CA3AF"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Due Amount</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalDueAmount)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Customers with Due</Text>
          <Text style={styles.summaryValue}>{creditSummaries.length}</Text>
        </View>
      </View>

      {/* Customer List */}
      <FlatList
        data={filteredSummaries}
        keyExtractor={(item) => item.customerId?.toString() || Math.random().toString()}
        renderItem={renderCustomerCard}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={loadUnpaidCreditBills}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Wallet size={48} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No unpaid credit bills found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search term' : 'Create a credit bill to see it here'}
            </Text>
            <TouchableOpacity style={styles.createBillButton} onPress={() => navigation.navigate('CreateBill' as never)}>
              <Text style={styles.createBillButtonText}>Create Credit Bill</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Customer Details Modal */}
      <Modal
        visible={!!selectedCustomer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#2563EB', '#1D4ED8']} style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>{selectedCustomer?.customerName || 'Customer Details'}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedCustomer(null)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            <View style={styles.customerDetailSummary}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Total Credit</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedCustomer?.totalCreditAmount || 0)}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Total Paid</Text>
                <Text style={styles.detailValue}>{formatCurrency(selectedCustomer?.totalPaidAmount || 0)}</Text>
              </View>
              <View style={[styles.detailCard, styles.dueCard]}>
                <Text style={styles.detailLabel}>Remaining Due</Text>
                <Text style={styles.dueValue}>{formatCurrency(selectedCustomer?.remainingAmount || 0)}</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Bills</Text>
            {selectedCustomer?.bills && selectedCustomer.bills.length > 0 ? (
              selectedCustomer.bills.map((bill) => renderBillItem(bill))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No bills found for this customer</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <View style={styles.paymentModalHeader}>
              <Text style={styles.paymentModalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.paymentModalBody}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Bill #</Text>
                <Text style={styles.paymentInfoValue}>{selectedBillForPayment?.id || 'N/A'}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Customer</Text>
                <Text style={styles.paymentInfoValue}>{selectedBillForPayment?.customerName || 'N/A'}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Total Amount</Text>
                <Text style={styles.paymentInfoValue}>{formatCurrency(selectedBillForPayment?.totalAmount || 0)}</Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Remaining Amount</Text>
                <Text style={[styles.paymentInfoValue, styles.remainingText]}>
                  {formatCurrency(selectedBillForPayment?.remainingAmount || selectedBillForPayment?.totalAmount || 0)}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Enter amount"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodButtons}>
                  {(['Cash', 'Card', 'UPI', 'Bank Transfer'] as const).map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.methodButton,
                        paymentMethod === method && styles.methodButtonActive,
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.methodButtonText,
                        paymentMethod === method && styles.methodButtonTextActive,
                      ]}>{method}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder="Add a note..."
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[styles.submitButton, processing && styles.submitButtonDisabled]}
                onPress={processPayment}
                disabled={processing}
              >
                <Text style={styles.submitButtonText}>
                  {processing ? 'Processing...' : 'Process Payment'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    width: 32,
  },
  refreshButton: {
    padding: 8,
  },
  debugContainer: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  debugText: {
    fontSize: 12,
    color: '#92400E',
    fontFamily: 'monospace',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: '#111827',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  createBillButton: {
    marginTop: 20,
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  createBillButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customerCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmount: {
    alignItems: 'flex-end',
  },
  totalAmountLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  totalAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  modalHeader: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  customerDetailSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dueCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  detailLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  dueValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  billDetailCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  billDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billNo: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  billDate: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusPaid: {
    backgroundColor: '#10B981',
  },
  statusPartial: {
    backgroundColor: '#F59E0B',
  },
  statusUnpaid: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '500',
  },
  billAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  paymentModalBody: {
    padding: 16,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  remainingText: {
    color: '#EF4444',
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  methodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  methodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
  },
  methodButtonActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  methodButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  methodButtonTextActive: {
    color: '#FFF',
  },
  submitButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});