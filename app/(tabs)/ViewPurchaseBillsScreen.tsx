import * as Print from 'expo-print';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  deletePurchaseBill,
  getAllPurchaseBills,
  getProductByNameAndDetails,
  getPurchaseBillWithItems,
  type PurchaseBill,
  type PurchaseItem,
} from '../../lib/db';

const { width } = Dimensions.get('window');

interface PurchaseBillWithItems {
  bill: PurchaseBill;
  items: (PurchaseItem & {
    currentStock?: number;
    isNewProduct?: boolean;
    stockAdded?: number;
  })[];
}

interface BillDataForExport {
  bill: PurchaseBill;
  items: any[];
}

export default function ViewPurchaseBillsScreen() {
  const router = useRouter();
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [selectedBill, setSelectedBill] =
    useState<PurchaseBillWithItems | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Generate PDF and Share
  const shareBillAsPDF = async (billData: BillDataForExport) => {
    try {
      setIsGeneratingPDF(true);

      // Get complete bill data with items
      const completeBillData = await getPurchaseBillWithItems(billData.bill.id);
      if (!completeBillData) {
        Alert.alert('Error', 'Failed to load bill details for PDF generation');
        return;
      }

      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bill #${completeBillData.bill.billNo}</title>
          <style>
            body { 
              font-family: 'Arial', sans-serif; 
              margin: 25px; 
              color: #2D3748;
              line-height: 1.6;
            }
            .header { 
              text-align: center; 
              border-bottom: 3px solid #1E3A8A;
              padding-bottom: 15px;
              margin-bottom: 25px;
            }
            .bill-title { 
              font-size: 28px; 
              font-weight: bold; 
              color: #1E3A8A;
              margin: 0;
              text-transform: uppercase;
            }
            .company-info {
              color: #64748B;
              font-size: 14px;
              margin-top: 5px;
            }
            .bill-info { 
              background: #F8FAFC;
              padding: 20px;
              border-radius: 10px;
              margin: 20px 0;
              border-left: 4px solid #1E3A8A;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0;
            }
            .info-label { 
              font-weight: bold; 
              color: #475569;
              min-width: 120px;
            }
            .info-value {
              color: #1E293B;
              font-weight: 600;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 25px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            .items-table th { 
              background-color: #1E3A8A; 
              color: white; 
              padding: 15px; 
              text-align: left;
              font-weight: 600;
              font-size: 14px;
            }
            .items-table td { 
              padding: 12px 15px; 
              border-bottom: 1px solid #E2E8F0;
              color: #475569;
            }
            .items-table tr:nth-child(even) {
              background-color: #F8FAFC;
            }
            .items-table tr:hover {
              background-color: #F1F5F9;
            }
            .total-section { 
              background: linear-gradient(135deg, #10B981, #059669);
              padding: 25px;
              border-radius: 12px;
              margin-top: 25px;
              text-align: center;
              color: white;
            }
            .total-amount {
              font-size: 32px;
              font-weight: bold;
              margin: 10px 0;
            }
            .footer { 
              text-align: center; 
              margin-top: 40px; 
              color: #64748B; 
              font-style: italic;
              border-top: 1px solid #E2E8F0;
              padding-top: 20px;
            }
            .pricing-info {
              background: #FFFBEB;
              padding: 15px;
              border-radius: 8px;
              margin: 10px 0;
              border-left: 4px solid #F59E0B;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="bill-title">Purchase Bill</h1>
            <div class="company-info">BillKaro - Your Trusted Billing Partner</div>
          </div>
          
          <div class="bill-info">
            <div class="info-row">
              <span class="info-label">Bill Number:</span>
              <span class="info-value">#${completeBillData.bill.billNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Supplier Name:</span>
              <span class="info-value">${completeBillData.bill.supplierName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Bill Date:</span>
              <span class="info-value">${new Date(
                completeBillData.bill.date,
              ).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Bill Type:</span>
              <span class="info-value" style="color: ${
                completeBillData.bill.billType === 'Cash'
                  ? '#059669'
                  : '#DC2626'
              };">${completeBillData.bill.billType}</span>
            </div>
          </div>

          <h3 style="color: #1E3A8A; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px;">
            📦 Purchased Items (${completeBillData.items.length} items)
          </h3>

          <table class="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Quantity</th>
                <th>Purchase Price</th>
                <th>Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${completeBillData.items
                .map(
                  (item: any, index: number) => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.category || 'General'}</td>
                  <td>₹${Number(item.mrp).toFixed(2)}</td>
                  <td>${item.quantity} ${item.unit}</td>
                  <td>₹${Number(item.purchasePrice).toFixed(2)}</td>
                  <td><strong>₹${Number(item.total).toFixed(2)}</strong></td>
                </tr>
              `,
                )
                .join('')}
            </tbody>
          </table>

          <div class="pricing-info">
            <div style="font-weight: bold; color: #92400E; margin-bottom: 8px;">Pricing Summary</div>
            <div class="info-row">
              <span>Total Items:</span>
              <span><strong>${completeBillData.items.length}</strong></span>
            </div>
            <div class="info-row">
              <span>Total Quantity:</span>
              <span><strong>${completeBillData.items.reduce((sum, item) => sum + item.quantity, 0)} units</strong></span>
            </div>
          </div>

          <div class="total-section">
            <div style="font-size: 18px; margin-bottom: 10px;">Grand Total Amount</div>
            <div class="total-amount">₹${Number(completeBillData.bill.totalAmount).toFixed(2)}</div>
            <div style="font-size: 14px; opacity: 0.9;">
              ${completeBillData.items.length} items • ${new Date().toLocaleDateString('en-IN')}
            </div>
          </div>

          <div class="footer">
            <p>Generated electronically by BillKaro App</p>
            <p>Date: ${new Date().toLocaleString('en-IN', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}</p>
          </div>
        </body>
        </html>
      `;

      // Generate PDF
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      // Share the PDF file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Bill_${completeBillData.bill.supplierName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert(
          'Sharing not available',
          'PDF has been generated but sharing is not available on this device.',
        );
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      Alert.alert('Error', 'Failed to generate and share PDF');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Print Bill Directly
  const printBill = async (billData: BillDataForExport) => {
    try {
      setIsPrinting(true);

      // Get complete bill data with items
      const completeBillData = await getPurchaseBillWithItems(billData.bill.id);
      if (!completeBillData) {
        Alert.alert('Error', 'Failed to load bill details for printing');
        return;
      }

      // Create HTML content for printing
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Bill #${completeBillData.bill.billNo}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 15px; 
              padding: 0;
              font-size: 13px;
              color: #000;
              line-height: 1.4;
            }
            .header { 
              text-align: center; 
              margin-bottom: 15px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .bill-title { 
              font-size: 20px; 
              font-weight: bold; 
              margin: 0;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .store-name {
              font-size: 16px;
              font-weight: bold;
              margin: 5px 0;
            }
            .bill-info { 
              margin: 15px 0; 
              padding: 10px;
              border: 1px dashed #666;
            }
            .info-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 4px 0;
            }
            .info-label { 
              font-weight: bold; 
            }
            .section-title {
              text-align: center;
              font-weight: bold;
              margin: 15px 0;
              border-top: 1px solid #000;
              border-bottom: 1px solid #000;
              padding: 5px 0;
              background: #f0f0f0;
            }
            .items-header {
              display: flex;
              justify-content: space-between;
              font-weight: bold;
              border-bottom: 2px solid #000;
              padding-bottom: 5px;
              margin-bottom: 8px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              padding-bottom: 4px;
              border-bottom: 1px dotted #ccc;
            }
            .item-name {
              flex: 2;
              font-weight: bold;
            }
            .item-category {
              font-size: 11px;
              color: #666;
              font-style: italic;
            }
            .mrp-col {
              text-align: right;
              min-width: 70px;
            }
            .quantity-col {
              text-align: center;
              min-width: 60px;
            }
            .price-col {
              text-align: right;
              min-width: 70px;
            }
            .total-col {
              text-align: right;
              min-width: 80px;
              font-weight: bold;
            }
            .divider {
              border-top: 2px dashed #000;
              margin: 10px 0;
            }
            .total-section { 
              text-align: right; 
              margin-top: 15px; 
              font-weight: bold;
              border-top: 3px double #000;
              padding-top: 10px;
              font-size: 16px;
            }
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-style: italic;
              font-size: 11px;
              border-top: 1px solid #000;
              padding-top: 10px;
            }
            .pricing-summary {
              background: #FFFBEB;
              padding: 10px;
              margin: 10px 0;
              border: 1px dashed #F59E0B;
            }
          </style>
        </head>
        <body>
          <div class="header">
          
            <h1 class="bill-title">Purchase Bill</h1>
            <div>BillKaro - Your Trusted Billing Partner</div>
            <div>----------------------------------------</div>
          </div>
          
          <div class="bill-info">
            <div class="info-row">
              <span class="info-label">BILL NO:</span>
              <span>#${completeBillData.bill.billNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">SUPPLIER:</span>
              <span>${completeBillData.bill.supplierName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">DATE:</span>
              <span>${new Date(completeBillData.bill.date).toLocaleDateString('en-IN')}</span>
            </div>
            <div class="info-row">
              <span class="info-label">TYPE:</span>
              <span>${completeBillData.bill.billType}</span>
            </div>
          </div>

          <div class="section-title">PURCHASED ITEMS</div>

          <div class="items-header">
            <div class="item-name">ITEM</div>
            <div class="mrp-col">MRP</div>
            <div class="quantity-col">QTY</div>
            <div class="price-col">PRICE</div>
            <div class="total-col">TOTAL</div>
          </div>

          ${completeBillData.items
            .map(
              (item: any) => `
            <div class="item-row">
              <div class="item-name">
                ${item.name}
                <div class="item-category">${item.category || 'General'}</div>
              </div>
              <div class="mrp-col">
                ₹${Number(item.mrp).toFixed(2)}
              </div>
              <div class="quantity-col">
                ${item.quantity} ${item.unit}
              </div>
              <div class="price-col">
                ₹${Number(item.purchasePrice).toFixed(2)}
              </div>
              <div class="total-col">
                ₹${Number(item.total).toFixed(2)}
              </div>
            </div>
          `,
            )
            .join('')}

          <div class="pricing-summary">
            <div style="text-align: center; font-weight: bold; margin-bottom: 5px;">SUMMARY</div>
            <div class="info-row">
              <span>Items:</span>
              <span>${completeBillData.items.length}</span>
            </div>
            <div class="info-row">
              <span>Total Qty:</span>
              <span>${completeBillData.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="total-section">
            <div class="info-row">
              <span class="info-label">GRAND TOTAL:</span>
              <span>₹${Number(completeBillData.bill.totalAmount).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div>*** Thank you for your business! ***</div>
            <div>Generated electronically by BillKaro App</div>
            <div>Date: ${new Date().toLocaleString('en-IN')}</div>
          </div>
        </body>
        </html>
      `;

      // Print directly
      await Print.printAsync({
        html: htmlContent,
        orientation: 'portrait',
        margins: {
          left: 15,
          top: 15,
          right: 15,
          bottom: 15,
        },
      });
    } catch (error) {
      console.error('Print Error:', error);
      Alert.alert(
        'Print Error',
        'Failed to print the bill. Please check your printer connection.',
      );
    } finally {
      setIsPrinting(false);
    }
  };

  // Load purchase bills function
  const loadPurchaseBills = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      const bills = await getAllPurchaseBills();
      setPurchaseBills(bills);
    } catch (error) {
      console.error('Error loading purchase bills:', error);
      Alert.alert('Error', 'Failed to load purchase bills');
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
      setIsRefreshing(false);
    }
  }, []);

  // Load purchase bills on component mount
  useEffect(() => {
    loadPurchaseBills(true);
  }, [loadPurchaseBills]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadPurchaseBills();
  }, [loadPurchaseBills]);

  const viewBillDetails = useCallback(async (billId: number) => {
    try {
      const billWithItems = await getPurchaseBillWithItems(billId);
      if (billWithItems) {
        const enhancedItems = await Promise.all(
          billWithItems.items.map(async (item) => {
            try {
              const productInfo = await getProductByNameAndDetails(
                item.name,
                item.category,
                item.mrp,
                item.purchasePrice,
              );

              if (productInfo) {
                return {
                  ...item,
                  currentStock: productInfo.stock,
                  isNewProduct: false,
                  stockAdded: item.quantity,
                };
              } else {
                return {
                  ...item,
                  currentStock: 0,
                  isNewProduct: true,
                  stockAdded: item.quantity,
                };
              }
            } catch (error) {
              console.error(
                'Error fetching product info for item:',
                item.name,
                error,
              );
              return {
                ...item,
                currentStock: 0,
                isNewProduct: true,
                stockAdded: item.quantity,
              };
            }
          }),
        );

        setSelectedBill({
          bill: billWithItems.bill,
          items: enhancedItems,
        });
        setShowBillModal(true);
      } else {
        Alert.alert('Error', 'Failed to load bill details');
      }
    } catch (error) {
      console.error('Error loading bill details:', error);
      Alert.alert('Error', 'Failed to load bill details');
    }
  }, []);

  // Handle Edit Bill
  const handleEditBill = useCallback(
    async (bill: PurchaseBill) => {
      try {
        const billWithItems = await getPurchaseBillWithItems(bill.id);
        if (!billWithItems) {
          Alert.alert('Error', 'Failed to load bill data for editing');
          return;
        }

        const itemsData = billWithItems.items.map((item) => ({
          name: item.name,
          mrp: item.mrp,
          purchasePrice: item.purchasePrice,
          sellPrice: item.sellPrice,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          total: item.total,
        }));

        router.push({
          pathname: '/(tabs)/PurchaseScreen',
          params: {
            editMode: 'true',
            editBillId: bill.id.toString(),
            billNo: bill.billNo,
            supplierId: bill.supplierId.toString(),
            supplierName: bill.supplierName,
            billType: bill.billType,
            date: bill.date,
            totalAmount: bill.totalAmount.toString(),
            itemsData: JSON.stringify(itemsData),
          },
        });
      } catch (error) {
        console.error('❌ Error preparing bill for editing:', error);
        Alert.alert('Error', 'Failed to load bill for editing');
      }
    },
    [router],
  );

  const handleDeleteBill = useCallback((billId: number, billNo: string) => {
    Alert.alert(
      'Delete Purchase Bill',
      `Are you sure you want to delete bill #${billNo}? This will also remove the inventory added by this bill.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteBill(billId),
        },
      ],
    );
  }, []);

  const confirmDeleteBill = useCallback(
    async (billId: number) => {
      try {
        setIsDeleting(true);
        await deletePurchaseBill(billId);
        Alert.alert('Success', 'Purchase bill deleted successfully');
        loadPurchaseBills();
        setShowBillModal(false);
      } catch (error) {
        console.error('Error deleting purchase bill:', error);
        Alert.alert('Error', 'Failed to delete purchase bill');
      } finally {
        setIsDeleting(false);
      }
    },
    [loadPurchaseBills],
  );

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return `₹${amount.toFixed(2)}`;
  }, []);

  // Get inventory summary for the bill
  const getInventorySummary = useCallback(() => {
    if (!selectedBill) return { totalItems: 0, newProducts: 0, stockAdded: 0 };

    const totalItems = selectedBill.items.length;
    const newProducts = selectedBill.items.filter(
      (item) => item.isNewProduct,
    ).length;
    const stockAdded = selectedBill.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );

    return { totalItems, newProducts, stockAdded };
  }, [selectedBill]);

  // Render Purchase Bill Card
  const renderPurchaseBill = useCallback(
    ({ item, index }: { item: PurchaseBill; index: number }) => (
      <TouchableOpacity
        style={[
          styles.billCard,
          index % 2 === 0 ? styles.billCardEven : styles.billCardOdd,
        ]}
        onPress={() => viewBillDetails(item.id)}
        activeOpacity={0.7}
      >
        {/* Share and Print Icons */}
        <View style={styles.iconRowRight}>
          <TouchableOpacity
            onPress={() => shareBillAsPDF({ bill: item, items: [] })}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <Text style={styles.actionIcon}>📤</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => printBill({ bill: item, items: [] })}
            disabled={isPrinting}
          >
            {isPrinting ? (
              <ActivityIndicator size="small" color="#1E293B" />
            ) : (
              <Text style={styles.actionIcon}>🖨️</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={styles.billNo}>#{item.billNo}</Text>
            <Text style={styles.supplierName}>{item.supplierName}</Text>
          </View>
          <View
            style={[
              styles.billTypeBadge,
              item.billType === 'Cash' ? styles.cashBadge : styles.creditBadge,
            ]}
          >
            <Text style={styles.billTypeText}>{item.billType}</Text>
          </View>
        </View>

        <View style={styles.billDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>{formatDate(item.date)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.amountText}>
              {formatCurrency(item.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Inventory Impact Badge */}
        <View style={styles.inventoryImpact}>
          <View style={styles.impactBadge}>
            <Text style={styles.impactText}>📦 Inventory Updated</Text>
          </View>
        </View>

        <View style={styles.billActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditBill(item)}
          >
            <Text style={styles.editButtonText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => viewBillDetails(item.id)}
          >
            <Text style={styles.viewButtonText}>👁️ View Details</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteBill(item.id, item.billNo)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    ),
    [
      viewBillDetails,
      handleEditBill,
      handleDeleteBill,
      formatDate,
      formatCurrency,
      isDeleting,
      isGeneratingPDF,
      isPrinting,
    ],
  );

  // Render Bill Item in Modal
  const renderBillItem = useCallback(
    (
      item: PurchaseItem & {
        currentStock?: number;
        isNewProduct?: boolean;
        stockAdded?: number;
      },
      index: number,
    ) => (
      <View style={styles.billItemCard} key={item.id}>
        <View style={styles.billItemHeader}>
          <Text style={styles.itemIndex}>#{index + 1}</Text>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>

        <View style={styles.billItemDetails}>
          <View style={styles.itemDetailRow}>
            <View style={styles.itemDetailColumn}>
              <Text style={styles.itemDetailLabel}>MRP</Text>
              <Text style={styles.itemDetailValue}>
                {formatCurrency(item.mrp)}
              </Text>
            </View>
            <View style={styles.itemDetailColumn}>
              <Text style={styles.itemDetailLabel}>Quantity</Text>
              <Text style={styles.itemDetailValue}>
                {item.quantity} {item.unit}
              </Text>
            </View>
            <View style={styles.itemDetailColumn}>
              <Text style={styles.itemDetailLabel}>Purchase</Text>
              <Text style={styles.itemDetailValue}>
                {formatCurrency(item.purchasePrice)}
              </Text>
            </View>
          </View>
          <View style={styles.itemDetailRow}>
            <View style={styles.itemDetailColumn}>
              <Text style={styles.itemDetailLabel}>Selling</Text>
              <Text style={styles.itemDetailValue}>
                {formatCurrency(item.sellPrice)}
              </Text>
            </View>
            <View style={styles.itemDetailColumn}>
              <Text style={styles.itemDetailLabel}>Total</Text>
              <Text style={[styles.itemDetailValue, styles.itemTotalText]}>
                {formatCurrency(item.total)}
              </Text>
            </View>
          </View>

          {/* Inventory Information */}
          <View style={styles.inventoryInfo}>
            <View style={styles.inventoryRow}>
              <Text style={styles.inventoryLabel}>Stock Added:</Text>
              <Text style={styles.inventoryValue}>
                +{item.quantity} {item.unit}
              </Text>
            </View>
            {!item.isNewProduct && item.currentStock !== undefined && (
              <View style={styles.inventoryRow}>
                <Text style={styles.inventoryLabel}>Current Stock:</Text>
                <Text style={styles.inventoryValue}>
                  {item.currentStock} {item.unit}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    ),
    [formatCurrency],
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading purchase bills...</Text>
      </View>
    );
  }

  const inventorySummary = selectedBill ? getInventorySummary() : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Purchase Bills</Text>
        <Text style={styles.subtitle}>
          {purchaseBills.length} bill{purchaseBills.length !== 1 ? 's' : ''}{' '}
          found
        </Text>
      </View>

      {/* Purchase Bills List */}
      {purchaseBills.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📋</Text>
          <Text style={styles.emptyStateTitle}>No Purchase Bills</Text>
          <Text style={styles.emptyStateSubtitle}>
            Purchase bills you create will appear here
          </Text>
          <TouchableOpacity
            style={styles.createBillButton}
            onPress={() => router.push('/(tabs)/PurchaseScreen')}
          >
            <Text style={styles.createBillButtonText}>
              ➕ Create First Bill
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={purchaseBills}
          renderItem={renderPurchaseBill}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        />
      )}

      {/* Bill Details Modal */}
      <Modal
        visible={showBillModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBillModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedBill && (
              <>
                {/* Modal Header */}
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>
                      Bill #{selectedBill.bill.billNo}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {selectedBill.bill.supplierName}
                    </Text>
                  </View>
                  <View style={styles.modalHeaderActions}>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => shareBillAsPDF(selectedBill)}
                      disabled={isGeneratingPDF}
                    >
                      {isGeneratingPDF ? (
                        <ActivityIndicator size="small" color="#64748B" />
                      ) : (
                        <Text style={styles.closeButtonText}>📤</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => printBill(selectedBill)}
                      disabled={isPrinting}
                    >
                      {isPrinting ? (
                        <ActivityIndicator size="small" color="#64748B" />
                      ) : (
                        <Text style={styles.closeButtonText}>🖨️</Text>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowBillModal(false)}
                    >
                      <Text style={styles.closeButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Inventory Summary */}
                {inventorySummary && (
                  <View style={styles.inventorySummaryCard}>
                    <Text style={styles.inventorySummaryTitle}>
                      📦 Inventory Impact
                    </Text>
                    <View style={styles.inventorySummaryGrid}>
                      <View style={styles.summaryGridItem}>
                        <Text style={styles.summaryNumber}>
                          {inventorySummary.totalItems}
                        </Text>
                        <Text style={styles.summaryGridLabel}>Items</Text>
                      </View>
                      <View style={styles.summaryGridItem}>
                        <Text style={styles.summaryNumber}>
                          {inventorySummary.stockAdded}
                        </Text>
                        <Text style={styles.summaryGridLabel}>Stock Added</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Bill Information */}
                <View style={styles.modalCard}>
                  <View style={styles.billSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>Bill Type</Text>
                      <View
                        style={[
                          styles.billTypeBadge,
                          selectedBill.bill.billType === 'Cash'
                            ? styles.cashBadge
                            : styles.creditBadge,
                        ]}
                      >
                        <Text style={styles.billTypeText}>
                          {selectedBill.bill.billType}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>Date</Text>
                      <Text style={styles.summaryRowValue}>
                        {formatDate(selectedBill.bill.date)}
                      </Text>
                    </View>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryRowLabel}>Created</Text>
                      <Text style={styles.summaryRowValue}>
                        {formatDate(selectedBill.bill.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.modalCard}>
                  <Text style={styles.itemsTitle}>📦 Purchased Items</Text>
                  <ScrollView style={styles.itemsList}>
                    {selectedBill.items.map((item, index) =>
                      renderBillItem(item, index),
                    )}
                  </ScrollView>
                </View>

                {/* Total Amount */}
                <View style={styles.totalCard}>
                  <Text style={styles.totalLabel}>Total Bill Amount</Text>
                  <Text style={styles.totalAmount}>
                    {formatCurrency(selectedBill.bill.totalAmount)}
                  </Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.editModalButton]}
                    onPress={() => {
                      setShowBillModal(false);
                      handleEditBill(selectedBill.bill);
                    }}
                  >
                    <Text style={styles.editModalButtonText}>✏️ Edit Bill</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.deleteModalButton]}
                    onPress={() =>
                      handleDeleteBill(
                        selectedBill.bill.id,
                        selectedBill.bill.billNo,
                      )
                    }
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.deleteModalButtonText}>
                        🗑️ Delete Bill
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionButton, styles.closeModalButton]}
                    onPress={() => setShowBillModal(false)}
                  >
                    <Text style={styles.closeModalButtonText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#1E3A8A',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    elevation: 8,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 24,
  },
  createBillButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  createBillButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 30,
  },
  billCard: {
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  billCardEven: {
    backgroundColor: '#FFFFFF',
  },
  billCardOdd: {
    backgroundColor: '#F8FAFC',
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  billInfo: {
    flex: 1,
  },
  billNo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  supplierName: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  billTypeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 12,
  },
  cashBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  creditBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  billTypeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
    letterSpacing: 0.5,
  },
  billDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10B981',
  },
  inventoryImpact: {
    marginBottom: 16,
  },
  impactBadge: {
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.2)',
  },
  impactText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  billActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  editButton: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  viewButton: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0369A1',
    letterSpacing: 0.3,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  deleteButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 0,
    width: width * 0.9,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
  inventorySummaryCard: {
    backgroundColor: '#DBEAFE',
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  inventorySummaryTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E40AF',
    marginBottom: 12,
    textAlign: 'center',
  },
  inventorySummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryGridItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E40AF',
    marginBottom: 4,
  },
  summaryGridLabel: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
  },
  billSummary: {
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryRowValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  itemsList: {
    maxHeight: 300,
  },
  billItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  billItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemIndex: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    flex: 1,
    letterSpacing: 0.3,
  },
  billItemDetails: {
    gap: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemDetailColumn: {
    flex: 1,
  },
  itemDetailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  itemDetailValue: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  itemTotalText: {
    color: '#10B981',
    fontSize: 15,
  },
  inventoryInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  inventoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  inventoryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  inventoryValue: {
    fontSize: 12,
    color: '#1E293B',
    fontWeight: '700',
  },
  totalCard: {
    backgroundColor: '#10B981',
    margin: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  totalAmount: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 0,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModalButton: {
    backgroundColor: '#0EA5E9',
  },
  deleteModalButton: {
    backgroundColor: '#DC2626',
  },
  closeModalButton: {
    backgroundColor: '#64748B',
  },
  editModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  deleteModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  closeModalButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  // Share and Print Icons Styles
  iconRowRight: {
    position: 'absolute',
    right: 10,
    top: 10,
    flexDirection: 'row',
    gap: 10,
  },
  actionIcon: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1E293B',
  },
});
