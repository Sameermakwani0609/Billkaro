import * as FileSystem from 'expo-file-system/legacy';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  History,
  RefreshCw,
  Search,
  Share2,
  User,
  Wallet,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
  CustomerCreditSummary,
  getAllCreditBillsUnpaid,
  getCustomerCreditDetails,
  getPaymentsByBillId,
  insertPayment,
  Payment,
} from '../lib/db';

export default function UnpaidCreditBillsScreen() {
  const navigation = useNavigation();
  const [creditSummaries, setCreditSummaries] = useState<
    CustomerCreditSummary[]
  >([]);
  const [filteredSummaries, setFilteredSummaries] = useState<
    CustomerCreditSummary[]
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] =
    useState<CustomerCreditSummary | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] =
    useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'Cash' | 'Card' | 'UPI' | 'Bank Transfer'
  >('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [selectedBillForHistory, setSelectedBillForHistory] =
    useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<Payment[]>([]);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sharingTransactionId, setSharingTransactionId] = useState<
    number | null
  >(null);

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
      const summaries = await getAllCreditBillsUnpaid();
      setCreditSummaries(summaries || []);
      setFilteredSummaries(summaries || []);
    } catch (error) {
      console.error('Error loading unpaid credit bills:', error);
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
          summary.customerName &&
          summary.customerName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
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

  const handleViewPaymentHistory = async (bill: any) => {
    try {
      const payments = await getPaymentsByBillId(bill.id);
      setPaymentHistory(payments);
      setSelectedBillForHistory(bill);
      setShowPaymentHistory(true);
    } catch (error) {
      console.error('Error loading payment history:', error);
      Alert.alert('Error', 'Failed to load payment history');
    }
  };

  const processPayment = async () => {
    if (!selectedBillForPayment) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const remainingAmount =
      selectedBillForPayment.remainingAmount ||
      selectedBillForPayment.totalAmount ||
      0;
    if (amount > remainingAmount) {
      Alert.alert(
        'Error',
        `Amount cannot exceed remaining amount of ${formatCurrency(remainingAmount)}`,
      );
      return;
    }

    setProcessing(true);
    try {
      await insertPayment(
        selectedBillForPayment.id,
        selectedBillForPayment.customerId,
        amount,
        paymentMethod,
        paymentNote || undefined,
      );

      Alert.alert(
        'Success',
        `Payment of ${formatCurrency(amount)} recorded successfully`,
      );
      setShowPaymentModal(false);
      await loadUnpaidCreditBills();

      if (selectedCustomer) {
        const updatedDetails = await getCustomerCreditDetails(
          selectedCustomer.customerId,
        );
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

  const generateSingleTransactionReceiptHTML = (
    bill: any,
    payment: Payment,
  ) => {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Receipt</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .receipt-container {
            max-width: 500px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .shop-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .receipt-title {
            font-size: 20px;
            margin-top: 8px;
            opacity: 0.95;
          }
          .receipt-no {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 8px;
          }
          .content {
            padding: 30px;
          }
          .customer-info {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid #E5E7EB;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .info-label {
            font-weight: 600;
            width: 120px;
            color: #6B7280;
          }
          .info-value {
            color: #111827;
            flex: 1;
          }
          .amount-section {
            background: #F0FDF4;
            padding: 30px;
            border-radius: 8px;
            margin-top: 16px;
            border: 1px solid #DCFCE7;
            text-align: center;
          }
          .amount-label {
            font-size: 16px;
            font-weight: 500;
            color: #166534;
            margin-bottom: 8px;
          }
          .amount-value {
            font-weight: 700;
            color: #166534;
            font-size: 32px;
          }
          .footer {
            background: #F9FAFB;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #6B7280;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .receipt-container {
              box-shadow: none;
              border-radius: 0;
            }
            .header {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="shop-name">Bill-Karo</div>
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div class="receipt-no">Receipt #: RCP-${payment.id}-${Date.now()}</div>
            <div class="receipt-no">Date: ${currentDate} | Time: ${currentTime}</div>
          </div>

          <div class="content">
            <div class="customer-info">
              <div class="info-row">
                <div class="info-label">Customer Name:</div>
                <div class="info-value">${escapeHtml(bill.customerName || 'N/A')}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Bill Number:</div>
                <div class="info-value">#${bill.id || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Bill Date:</div>
                <div class="info-value">${bill.billingDate ? new Date(bill.billingDate).toLocaleDateString('en-GB') : 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Date:</div>
                <div class="info-value">${new Date(payment.paymentDate).toLocaleDateString('en-GB')}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Payment Method:</div>
                <div class="info-value">${payment.paymentMethod}</div>
              </div>
              ${
                payment.note
                  ? `
              <div class="info-row">
                <div class="info-label">Note:</div>
                <div class="info-value">${escapeHtml(payment.note)}</div>
              </div>
              `
                  : ''
              }
            </div>

            <div class="amount-section">
              <div class="amount-label">Receipt Amount</div>
              <div class="amount-value">₹${payment.amount.toFixed(2)}</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your payment!</p>
            <p>This is a computer generated receipt | Valid without signature</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const generateReceiptHTML = (bill: any, payments: Payment[]) => {
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const currentDate = new Date().toLocaleDateString('en-GB');
    const currentTime = new Date().toLocaleTimeString();

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Full Payment Receipt</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
          }
          .receipt-container {
            max-width: 700px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #1D4ED8 100%);
            color: white;
            padding: 30px;
            text-align: center;
          }
          .shop-name {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .receipt-title {
            font-size: 20px;
            margin-top: 8px;
            opacity: 0.95;
          }
          .receipt-no {
            font-size: 12px;
            opacity: 0.8;
            margin-top: 8px;
          }
          .content {
            padding: 30px;
          }
          .customer-info {
            background: #F9FAFB;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 24px;
            border: 1px solid #E5E7EB;
          }
          .info-row {
            display: flex;
            margin-bottom: 12px;
            font-size: 14px;
          }
          .info-label {
            font-weight: 600;
            width: 120px;
            color: #6B7280;
          }
          .info-value {
            color: #111827;
            flex: 1;
          }
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
            margin-bottom: 24px;
          }
          .payment-table th {
            background: #F3F4F6;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #E5E7EB;
          }
          .payment-table td {
            padding: 12px;
            border-bottom: 1px solid #E5E7EB;
            color: #111827;
          }
          .total-section {
            background: #F0FDF4;
            padding: 30px;
            border-radius: 8px;
            margin-top: 24px;
            border: 1px solid #DCFCE7;
            text-align: center;
          }
          .total-label {
            font-size: 16px;
            font-weight: 500;
            color: #166534;
            margin-bottom: 8px;
          }
          .total-amount {
            font-weight: 700;
            color: #166534;
            font-size: 32px;
          }
          .footer {
            background: #F9FAFB;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #E5E7EB;
            font-size: 12px;
            color: #6B7280;
          }
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .receipt-container {
              box-shadow: none;
              border-radius: 0;
            }
            .header {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="shop-name">Bill-Karo</div>
            <div class="receipt-title">PAYMENT RECEIPT</div>
            <div class="receipt-no">Receipt #: RCP-${bill.id}-${Date.now()}</div>
            <div class="receipt-no">Date: ${currentDate} | Time: ${currentTime}</div>
          </div>

          <div class="content">
            <div class="customer-info">
              <div class="info-row">
                <div class="info-label">Customer Name:</div>
                <div class="info-value">${escapeHtml(bill.customerName || 'N/A')}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Bill Number:</div>
                <div class="info-value">#${bill.id || 'N/A'}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Bill Date:</div>
                <div class="info-value">${bill.billingDate ? new Date(bill.billingDate).toLocaleDateString('en-GB') : 'N/A'}</div>
              </div>
            </div>

            <div style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">Payment History</div>
            ${
              payments.length > 0
                ? `
              <table class="payment-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  ${payments
                    .map(
                      (payment) => `
                    <tr>
                      <td>${new Date(payment.paymentDate).toLocaleDateString('en-GB')}</td>
                      <td>₹${payment.amount.toFixed(2)}</td>
                      <td>${payment.paymentMethod}</td>
                      <td>${escapeHtml(payment.note || '-')}</td>
                    </tr>
                  `,
                    )
                    .join('')}
                </tbody>
              </table>
            `
                : '<p style="color: #6B7280;">No payment records found</p>'
            }

            <div class="total-section">
              <div class="total-label">Total Paid Amount</div>
              <div class="total-amount">₹${totalPaid.toFixed(2)}</div>
            </div>
          </div>

          <div class="footer">
            <p>Thank you for your business!</p>
            <p>This is a computer generated receipt | Valid without signature</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const escapeHtml = (text: string) => {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const shareSingleTransaction = async (bill: any, payment: Payment) => {
    setSharingTransactionId(payment.id);
    try {
      const html = generateSingleTransactionReceiptHTML(bill, payment);
      const fileName = `receipt_${payment.id}_${Date.now()}.html`;

      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        throw new Error('Document directory not available');
      }

      const fileUri = documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Share Payment Receipt',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert(
        'Error',
        'Failed to share receipt: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    } finally {
      setSharingTransactionId(null);
    }
  };

  const shareReceipt = async (bill: any, payments: Payment[]) => {
    setGeneratingPDF(true);
    try {
      const html = generateReceiptHTML(bill, payments);
      const fileName = `full_receipt_${bill.id}_${Date.now()}.html`;

      const documentDirectory = FileSystem.documentDirectory;
      if (!documentDirectory) {
        throw new Error('Document directory not available');
      }

      const fileUri = documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, html, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (isSharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/html',
          dialogTitle: 'Share Full Payment Receipt',
        });
      } else {
        Alert.alert('Error', 'Sharing is not available on this device');
      }
    } catch (error) {
      console.error('Error sharing receipt:', error);
      Alert.alert(
        'Error',
        'Failed to share receipt: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      );
    } finally {
      setGeneratingPDF(false);
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
      <TouchableOpacity
        style={styles.customerCard}
        onPress={() => handleCustomerPress(item.customerId)}
      >
        <View style={styles.customerHeader}>
          <View style={styles.customerInfo}>
            <View style={styles.avatar}>
              <User size={20} color="#FFFFFF" />
            </View>
            <Text style={styles.customerName}>
              {item.customerName || 'Unknown'}
            </Text>
          </View>
          <View style={styles.totalAmount}>
            <Text style={styles.totalAmountLabel}>Total Due</Text>
            <Text style={styles.totalAmountValue}>
              {formatCurrency(remainingAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Credit</Text>
            <Text style={styles.statValue}>
              {formatCurrency(totalCreditAmount)}
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Paid</Text>
            <Text style={styles.statValue}>
              {formatCurrency(totalPaidAmount)}
            </Text>
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
              <Calendar size={12} color="#64748B" />{' '}
              {formatDate(bill.billingDate)}
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
            <Text style={styles.remainingAmount}>
              {formatCurrency(remainingAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.billActions}>
          {remainingAmount > 0 && (
            <TouchableOpacity
              style={styles.payButton}
              onPress={() => handleMakePayment(bill)}
            >
              <Wallet size={16} color="#FFF" />
              <Text style={styles.payButtonText}>Make Payment</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => handleViewPaymentHistory(bill)}
          >
            <History size={16} color="#3B82F6" />
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
        <LinearGradient
          colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Payments</Text>
            <View style={styles.headerRight} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading payment records...</Text>
        </View>
      </View>
    );
  }

  const totalDueAmount = creditSummaries.reduce(
    (sum, c) => sum + (c.remainingAmount || 0),
    0,
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#0F172A" barStyle="light-content" />

      <LinearGradient
        colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Payments</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {creditSummaries.length} Customers with Due
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={loadUnpaidCreditBills}
          >
            <RefreshCw size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <Search size={20} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by customer name..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <X size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.summaryContainer}>
        <LinearGradient
          colors={['#EFF6FF', '#DBEAFE']}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>Total Due Amount</Text>
          <Text style={styles.summaryValue}>
            {formatCurrency(totalDueAmount)}
          </Text>
        </LinearGradient>
        <LinearGradient
          colors={['#F0FDF4', '#DCFCE7']}
          style={styles.summaryCard}
        >
          <Text style={styles.summaryLabel}>Customers with Due</Text>
          <Text style={styles.summaryValue}>{creditSummaries.length}</Text>
        </LinearGradient>
      </View>

      <FlatList
        data={filteredSummaries}
        keyExtractor={(item) =>
          item.customerId?.toString() || Math.random().toString()
        }
        renderItem={renderCustomerCard}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={loadUnpaidCreditBills}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Wallet size={48} color="#94A3B8" />
            <Text style={styles.emptyStateText}>
              No unpaid credit bills found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery
                ? 'Try a different search term'
                : 'Create a credit bill to see it here'}
            </Text>
            <TouchableOpacity
              style={styles.createBillButton}
              onPress={() => navigation.navigate('CreateBill' as never)}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                style={styles.createBillButtonGradient}
              >
                <Text style={styles.createBillButtonText}>
                  Create Credit Bill
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal
        visible={!!selectedCustomer}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCustomer(null)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>
                {selectedCustomer?.customerName || 'Customer Details'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedCustomer(null)}
              >
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <ScrollView style={styles.modalContent}>
            <View style={styles.customerDetailSummary}>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Total Credit</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(selectedCustomer?.totalCreditAmount || 0)}
                </Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailLabel}>Total Paid</Text>
                <Text style={styles.detailValue}>
                  {formatCurrency(selectedCustomer?.totalPaidAmount || 0)}
                </Text>
              </View>
              <View style={[styles.detailCard, styles.dueCard]}>
                <Text style={styles.detailLabel}>Remaining Due</Text>
                <Text style={styles.dueValue}>
                  {formatCurrency(selectedCustomer?.remainingAmount || 0)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Bills</Text>
            {selectedCustomer?.bills && selectedCustomer.bills.length > 0 ? (
              selectedCustomer.bills.map((bill) => renderBillItem(bill))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  No bills found for this customer
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showPaymentHistory}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentHistory(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentHistoryModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.paymentModalHeader}
            >
              <Text style={styles.paymentModalTitle}>Payment History</Text>
              <TouchableOpacity onPress={() => setShowPaymentHistory(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.paymentModalBody}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Bill #</Text>
                <Text style={styles.paymentInfoValue}>
                  {selectedBillForHistory?.id || 'N/A'}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Customer</Text>
                <Text style={styles.paymentInfoValue}>
                  {selectedBillForHistory?.customerName || 'N/A'}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Total Amount</Text>
                <Text style={styles.paymentInfoValue}>
                  {formatCurrency(selectedBillForHistory?.totalAmount || 0)}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Total Paid</Text>
                <Text style={styles.paymentInfoValue}>
                  {formatCurrency(
                    paymentHistory.reduce((sum, p) => sum + p.amount, 0),
                  )}
                </Text>
              </View>

              {paymentHistory.length > 0 ? (
                <>
                  <Text style={styles.historyTitle}>Payment Transactions</Text>
                  {paymentHistory.map((payment, index) => (
                    <View key={payment.id} style={styles.historyItem}>
                      <View style={styles.historyHeader}>
                        <View>
                          <Text style={styles.historyDate}>
                            {formatDate(payment.paymentDate)}
                          </Text>
                          <View style={styles.historyMethodBadge}>
                            <Text style={styles.historyMethodText}>
                              {payment.paymentMethod}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={styles.shareTransactionButton}
                          onPress={() =>
                            shareSingleTransaction(
                              selectedBillForHistory,
                              payment,
                            )
                          }
                          disabled={sharingTransactionId === payment.id}
                        >
                          {sharingTransactionId === payment.id ? (
                            <ActivityIndicator size="small" color="#3B82F6" />
                          ) : (
                            <>
                              <Share2 size={16} color="#3B82F6" />
                              <Text style={styles.shareTransactionButtonText}>
                                Share Receipt
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                      <View style={styles.historyDetails}>
                        <Text style={styles.historyAmount}>
                          Amount: {formatCurrency(payment.amount)}
                        </Text>
                        {payment.note && (
                          <Text style={styles.historyNote}>
                            Note: {payment.note}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>
                    No payment records found
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={styles.shareButton}
                onPress={() =>
                  shareReceipt(selectedBillForHistory, paymentHistory)
                }
                disabled={generatingPDF}
              >
                <LinearGradient
                  colors={['#3B82F6', '#1D4ED8']}
                  style={styles.shareButtonGradient}
                >
                  {generatingPDF ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Share2 size={20} color="#FFF" />
                      <Text style={styles.shareButtonText}>
                        Share All Receipts
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContent}>
            <LinearGradient
              colors={['#0F172A', '#1E3A8A']}
              style={styles.paymentModalHeader}
            >
              <Text style={styles.paymentModalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.paymentModalBody}>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Bill #</Text>
                <Text style={styles.paymentInfoValue}>
                  {selectedBillForPayment?.id || 'N/A'}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Customer</Text>
                <Text style={styles.paymentInfoValue}>
                  {selectedBillForPayment?.customerName || 'N/A'}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Total Amount</Text>
                <Text style={styles.paymentInfoValue}>
                  {formatCurrency(selectedBillForPayment?.totalAmount || 0)}
                </Text>
              </View>
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentInfoLabel}>Remaining Amount</Text>
                <Text style={[styles.paymentInfoValue, styles.remainingText]}>
                  {formatCurrency(
                    selectedBillForPayment?.remainingAmount ||
                      selectedBillForPayment?.totalAmount ||
                      0,
                  )}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Amount *</Text>
                <TextInput
                  style={styles.input}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  placeholder="Enter amount"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.methodButtons}>
                  {(['Cash', 'Card', 'UPI', 'Bank Transfer'] as const).map(
                    (method) => (
                      <TouchableOpacity
                        key={method}
                        style={[
                          styles.methodButton,
                          paymentMethod === method && styles.methodButtonActive,
                        ]}
                        onPress={() => setPaymentMethod(method)}
                      >
                        <Text
                          style={[
                            styles.methodButtonText,
                            paymentMethod === method &&
                              styles.methodButtonTextActive,
                          ]}
                        >
                          {method}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Note (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={paymentNote}
                  onChangeText={setPaymentNote}
                  placeholder="Add a note..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  processing && styles.submitButtonDisabled,
                ]}
                onPress={processPayment}
                disabled={processing}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={styles.submitButtonGradient}
                >
                  <Text style={styles.submitButtonText}>
                    {processing ? 'Processing...' : 'Process Payment'}
                  </Text>
                </LinearGradient>
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
    backgroundColor: '#F1F5F9',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 20,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    elevation: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  headerBadgeText: {
    fontSize: 11,
    color: '#93C5FD',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  headerRight: {
    width: 48,
  },
  refreshButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  summaryContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
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
    color: '#64748B',
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
  createBillButton: {
    marginTop: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  createBillButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createBillButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  customerCard: {
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
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  totalAmount: {
    alignItems: 'flex-end',
  },
  totalAmountLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  totalAmountValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#F1F5F9',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 58 : 44,
    paddingBottom: 16,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  customerDetailSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  detailCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dueCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  dueValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#EF4444',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  billDetailCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  billDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  billNo: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  billDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
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
    fontWeight: '600',
  },
  billAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  billAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10B981',
  },
  remainingAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  payButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  payButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  historyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#3B82F6',
  },
  historyButtonText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  paymentHistoryModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
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
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  paymentModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  paymentModalBody: {
    padding: 20,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentInfoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  paymentInfoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  remainingText: {
    color: '#EF4444',
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
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
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  methodButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  methodButtonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  methodButtonTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 20,
    marginBottom: 12,
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  historyMethodBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  historyMethodText: {
    fontSize: 10,
    color: '#3B82F6',
    fontWeight: '600',
  },
  historyDetails: {
    marginTop: 4,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyNote: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  shareTransactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  shareTransactionButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  shareButton: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  shareButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
