import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  TextInput,
  Modal,
  Alert,
  Share,
  ActivityIndicator 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Package, 
  Users,
  ArrowLeft,
  User,
  X,
  FileText,
  Wallet,
  Download,
  Printer,
  CreditCard,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react-native';
import { useNavigation } from 'expo-router';
import {
  CustomerStatement,
  getAllCustomers,
  getCustomerStatement,
  Customer,
  getAllCreditBillsUnpaid,
  CustomerCreditSummary
} from '../../lib/db';

interface SalesData {
  date: string;
  amount: number;
  items: number;
  invoices: number;
}

export default function Reports() {
  const navigation = useNavigation();
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'sales' | 'statement' | 'unpaid'>('sales');
  
  // Statement States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  
  const [startDate, setStartDate] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return date;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  
  // Unpaid Credit Bills States
  const [unpaidSummaries, setUnpaidSummaries] = useState<CustomerCreditSummary[]>([]);
  const [unpaidLoading, setUnpaidLoading] = useState(false);
  
  const salesData: SalesData[] = [
    { date: '2024-01-15', amount: 12450, items: 45, invoices: 8 },
    { date: '2024-01-14', amount: 8750, items: 32, invoices: 6 },
    { date: '2024-01-13', amount: 15200, items: 58, invoices: 12 },
    { date: '2024-01-12', amount: 9800, items: 38, invoices: 7 },
    { date: '2024-01-11', amount: 11300, items: 42, invoices: 9 },
  ];

  const topProducts = [
    { name: 'Basmati Rice 1kg', sold: 25, revenue: 3000 },
    { name: 'Tata Salt 1kg', sold: 50, revenue: 1250 },
    { name: 'Maggi Noodles', sold: 80, revenue: 1200 },
    { name: 'Amul Butter 500g', sold: 15, revenue: 2700 },
    { name: 'Fortune Oil 1L', sold: 20, revenue: 2800 },
  ];

  useEffect(() => {
    loadCustomers();
    loadUnpaidCreditBills();
  }, []);

  useEffect(() => {
    if (customerSearch.length > 0) {
      const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone.includes(customerSearch)
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customers]);

  const loadCustomers = async () => {
    try {
      const allCustomers = await getAllCustomers();
      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadUnpaidCreditBills = async () => {
    setUnpaidLoading(true);
    try {
      const summaries = await getAllCreditBillsUnpaid();
      setUnpaidSummaries(summaries);
    } catch (error) {
      console.error('Error loading unpaid credit bills:', error);
    } finally {
      setUnpaidLoading(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const generateStatement = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }

    setStatementLoading(true);
    try {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      const result = await getCustomerStatement(
        selectedCustomer.id,
        startDateStr,
        endDateStr
      );
      setStatement(result);
      setShowStatementModal(true);
    } catch (error) {
      console.error('Error generating statement:', error);
      Alert.alert('Error', 'Failed to generate statement');
    } finally {
      setStatementLoading(false);
    }
  };

  const handleShareStatement = async () => {
    if (!statement) return;
    
    let statementText = `CUSTOMER STATEMENT\n`;
    statementText += `========================\n\n`;
    statementText += `Customer: ${statement.customerName}\n`;
    statementText += `Phone: ${statement.customerPhone}\n`;
    if (statement.customerAddress) statementText += `Address: ${statement.customerAddress}\n`;
    statementText += `Period: ${formatDate(new Date(statement.startDate))} to ${formatDate(new Date(statement.endDate))}\n\n`;
    statementText += `Opening Balance: ${formatCurrency(statement.openingBalance)}\n\n`;
    statementText += `TRANSACTIONS:\n`;
    statementText += `========================\n`;
    statementText += `Date       | Type    | Description           | Debit    | Credit   | Balance\n`;
    statementText += `------------------------------------------------------------------------\n`;
    
    for (const trans of statement.transactions) {
      const date = new Date(trans.date).toLocaleDateString('en-GB');
      const type = trans.type === 'Bill' ? 'BILL' : 'PAYMT';
      const desc = trans.description.substring(0, 20).padEnd(20);
      const debit = trans.debit > 0 ? formatCurrency(trans.debit).padEnd(9) : ' '.padEnd(9);
      const credit = trans.credit > 0 ? formatCurrency(trans.credit).padEnd(9) : ' '.padEnd(9);
      const balance = formatCurrency(trans.balance);
      statementText += `${date} | ${type} | ${desc} | ${debit} | ${credit} | ${balance}\n`;
    }
    
    statementText += `\n------------------------------------------------------------------------\n`;
    statementText += `SUMMARY:\n`;
    statementText += `Total Bills (Credit): ${formatCurrency(statement.totalDebit)}\n`;
    statementText += `Total Payments: ${formatCurrency(statement.totalCredit)}\n`;
    statementText += `Closing Balance: ${formatCurrency(statement.closingBalance)}\n`;
    
    try {
      await Share.share({
        message: statementText,
        title: `Statement - ${statement.customerName}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '₹0.00';
    }
    return `₹${amount.toFixed(2)}`;
  };

  const getTotalSales = () => salesData.reduce((sum, day) => sum + day.amount, 0);
  const getTotalItems = () => salesData.reduce((sum, day) => sum + day.items, 0);
  const getTotalInvoices = () => salesData.reduce((sum, day) => sum + day.invoices, 0);
  const getAverageSale = () => Math.round(getTotalSales() / getTotalInvoices());

  const periods = [
    { key: 'today' as const, label: 'Today' },
    { key: 'week' as const, label: 'This Week' },
    { key: 'month' as const, label: 'This Month' },
  ];

  const stats = [
    { 
      title: 'Total Sales', 
      value: `₹${getTotalSales().toLocaleString()}`, 
      icon: DollarSign, 
      color: '#138808',
      change: '+12.5%'
    },
    { 
      title: 'Items Sold', 
      value: getTotalItems().toString(), 
      icon: Package, 
      color: '#0066CC',
      change: '+8.2%'
    },
    { 
      title: 'Total Invoices', 
      value: getTotalInvoices().toString(), 
      icon: BarChart3, 
      color: '#FF9933',
      change: '+15.3%'
    },
    { 
      title: 'Average Sale', 
      value: `₹${getAverageSale()}`, 
      icon: TrendingUp, 
      color: '#8B5CF6',
      change: '+5.7%'
    },
  ];

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

  const renderTransactionRow = (transaction: any, index: number) => (
    <View key={index} style={styles.transactionRow}>
      <View style={styles.transactionDate}>
        <Text style={styles.transactionDateText}>
          {new Date(transaction.date).toLocaleDateString('en-GB')}
        </Text>
      </View>
      <View style={styles.transactionType}>
        {transaction.type === 'Bill' ? (
          <View style={styles.billTypeBadge}>
            <FileText size={12} color="#FFF" />
            <Text style={styles.billTypeText}>Credit Bill</Text>
          </View>
        ) : (
          <View style={styles.paymentTypeBadge}>
            <Wallet size={12} color="#FFF" />
            <Text style={styles.paymentTypeText}>{transaction.paymentMethod || 'Payment'}</Text>
          </View>
        )}
      </View>
      <View style={styles.transactionDescription}>
        <Text style={styles.transactionDescText} numberOfLines={2}>
          {transaction.description}
        </Text>
        {transaction.note && (
          <Text style={styles.transactionNote}>{transaction.note}</Text>
        )}
      </View>
      <View style={styles.transactionAmounts}>
        {transaction.debit > 0 && (
          <View style={styles.debitContainer}>
            <TrendingUp size={12} color="#EF4444" />
            <Text style={styles.debitAmount}>{formatCurrency(transaction.debit)}</Text>
          </View>
        )}
        {transaction.credit > 0 && (
          <View style={styles.creditContainer}>
            <TrendingDown size={12} color="#10B981" />
            <Text style={styles.creditAmount}>{formatCurrency(transaction.credit)}</Text>
          </View>
        )}
        <Text style={styles.balanceAmount}>{formatCurrency(transaction.balance)}</Text>
      </View>
    </View>
  );

  const renderSalesTab = () => (
    <>
      <View style={styles.periodSelector}>
        {periods.map((period) => (
          <TouchableOpacity
            key={period.key}
            style={[
              styles.periodButton,
              selectedPeriod === period.key && styles.activePeriodButton
            ]}
            onPress={() => setSelectedPeriod(period.key)}
          >
            <Text style={[
              styles.periodButtonText,
              selectedPeriod === period.key && styles.activePeriodButtonText
            ]}>
              {period.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContainer}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <stat.icon size={20} color={stat.color} />
              </View>
              <Text style={[styles.statChange, { color: stat.color }]}>{stat.change}</Text>
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Daily Sales History</Text>
        <View style={styles.salesHistoryCard}>
          {salesData.map((day, index) => (
            <View key={index} style={styles.salesHistoryItem}>
              <View style={styles.salesHistoryDate}>
                <Calendar size={16} color="#6B7280" />
                <Text style={styles.salesHistoryDateText}>
                  {new Date(day.date).toLocaleDateString('en-IN', { 
                    day: 'numeric', 
                    month: 'short' 
                  })}
                </Text>
              </View>
              <View style={styles.salesHistoryDetails}>
                <Text style={styles.salesHistoryAmount}>₹{day.amount.toLocaleString()}</Text>
                <Text style={styles.salesHistoryItems}>{day.items} items • {day.invoices} bills</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Selling Products</Text>
        <View style={styles.topProductsCard}>
          {topProducts.map((product, index) => (
            <View key={index} style={styles.topProductItem}>
              <View style={styles.productRank}>
                <Text style={styles.rankNumber}>{index + 1}</Text>
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productStats}>
                  Sold: {product.sold} • Revenue: ₹{product.revenue.toLocaleString()}
                </Text>
              </View>
              <View style={styles.productProgress}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${(product.sold / 100) * 100}%` }
                  ]} 
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Performance Insights</Text>
        <View style={styles.insightsCard}>
          <View style={styles.insightItem}>
            <View style={styles.insightIcon}>
              <TrendingUp size={20} color="#138808" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Sales Growth</Text>
              <Text style={styles.insightDescription}>
                Your sales have increased by 15.3% compared to last week
              </Text>
            </View>
          </View>
          
          <View style={styles.insightItem}>
            <View style={styles.insightIcon}>
              <Package size={20} color="#FF9933" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Inventory Alert</Text>
              <Text style={styles.insightDescription}>
                5 products are running low on stock and need restocking
              </Text>
            </View>
          </View>
          
          <View style={styles.insightItem}>
            <View style={styles.insightIcon}>
              <Users size={20} color="#8B5CF6" />
            </View>
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Customer Activity</Text>
              <Text style={styles.insightDescription}>
                3 new customers added this week with total purchases of ₹4,200
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );

  const renderStatementTab = () => (
    <View style={styles.statementTab}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Customer</Text>
        <View style={styles.customerInputContainer}>
          <User size={20} color="#6B7280" />
          <TextInput
            style={styles.customerInput}
            placeholder="Search customer by name or phone..."
            value={customerSearch}
            onChangeText={setCustomerSearch}
            onFocus={() => setShowCustomerDropdown(true)}
          />
          {customerSearch !== '' && (
            <TouchableOpacity onPress={() => {
              setCustomerSearch('');
              setSelectedCustomer(null);
            }}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>

        {showCustomerDropdown && filteredCustomers.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView nestedScrollEnabled={true} style={styles.dropdownList}>
              {filteredCustomers.map((customer) => (
                <TouchableOpacity
                  key={customer.id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectCustomer(customer)}
                >
                  <View>
                    <Text style={styles.dropdownName}>{customer.name}</Text>
                    <Text style={styles.dropdownPhone}>{customer.phone}</Text>
                  </View>
                  {selectedCustomer?.id === customer.id && (
                    <View style={styles.selectedCheck}>
                      <Text style={styles.selectedCheckText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Date Range</Text>
        
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Calendar size={20} color="#EC4899" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>From Date</Text>
            <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Calendar size={20} color="#EC4899" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>To Date</Text>
            <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(date);
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}

      <TouchableOpacity
        style={[styles.generateButton, (!selectedCustomer || statementLoading) && styles.generateButtonDisabled]}
        onPress={generateStatement}
        disabled={!selectedCustomer || statementLoading}
      >
        {statementLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <FileText size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>Generate Statement</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderUnpaidTab = () => (
    <View style={styles.unpaidTab}>
      {unpaidLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
          <Text style={styles.loadingText}>Loading unpaid bills...</Text>
        </View>
      ) : unpaidSummaries.length === 0 ? (
        <View style={styles.emptyState}>
          <Wallet size={48} color="#9CA3AF" />
          <Text style={styles.emptyStateText}>No unpaid credit bills found</Text>
          <Text style={styles.emptyStateSubtext}>
            All credit bills are fully paid
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.unpaidSummary}>
            <View style={styles.unpaidSummaryCard}>
              <Text style={styles.unpaidSummaryLabel}>Total Due Amount</Text>
              <Text style={styles.unpaidSummaryValue}>
                {formatCurrency(unpaidSummaries.reduce((sum, c) => sum + (c.remainingAmount || 0), 0))}
              </Text>
            </View>
            <View style={styles.unpaidSummaryCard}>
              <Text style={styles.unpaidSummaryLabel}>Customers with Due</Text>
              <Text style={styles.unpaidSummaryValue}>{unpaidSummaries.length}</Text>
            </View>
          </View>

          {unpaidSummaries.map((customer) => (
            <View key={customer.customerId} style={styles.unpaidCustomerCard}>
              <View style={styles.unpaidCustomerHeader}>
                <View style={styles.unpaidCustomerInfo}>
                  <User size={20} color="#EC4899" />
                  <Text style={styles.unpaidCustomerName}>{customer.customerName}</Text>
                </View>
                <View style={styles.unpaidCustomerAmount}>
                  <Text style={styles.unpaidAmountLabel}>Total Due</Text>
                  <Text style={styles.unpaidAmountValue}>
                    {formatCurrency(customer.remainingAmount)}
                  </Text>
                </View>
              </View>
              
              <View style={styles.unpaidStatsRow}>
                <View style={styles.unpaidStatItem}>
                  <Text style={styles.unpaidStatLabel}>Total Credit</Text>
                  <Text style={styles.unpaidStatValue}>{formatCurrency(customer.totalCreditAmount)}</Text>
                </View>
                <View style={styles.unpaidStatDivider} />
                <View style={styles.unpaidStatItem}>
                  <Text style={styles.unpaidStatLabel}>Total Paid</Text>
                  <Text style={styles.unpaidStatValue}>{formatCurrency(customer.totalPaidAmount)}</Text>
                </View>
                <View style={styles.unpaidStatDivider} />
                <View style={styles.unpaidStatItem}>
                  <Text style={styles.unpaidStatLabel}>Bills Count</Text>
                  <Text style={styles.unpaidStatValue}>{customer.bills.length}</Text>
                </View>
              </View>

              <Text style={styles.unpaidBillsTitle}>Bills:</Text>
              {customer.bills.map((bill) => (
                <View key={bill.id} style={styles.unpaidBillItem}>
                  <View style={styles.unpaidBillHeader}>
                    <Text style={styles.unpaidBillNo}>Bill #{bill.id}</Text>
                    {getStatusBadge(bill.paymentStatus)}
                  </View>
                  <View style={styles.unpaidBillAmounts}>
                    <View>
                      <Text style={styles.unpaidAmountLabelSmall}>Bill Amount</Text>
                      <Text style={styles.unpaidBillAmount}>{formatCurrency(bill.totalAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.unpaidAmountLabelSmall}>Paid</Text>
                      <Text style={styles.unpaidPaidAmount}>{formatCurrency(bill.paidAmount)}</Text>
                    </View>
                    <View>
                      <Text style={styles.unpaidAmountLabelSmall}>Remaining</Text>
                      <Text style={styles.unpaidRemainingAmount}>{formatCurrency(bill.remainingAmount)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#EC4899" barStyle="light-content" />
      
      <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Reports</Text>
            <Text style={styles.headerSubtitle}>Track your business performance</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <View style={styles.tabSelector}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'sales' && styles.activeTab]}
          onPress={() => setActiveTab('sales')}
        >
          <BarChart3 size={20} color={activeTab === 'sales' ? '#EC4899' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'sales' && styles.activeTabText]}>Sales</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'statement' && styles.activeTab]}
          onPress={() => setActiveTab('statement')}
        >
          <FileText size={20} color={activeTab === 'statement' ? '#EC4899' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'statement' && styles.activeTabText]}>Statement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unpaid' && styles.activeTab]}
          onPress={() => setActiveTab('unpaid')}
        >
          <CreditCard size={20} color={activeTab === 'unpaid' ? '#EC4899' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'unpaid' && styles.activeTabText]}>Unpaid</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'sales' && renderSalesTab()}
        {activeTab === 'statement' && renderStatementTab()}
        {activeTab === 'unpaid' && renderUnpaidTab()}
      </ScrollView>

      <Modal
        visible={showStatementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatementModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient colors={['#EC4899', '#DB2777']} style={styles.modalHeader}>
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Customer Statement</Text>
              <TouchableOpacity onPress={() => setShowStatementModal(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {statement && (
            <ScrollView style={styles.statementContent}>
              <View style={styles.customerInfoCard}>
                <Text style={styles.customerInfoName}>{statement.customerName}</Text>
                <Text style={styles.customerInfoPhone}>{statement.customerPhone}</Text>
                {statement.customerAddress && (
                  <Text style={styles.customerInfoAddress}>{statement.customerAddress}</Text>
                )}
                <View style={styles.periodContainer}>
                  <Text style={styles.periodText}>
                    Period: {formatDate(new Date(statement.startDate))} - {formatDate(new Date(statement.endDate))}
                  </Text>
                </View>
              </View>

              <View style={styles.balanceSummary}>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Opening Balance</Text>
                  <Text style={[
                    styles.balanceValue,
                    statement.openingBalance >= 0 ? styles.positiveBalance : styles.negativeBalance
                  ]}>
                    {formatCurrency(statement.openingBalance)}
                  </Text>
                </View>
                <View style={styles.balanceCard}>
                  <Text style={styles.balanceLabel}>Closing Balance</Text>
                  <Text style={[
                    styles.balanceValue,
                    statement.closingBalance >= 0 ? styles.positiveBalance : styles.negativeBalance
                  ]}>
                    {formatCurrency(statement.closingBalance)}
                  </Text>
                </View>
              </View>

              <View style={styles.totalsContainer}>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total Credit Bills</Text>
                  <Text style={styles.totalDebit}>{formatCurrency(statement.totalDebit)}</Text>
                </View>
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total Payments</Text>
                  <Text style={styles.totalCredit}>{formatCurrency(statement.totalCredit)}</Text>
                </View>
              </View>

              <Text style={styles.transactionsTitle}>Transactions</Text>
              <View style={styles.transactionsHeader}>
                <Text style={styles.headerDate}>Date</Text>
                <Text style={styles.headerType}>Type</Text>
                <Text style={styles.headerDescription}>Description</Text>
                <Text style={styles.headerAmount}>Amount</Text>
              </View>

              {statement.transactions.map((transaction, index) => renderTransactionRow(transaction, index))}

              {statement.transactions.length === 0 && (
                <View style={styles.noTransactions}>
                  <Text style={styles.noTransactionsText}>No transactions in this period</Text>
                </View>
              )}

              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.shareButton} onPress={handleShareStatement}>
                  <Download size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.printButton}>
                  <Printer size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Print</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingTop: 50, paddingBottom: 20, paddingHorizontal: 20 },
  headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  headerRight: { width: 32 },
  tabSelector: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginTop: 16, borderRadius: 12, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 6 },
  activeTab: { backgroundColor: '#FCE7F3' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activeTabText: { color: '#EC4899' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  periodSelector: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 4, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  periodButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activePeriodButton: { backgroundColor: '#EC4899' },
  periodButtonText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  activePeriodButtonText: { color: '#FFFFFF' },
  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 25 },
  statCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 15, width: '48%', marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  statChange: { fontSize: 12, fontWeight: 'bold' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1F2937', marginBottom: 5 },
  statTitle: { fontSize: 12, color: '#6B7280' },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 15 },
  salesHistoryCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  salesHistoryItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  salesHistoryDate: { flexDirection: 'row', alignItems: 'center' },
  salesHistoryDateText: { fontSize: 14, color: '#6B7280', marginLeft: 8, fontWeight: '600' },
  salesHistoryDetails: { alignItems: 'flex-end' },
  salesHistoryAmount: { fontSize: 18, fontWeight: 'bold', color: '#138808', marginBottom: 2 },
  salesHistoryItems: { fontSize: 12, color: '#6B7280' },
  topProductsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  topProductItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  productRank: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#EC4899', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rankNumber: { fontSize: 14, fontWeight: 'bold', color: '#FFFFFF' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 5 },
  productStats: { fontSize: 12, color: '#6B7280' },
  productProgress: { width: 60, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginLeft: 15 },
  progressBar: { height: '100%', backgroundColor: '#EC4899', borderRadius: 2 },
  insightsCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  insightItem: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  insightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  insightContent: { flex: 1 },
  insightTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 5 },
  insightDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  statementTab: { paddingBottom: 30 },
  customerInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D1D5DB', gap: 8 },
  customerInput: { flex: 1, height: 48, fontSize: 16, color: '#111827' },
  dropdown: { backgroundColor: '#FFF', borderRadius: 8, marginTop: 4, borderWidth: 1, borderColor: '#E5E7EB', maxHeight: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
  dropdownList: { maxHeight: 200 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dropdownName: { fontSize: 14, fontWeight: '500', color: '#111827' },
  dropdownPhone: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  selectedCheck: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' },
  selectedCheckText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  dateButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#D1D5DB', gap: 12 },
  dateTextContainer: { flex: 1 },
  dateLabel: { fontSize: 12, color: '#6B7280' },
  dateValue: { fontSize: 14, fontWeight: '500', color: '#111827' },
  generateButton: { backgroundColor: '#EC4899', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 8, gap: 8, marginTop: 16 },
  generateButtonDisabled: { backgroundColor: '#9CA3AF' },
  generateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  unpaidTab: { paddingBottom: 30 },
  unpaidSummary: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  unpaidSummaryCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  unpaidSummaryLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  unpaidSummaryValue: { fontSize: 20, fontWeight: '700', color: '#111827' },
  unpaidCustomerCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  unpaidCustomerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  unpaidCustomerInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  unpaidCustomerName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  unpaidCustomerAmount: { alignItems: 'flex-end' },
  unpaidAmountLabel: { fontSize: 11, color: '#6B7280' },
  unpaidAmountValue: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  unpaidStatsRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12, marginBottom: 12 },
  unpaidStatItem: { flex: 1, alignItems: 'center' },
  unpaidStatLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  unpaidStatValue: { fontSize: 14, fontWeight: '600', color: '#374151' },
  unpaidStatDivider: { width: 1, height: 30, backgroundColor: '#E5E7EB' },
  unpaidBillsTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  unpaidBillItem: { backgroundColor: '#F9FAFB', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  unpaidBillHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unpaidBillNo: { fontSize: 14, fontWeight: '600', color: '#111827' },
  unpaidBillAmounts: { flexDirection: 'row', justifyContent: 'space-between' },
  unpaidAmountLabelSmall: { fontSize: 11, color: '#6B7280' },
  unpaidBillAmount: { fontSize: 14, fontWeight: '600', color: '#111827' },
  unpaidPaidAmount: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  unpaidRemainingAmount: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, gap: 4 },
  statusPaid: { backgroundColor: '#10B981' },
  statusPartial: { backgroundColor: '#F59E0B' },
  statusUnpaid: { backgroundColor: '#EF4444' },
  statusText: { fontSize: 11, color: '#FFF', fontWeight: '500' },
  loadingContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 16 },
  loadingText: { fontSize: 16, color: '#6B7280' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#6B7280', marginTop: 16, marginBottom: 8 },
  emptyStateSubtext: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#FFF' },
  modalHeader: { paddingTop: 50, paddingBottom: 16 },
  modalHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  statementContent: { flex: 1, padding: 16 },
  customerInfoCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  customerInfoName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  customerInfoPhone: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  customerInfoAddress: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  periodContainer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  periodText: { fontSize: 12, color: '#EC4899', fontWeight: '500' },
  balanceSummary: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  balanceCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  balanceLabel: { fontSize: 12, color: '#6B7280', marginBottom: 8 },
  balanceValue: { fontSize: 20, fontWeight: '700' },
  positiveBalance: { color: '#EF4444' },
  negativeBalance: { color: '#10B981' },
  totalsContainer: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  totalCard: { flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center' },
  totalLabel: { fontSize: 11, color: '#6B7280', marginBottom: 4 },
  totalDebit: { fontSize: 16, fontWeight: '700', color: '#EF4444' },
  totalCredit: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  transactionsTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  transactionsHeader: { flexDirection: 'row', backgroundColor: '#F1F5F9', padding: 10, borderRadius: 8, marginBottom: 8 },
  headerDate: { width: 80, fontSize: 12, fontWeight: '600', color: '#475569' },
  headerType: { width: 80, fontSize: 12, fontWeight: '600', color: '#475569' },
  headerDescription: { flex: 1, fontSize: 12, fontWeight: '600', color: '#475569' },
  headerAmount: { width: 100, fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'right' },
  transactionRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  transactionDate: { width: 80 },
  transactionDateText: { fontSize: 11, color: '#6B7280' },
  transactionType: { width: 80 },
  billTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4, alignSelf: 'flex-start' },
  billTypeText: { fontSize: 9, color: '#FFF', fontWeight: '600' },
  paymentTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, gap: 4, alignSelf: 'flex-start' },
  paymentTypeText: { fontSize: 9, color: '#FFF', fontWeight: '600' },
  transactionDescription: { flex: 1, paddingHorizontal: 8 },
  transactionDescText: { fontSize: 12, color: '#111827' },
  transactionNote: { fontSize: 10, color: '#6B7280', fontStyle: 'italic', marginTop: 2 },
  transactionAmounts: { width: 100, alignItems: 'flex-end' },
  debitContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  debitAmount: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
  creditContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  creditAmount: { fontSize: 12, fontWeight: '600', color: '#10B981' },
  balanceAmount: { fontSize: 12, fontWeight: '600', color: '#111827', marginTop: 4 },
  noTransactions: { alignItems: 'center', paddingVertical: 40 },
  noTransactionsText: { fontSize: 14, color: '#9CA3AF' },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 32 },
  shareButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, gap: 8 },
  printButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#6B7280', paddingVertical: 12, borderRadius: 8, gap: 8 },
  actionButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
});