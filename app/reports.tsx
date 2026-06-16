import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
import { useNavigation } from 'expo-router';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  Package,
  Printer,
  Receipt,
  TrendingUp,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AppSettings,
  Customer,
  CustomerStatement,
  getAllCustomers,
  getAppSettings,
  getBillsByDate,
  getCustomerStatement,
  getItemSalesSummary,
  getProfitSummary,
  ItemSalesSummary,
  PartySummaryBill,
  ProfitSummary,
} from '../lib/db';

type TabType = 'statement' | 'itemSummary' | 'partySummary' | 'profit';

export default function Reports() {
  const navigation = useNavigation();

  const [activeTab, setActiveTab] = useState<TabType>('statement');

  const [shopSettings, setShopSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Statement states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);

  const [startDate, setStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 1);
    return d;
  });
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [statementLoading, setStatementLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Item Summary states
  const [itemSummaryDate, setItemSummaryDate] = useState<Date>(new Date());
  const [showItemSummaryDatePicker, setShowItemSummaryDatePicker] =
    useState(false);
  const [itemSummaryData, setItemSummaryData] = useState<ItemSalesSummary[]>(
    [],
  );
  const [itemSummaryLoading, setItemSummaryLoading] = useState(false);
  const [showItemSummaryModal, setShowItemSummaryModal] = useState(false);
  const [itemSummaryPdfLoading, setItemSummaryPdfLoading] = useState(false);

  // Party Summary states
  const [partySummaryDate, setPartySummaryDate] = useState<Date>(new Date());
  const [showPartySummaryDatePicker, setShowPartySummaryDatePicker] =
    useState(false);
  const [partySummaryData, setPartySummaryData] = useState<PartySummaryBill[]>(
    [],
  );
  const [partySummaryLoading, setPartySummaryLoading] = useState(false);
  const [showPartySummaryModal, setShowPartySummaryModal] = useState(false);
  const [partySummaryPdfLoading, setPartySummaryPdfLoading] = useState(false);

  // Profit states
  const [profitData, setProfitData] = useState<
    Record<string, ProfitSummary | null>
  >({});
  const [profitLoading, setProfitLoading] = useState(false);

  useEffect(() => {
    loadShopSettings();
    loadCustomers();
  }, []);

  const loadShopSettings = async () => {
    try {
      const settings = await getAppSettings();
      setShopSettings(settings);
    } catch (error) {
      console.error('Error loading shop settings:', error);
    } finally {
      setSettingsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const all = await getAllCustomers();
      setCustomers(all);
      setFilteredCustomers(all);
    } catch (e) {
      console.error('Error loading customers:', e);
    }
  };

  useEffect(() => {
    if (customerSearch.length > 0) {
      const filtered = customers.filter(
        (c) =>
          c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
          c.phone.includes(customerSearch),
      );
      setFilteredCustomers(filtered);
      setShowCustomerDropdown(true);
    } else {
      setFilteredCustomers(customers);
      setShowCustomerDropdown(false);
    }
  }, [customerSearch, customers]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  // ─── Generate Customer Statement ─────────────────────────────
  const generateStatement = async () => {
    if (!selectedCustomer) {
      Alert.alert('Error', 'Please select a customer');
      return;
    }
    setStatementLoading(true);
    try {
      const result = await getCustomerStatement(
        selectedCustomer.id,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0],
      );
      setStatement(result);
      setShowStatementModal(true);
    } catch (e) {
      console.error('Error generating statement:', e);
      Alert.alert('Error', 'Failed to generate statement');
    } finally {
      setStatementLoading(false);
    }
  };

  // ─── Load Item Summary ───────────────────────────────────────
  const loadItemSummary = async () => {
    setItemSummaryLoading(true);
    try {
      const dateStr = itemSummaryDate.toISOString().split('T')[0];
      const data = await getItemSalesSummary(dateStr, dateStr);
      setItemSummaryData(data);
      setShowItemSummaryModal(true);
    } catch (e) {
      console.error('Error loading item summary:', e);
      Alert.alert('Error', 'Failed to load item summary');
    } finally {
      setItemSummaryLoading(false);
    }
  };

  // ─── Load Party Summary ──────────────────────────────────────
  const loadPartySummary = async () => {
    setPartySummaryLoading(true);
    try {
      const dateStr = partySummaryDate.toISOString().split('T')[0];
      const data = await getBillsByDate(dateStr);
      setPartySummaryData(data);
      setShowPartySummaryModal(true);
    } catch (e) {
      console.error('Error loading party summary:', e);
      Alert.alert('Error', 'Failed to load party summary');
    } finally {
      setPartySummaryLoading(false);
    }
  };

  // ─── Profit Periods ──────────────────────────────────────────
  const PROFIT_PERIODS: {
    label: string;
    icon: string;
    getDates: () => [string, string];
  }[] = [
    {
      label: 'Today',
      icon: '📅',
      getDates: () => {
        const d = new Date().toISOString().split('T')[0];
        return [d, d];
      },
    },
    {
      label: 'Last Month',
      icon: '📆',
      getDates: () => {
        const e = new Date();
        const s = new Date();
        s.setMonth(s.getMonth() - 1);
        return [s.toISOString().split('T')[0], e.toISOString().split('T')[0]];
      },
    },
    {
      label: 'Last 3 Months',
      icon: '🗓️',
      getDates: () => {
        const e = new Date();
        const s = new Date();
        s.setMonth(s.getMonth() - 3);
        return [s.toISOString().split('T')[0], e.toISOString().split('T')[0]];
      },
    },
    {
      label: 'Last 6 Months',
      icon: '📊',
      getDates: () => {
        const e = new Date();
        const s = new Date();
        s.setMonth(s.getMonth() - 6);
        return [s.toISOString().split('T')[0], e.toISOString().split('T')[0]];
      },
    },
    {
      label: 'Last Year',
      icon: '🏆',
      getDates: () => {
        const e = new Date();
        const s = new Date();
        s.setFullYear(s.getFullYear() - 1);
        return [s.toISOString().split('T')[0], e.toISOString().split('T')[0]];
      },
    },
  ];

  const loadAllProfitData = async () => {
    setProfitLoading(true);
    try {
      const results: Record<string, ProfitSummary | null> = {};
      for (const period of PROFIT_PERIODS) {
        const [s, e] = period.getDates();
        results[period.label] = await getProfitSummary(s, e);
      }
      setProfitData(results);
    } catch (e) {
      console.error('Error loading profit data:', e);
      Alert.alert('Error', 'Failed to load profit data');
    } finally {
      setProfitLoading(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────
  const formatDate = (date: Date) => date.toLocaleDateString('en-GB');

  const formatDateForFilename = (date: Date) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}${m}${y}`;
  };

  const getTodayForFilename = () => formatDateForFilename(new Date());

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null || isNaN(amount))
      return '₹0.00';
    return `₹${Math.abs(amount).toFixed(2)}`;
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return '#EF4444';
    if (balance < 0) return '#10B981';
    return '#64748B';
  };

  const getBalanceLabel = (balance: number) => {
    if (balance > 0) return `${formatCurrency(balance)} Dr`;
    if (balance < 0) return `${formatCurrency(balance)} Cr`;
    return '₹0.00';
  };

  const escapeHtml = (text: string): string => {
    return text.replace(/[&<>]/g, function (m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  };

  // ─── Shop Header HTML ─────────────────────────────────────────
  const getShopHeaderHTML = () => {
    if (!shopSettings) return '';
    return `
      <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #3B82F6; padding-bottom:15px;">
        <h2 style="color:#3B82F6; margin:0;">${escapeHtml(shopSettings.shopName)}</h2>
        <p style="margin:5px 0 0; color:#6b7280;">${escapeHtml(shopSettings.shopAddress)}</p>
        <p style="margin:0; color:#6b7280;">📞 ${escapeHtml(shopSettings.shopPhone)}</p>
        ${shopSettings.shopEmail ? `<p style="margin:0; color:#6b7280;">✉️ ${escapeHtml(shopSettings.shopEmail)}</p>` : ''}
      </div>
    `;
  };

  const getShopHeaderText = () => {
    if (!shopSettings) return '';
    let header = `${shopSettings.shopName.toUpperCase()}\n`;
    header += `${shopSettings.shopAddress}\n`;
    header += `📞 ${shopSettings.shopPhone}`;
    if (shopSettings.shopEmail) header += ` | ✉️ ${shopSettings.shopEmail}`;
    header += `\n${'='.repeat(50)}\n\n`;
    return header;
  };

  // ─── Customer Statement: Share Text ──────────────────────────
  const handleShareStatement = async () => {
    if (!statement) return;
    const w = 60;
    const line = '='.repeat(w);
    const dash = '-'.repeat(w);
    const pad = (s: string, n: number) => s.substring(0, n).padEnd(n);
    const rpad = (s: string, n: number) => s.substring(0, n).padStart(n);

    let text = getShopHeaderText();
    text += `${'CUSTOMER STATEMENT'.padStart(w / 2 + 9)}\n${line}\n\n`;
    text += `Customer : ${statement.customerName}\n`;
    text += `Phone    : ${statement.customerPhone}\n`;
    if (statement.customerAddress)
      text += `Address  : ${statement.customerAddress}\n`;
    text += `Period   : ${formatDate(new Date(statement.startDate))} to ${formatDate(new Date(statement.endDate))}\n`;
    text += `\nOpening Balance: ${getBalanceLabel(statement.openingBalance)}\n\n`;
    text += `${pad('Date', 11)}${pad('Bill#', 8)}${pad('Type', 9)}${rpad('Bill Amt', 11)}${rpad('Received', 11)}${rpad('Balance', 11)}\n`;
    text += `${dash}\n`;

    for (const t of statement.transactions) {
      if (t.billType === 'Opening') continue;
      const date = new Date(t.date).toLocaleDateString('en-GB').padEnd(11);
      const billNo = t.billNo.toString().padEnd(8);
      const type = t.billType.padEnd(9);
      const bAmt = (
        t.billAmount > 0 ? formatCurrency(t.billAmount) : '-'
      ).padStart(11);
      const recv = (t.received > 0 ? formatCurrency(t.received) : '-').padStart(
        11,
      );
      const bal = getBalanceLabel(t.balance).padStart(11);
      text += `${date}${billNo}${type}${bAmt}${recv}${bal}\n`;
    }

    text += `\n${line}\n`;
    text += `Total Credit Bills  : ${formatCurrency(statement.totalCreditAmount)}\n`;
    text += `Total Cash Bills    : ${formatCurrency(
      statement.transactions
        .filter((t) => t.billType === 'Cash')
        .reduce((s, t) => s + t.billAmount, 0),
    )}\n`;
    text += `Total Received      : ${formatCurrency(statement.totalReceivedAmount)}\n`;
    text += `Closing Balance     : ${getBalanceLabel(statement.closingBalance)}\n`;

    try {
      await Share.share({
        message: text,
        title: `Statement - ${statement.customerName}`,
      });
    } catch (e) {
      console.error('Error sharing:', e);
    }
  };

  // ─── Customer Statement: PDF ──────────────────────────────────
  const generatePDF = async () => {
    if (!statement || !selectedCustomer) return;
    setPdfLoading(true);
    try {
      const html = buildStatementHTML(statement);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      const safeName = selectedCustomer.name.replace(/\s+/g, '_');
      const fileName = `Statement_${safeName}_${getTodayForFilename()}`;
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Saved to: ${uri}`);
      }
    } catch (e) {
      console.error('PDF error:', e);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!statement) return;
    setPdfLoading(true);
    try {
      const html = buildStatementHTML(statement);
      await Print.printAsync({ html });
    } catch (e) {
      console.error('Print error:', e);
      Alert.alert('Error', 'Failed to print');
    } finally {
      setPdfLoading(false);
    }
  };

  const buildStatementHTML = (s: CustomerStatement): string => {
    const cashTotal = s.transactions
      .filter((t) => t.billType === 'Cash')
      .reduce((sum, t) => sum + t.billAmount, 0);

    const rowsHTML = s.transactions
      .filter((t) => t.billType !== 'Opening')
      .map((t, i) => {
        const isReceipt = t.billType === 'Receipt';
        const isCredit = t.billType === 'Credit';
        const isCash = t.billType === 'Cash';
        const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
        const typeColor = isReceipt
          ? '#F59E0B'
          : isCredit
            ? '#EF4444'
            : isCash
              ? '#10B981'
              : '#8B5CF6';
        const balColor =
          t.balance > 0 ? '#EF4444' : t.balance < 0 ? '#10B981' : '#374151';
        const balLabel =
          t.balance > 0
            ? `₹${t.balance.toFixed(2)} Dr`
            : t.balance < 0
              ? `₹${Math.abs(t.balance).toFixed(2)} Cr`
              : '₹0.00';

        return `
          <tr style="background:${bg}">
            <td>${new Date(t.date).toLocaleDateString('en-GB')}</td>
            <td>${t.billNo}</td>
            <td style="color:${typeColor};font-weight:600">${t.billType}</td>
            <td style="text-align:right">${t.billAmount > 0 ? '₹' + t.billAmount.toFixed(2) : '-'}</td>
            <td style="text-align:right;color:#10b981">${t.received > 0 ? '₹' + t.received.toFixed(2) : '-'}</td>
            <td style="text-align:right;font-weight:600;color:${balColor}">${balLabel}</td>
          </tr>`;
      })
      .join('');

    const closingColor =
      s.closingBalance > 0
        ? '#EF4444'
        : s.closingBalance < 0
          ? '#10B981'
          : '#374151';
    const closingLabel =
      s.closingBalance > 0
        ? `₹${s.closingBalance.toFixed(2)} Dr`
        : s.closingBalance < 0
          ? `₹${Math.abs(s.closingBalance).toFixed(2)} Cr`
          : '₹0.00';

    const openingLabel =
      s.openingBalance > 0
        ? `₹${s.openingBalance.toFixed(2)} Dr`
        : s.openingBalance < 0
          ? `₹${Math.abs(s.openingBalance).toFixed(2)} Cr`
          : '₹0.00';

    const periodStart = formatDate(new Date(s.startDate));
    const periodEnd = formatDate(new Date(s.endDate));
    const generatedDate = new Date().toLocaleDateString('en-GB');

    return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:12px;color:#1f2937;padding:24px;}
  .header{text-align:center;margin-bottom:20px;border-bottom:2px solid #3B82F6;padding-bottom:16px;}
  .header h1{font-size:20px;color:#3B82F6;font-weight:700;}
  .customer-box{background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between;flex-wrap:wrap;}
  .opening-row{background:#FEF3C7;border:1px solid #FDE68A;border-radius:6px;padding:8px 14px;display:flex;justify-content:space-between;margin-bottom:12px;}
  table{width:100%;border-collapse:collapse;margin-bottom:16px;}
  thead tr{background:#3B82F6;}
  thead th{color:#fff;padding:8px 10px;text-align:left;}
  thead th:nth-child(4),thead th:nth-child(5),thead th:nth-child(6){text-align:right;}
  tbody td{padding:7px 10px;border-bottom:1px solid #f3f4f6;}
  .summary{border:1px solid #e5e7eb;border-radius:8px;margin-top:8px;}
  .summary-row{display:flex;justify-content:space-between;padding:8px 16px;border-bottom:1px solid #f3f4f6;}
  .summary-row:last-child{background:#EFF6FF;border-bottom:none;}
  .footer{text-align:center;margin-top:20px;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:10px;}
</style>
</head>
<body>
${getShopHeaderHTML()}
<div class="header">
  <h1>CUSTOMER STATEMENT</h1>
  <p>Generated on ${generatedDate}</p>
</div>
<div class="customer-box">
  <div><strong>${s.customerName}</strong><br/>${s.customerPhone}${s.customerAddress ? '<br/>' + s.customerAddress : ''}</div>
  <div>${periodStart} — ${periodEnd}</div>
</div>
<div class="opening-row"><span>Opening Balance</span><strong>${openingLabel}</strong></div>
<table><thead><tr><th>Date</th><th>Bill#</th><th>Type</th><th>Bill Amt</th><th>Received</th><th>Balance</th></tr></thead><tbody>${rowsHTML}</tbody></table>
<div class="summary">
  <div class="summary-row"><span>Credit Bills Total</span><span>₹${s.totalCreditAmount.toFixed(2)}</span></div>
  <div class="summary-row"><span>Cash Bills Total</span><span>₹${cashTotal.toFixed(2)}</span></div>
  <div class="summary-row"><span>Total Received</span><span>₹${s.totalReceivedAmount.toFixed(2)}</span></div>
  <div class="summary-row"><strong>Closing Balance</strong><strong style="color:${closingColor}">${closingLabel}</strong></div>
</div>
<div class="footer">Computer generated statement – no signature required.</div>
</body></html>`;
  };

  const renderStatementTable = () => (
    <View style={styles.tableContainer}>
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, styles.dateCol]}>Date</Text>
        <Text style={[styles.headerCell, styles.billNoCol]}>Bill#</Text>
        <Text style={[styles.headerCell, styles.typeCol]}>Type</Text>
        <Text style={[styles.headerCell, styles.amountCol]}>Bill Amt</Text>
        <Text style={[styles.headerCell, styles.amountCol]}>Received</Text>
        <Text style={[styles.headerCell, styles.balanceCol]}>Balance</Text>
      </View>
      {statement?.transactions.map((t, i) => (
        <View
          key={i}
          style={[
            styles.tableRow,
            i % 2 === 1 && styles.altRow,
            t.billType === 'Opening' && styles.openingRow,
          ]}
        >
          <Text style={[styles.rowCell, styles.dateCol]}>
            {new Date(t.date).toLocaleDateString('en-GB')}
          </Text>
          <Text style={[styles.rowCell, styles.billNoCol]}>{t.billNo}</Text>
          <Text
            style={[
              styles.rowCell,
              styles.typeCol,
              t.billType === 'Cash' && styles.cashText,
              t.billType === 'Credit' && styles.creditText,
              t.billType === 'Receipt' && styles.receiptText,
            ]}
          >
            {t.billType}
          </Text>
          <Text style={[styles.rowCell, styles.amountCol]}>
            {t.billAmount > 0 ? formatCurrency(t.billAmount) : '-'}
          </Text>
          <Text style={[styles.rowCell, styles.amountCol, styles.receivedText]}>
            {t.received > 0 ? formatCurrency(t.received) : '-'}
          </Text>
          <Text
            style={[
              styles.rowCell,
              styles.balanceCol,
              { color: getBalanceColor(t.balance) },
            ]}
          >
            {getBalanceLabel(t.balance)}
          </Text>
        </View>
      ))}
    </View>
  );

  const renderStatementTab = () => (
    <View style={styles.statementTab}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Customer</Text>
        <View style={styles.customerInputContainer}>
          <User size={20} color="#64748B" />
          <TextInput
            style={styles.customerInput}
            placeholder="Search by name or phone…"
            value={customerSearch}
            onChangeText={setCustomerSearch}
            onFocus={() => setShowCustomerDropdown(true)}
            placeholderTextColor="#94A3B8"
          />
          {customerSearch !== '' && (
            <TouchableOpacity
              onPress={() => {
                setCustomerSearch('');
                setSelectedCustomer(null);
              }}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          )}
        </View>
        {showCustomerDropdown && filteredCustomers.length > 0 && (
          <View style={styles.dropdown}>
            <ScrollView nestedScrollEnabled style={styles.dropdownList}>
              {filteredCustomers.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectCustomer(c)}
                >
                  <View>
                    <Text style={styles.dropdownName}>{c.name}</Text>
                    <Text style={styles.dropdownPhone}>{c.phone}</Text>
                  </View>
                  {selectedCustomer?.id === c.id && (
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
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartPicker(true)}
        >
          <Calendar size={20} color="#3B82F6" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>From</Text>
            <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndPicker(true)}
        >
          <Calendar size={20} color="#3B82F6" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>To</Text>
            <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
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
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(date);
          }}
        />
      )}
      <TouchableOpacity
        style={[
          styles.generateButton,
          (!selectedCustomer || statementLoading) &&
            styles.generateButtonDisabled,
        ]}
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

  // ─── Item Summary PDF ─────────────────────────────────────────
  const handleShareItemSummary = async () => {
    if (itemSummaryData.length === 0) return;
    let text = getShopHeaderText();
    const line = '='.repeat(50);
    text += `${'ITEM SALES SUMMARY'.padStart(28)}\n${line}\n\n`;
    text += `Date: ${formatDate(itemSummaryDate)}\n\n`;
    text += `${'Product'.padEnd(30)}${'Qty'.padStart(8)}${'Amount'.padStart(12)}\n`;
    text += `${'-'.repeat(50)}\n`;
    for (const item of itemSummaryData) {
      const product = (item.productName || 'N/A').substring(0, 29).padEnd(30);
      const qty = item.totalQuantity.toString().padStart(8);
      const amount = `₹${item.totalAmount.toFixed(2)}`.padStart(12);
      text += `${product}${qty}${amount}\n`;
    }
    const total = itemSummaryData.reduce((sum, i) => sum + i.totalAmount, 0);
    text += `\n${line}\nTotal Items: ${itemSummaryData.length}\nTotal Sales: ₹${total.toFixed(2)}\n`;
    try {
      await Share.share({
        message: text,
        title: `Item Sales Summary ${formatDate(itemSummaryDate)}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const generateItemSummaryPDF = async () => {
    if (itemSummaryData.length === 0) {
      Alert.alert('No Data', 'No items to export.');
      return;
    }
    setItemSummaryPdfLoading(true);
    try {
      const html = buildItemSummaryHTML(itemSummaryData, itemSummaryDate);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      const fileName = `ItemSummary_${getTodayForFilename()}`;
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Saved to: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setItemSummaryPdfLoading(false);
    }
  };

  const buildItemSummaryHTML = (
    data: ItemSalesSummary[],
    selectedDate: Date,
  ): string => {
    const rows = data
      .map(
        (item, i) =>
          `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:10px;border-bottom:1px solid #e5e7eb;">${escapeHtml(item.productName)}</td><td style="padding:10px;text-align:center;">${item.totalQuantity}</td><td style="padding:10px;text-align:right;">₹${item.totalAmount.toFixed(2)}</td></tr>`,
      )
      .join('');
    const totalQty = data.reduce((s, i) => s + i.totalQuantity, 0);
    const totalAmt = data.reduce((s, i) => s + i.totalAmount, 0);
    const generatedDate = new Date().toLocaleDateString('en-GB');
    const summaryDate = formatDate(selectedDate);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Item Sales Summary</title><style>body{font-family:Helvetica;padding:40px;}.report-header{text-align:center;margin-bottom:30px;}.report-header h1{color:#3B82F6;}.date-info{text-align:center;margin-bottom:20px;color:#6b7280;}table{width:100%;border-collapse:collapse;}th{background:#3B82F6;color:#fff;padding:10px;text-align:left;}th:nth-child(2){text-align:center;}th:nth-child(3){text-align:right;}.summary{background:#f9fafb;padding:15px;margin-top:20px;border-radius:8px;}.total{font-weight:bold;font-size:16px;color:#3B82F6;border-top:1px solid #ccc;margin-top:8px;padding-top:8px;}.footer{text-align:center;margin-top:30px;font-size:10px;color:#9ca3af;}</style></head><body>
    ${getShopHeaderHTML()}
    <div class="report-header"><h1>ITEM SALES SUMMARY</h1></div>
    <div class="date-info"><strong>Sales Date:</strong> ${summaryDate} &nbsp;|&nbsp; <strong>Generated on:</strong> ${generatedDate}</div>
    <table><thead><tr><th>Product</th><th style="text-align:center">Quantity</th><th style="text-align:right">Total Value</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="summary"><div>Total Line Items: ${data.length}</div><div>Total Units Sold: ${totalQty}</div><div class="total">GRAND TOTAL: ₹${totalAmt.toFixed(2)}</div></div>
    <div class="footer">Computer generated document – valid without signature.</div>
    </body></html>`;
  };

  const renderItemSummaryTab = () => (
    <View style={styles.statementTab}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowItemSummaryDatePicker(true)}
        >
          <Calendar size={20} color="#3B82F6" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(itemSummaryDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      {showItemSummaryDatePicker && (
        <DateTimePicker
          value={itemSummaryDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowItemSummaryDatePicker(false);
            if (date) setItemSummaryDate(date);
          }}
        />
      )}
      <TouchableOpacity
        style={[
          styles.generateButton,
          itemSummaryLoading && styles.generateButtonDisabled,
        ]}
        onPress={loadItemSummary}
        disabled={itemSummaryLoading}
      >
        {itemSummaryLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Package size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>Load Item Summary</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ─── Party Summary PDF ────────────────────────────────────────
  const handleSharePartySummary = async () => {
    if (partySummaryData.length === 0) return;
    let text = getShopHeaderText();
    const line = '='.repeat(60);
    text += `${'PARTY BILLS SUMMARY'.padStart(32)}\n${line}\n\n`;
    text += `Date: ${formatDate(partySummaryDate)}\n\n`;
    text += `${'S.No.'.padEnd(6)}${'Bill No.'.padEnd(10)}${'Customer Name'.padEnd(25)}${'Type'.padEnd(10)}${'Amount'.padStart(12)}\n`;
    text += `${'-'.repeat(63)}\n`;
    let total = 0;
    partySummaryData.forEach((bill, idx) => {
      text += `${(idx + 1).toString().padEnd(6)}${bill.billNo.toString().padEnd(10)}${bill.customerName.substring(0, 24).padEnd(25)}${bill.billType.padEnd(10)}${`₹${bill.totalAmount.toFixed(2)}`.padStart(12)}\n`;
      total += bill.totalAmount;
    });
    text += `\n${line}\n${'TOTAL'.padEnd(53)}${`₹${total.toFixed(2)}`.padStart(12)}\n`;
    try {
      await Share.share({
        message: text,
        title: `Party Bills Summary ${formatDate(partySummaryDate)}`,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const generatePartySummaryPDF = async () => {
    if (partySummaryData.length === 0) {
      Alert.alert('No Data', 'No bills found.');
      return;
    }
    setPartySummaryPdfLoading(true);
    try {
      const html = buildPartySummaryHTML(partySummaryData, partySummaryDate);
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      const canShare = await Sharing.isAvailableAsync();
      const fileName = `PartySummary_${getTodayForFilename()}`;
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('PDF Saved', `Saved to: ${uri}`);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setPartySummaryPdfLoading(false);
    }
  };

  const buildPartySummaryHTML = (
    data: PartySummaryBill[],
    selectedDate: Date,
  ): string => {
    const rows = data
      .map(
        (bill, i) =>
          `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}"><td style="padding:10px;border-bottom:1px solid #e5e7eb;">${i + 1}</td><td style="padding:10px;">${bill.billNo}</td><td style="padding:10px;">${escapeHtml(bill.customerName)}</td><td style="padding:10px;text-align:center;">${bill.billType}</td><td style="padding:10px;text-align:right;">₹${bill.totalAmount.toFixed(2)}</td></tr>`,
      )
      .join('');
    const total = data.reduce((s, b) => s + b.totalAmount, 0);
    const generatedDate = new Date().toLocaleDateString('en-GB');
    const summaryDate = formatDate(selectedDate);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Party Bills Summary</title><style>body{font-family:Helvetica;padding:40px;}.report-header{text-align:center;margin-bottom:30px;}.report-header h1{color:#3B82F6;}.date-info{text-align:center;margin-bottom:20px;color:#6b7280;}table{width:100%;border-collapse:collapse;}th{background:#3B82F6;color:#fff;padding:10px;text-align:left;}th:last-child{text-align:right;}.summary{background:#f9fafb;padding:15px;margin-top:20px;border-radius:8px;display:flex;justify-content:space-between;font-weight:bold;font-size:16px;color:#3B82F6;}.footer{text-align:center;margin-top:30px;font-size:10px;color:#9ca3af;}</style></head><body>
    ${getShopHeaderHTML()}
    <div class="report-header"><h1>PARTY BILLS SUMMARY</h1></div>
    <div class="date-info"><strong>Bills Date:</strong> ${summaryDate} &nbsp;|&nbsp; <strong>Generated on:</strong> ${generatedDate}</div>
    <table><thead><tr><th>#</th><th>Bill No.</th><th>Customer Name</th><th style="text-align:center">Type</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="summary"><span>TOTAL</span><span>₹${total.toFixed(2)}</span></div>
    <div class="footer">Computer generated document – valid without signature.</div>
    </body></html>`;
  };

  const renderPartySummaryTab = () => (
    <View style={styles.statementTab}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowPartySummaryDatePicker(true)}
        >
          <Calendar size={20} color="#3B82F6" />
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateLabel}>Date</Text>
            <Text style={styles.dateValue}>{formatDate(partySummaryDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>
      {showPartySummaryDatePicker && (
        <DateTimePicker
          value={partySummaryDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPartySummaryDatePicker(false);
            if (date) setPartySummaryDate(date);
          }}
        />
      )}
      <TouchableOpacity
        style={[
          styles.generateButton,
          partySummaryLoading && styles.generateButtonDisabled,
        ]}
        onPress={loadPartySummary}
        disabled={partySummaryLoading}
      >
        {partySummaryLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Receipt size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>Load Party Summary</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  // ─── Profit Tab ───────────────────────────────────────────────
  const renderProfitTab = () => (
    <View style={styles.statementTab}>
      <TouchableOpacity
        style={[
          styles.generateButton,
          profitLoading && styles.generateButtonDisabled,
        ]}
        onPress={loadAllProfitData}
        disabled={profitLoading}
      >
        {profitLoading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <TrendingUp size={20} color="#FFF" />
            <Text style={styles.generateButtonText}>Refresh Profit Data</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{ gap: 14, marginTop: 16 }}>
        {PROFIT_PERIODS.map((period) => {
          const d = profitData[period.label];
          const hasData = d !== null && d !== undefined;
          const profitColor =
            hasData && d!.totalProfit >= 0 ? '#10B981' : '#EF4444';
          const marginPct = hasData
            ? Math.min(100, Math.max(0, d!.profitMargin))
            : 0;

          return (
            <View key={period.label} style={styles.profitCard}>
              {/* Card header */}
              <View style={styles.profitCardHeader}>
                <Text style={styles.profitCardIcon}>{period.icon}</Text>
                <Text style={styles.profitCardTitle}>{period.label}</Text>
                {hasData && (
                  <View
                    style={[
                      styles.profitBadge,
                      {
                        backgroundColor:
                          d!.totalProfit >= 0 ? '#DCFCE7' : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[styles.profitBadgeText, { color: profitColor }]}
                    >
                      {d!.profitMargin.toFixed(1)}% margin
                    </Text>
                  </View>
                )}
              </View>

              {hasData ? (
                <View style={styles.profitCardBody}>
                  {/* Top row: Sales + Cost */}
                  <View style={styles.profitRow}>
                    <View
                      style={[
                        styles.profitMetric,
                        { borderColor: '#BFDBFE', borderWidth: 1 },
                      ]}
                    >
                      <Text style={styles.profitMetricLabel}>Total Sales</Text>
                      <Text
                        style={[styles.profitMetricValue, { color: '#3B82F6' }]}
                      >
                        {formatCurrency(d!.totalSales)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.profitMetric,
                        { borderColor: '#FECACA', borderWidth: 1 },
                      ]}
                    >
                      <Text style={styles.profitMetricLabel}>Total Cost</Text>
                      <Text
                        style={[styles.profitMetricValue, { color: '#EF4444' }]}
                      >
                        {formatCurrency(d!.totalCost)}
                      </Text>
                    </View>
                  </View>

                  {/* Bottom row: Net Profit + Margin */}
                  <View style={[styles.profitRow, { marginTop: 10 }]}>
                    <View
                      style={[
                        styles.profitMetric,
                        {
                          borderColor:
                            d!.totalProfit >= 0 ? '#BBF7D0' : '#FECACA',
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <Text style={styles.profitMetricLabel}>Net Profit</Text>
                      <Text
                        style={[
                          styles.profitMetricValue,
                          { color: profitColor, fontSize: 18 },
                        ]}
                      >
                        {d!.totalProfit >= 0 ? '' : '-'}
                        {formatCurrency(d!.totalProfit)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.profitMetric,
                        {
                          borderColor:
                            d!.profitMargin >= 0 ? '#BBF7D0' : '#FECACA',
                          borderWidth: 1.5,
                        },
                      ]}
                    >
                      <Text style={styles.profitMetricLabel}>
                        Profit Margin
                      </Text>
                      <Text
                        style={[
                          styles.profitMetricValue,
                          { color: profitColor, fontSize: 18 },
                        ]}
                      >
                        {d!.profitMargin.toFixed(1)}%
                      </Text>
                    </View>
                  </View>

                  {/* Progress bar */}
                  <View style={styles.profitBarTrack}>
                    <View
                      style={[
                        styles.profitBarFill,
                        {
                          width: `${marginPct}%` as any,
                          backgroundColor: profitColor,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.profitBarLabels}>
                    <Text style={styles.profitBarLabelText}>0%</Text>
                    <Text
                      style={[
                        styles.profitBarLabelText,
                        { color: profitColor, fontWeight: '700' },
                      ]}
                    >
                      {d!.profitMargin.toFixed(1)}%
                    </Text>
                    <Text style={styles.profitBarLabelText}>100%</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.profitCardEmpty}>
                  <TrendingUp size={28} color="#CBD5E1" />
                  <Text style={styles.profitCardEmptyText}>
                    Tap "Refresh Profit Data" to load
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  // ─── Tab Selector ────────────────────────────────────────────
  const renderTabSelector = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabScrollContainer}
      contentContainerStyle={styles.tabContainer}
    >
      <TouchableOpacity
        style={[styles.tab, activeTab === 'statement' && styles.activeTab]}
        onPress={() => setActiveTab('statement')}
      >
        <FileText
          size={16}
          color={activeTab === 'statement' ? '#FFFFFF' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'statement' && styles.activeTabText,
          ]}
        >
          Statement
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'itemSummary' && styles.activeTab]}
        onPress={() => setActiveTab('itemSummary')}
      >
        <Package
          size={16}
          color={activeTab === 'itemSummary' ? '#FFFFFF' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'itemSummary' && styles.activeTabText,
          ]}
        >
          Items
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'partySummary' && styles.activeTab]}
        onPress={() => setActiveTab('partySummary')}
      >
        <Receipt
          size={16}
          color={activeTab === 'partySummary' ? '#FFFFFF' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'partySummary' && styles.activeTabText,
          ]}
        >
          Party
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'profit' && styles.activeTab]}
        onPress={() => {
          setActiveTab('profit');
          if (Object.keys(profitData).length === 0) loadAllProfitData();
        }}
      >
        <TrendingUp
          size={16}
          color={activeTab === 'profit' ? '#FFFFFF' : '#64748B'}
        />
        <Text
          style={[
            styles.tabText,
            activeTab === 'profit' && styles.activeTabText,
          ]}
        >
          Profit
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  // ─── Main Render ─────────────────────────────────────────────
  if (settingsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const getHeaderBadgeLabel = () => {
    if (activeTab === 'statement') return 'Customer Statement';
    if (activeTab === 'itemSummary') return 'Item Sales Summary';
    if (activeTab === 'partySummary') return 'Party Bills Summary';
    return 'Profit Summary';
  };

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
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Reports</Text>
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {getHeaderBadgeLabel()}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      {renderTabSelector()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'statement'
          ? renderStatementTab()
          : activeTab === 'itemSummary'
            ? renderItemSummaryTab()
            : activeTab === 'partySummary'
              ? renderPartySummaryTab()
              : renderProfitTab()}
      </ScrollView>

      {/* ── Customer Statement Modal ── */}
      <Modal
        visible={showStatementModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatementModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Customer Statement</Text>
              <TouchableOpacity onPress={() => setShowStatementModal(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          {statement && (
            <ScrollView style={styles.statementContent}>
              <View style={styles.shopHeaderCard}>
                <Text style={styles.shopHeaderName}>
                  {shopSettings?.shopName}
                </Text>
                <Text style={styles.shopHeaderAddress}>
                  {shopSettings?.shopAddress}
                </Text>
                <Text style={styles.shopHeaderPhone}>
                  📞 {shopSettings?.shopPhone}
                </Text>
                {shopSettings?.shopEmail && (
                  <Text style={styles.shopHeaderEmail}>
                    ✉️ {shopSettings.shopEmail}
                  </Text>
                )}
              </View>
              <View style={styles.customerInfoCard}>
                <Text style={styles.customerInfoName}>
                  {statement.customerName}
                </Text>
                <Text style={styles.customerInfoPhone}>
                  {statement.customerPhone}
                </Text>
                {statement.customerAddress && (
                  <Text style={styles.customerInfoAddress}>
                    {statement.customerAddress}
                  </Text>
                )}
                <View style={styles.periodContainer}>
                  <Text style={styles.periodText}>
                    {formatDate(new Date(statement.startDate))} —{' '}
                    {formatDate(new Date(statement.endDate))}
                  </Text>
                </View>
                <View style={styles.openingContainer}>
                  <Text style={styles.openingLabel}>Opening Balance</Text>
                  <Text
                    style={[
                      styles.openingValue,
                      { color: getBalanceColor(statement.openingBalance) },
                    ]}
                  >
                    {getBalanceLabel(statement.openingBalance)}
                  </Text>
                </View>
              </View>
              {renderStatementTable()}
              <View style={styles.summarySection}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Credit Bills</Text>
                  <Text style={[styles.summaryCardValue, { color: '#EF4444' }]}>
                    {formatCurrency(statement.totalCreditAmount)}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Cash Bills</Text>
                  <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                    {formatCurrency(
                      statement.transactions
                        .filter((t) => t.billType === 'Cash')
                        .reduce((s, t) => s + t.billAmount, 0),
                    )}
                  </Text>
                </View>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Total Received</Text>
                  <Text style={[styles.summaryCardValue, { color: '#10B981' }]}>
                    {formatCurrency(statement.totalReceivedAmount)}
                  </Text>
                </View>
              </View>
              <View style={styles.closingCard}>
                <Text style={styles.closingCardLabel}>Closing Balance</Text>
                <Text
                  style={[
                    styles.closingCardValue,
                    { color: getBalanceColor(statement.closingBalance) },
                  ]}
                >
                  {getBalanceLabel(statement.closingBalance)}
                </Text>
              </View>
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#EF4444' }]}
                  />
                  <Text style={styles.legendText}>Dr = Customer owes you</Text>
                </View>
                <View style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: '#10B981' }]}
                  />
                  <Text style={styles.legendText}>Cr = You owe customer</Text>
                </View>
              </View>
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={handleShareStatement}
                >
                  <Download size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Share Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pdfButton, pdfLoading && styles.btnDisabled]}
                  onPress={generatePDF}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <FileText size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Export PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.printButton, pdfLoading && styles.btnDisabled]}
                  onPress={handlePrint}
                  disabled={pdfLoading}
                >
                  {pdfLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <Printer size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Print</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Item Summary Modal */}
      <Modal
        visible={showItemSummaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowItemSummaryModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Item Sales Summary</Text>
              <TouchableOpacity onPress={() => setShowItemSummaryModal(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <ScrollView style={styles.statementContent}>
            <View style={styles.shopHeaderCard}>
              <Text style={styles.shopHeaderName}>
                {shopSettings?.shopName}
              </Text>
              <Text style={styles.shopHeaderAddress}>
                {shopSettings?.shopAddress}
              </Text>
              <Text style={styles.shopHeaderPhone}>
                📞 {shopSettings?.shopPhone}
              </Text>
              {shopSettings?.shopEmail && (
                <Text style={styles.shopHeaderEmail}>
                  ✉️ {shopSettings.shopEmail}
                </Text>
              )}
            </View>
            <View style={styles.customerInfoCard}>
              <Text style={styles.customerInfoName}>Sales Summary</Text>
              <View style={styles.periodContainer}>
                <Text style={styles.periodText}>
                  {formatDate(itemSummaryDate)}
                </Text>
              </View>
              <View style={styles.openingContainer}>
                <Text style={styles.openingLabel}>Total Items Sold</Text>
                <Text style={[styles.openingValue, { color: '#3B82F6' }]}>
                  {itemSummaryData.length} Products
                </Text>
              </View>
              <View style={[styles.openingContainer, { marginTop: 8 }]}>
                <Text style={styles.openingLabel}>Total Sales Value</Text>
                <Text style={[styles.openingValue, { color: '#10B981' }]}>
                  {formatCurrency(
                    itemSummaryData.reduce((sum, i) => sum + i.totalAmount, 0),
                  )}
                </Text>
              </View>
            </View>
            {itemSummaryData.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>
                  No items sold on this date
                </Text>
              </View>
            ) : (
              <View style={styles.itemSummaryList}>
                {itemSummaryData.map((item, idx) => (
                  <View key={idx} style={styles.itemSummaryCard}>
                    <Text style={styles.itemSummaryName}>
                      {item.productName}
                    </Text>
                    <View style={styles.itemSummaryDetails}>
                      <View style={styles.itemSummaryDetail}>
                        <Text style={styles.itemSummaryDetailLabel}>
                          Quantity
                        </Text>
                        <Text style={styles.itemSummaryDetailValue}>
                          {item.totalQuantity}{' '}
                          {item.totalQuantity === 1 ? 'unit' : 'units'}
                        </Text>
                      </View>
                      <View style={styles.itemSummaryDetail}>
                        <Text style={styles.itemSummaryDetailLabel}>
                          Total Value
                        </Text>
                        <Text style={styles.itemSummaryDetailValue}>
                          {formatCurrency(item.totalAmount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {itemSummaryData.length > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: '#10B981' }]}
                  onPress={handleShareItemSummary}
                >
                  <Download size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Share Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pdfButton,
                    itemSummaryPdfLoading && styles.btnDisabled,
                  ]}
                  onPress={generateItemSummaryPDF}
                  disabled={itemSummaryPdfLoading}
                >
                  {itemSummaryPdfLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <FileText size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Export PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Party Summary Modal */}
      <Modal
        visible={showPartySummaryModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPartySummaryModal(false)}
      >
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0F172A', '#1E3A8A', '#1D4ED8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.modalHeader}
          >
            <View style={styles.modalHeaderContent}>
              <Text style={styles.modalTitle}>Party Bills Summary</Text>
              <TouchableOpacity onPress={() => setShowPartySummaryModal(false)}>
                <X size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
          <ScrollView style={styles.statementContent}>
            <View style={styles.shopHeaderCard}>
              <Text style={styles.shopHeaderName}>
                {shopSettings?.shopName}
              </Text>
              <Text style={styles.shopHeaderAddress}>
                {shopSettings?.shopAddress}
              </Text>
              <Text style={styles.shopHeaderPhone}>
                📞 {shopSettings?.shopPhone}
              </Text>
              {shopSettings?.shopEmail && (
                <Text style={styles.shopHeaderEmail}>
                  ✉️ {shopSettings.shopEmail}
                </Text>
              )}
            </View>
            <View style={styles.customerInfoCard}>
              <Text style={styles.customerInfoName}>Bills Summary</Text>
              <View style={styles.periodContainer}>
                <Text style={styles.periodText}>
                  {formatDate(partySummaryDate)}
                </Text>
              </View>
              <View style={styles.openingContainer}>
                <Text style={styles.openingLabel}>Total Bills</Text>
                <Text style={[styles.openingValue, { color: '#3B82F6' }]}>
                  {partySummaryData.length}
                </Text>
              </View>
              <View style={[styles.openingContainer, { marginTop: 8 }]}>
                <Text style={styles.openingLabel}>Total Amount</Text>
                <Text style={[styles.openingValue, { color: '#10B981' }]}>
                  {formatCurrency(
                    partySummaryData.reduce((sum, b) => sum + b.totalAmount, 0),
                  )}
                </Text>
              </View>
            </View>
            {partySummaryData.length === 0 ? (
              <View style={styles.emptyState}>
                <Receipt size={48} color="#94A3B8" />
                <Text style={styles.emptyStateText}>
                  No bills found for this date
                </Text>
              </View>
            ) : (
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, { width: 40 }]}>#</Text>
                  <Text style={[styles.headerCell, { width: 80 }]}>
                    Bill No
                  </Text>
                  <Text style={[styles.headerCell, { flex: 2 }]}>Customer</Text>
                  <Text style={[styles.headerCell, { width: 70 }]}>Type</Text>
                  <Text
                    style={[
                      styles.headerCell,
                      { width: 90, textAlign: 'right' },
                    ]}
                  >
                    Amount
                  </Text>
                </View>
                {partySummaryData.map((bill, idx) => (
                  <View
                    key={idx}
                    style={[styles.tableRow, idx % 2 === 1 && styles.altRow]}
                  >
                    <Text style={[styles.rowCell, { width: 40 }]}>
                      {idx + 1}
                    </Text>
                    <Text style={[styles.rowCell, { width: 80 }]}>
                      {bill.billNo}
                    </Text>
                    <Text
                      style={[styles.rowCell, { flex: 2 }]}
                      numberOfLines={1}
                    >
                      {bill.customerName}
                    </Text>
                    <Text
                      style={[
                        styles.rowCell,
                        { width: 70 },
                        bill.billType === 'Cash'
                          ? styles.cashText
                          : styles.creditText,
                      ]}
                    >
                      {bill.billType}
                    </Text>
                    <Text
                      style={[
                        styles.rowCell,
                        { width: 90, textAlign: 'right' },
                      ]}
                    >
                      {formatCurrency(bill.totalAmount)}
                    </Text>
                  </View>
                ))}
                <View
                  style={[
                    styles.closingCard,
                    { marginTop: 12, backgroundColor: '#EFF6FF' },
                  ]}
                >
                  <Text style={styles.closingCardLabel}>TOTAL</Text>
                  <Text style={styles.closingCardValue}>
                    {formatCurrency(
                      partySummaryData.reduce(
                        (sum, b) => sum + b.totalAmount,
                        0,
                      ),
                    )}
                  </Text>
                </View>
              </View>
            )}
            {partySummaryData.length > 0 && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.shareButton, { backgroundColor: '#10B981' }]}
                  onPress={handleSharePartySummary}
                >
                  <Download size={18} color="#FFF" />
                  <Text style={styles.actionButtonText}>Share Text</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.pdfButton,
                    partySummaryPdfLoading && styles.btnDisabled,
                  ]}
                  onPress={generatePartySummaryPDF}
                  disabled={partySummaryPdfLoading}
                >
                  {partySummaryPdfLoading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <FileText size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Export PDF</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
  },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
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
  headerCenter: { alignItems: 'center' },
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
  headerRight: { width: 48 },

  // Tab bar — now horizontal scroll
  tabScrollContainer: { marginTop: 20, marginHorizontal: 20, flexGrow: 0 },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  activeTabText: { color: '#FFFFFF' },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  statementTab: { paddingBottom: 30 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  customerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  customerInput: { flex: 1, height: 50, fontSize: 15, color: '#0F172A' },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownList: { maxHeight: 220 },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  dropdownPhone: { fontSize: 12, color: '#64748B', marginTop: 2 },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedCheckText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 14,
  },
  dateTextContainer: { flex: 1 },
  dateLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  dateValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 2,
  },
  generateButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 10,
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  generateButtonDisabled: { backgroundColor: '#94A3B8', shadowOpacity: 0 },
  generateButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  modalContainer: { flex: 1, backgroundColor: '#F1F5F9' },
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
    color: '#FFF',
    letterSpacing: 0.3,
  },
  statementContent: { flex: 1, padding: 16 },
  shopHeaderCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  shopHeaderName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 6,
  },
  shopHeaderAddress: { fontSize: 13, color: '#64748B', textAlign: 'center' },
  shopHeaderPhone: { fontSize: 13, color: '#64748B', marginTop: 4 },
  shopHeaderEmail: { fontSize: 13, color: '#64748B', marginTop: 4 },
  customerInfoCard: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  customerInfoName: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  customerInfoPhone: { fontSize: 13, color: '#64748B', marginTop: 4 },
  customerInfoAddress: { fontSize: 13, color: '#64748B', marginTop: 4 },
  periodContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFF6FF',
  },
  periodText: { fontSize: 12, color: '#3B82F6', fontWeight: '600' },
  openingContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EFF6FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  openingLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  openingValue: { fontSize: 14, fontWeight: '700' },
  tableContainer: { marginBottom: 16 },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  headerCell: { fontSize: 11, fontWeight: '700', color: '#FFF' },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  altRow: { backgroundColor: '#F8FAFC' },
  openingRow: { backgroundColor: '#FEF3C7' },
  rowCell: { fontSize: 11, color: '#475569' },
  dateCol: { width: 72 },
  billNoCol: { width: 44 },
  typeCol: { width: 56 },
  amountCol: { flex: 1, textAlign: 'right' },
  balanceCol: { flex: 1, textAlign: 'right' },
  cashText: { color: '#10B981', fontWeight: '700' },
  creditText: { color: '#EF4444', fontWeight: '700' },
  receiptText: { color: '#F59E0B', fontWeight: '700' },
  receivedText: { color: '#10B981' },
  summarySection: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  summaryCardValue: { fontSize: 14, fontWeight: '700', marginTop: 6 },
  closingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#EFF6FF',
  },
  closingCardLabel: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  closingCardValue: { fontSize: 22, fontWeight: '800' },
  legendRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#64748B' },
  actionButtons: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  printButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.6 },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  itemSummaryList: { gap: 12, marginBottom: 16 },
  itemSummaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemSummaryName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  itemSummaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemSummaryDetail: { alignItems: 'center', flex: 1 },
  itemSummaryDetailLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 4,
  },
  itemSummaryDetailValue: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 16,
  },
  emptyStateText: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  // ─── Profit styles ────────────────────────────────────────────
  profitCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EFF6FF',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  profitCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  profitCardIcon: {
    fontSize: 20,
  },
  profitCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    letterSpacing: 0.2,
  },
  profitBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  profitBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  profitCardBody: {
    gap: 0,
  },
  profitRow: {
    flexDirection: 'row',
    gap: 10,
  },
  profitMetric: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  profitMetricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
    marginBottom: 5,
  },
  profitMetricValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  profitBarTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  profitBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  profitBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  profitBarLabelText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
  },
  profitCardEmpty: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 10,
  },
  profitCardEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
