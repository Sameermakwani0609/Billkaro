import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Share, Platform, Alert } from 'react-native';

export interface PDFBillData {
  bill: {
    id: number;
    billNo: string;
    supplierName: string;
    billType: string;
    date: string;
    totalAmount: number;
    createdAt: string;
  };
  items: {
    id: number;
    name: string;
    category: string;
    mrp: number;
    purchasePrice: number;
    sellPrice: number;
    quantity: number;
    unit: string;
    total: number;
  }[];
}

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const PDFService = {
  // Generate PDF function
  generatePDF: async (billData: PDFBillData): Promise<string> => {
    try {
      const { bill, items } = billData;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Purchase Bill #${bill.billNo}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; color: #333; line-height: 1.4; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #333; padding-bottom: 15px; }
            .company-name { font-size: 24px; font-weight: bold; color: #1E3A8A; margin-bottom: 5px; }
            .bill-info { display: flex; justify-content: space-between; margin-bottom: 25px; flex-wrap: wrap; }
            .supplier-info, .bill-details { flex: 1; min-width: 200px; }
            .info-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
            .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .info-label { font-weight: bold; color: #555; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            .table th { background-color: #1E3A8A; color: white; padding: 12px 8px; text-align: left; font-weight: bold; }
            .table td { padding: 10px 8px; border-bottom: 1px solid #ddd; }
            .table tr:nth-child(even) { background-color: #f8f9fa; }
            .total-section { text-align: right; margin-top: 25px; padding: 20px; background: #10B981; color: white; border-radius: 8px; }
            .total-amount { font-size: 24px; font-weight: bold; margin-top: 5px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-name">Your Company</div>
            <h1>PURCHASE BILL</h1>
            <h2>Bill No: ${bill.billNo}</h2>
          </div>
          
          <div class="bill-info">
            <div class="supplier-info">
              <div class="info-section">
                <h3>Supplier Information</h3>
                <div class="info-row">
                  <span class="info-label">Supplier Name:</span>
                  <span class="info-value">${bill.supplierName}</span>
                </div>
              </div>
            </div>
            
            <div class="bill-details">
              <div class="info-section">
                <h3>Bill Details</h3>
                <div class="info-row">
                  <span class="info-label">Bill Date:</span>
                  <span class="info-value">${formatDate(bill.date)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Bill Type:</span>
                  <span class="info-value">${bill.billType}</span>
                </div>
              </div>
            </div>
          </div>
          
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Item Name</th>
                <th>Category</th>
                <th>MRP</th>
                <th>Purchase Price</th>
                <th>Selling Price</th>
                <th>Quantity</th>
                <th>Unit</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.category}</td>
                  <td>₹${item.mrp.toFixed(2)}</td>
                  <td>₹${item.purchasePrice.toFixed(2)}</td>
                  <td>₹${item.sellPrice.toFixed(2)}</td>
                  <td>${item.quantity}</td>
                  <td>${item.unit}</td>
                  <td>₹${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div style="font-size: 18px; font-weight: bold;">Total Bill Amount</div>
            <div class="total-amount">₹${bill.totalAmount.toFixed(2)}</div>
          </div>
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString('en-IN')}</p>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false,
      });

      Alert.alert('Success', 'PDF generated successfully!');
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF');
    }
  },

  // Share PDF function
  sharePDF: async (billData: PDFBillData) => {
    try {
      const pdfUri = await PDFService.generatePDF(billData);
      
      if (Platform.OS === 'android') {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Purchase Bill #${billData.bill.billNo}`,
          UTI: '.pdf'
        });
      } else {
        await Share.share({
          url: pdfUri,
          title: `Purchase Bill #${billData.bill.billNo}`,
        });
      }
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share PDF');
      throw error;
    }
  },

  // Generate and Share PDF function (NEW - Fixes Error 3)
  generateAndSharePDF: async (billData: PDFBillData): Promise<void> => {
    try {
      const pdfUri = await PDFService.generatePDF(billData);
      
      if (Platform.OS === 'android') {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Purchase Bill #${billData.bill.billNo}`,
          UTI: '.pdf'
        });
      } else {
        await Share.share({
          url: pdfUri,
          title: `Purchase Bill #${billData.bill.billNo}`,
        });
      }
    } catch (error) {
      console.error('Error generating and sharing PDF:', error);
      Alert.alert('Error', 'Failed to generate and share PDF');
      throw error;
    }
  },

  // Share to WhatsApp
  shareToWhatsApp: async (billData: PDFBillData) => {
    try {
      const pdfUri = await PDFService.generatePDF(billData);
      
      const message = `Purchase Bill #${billData.bill.billNo}

Supplier: ${billData.bill.supplierName}
Date: ${formatDate(billData.bill.date)}
Total Amount: ₹${billData.bill.totalAmount.toFixed(2)}

Please find the attached PDF bill.`;

      await Share.share({
        url: pdfUri,
        message: message,
      });
    } catch (error) {
      console.error('Error sharing to WhatsApp:', error);
      Alert.alert('Error', 'Failed to share to WhatsApp');
      throw error;
    }
  },

  // Share to Gmail
  shareToGmail: async (billData: PDFBillData) => {
    try {
      const pdfUri = await PDFService.generatePDF(billData);
      
      const message = `Dear Team,

Please find attached the purchase bill #${billData.bill.billNo} from ${billData.bill.supplierName}.

Bill Details:
- Bill Number: ${billData.bill.billNo}
- Supplier: ${billData.bill.supplierName}
- Date: ${formatDate(billData.bill.date)}
- Total Amount: ₹${billData.bill.totalAmount.toFixed(2)}
- Bill Type: ${billData.bill.billType}

Thank you.

Best regards,
Your Company Name`;

      await Share.share({
        url: pdfUri,
        message: message,
      });
    } catch (error) {
      console.error('Error sharing to Gmail:', error);
      Alert.alert('Error', 'Failed to share to Gmail');
      throw error;
    }
  }
};