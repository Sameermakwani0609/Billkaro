import { Share, Alert } from 'react-native';

export interface PrintOptions {
  billNo: string;
  supplierName: string;
  date: string;
  billType: string;
  items: Array<{
    name: string;
    quantity: number;
    unit: string;
    purchasePrice: number;
    total: number;
    mrp?: number;
    sellPrice?: number;
  }>;
  totalAmount: number;
}

// Helper functions
const formatDateForPrint = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const truncateText = (text: string, maxLength: number) => {
  return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
};

export const PrinterService = {
  // Thermal Printing Function for 3-inch Bluetooth printers
  printThermal: async (options: PrintOptions): Promise<string> => {
    try {
      const { billNo, supplierName, items, totalAmount, date, billType } = options;
      
      // Format for 3-inch thermal printer (approx 32-48 characters per line)
      const receiptText = `
${'='.repeat(32)}
      PURCHASE BILL
${'='.repeat(32)}
Bill No  : ${billNo}
Supplier : ${supplierName}
Date     : ${formatDateForPrint(date)}
Type     : ${billType}
${'-'.repeat(32)}
     PURCHASED ITEMS
${'-'.repeat(32)}
${items.map((item, index) => 
`${(index + 1).toString().padStart(2)}. ${truncateText(item.name, 18).padEnd(18)}
     Qty: ${item.quantity.toString().padStart(3)} ${item.unit.padEnd(4)} @₹${item.purchasePrice.toFixed(2)}
     Total: ₹${item.total.toFixed(2).padStart(8)}`
).join('\n')}
${'-'.repeat(32)}
TOTAL AMOUNT: ₹${totalAmount.toFixed(2).padStart(10)}
${'='.repeat(32)}
Generated: ${new Date().toLocaleDateString('en-IN')}
Thank you for your business!
${'='.repeat(32)}
      `.trim();

      // Share the thermal print text (for now - you can integrate with actual printer SDK)
      await Share.share({
        message: receiptText,
        title: `Thermal Print - Bill #${billNo}`,
      });

      Alert.alert(
        'Thermal Print Ready', 
        'Thermal print content has been generated. Connect to your Bluetooth thermal printer to print.',
        [{ text: 'OK' }]
      );
      
      return receiptText;
    } catch (error) {
      console.error('Error generating thermal print:', error);
      Alert.alert('Error', 'Failed to generate thermal print content');
      throw error;
    }
  },

  // For actual Bluetooth printer integration (placeholder)
  connectToBluetoothPrinter: async () => {
    // This is where you would integrate with actual Bluetooth printer libraries
    // Popular libraries: react-native-thermal-receipt-printer, react-native-bluetooth-escpos-printer
    Alert.alert(
      'Bluetooth Printer',
      'Connect to your 3-inch Bluetooth thermal printer. Implementation depends on your specific printer model.',
      [{ text: 'OK' }]
    );
  }
};